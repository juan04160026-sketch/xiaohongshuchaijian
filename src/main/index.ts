import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { ConfigManager } from './services/ConfigManager';
import { FeishuReader } from './services/FeishuReader';
import { TaskScheduler } from './services/TaskScheduler';
import { PublishingEngine } from './services/PublishingEngine';
import { LoggerManager } from './services/LoggerManager';
import { PublishScheduler } from './services/PublishScheduler';
import type { Config } from '../types';

let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager;
let feishuReader: FeishuReader;
let taskScheduler: TaskScheduler;
let publishingEngine: PublishingEngine;
let loggerManager: LoggerManager;
let publishScheduler: PublishScheduler;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const url = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../renderer/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

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
