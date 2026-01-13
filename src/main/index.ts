import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
import { ChromePublisher } from './services/ChromePublisher';
import { GeminiService, TEXT_MODELS, IMAGE_MODELS } from './services/GeminiService';
import { AIContentGenerator } from './services/AIContentGenerator';

// 创建飞书 API 客户端
const feishuClient = axios.create({
  baseURL: 'https://open.feishu.cn/open-apis',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 飞书图片下载目录
const feishuImageDir = path.join(os.homedir(), '.xhs-publisher', 'feishu-images');
if (!fs.existsSync(feishuImageDir)) {
  fs.mkdirSync(feishuImageDir, { recursive: true });
}

// 下载飞书附件图片
async function downloadFeishuImage(fileToken: string, recordId: string, index: number, token: string): Promise<string | null> {
  try {
    const filePath = path.join(feishuImageDir, `${recordId}_${index}.png`);
    
    // 总是重新下载图片，确保使用最新的飞书图片
    // 删除旧文件（如果存在）
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ 删除旧图片缓存: ${filePath}`);
    }
    
    const response = await axios.get(
      `https://open.feishu.cn/open-apis/drive/v1/medias/${fileToken}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer',
        timeout: 60000,
      }
    );
    
    fs.writeFileSync(filePath, response.data);
    console.log(`📥 下载飞书图片: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`下载飞书图片失败 (${fileToken}):`, error);
    return null;
  }
}

let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager;
let feishuReader: FeishuReader;
let taskScheduler: TaskScheduler;
let publishingEngine: PublishingEngine;
let loggerManager: LoggerManager;
let publishScheduler: PublishScheduler;
let bitBrowserManager: BitBrowserManager;
let multiAccountPublisher: MultiAccountPublisher;
let chromePublisher: ChromePublisher;
let geminiService: GeminiService;
let aiContentGenerator: AIContentGenerator;

// 发布控制标志
let isPublishingStopped = false;
let currentPublishAbortController: AbortController | null = null;

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
  
  // 谷歌浏览器发布器
  chromePublisher = new ChromePublisher();
  
  // Gemini AI 服务
  const aiConfig = configManager.getAIConfig();
  geminiService = new GeminiService(aiConfig.geminiApiKey || '');
  
  // AI 内容生成器
  aiContentGenerator = new AIContentGenerator();
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
  ipcMain.handle('logs:clear', () => loggerManager.clearLogs());

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
    token: string,
    dataTableId?: string  // 可选的数据表ID
  ): Promise<boolean> => {
    try {
      let targetTableId = dataTableId;
      
      // 如果没有指定数据表ID，则获取第一个表
      if (!targetTableId) {
        const tablesRes = await feishuClient.get(`/bitable/v1/apps/${tableId}/tables`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (tablesRes.data.code !== 0 || !tablesRes.data.data?.items?.length) {
          console.error('获取表格失败:', tablesRes.data.msg);
          return false;
        }

        targetTableId = tablesRes.data.data.items[0].table_id;
      }

      // 更新记录状态 - 单选字段需要使用文本格式
      console.log(`正在更新飞书记录: tableId=${tableId}, dataTableId=${targetTableId}, recordId=${recordId}, status=${status}`);
      const updateRes = await feishuClient.put(
        `/bitable/v1/apps/${tableId}/tables/${targetTableId}/records/${recordId}`,
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
    // 重置停止标志
    isPublishingStopped = false;
    currentPublishAbortController = new AbortController();
    multiAccountPublisher.setStopped(false);
    
    try {
      const config = configManager.getConfig();
      const browserType = config.browserType || 'bitbrowser';
      const imageDir = config.imageDir;
      const imageSource = config.imageSource || 'local';
      const mappings = config.windowTableMappings || [];
      
      const browserName = browserType === 'chrome' ? '谷歌浏览器' : '比特浏览器';
      const imageSourceName = imageSource === 'feishu' ? '飞书图片' : '本地合成图片';
      console.log(`📌 使用浏览器类型: ${browserName}`);
      console.log(`📌 图片来源: ${imageSourceName}`);
      
      // 记录开始发布日志
      loggerManager.logTaskStatus('system', 'started', { 
        message: `开始发布，使用${browserName}，图片来源: ${imageSourceName}`,
        browserType,
        imageSource,
        totalTasks: windowTasks.reduce((sum, w) => sum + w.tasks.length, 0)
      });

      // 获取飞书 Token 用于更新状态
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
        loggerManager.logError('system', new Error('获取飞书Token失败，将无法更新状态'));
      }

      // 根据浏览器类型选择发布方式
      if (browserType === 'chrome') {
        // 使用谷歌浏览器 - 所有任务串行发布
        if (imageDir) {
          chromePublisher.setImageDir(imageDir);
        }
        chromePublisher.setPublishInterval(config.publishInterval);
        chromePublisher.setImageSource(imageSource);
        if (config.chrome) {
          chromePublisher.setConfig(config.chrome);
        }

        const allTasks = windowTasks.flatMap(({ tasks }) => tasks);
        
        // 记录每个任务的开始
        for (const task of allTasks) {
          loggerManager.logTaskStatus(task.id, 'publishing', {
            message: `开始发布: ${task.title}`,
            title: task.title
          });
        }
        
        const results = await chromePublisher.publishSerial(allTasks);

        // 记录发布结果并更新飞书状态
        for (const result of results) {
          const task = allTasks.find(t => t.id === result.taskId);
          loggerManager.logPublishResult(result.taskId, {
            ...result,
            title: task?.title,
            message: result.success ? `发布成功: ${task?.title}` : `发布失败: ${result.errorMessage}`
          });
          
          if (feishuToken) {
            for (const { windowId, tasks } of windowTasks) {
              const foundTask = tasks.find((t: any) => t.id === result.taskId);
              if (foundTask) {
                const mapping = mappings.find((m: any) => m.windowId === windowId);
                if (mapping) {
                  await updateFeishuRecordStatus(
                    mapping.feishuTableId,
                    result.taskId,
                    result.success ? '已发布' : '发布失败',
                    feishuToken,
                    mapping.feishuDataTableId  // 传入数据表ID
                  );
                }
                break;
              }
            }
          }
        }

        return [{ windowId: 'chrome', windowName: '谷歌浏览器', results }];
      } else {
        // 使用比特浏览器 - 多窗口并行发布
        if (imageDir) {
          multiAccountPublisher.setImageDir(imageDir);
        }
        multiAccountPublisher.setPublishInterval(config.publishInterval);
        multiAccountPublisher.setImageSource(imageSource);

        // 串行发布每个窗口的任务（一个窗口发完再发下一个，避免同时打开多个窗口）
        const allResults = [];
        
        for (const { windowId, windowName, tasks } of windowTasks) {
          // 检查是否已停止
          if (isPublishingStopped) {
            console.log('🛑 发布已停止，跳过剩余窗口');
            break;
          }
          
          // 记录窗口开始发布
          loggerManager.logTaskStatus(windowId, 'window_started', {
            message: `窗口 ${windowName} 开始发布 ${tasks.length} 条笔记`,
            windowName,
            taskCount: tasks.length
          });
          
          const tasksWithAccount = tasks.map(task => ({
            ...task,
            windowId,
            windowName,
          }));
          
          // 记录每个任务开始
          for (const task of tasks) {
            loggerManager.logTaskStatus(task.id, 'publishing', {
              message: `[${windowName}] 开始发布: ${task.title}`,
              title: task.title,
              windowName
            });
          }
          
          // 获取当前窗口的映射配置
          const mapping = mappings.find((m: any) => m.windowId === windowId);
          
          // 每个窗口内串行发布，每条完成后立即更新飞书状态
          const results = await multiAccountPublisher.publishSerial(
            tasksWithAccount,
            // 每条任务完成后的回调
            async (result, task) => {
              // 记录发布结果
              loggerManager.logPublishResult(result.taskId, {
                ...result,
                title: task?.title,
                windowName,
                message: result.success 
                  ? `[${windowName}] 发布成功: ${task?.title}` 
                  : `[${windowName}] 发布失败: ${result.errorMessage}`
              });
              
              // 立即更新飞书状态
              if (feishuToken && mapping) {
                console.log(`📝 立即更新飞书状态: ${task.title} -> ${result.success ? '已发布' : '发布失败'}`);
                await updateFeishuRecordStatus(
                  mapping.feishuTableId,
                  result.taskId,
                  result.success ? '已发布' : '发布失败',
                  feishuToken,
                  mapping.feishuDataTableId
                );
              }
            }
          );
          
          allResults.push({ windowId, windowName, results });
        }
        
        // 记录发布完成
        const totalSuccess = allResults.reduce((sum, r) => sum + r.results.filter((x: any) => x.success).length, 0);
        const totalFailed = allResults.reduce((sum, r) => sum + r.results.filter((x: any) => !x.success).length, 0);
        loggerManager.logTaskStatus('system', 'completed', {
          message: `发布完成，成功 ${totalSuccess} 条，失败 ${totalFailed} 条`,
          totalSuccess,
          totalFailed
        });
        
        return allResults;
      }
    } catch (error) {
      console.error('按窗口发布失败:', error);
      loggerManager.logError('system', error as Error);
      throw error;
    }
  });

  ipcMain.handle('publish:stop', async () => {
    try {
      // 设置停止标志
      isPublishingStopped = true;
      
      // 设置发布器的停止标志
      multiAccountPublisher.setStopped(true);
      
      // 触发 abort 信号
      if (currentPublishAbortController) {
        currentPublishAbortController.abort();
        currentPublishAbortController = null;
      }
      
      console.log('🛑 发布已停止');
      
      const browserType = configManager.getBrowserType();
      if (browserType === 'chrome') {
        await chromePublisher.close();
      } else {
        await multiAccountPublisher.closeAll();
      }
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

        // 使用配置的数据表ID，如果没有配置则使用第一个表格
        let targetTableId = mapping.feishuDataTableId;
        let targetTableName = '';
        
        if (targetTableId) {
          // 查找指定的数据表
          const targetTable = tables.find((t: any) => t.table_id === targetTableId);
          if (targetTable) {
            targetTableName = targetTable.name;
          } else {
            windowState.status = 'error';
            windowState.errorMessage = `未找到数据表 ${targetTableId}`;
            results.push(windowState);
            continue;
          }
        } else {
          targetTableId = tables[0].table_id;
          targetTableName = tables[0].name;
        }
        
        if (!windowState.feishuTableName) {
          windowState.feishuTableName = targetTableName;
        }

        console.log(`📋 窗口 ${mapping.windowName}: 读取表格 ${targetTableName} (${targetTableId})`);

        // 获取记录
        const recordsRes = await feishuClient.get(`/bitable/v1/apps/${mapping.feishuTableId}/tables/${targetTableId}/records`, {
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
        const pendingRecords = records.filter((r: any) => {
          const status = r.fields?.['状态'];
          if (Array.isArray(status)) {
            return status.some((s: any) => s.text === '待发布' || s === '待发布');
          }
          return status === '待发布';
        });

        // 提取文本值的辅助函数
        const getText = (field: any): string => {
          if (!field) return '';
          if (typeof field === 'string') return field;
          if (Array.isArray(field)) {
            return field.map((item: any) => item.text || item).join('');
          }
          return field.text || '';
        };

        // 处理每条记录，下载飞书图片
        const pendingTasks = [];
        for (const r of pendingRecords) {
          const fields = r.fields || {};
          
          // 获取飞书图片附件
          const coverField = fields['小红书封面'];
          const feishuImages: string[] = [];
          
          if (Array.isArray(coverField)) {
            for (let i = 0; i < coverField.length; i++) {
              const attachment = coverField[i];
              if (attachment && attachment.file_token) {
                const imagePath = await downloadFeishuImage(attachment.file_token, r.record_id, i, token);
                if (imagePath) {
                  feishuImages.push(imagePath);
                }
              }
            }
          }

          pendingTasks.push({
            id: r.record_id,
            title: getText(fields['小红书标题']) || getText(fields['标题']) || '无标题',
            content: getText(fields['小红书文案']) || getText(fields['文案']) || '',
            coverImage: feishuImages.length > 0 ? feishuImages[0] : '',
            images: feishuImages,  // 飞书下载的图片路径
            feishuImages,  // 专门存储飞书图片路径
            topic: getText(fields['主题']) || '',
            tags: getText(fields['标签']) || '',  // 读取标签字段
            status: 'pending' as const,
            scheduledTime: fields['定时发布时间'] ? new Date(fields['定时发布时间']) : new Date(),
            createdTime: fields['生成时间'] ? new Date(fields['生成时间']) : new Date(),
            targetAccount: mapping.windowId,
            productId: getText(fields['商品ID']) || '',
            windowId: mapping.windowId,
            windowName: mapping.windowName,
          });
        }

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
  ipcMain.handle('feishu:test', async (_, appId: string, appSecret: string, tableId: string, dataTableId?: string) => {
    const result: any = {
      success: false,
      tokenOk: false,
      tableOk: false,
      recordCount: 0,
      pendingCount: 0,
      fields: [],
      error: '',
    };

    console.log('测试飞书连接:', { appId, tableId, dataTableId });

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
      
      // 如果指定了数据表ID，使用指定的；否则使用第一个
      let targetTableId = dataTableId;
      let targetTableName = '';
      
      if (dataTableId) {
        // 查找指定的数据表
        const targetTable = tables.find((t: any) => t.table_id === dataTableId);
        if (targetTable) {
          targetTableName = targetTable.name;
        } else {
          result.error = `未找到数据表 ${dataTableId}，可用的表: ${tables.map((t: any) => `${t.name}(${t.table_id})`).join(', ')}`;
          return result;
        }
      } else {
        targetTableId = tables[0].table_id;
        targetTableName = tables[0].name;
      }
      
      result.tableName = targetTableName;
      result.dataTableId = targetTableId;

      // 3. 获取字段列表
      const fieldsRes = await feishuClient.get(`/bitable/v1/apps/${tableId}/tables/${targetTableId}/fields`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fieldsRes.data.code === 0) {
        result.fields = (fieldsRes.data.data?.items || []).map((f: any) => f.field_name);
      }

      // 4. 获取记录
      const recordsRes = await feishuClient.get(`/bitable/v1/apps/${tableId}/tables/${targetTableId}/records`, {
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

  // 文件保存 IPC handler
  ipcMain.handle('file:save', async (_, dir: string, fileName: string, data: number[]) => {
    try {
      const filePath = path.join(dir, fileName);
      const buffer = Buffer.from(data);
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ 文件已保存: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('保存文件失败:', error);
      throw error;
    }
  });

  // AI 相关 IPC handlers
  ipcMain.handle('ai:getModels', () => {
    return {
      textModels: TEXT_MODELS,
      imageModels: IMAGE_MODELS,
    };
  });

  ipcMain.handle('ai:testText', async (_, apiKey: string, modelId: string) => {
    try {
      const service = new GeminiService(apiKey);
      return await service.testTextConnection(modelId);
    } catch (error: any) {
      return { success: false, error: error.message || '测试失败' };
    }
  });

  ipcMain.handle('ai:testImage', async (_, apiKey: string, modelId: string) => {
    try {
      const service = new GeminiService(apiKey);
      return await service.testImageConnection(modelId);
    } catch (error: any) {
      return { success: false, error: error.message || '测试失败' };
    }
  });

  ipcMain.handle('ai:generateText', async (_, title: string, modelId?: string) => {
    try {
      const aiConfig = configManager.getAIConfig();
      if (!aiConfig.geminiApiKey) {
        return { success: false, error: '请先配置 Gemini API Key' };
      }
      geminiService.setApiKey(aiConfig.geminiApiKey);
      const model = modelId || aiConfig.textModel || 'gemini-3-flash-preview';
      return await geminiService.generateContent(title, model);
    } catch (error: any) {
      return { success: false, error: error.message || '生成失败' };
    }
  });

  ipcMain.handle('ai:generateImage', async (_, prompt: string, modelId?: string) => {
    try {
      const aiConfig = configManager.getAIConfig();
      if (!aiConfig.geminiApiKey) {
        return { success: false, error: '请先配置 Gemini API Key' };
      }
      geminiService.setApiKey(aiConfig.geminiApiKey);
      const model = modelId || aiConfig.imageModel || 'gemini-3-pro-image-preview';
      const imageDir = configManager.getImageDir();
      return await geminiService.generateImage(prompt, model, imageDir);
    } catch (error: any) {
      return { success: false, error: error.message || '生成失败' };
    }
  });

  // AI 内容生成 IPC handlers
  ipcMain.handle('ai:generateForRecord', async (_, recordId: string, topic: string, dataTableId?: string) => {
    try {
      const aiConfig = configManager.getAIConfig();
      const feishuConfig = configManager.getConfig().feishu;
      
      if (!aiConfig.geminiApiKey) {
        return { success: false, error: '请先配置 Gemini API Key' };
      }
      
      if (!feishuConfig.appId || !feishuConfig.appSecret || !feishuConfig.tableId) {
        return { success: false, error: '请先配置飞书连接' };
      }
      
      return await aiContentGenerator.generateForRecord(
        recordId,
        topic,
        aiConfig,
        feishuConfig,
        dataTableId
      );
    } catch (error: any) {
      return { success: false, error: error.message || '生成失败' };
    }
  });

  ipcMain.handle('ai:generateBatch', async (_, dataTableId?: string) => {
    try {
      const aiConfig = configManager.getAIConfig();
      const feishuConfig = configManager.getConfig().feishu;
      
      if (!aiConfig.geminiApiKey) {
        return { success: false, error: '请先配置 Gemini API Key' };
      }
      
      if (!feishuConfig.appId || !feishuConfig.appSecret || !feishuConfig.tableId) {
        return { success: false, error: '请先配置飞书连接' };
      }
      
      return await aiContentGenerator.generateBatch(aiConfig, feishuConfig, dataTableId);
    } catch (error: any) {
      return { success: false, error: error.message || '生成失败' };
    }
  });

  // 清空已生成的内容
  ipcMain.handle('ai:clearGenerated', async (_, dataTableId?: string) => {
    try {
      const feishuConfig = configManager.getConfig().feishu;
      
      if (!feishuConfig.appId || !feishuConfig.appSecret || !feishuConfig.tableId) {
        return { success: false, error: '请先配置飞书连接' };
      }
      
      const feishuReader = new FeishuReader();
      await feishuReader.connect(feishuConfig);
      
      return await feishuReader.clearGeneratedContent(feishuConfig.tableId, dataTableId);
    } catch (error: any) {
      return { success: false, count: 0, error: error.message || '清空失败' };
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
