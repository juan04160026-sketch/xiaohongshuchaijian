import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import axios from 'axios';

// 设置控制台编码为 UTF-8（Windows）
if (process.platform === 'win32') {
  process.stdout.setDefaultEncoding?.('utf8');
  process.stderr.setDefaultEncoding?.('utf8');
}
import { ConfigManager } from './services/ConfigManager';
import { FeishuReader } from './services/FeishuReader';
import { TaskScheduler } from './services/TaskScheduler';
import { PublishingEngine } from './services/PublishingEngine';
import { LoggerManager } from './services/LoggerManager';
import { PublishScheduler } from './services/PublishScheduler';
import { BitBrowserManager } from './services/BitBrowserManager';
import { MultiAccountPublisher, PublishTaskWithAccount } from './services/MultiAccountPublisher';

// 创建飞书 API 客户端
const feishuClient = axios.create({
  baseURL: 'https://open.feishu.cn/open-apis',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager;
let feishuReader: FeishuReader;
let taskScheduler: TaskScheduler;
let publishingEngine: PublishingEngine;
let loggerManager: LoggerManager;
let publishScheduler: PublishScheduler;
let bitBrowserManager: BitBrowserManager;
let multiAccountPublisher: MultiAccountPublisher;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '小红书自动发布插件',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      defaultEncoding: 'UTF-8',
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // 使用 loadFile 而不是 loadURL，避免中文路径编码问题
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading file:', htmlPath);
    mainWindow.loadFile(htmlPath);
  }

  // 开发时可以打开开发者工具调试，生产环境注释掉
  // mainWindow.webContents.openDevTools();
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeServices(): void {
  configManager = new ConfigManager();
  feishuReader = new FeishuReader();
  taskScheduler = new TaskScheduler();
  publishingEngine = new PublishingEngine();
  loggerManager = new LoggerManager();
  publishScheduler = new PublishScheduler(
    configManager,
    feishuReader,
    taskScheduler,
    publishingEngine,
    loggerManager
  );
  
  // 比特浏览器多账号支持
  bitBrowserManager = new BitBrowserManager();
  multiAccountPublisher = new MultiAccountPublisher();
}

function setupIPC(): void {
  // Config IPC handlers
  ipcMain.handle('config:get', () => configManager.getConfig());
  ipcMain.handle('config:set', (_, config) => configManager.setConfig(config));
  ipcMain.handle('config:save', () => configManager.saveConfig());

  // Task IPC handlers
  ipcMain.handle('tasks:get', () => taskScheduler.getTasks());
  ipcMain.handle('tasks:start', async () => {
    try {
      await publishScheduler.start();
    } catch (error) {
      console.error('Failed to start publish scheduler:', error);
      throw error;
    }
  });
  ipcMain.handle('tasks:pause', () => publishScheduler.pause());
  ipcMain.handle('tasks:resume', () => publishScheduler.resume());
  ipcMain.handle('tasks:stop', async () => {
    try {
      await publishScheduler.stop();
    } catch (error) {
      console.error('Failed to stop publish scheduler:', error);
      throw error;
    }
  });

  // Logger IPC handlers
  ipcMain.handle('logs:get', (_, filter) => loggerManager.getLogs(filter));
  ipcMain.handle('logs:search', (_, query) => loggerManager.searchLogs(query));

  // Dialog IPC handlers
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择图片目录',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // 比特浏览器 IPC handlers
  ipcMain.handle('bitbrowser:getWindows', async () => {
    try {
      return await bitBrowserManager.getWindowList();
    } catch (error) {
      console.error('获取比特浏览器窗口列表失败:', error);
      throw error;
    }
  });

  ipcMain.handle('bitbrowser:openWindow', async (_, windowId: string) => {
    try {
      await bitBrowserManager.openWindow(windowId);
      return { success: true };
    } catch (error) {
      console.error('打开窗口失败:', error);
      throw error;
    }
  });

  ipcMain.handle('bitbrowser:closeWindow', async (_, windowId: string) => {
    try {
      await bitBrowserManager.closeWindow(windowId);
      return { success: true };
    } catch (error) {
      console.error('关闭窗口失败:', error);
      throw error;
    }
  });

  // 多账号发布 IPC handlers
  ipcMain.handle('publish:multi', async (_, tasks: PublishTaskWithAccount[], mode: 'serial' | 'parallel') => {
    try {
      const imageDir = configManager.getImageDir();
      if (imageDir) {
        multiAccountPublisher.setImageDir(imageDir);
      }
      multiAccountPublisher.setPublishInterval(configManager.getPublishInterval());

      let results;
      if (mode === 'parallel') {
        results = await multiAccountPublisher.publishParallel(tasks, 3);
      } else {
        results = await multiAccountPublisher.publishSerial(tasks);
      }
      return results;
    } catch (error) {
      console.error('多账号发布失败:', error);
      throw error;
    }
  });

  // 更新飞书记录状态的辅助函数
  const updateFeishuRecordStatus = async (
    tableId: string,
    recordId: string,
    status: '已发布' | '发布失败',
    token: string
  ): Promise<boolean> => {
    try {
      // 先获取表格的第一个 table
      const tablesRes = await feishuClient.get(`/bitable/v1/apps/${tableId}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (tablesRes.data.code !== 0 || !tablesRes.data.data?.items?.length) {
        console.error('获取表格失败:', tablesRes.data.msg);
        return false;
      }

      const firstTableId = tablesRes.data.data.items[0].table_id;

      // 更新记录状态 - 单选字段需要使用文本格式
      console.log(`正在更新飞书记录: tableId=${tableId}, recordId=${recordId}, status=${status}`);
      const updateRes = await feishuClient.put(
        `/bitable/v1/apps/${tableId}/tables/${firstTableId}/records/${recordId}`,
        {
          fields: {
            '状态': status,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('飞书更新响应:', updateRes.data);
      
      if (updateRes.data.code === 0) {
        console.log(`✅ 飞书状态已更新: ${recordId} -> ${status}`);
        return true;
      } else {
        console.error('更新飞书状态失败:', updateRes.data.msg);
        return false;
      }
    } catch (error) {
      console.error('更新飞书状态异常:', error);
      return false;
    }
  };

  // 按窗口并行发布 - 每个窗口独立发布自己表格的笔记
  ipcMain.handle('publish:byWindows', async (_, windowTasks: { windowId: string; windowName: string; tasks: any[] }[]) => {
    try {
      const imageDir = configManager.getImageDir();
      if (imageDir) {
        multiAccountPublisher.setImageDir(imageDir);
      }
      multiAccountPublisher.setPublishInterval(configManager.getPublishInterval());

      // 获取飞书 Token 用于更新状态
      const config = configManager.getConfig();
      const mappings = config.windowTableMappings || [];
      let feishuToken = '';
      
      try {
        const tokenRes = await feishuClient.post('/auth/v3/tenant_access_token/internal', {
          app_id: config.feishu.appId,
          app_secret: config.feishu.appSecret,
        });
        if (tokenRes.data.code === 0) {
          feishuToken = tokenRes.data.tenant_access_token;
        }
      } catch (e) {
        console.error('获取飞书Token失败，将无法更新状态');
      }

      // 并行发布每个窗口的任务
      const publishPromises = windowTasks.map(async ({ windowId, windowName, tasks }) => {
        const tasksWithAccount = tasks.map(task => ({
          ...task,
          windowId,
          windowName,
        }));
        
        // 每个窗口内串行发布
        const results = await multiAccountPublisher.publishSerial(tasksWithAccount);
        
        // 发布完成后更新飞书状态
        if (feishuToken) {
          const mapping = mappings.find((m: any) => m.windowId === windowId);
          if (mapping) {
            for (const result of results) {
              const task = tasks.find((t: any) => t.id === result.taskId);
              if (task) {
                await updateFeishuRecordStatus(
                  mapping.feishuTableId,
                  result.taskId,
                  result.success ? '已发布' : '发布失败',
                  feishuToken
                );
              }
            }
          }
        }
        
        return { windowId, windowName, results };
      });

      const allResults = await Promise.all(publishPromises);
      return allResults;
    } catch (error) {
      console.error('按窗口发布失败:', error);
      throw error;
    }
  });

  ipcMain.handle('publish:stop', async () => {
    try {
      await multiAccountPublisher.closeAll();
      return { success: true };
    } catch (error) {
      console.error('停止发布失败:', error);
      throw error;
    }
  });

  // 按窗口加载笔记 - 根据窗口-表格映射从各个表格加载待发布笔记
  ipcMain.handle('feishu:loadByWindows', async () => {
    const config = configManager.getConfig();
    const mappings = config.windowTableMappings || [];
    
    if (mappings.length === 0) {
      throw new Error('请先在系统设置中配置窗口与表格的映射关系');
    }

    const appId = config.feishu.appId;
    const appSecret = config.feishu.appSecret;

    if (!appId || !appSecret) {
      throw new Error('请先配置飞书 App ID 和 App Secret');
    }

    // 获取 Token
    const tokenRes = await feishuClient.post('/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret,
    });

    if (tokenRes.data.code !== 0) {
      throw new Error(`获取Token失败: ${tokenRes.data.msg}`);
    }

    const token = tokenRes.data.tenant_access_token;

    // 为每个映射加载笔记
    const results: any[] = [];

    for (const mapping of mappings) {
      const windowState: any = {
        windowId: mapping.windowId,
        windowName: mapping.windowName,
        feishuTableId: mapping.feishuTableId,
        feishuTableName: mapping.feishuTableName,
        tasks: [],
        status: 'idle',
        progress: { total: 0, completed: 0, failed: 0 },
        errorMessage: undefined,
      };

      try {
        // 获取表格列表
        const tablesRes = await feishuClient.get(`/bitable/v1/apps/${mapping.feishuTableId}/tables`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (tablesRes.data.code !== 0) {
          windowState.status = 'error';
          windowState.errorMessage = `获取表格失败: ${tablesRes.data.msg}`;
          results.push(windowState);
          continue;
        }

        const tables = tablesRes.data.data?.items || [];
        if (tables.length === 0) {
          windowState.status = 'error';
          windowState.errorMessage = '表格为空';
          results.push(windowState);
          continue;
        }

        const firstTableId = tables[0].table_id;
        if (!windowState.feishuTableName) {
          windowState.feishuTableName = tables[0].name;
        }

        // 获取记录
        const recordsRes = await feishuClient.get(`/bitable/v1/apps/${mapping.feishuTableId}/tables/${firstTableId}/records`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (recordsRes.data.code !== 0) {
          windowState.status = 'error';
          windowState.errorMessage = `获取记录失败: ${recordsRes.data.msg}`;
          results.push(windowState);
          continue;
        }

        const records = recordsRes.data.data?.items || [];
        
        // 过滤待发布的记录并转换为任务
        const pendingTasks = records
          .filter((r: any) => {
            const status = r.fields?.['状态'];
            if (Array.isArray(status)) {
              return status.some((s: any) => s.text === '待发布' || s === '待发布');
            }
            return status === '待发布';
          })
          .map((r: any) => {
            const fields = r.fields || {};
            
            // 提取文本值的辅助函数
            const getText = (field: any): string => {
              if (!field) return '';
              if (typeof field === 'string') return field;
              if (Array.isArray(field)) {
                return field.map((item: any) => item.text || item).join('');
              }
              return field.text || '';
            };

            return {
              id: r.record_id,
              title: getText(fields['小红书标题']) || getText(fields['标题']) || '无标题',
              content: getText(fields['小红书文案']) || getText(fields['文案']) || '',
              coverImage: getText(fields['小红书封面']) || '',
              topic: getText(fields['主题']) || '',
              status: 'pending' as const,
              scheduledTime: fields['定时发布时间'] ? new Date(fields['定时发布时间']) : new Date(),
              createdTime: fields['生成时间'] ? new Date(fields['生成时间']) : new Date(),
              targetAccount: mapping.windowId,
              productId: getText(fields['商品ID']) || '',
              windowId: mapping.windowId,
              windowName: mapping.windowName,
            };
          });

        windowState.tasks = pendingTasks;
        windowState.progress.total = pendingTasks.length;
        windowState.status = pendingTasks.length > 0 ? 'idle' : 'completed';
        
      } catch (error: any) {
        windowState.status = 'error';
        windowState.errorMessage = error.message || '加载失败';
      }

      results.push(windowState);
    }

    return results;
  });

  // 测试飞书连接 - 使用 axios
  ipcMain.handle('feishu:test', async (_, appId: string, appSecret: string, tableId: string) => {
    const result: any = {
      success: false,
      tokenOk: false,
      tableOk: false,
      recordCount: 0,
      pendingCount: 0,
      fields: [],
      error: '',
    };

    console.log('测试飞书连接:', { appId, tableId });

    try {
      // 1. 获取 Token
      console.log('正在获取 Token...');
      const tokenRes = await feishuClient.post('/auth/v3/tenant_access_token/internal', {
        app_id: appId,
        app_secret: appSecret,
      });

      console.log('Token 响应:', tokenRes.data);

      if (tokenRes.data.code !== 0) {
        result.error = `获取Token失败: ${tokenRes.data.msg}`;
        return result;
      }

      result.tokenOk = true;
      const token = tokenRes.data.tenant_access_token;

      // 2. 获取表格列表
      const tablesRes = await feishuClient.get(`/bitable/v1/apps/${tableId}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (tablesRes.data.code !== 0) {
        result.error = `获取表格失败: ${tablesRes.data.msg}`;
        return result;
      }

      const tables = tablesRes.data.data?.items || [];
      if (tables.length === 0) {
        result.error = '表格为空，请检查 Base ID 是否正确';
        return result;
      }

      result.tableOk = true;
      const firstTableId = tables[0].table_id;
      result.tableName = tables[0].name;

      // 3. 获取字段列表
      const fieldsRes = await feishuClient.get(`/bitable/v1/apps/${tableId}/tables/${firstTableId}/fields`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fieldsRes.data.code === 0) {
        result.fields = (fieldsRes.data.data?.items || []).map((f: any) => f.field_name);
      }

      // 4. 获取记录
      const recordsRes = await feishuClient.get(`/bitable/v1/apps/${tableId}/tables/${firstTableId}/records`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (recordsRes.data.code !== 0) {
        result.error = `获取记录失败: ${recordsRes.data.msg}`;
        return result;
      }

      const records = recordsRes.data.data?.items || [];
      result.recordCount = records.length;

      // 5. 统计待发布数量
      result.pendingCount = records.filter((r: any) => {
        const status = r.fields?.['状态'];
        if (Array.isArray(status)) {
          return status.some((s: any) => s.text === '待发布' || s === '待发布');
        }
        return status === '待发布';
      }).length;

      result.success = true;
      return result;
    } catch (error: any) {
      console.error('飞书测试错误:', error);
      result.error = error.message || '网络请求失败，请检查网络连接';
      return result;
    }
  });
}

app.on('ready', () => {
  initializeServices();
  setupIPC();
  createWindow();
});

app.on('window-all-closed', async () => {
  // Cleanup
  try {
    await publishScheduler.stop();
    await publishingEngine.shutdown();
  } catch (error) {
    console.error('Failed to cleanup:', error);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
