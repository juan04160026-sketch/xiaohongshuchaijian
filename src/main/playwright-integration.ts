import { ipcMain } from 'electron';
import { PlaywrightPublisher } from './services/PlaywrightPublisher';
import { PublishTask } from '../types';

const publisher = new PlaywrightPublisher();

/**
 * 初始化 Playwright IPC 处理
 */
export function initPlaywrightIPC(): void {
  // 发布单个内容
  ipcMain.handle('playwright:publish', async (_event, task: PublishTask) => {
    try {
      await publisher.launch();
      await publisher.openPublishPage();
      await publisher.publishContent(task);
      await publisher.close();
      return { success: true };
    } catch (error) {
      console.error('Playwright 发布失败:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 批量发布
  ipcMain.handle('playwright:publish-batch', async (_event, tasks: PublishTask[], interval: number = 30000) => {
    try {
      await publisher.publishBatch(tasks, interval);
      return { success: true };
    } catch (error) {
      console.error('Playwright 批量发布失败:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 设置图片目录
  ipcMain.handle('playwright:set-image-dir', async (_event, dir: string) => {
    try {
      publisher.setImageDir(dir);
      return { success: true };
    } catch (error) {
      console.error('设置图片目录失败:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 停止发布
  ipcMain.handle('playwright:stop', async () => {
    try {
      await publisher.close();
      return { success: true };
    } catch (error) {
      console.error('Playwright 停止失败:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
