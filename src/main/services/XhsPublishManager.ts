import { PlaywrightPublisher } from './PlaywrightPublisher';
import { PublishTask, XhsAccount, PublishResult } from '../../types';
import { LoggerManager } from './LoggerManager';

export class XhsPublishManager {
  private loggerManager: LoggerManager;
  private publisher: PlaywrightPublisher | null = null;
  private isPublishing: boolean = false;
  private publishQueue: Array<{
    task: PublishTask;
    account: XhsAccount;
    resolve: (result: PublishResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private imageDir: string = '';

  constructor(loggerManager: LoggerManager) {
    this.loggerManager = loggerManager;
  }

  setImageDir(dir: string): void {
    this.imageDir = dir;
    if (this.publisher) {
      this.publisher.setImageDir(dir);
    }
  }

  async publish(task: PublishTask, account: XhsAccount): Promise<PublishResult> {
    return new Promise((resolve, reject) => {
      this.publishQueue.push({ task, account, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isPublishing || this.publishQueue.length === 0) {
      return;
    }

    this.isPublishing = true;

    try {
      // 初始化 Playwright 发布器
      if (!this.publisher) {
        this.publisher = new PlaywrightPublisher();
        if (this.imageDir) {
          this.publisher.setImageDir(this.imageDir);
        }
        await this.publisher.launch();
        await this.publisher.openPublishPage();
      }

      while (this.publishQueue.length > 0) {
        const item = this.publishQueue.shift();
        if (!item) break;

        try {
          this.loggerManager.logTaskStatus(item.task.id, 'publishing');
          const result = await this.publisher.publishContent(item.task);
          this.loggerManager.logPublishResult(item.task.id, result);
          item.resolve(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.loggerManager.logError(item.task.id, error instanceof Error ? error : new Error(errorMessage));
          item.reject(error instanceof Error ? error : new Error(errorMessage));
        }

        // 发布间隔
        if (this.publishQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
    } catch (error) {
      console.error('发布队列处理失败:', error);
      // 清空队列，拒绝所有等待的任务
      while (this.publishQueue.length > 0) {
        const item = this.publishQueue.shift();
        if (item) {
          item.reject(error instanceof Error ? error : new Error('Publisher initialization failed'));
        }
      }
    } finally {
      this.isPublishing = false;
    }
  }

  async closeAll(): Promise<void> {
    if (this.publisher) {
      await this.publisher.close();
      this.publisher = null;
    }
    this.publishQueue = [];
    this.isPublishing = false;
  }

  getQueueSize(): number {
    return this.publishQueue.length;
  }

  isActive(): boolean {
    return this.isPublishing;
  }
}
