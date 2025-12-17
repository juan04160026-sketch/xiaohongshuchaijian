import axios from 'axios';
import { PublishTask, XhsAccount, PublishResult } from '../../types';
import { XhsApiClient } from './XhsApiClient';

type PublishStartCallback = (task: PublishTask) => void;
type PublishSuccessCallback = (result: PublishResult) => void;
type PublishFailedCallback = (error: any) => void;

export class PublishingEngine {
  private publishInterval: number = 30; // seconds
  private isPaused: boolean = false;
  private lastPublishTime: number = 0;
  private publishStartCallbacks: PublishStartCallback[] = [];
  private publishSuccessCallbacks: PublishSuccessCallback[] = [];
  private publishFailedCallbacks: PublishFailedCallback[] = [];
  private apiClients: Map<string, XhsApiClient> = new Map();

  async publish(task: PublishTask, account: XhsAccount): Promise<PublishResult> {
    // Wait for interval
    await this.waitForInterval();

    this.publishStartCallbacks.forEach((callback) => callback(task));

    try {
      // Get or create API client for this account
      let client = this.apiClients.get(account.id);
      if (!client) {
        client = new XhsApiClient();
        const loginSuccess = await client.login(account);
        if (!loginSuccess) {
          throw new Error('Failed to login to Xiaohongshu');
        }
        this.apiClients.set(account.id, client);
      }

      // Check if still logged in
      const isLoggedIn = await client.checkLogin();
      if (!isLoggedIn) {
        const loginSuccess = await client.login(account);
        if (!loginSuccess) {
          throw new Error('Failed to login to Xiaohongshu');
        }
      }

      // Publish using API
      const result = await client.publish(task);

      this.publishSuccessCallbacks.forEach((callback) => callback(result));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const publishResult: PublishResult = {
        taskId: task.id,
        success: false,
        publishedTime: new Date(),
        duration: 0,
        errorMessage,
      };

      this.publishFailedCallbacks.forEach((callback) => callback(error));
      throw error;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  setInterval(seconds: number): void {
    this.publishInterval = seconds;
  }

  getInterval(): number {
    return this.publishInterval;
  }

  async retry(task: PublishTask, account: XhsAccount, maxRetries: number = 3): Promise<PublishResult> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.publish(task, account);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  on(event: 'publish-start' | 'publish-success' | 'publish-failed', callback: any): void {
    if (event === 'publish-start') {
      this.publishStartCallbacks.push(callback);
    } else if (event === 'publish-success') {
      this.publishSuccessCallbacks.push(callback);
    } else if (event === 'publish-failed') {
      this.publishFailedCallbacks.push(callback);
    }
  }

  private async waitForInterval(): Promise<void> {
    if (this.isPaused) {
      return;
    }

    const now = Date.now();
    const timeSinceLastPublish = now - this.lastPublishTime;
    const waitTime = Math.max(0, this.publishInterval * 1000 - timeSinceLastPublish);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastPublishTime = Date.now();
  }

  async shutdown(): Promise<void> {
    // Logout all clients
    for (const client of this.apiClients.values()) {
      await client.logout();
    }
    this.apiClients.clear();
  }
}
