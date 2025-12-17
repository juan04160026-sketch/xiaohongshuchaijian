import { XhsApiClient } from './XhsApiClient';
import { PublishTask, XhsAccount, PublishResult } from '../../types';
import { LoggerManager } from './LoggerManager';

export class XhsPublishManager {
  private apiClients: Map<string, XhsApiClient> = new Map();
  private loggerManager: LoggerManager;
  private maxConcurrent: number = 3; // Max concurrent API requests
  private activePublishes: number = 0;
  private publishQueue: Array<{ task: PublishTask; account: XhsAccount; resolve: (result: PublishResult) => void; reject: (error: Error) => void }> = [];

  constructor(loggerManager: LoggerManager) {
    this.loggerManager = loggerManager;
  }

  async publish(task: PublishTask, account: XhsAccount): Promise<PublishResult> {
    return new Promise((resolve, reject) => {
      this.publishQueue.push({ task, account, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    while (this.publishQueue.length > 0 && this.activePublishes < this.maxConcurrent) {
      const item = this.publishQueue.shift();
      if (!item) break;

      this.activePublishes++;

      try {
        const result = await this.publishInternal(item.task, item.account);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        this.activePublishes--;
        this.processQueue();
      }
    }
  }

  private async publishInternal(task: PublishTask, account: XhsAccount): Promise<PublishResult> {
    let client = this.apiClients.get(account.id);

    try {
      // Create new API client if needed
      if (!client) {
        client = new XhsApiClient();
        this.loggerManager.logTaskStatus(task.id, 'login', { accountId: account.id });
        const loginSuccess = await client.login(account);
        if (!loginSuccess) {
          throw new Error('Failed to login to Xiaohongshu');
        }
        this.apiClients.set(account.id, client);
      }

      // Check if still logged in
      const isLoggedIn = await client.checkLogin();
      if (!isLoggedIn) {
        this.loggerManager.logTaskStatus(task.id, 'login', { accountId: account.id });
        const loginSuccess = await client.login(account);
        if (!loginSuccess) {
          throw new Error('Failed to login to Xiaohongshu');
        }
      }

      // Publish
      this.loggerManager.logTaskStatus(task.id, 'publishing', { accountId: account.id });
      const result = await client.publish(task);

      this.loggerManager.logPublishResult(task.id, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.loggerManager.logError(task.id, error instanceof Error ? error : new Error(errorMessage));

      // Remove failed client
      if (client) {
        try {
          await client.logout();
        } catch (e) {
          console.error('Failed to logout:', e);
        }
        this.apiClients.delete(account.id);
      }

      throw error;
    }
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.apiClients.values()).map((client) => client.logout());
    await Promise.all(promises);
    this.apiClients.clear();
  }

  getQueueSize(): number {
    return this.publishQueue.length;
  }

  getActivePublishes(): number {
    return this.activePublishes;
  }
}
