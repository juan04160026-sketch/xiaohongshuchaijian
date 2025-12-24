import axios, { AxiosInstance } from 'axios';
import { chromium, BrowserContext } from 'playwright';

/**
 * 比特浏览器配置
 */
export interface BitBrowserConfig {
  apiUrl: string;  // 比特浏览器 API 地址，默认 http://127.0.0.1:54345
}

/**
 * 比特浏览器窗口信息
 */
export interface BitBrowserWindow {
  id: string;           // 窗口 ID
  name: string;         // 窗口名称
  remark?: string;      // 备注
  groupId?: string;     // 分组 ID
  groupName?: string;   // 分组名称
}

/**
 * 已打开的浏览器实例
 */
interface OpenedBrowser {
  windowId: string;
  ws: string;           // WebSocket 调试地址
  context: BrowserContext;
}

/**
 * 比特浏览器管理器
 * 用于管理多个比特浏览器窗口，实现多账号发布
 */
export class BitBrowserManager {
  private client: AxiosInstance;
  private openedBrowsers: Map<string, OpenedBrowser> = new Map();

  constructor(config: BitBrowserConfig = { apiUrl: 'http://127.0.0.1:54345' }) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 获取所有浏览器窗口列表
   */
  async getWindowList(): Promise<BitBrowserWindow[]> {
    try {
      const allWindows: BitBrowserWindow[] = [];
      let page = 0;  // 比特浏览器 API 分页从 0 开始
      const pageSize = 100;
      let hasMore = true;

      // 分页获取所有窗口
      while (hasMore) {
        console.log(`正在获取第 ${page} 页窗口列表...`);
        const response = await this.client.post('/browser/list', {
          page: page,
          pageSize: pageSize,
        });

        console.log(`API 响应:`, JSON.stringify(response.data, null, 2));

        if (response.data.success) {
          const list = response.data.data.list || [];
          const total = response.data.data.totalNum || 0;
          
          const windows = list.map((item: any) => ({
            id: item.id,
            name: item.name,
            remark: item.remark,
            groupId: item.groupId,
            groupName: item.groupName,
          }));
          
          allWindows.push(...windows);
          
          console.log(`获取窗口列表: 第${page}页, 本页${list.length}个, 已获取${allWindows.length}个, 总共${total}个`);
          
          // 检查是否还有更多
          hasMore = allWindows.length < total && list.length > 0;
          page++;
        } else {
          // 检查是否是比特浏览器云端连接问题
          const msg = response.data.msg || '获取窗口列表失败';
          if (msg.includes('ENOTFOUND') || msg.includes('serviceapi.bitbrowser')) {
            throw new Error('比特浏览器无法连接云端服务，请检查：\n1. 网络连接是否正常\n2. 比特浏览器是否已登录\n3. 是否需要配置代理');
          }
          throw new Error(msg);
        }
      }

      console.log(`共获取到 ${allWindows.length} 个窗口`);
      return allWindows;
    } catch (error: any) {
      console.error('获取比特浏览器窗口列表失败:', error);
      // 检查是否是连接超时或拒绝
      if (error.code === 'ECONNREFUSED') {
        throw new Error('无法连接比特浏览器，请确保比特浏览器已启动');
      }
      throw error;
    }
  }


  /**
   * 打开指定窗口并返回 Playwright 连接
   */
  async openWindow(windowId: string): Promise<BrowserContext> {
    // 检查是否已经打开
    const existing = this.openedBrowsers.get(windowId);
    if (existing) {
      console.log(`窗口 ${windowId} 已打开，复用连接`);
      return existing.context;
    }

    try {
      // 调用比特浏览器 API 打开窗口
      const response = await this.client.post('/browser/open', {
        id: windowId,
        loadExtensions: false,
        args: [],
      });

      if (!response.data.success) {
        throw new Error(response.data.msg || '打开窗口失败');
      }

      const { ws, http } = response.data.data;
      console.log(`窗口 ${windowId} 已打开，WebSocket: ${ws}, HTTP: ${http}`);

      // 构建正确的 CDP 连接地址
      let cdpUrl = http;
      
      // 如果 http 为空或格式不对，从 ws 地址提取
      if (!cdpUrl || !cdpUrl.startsWith('http')) {
        // ws 格式: ws://127.0.0.1:59673/devtools/browser/xxx
        // 需要转换为: http://127.0.0.1:59673
        if (ws && ws.startsWith('ws://')) {
          const wsUrl = new URL(ws);
          cdpUrl = `http://${wsUrl.host}`;
        } else {
          throw new Error('无法获取有效的 CDP 连接地址');
        }
      }

      console.log(`使用 CDP 地址连接: ${cdpUrl}`);

      // 使用 Playwright 连接到浏览器
      const browser = await chromium.connectOverCDP(cdpUrl);
      const contexts = browser.contexts();
      const context = contexts.length > 0 ? contexts[0] : await browser.newContext();

      this.openedBrowsers.set(windowId, {
        windowId,
        ws,
        context,
      });

      return context;
    } catch (error) {
      console.error(`打开窗口 ${windowId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 关闭指定窗口
   */
  async closeWindow(windowId: string): Promise<void> {
    const browser = this.openedBrowsers.get(windowId);
    if (!browser) {
      console.log(`窗口 ${windowId} 未打开`);
      return;
    }

    try {
      // 调用比特浏览器 API 关闭窗口
      await this.client.post('/browser/close', {
        id: windowId,
      });

      this.openedBrowsers.delete(windowId);
      console.log(`窗口 ${windowId} 已关闭`);
    } catch (error) {
      console.error(`关闭窗口 ${windowId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 关闭所有已打开的窗口
   */
  async closeAll(): Promise<void> {
    const windowIds = Array.from(this.openedBrowsers.keys());
    for (const windowId of windowIds) {
      await this.closeWindow(windowId);
    }
  }

  /**
   * 获取已打开的窗口数量
   */
  getOpenedCount(): number {
    return this.openedBrowsers.size;
  }

  /**
   * 检查窗口是否已打开
   */
  isWindowOpened(windowId: string): boolean {
    return this.openedBrowsers.has(windowId);
  }

  /**
   * 获取窗口的 BrowserContext
   */
  getContext(windowId: string): BrowserContext | null {
    const browser = this.openedBrowsers.get(windowId);
    return browser ? browser.context : null;
  }
}
