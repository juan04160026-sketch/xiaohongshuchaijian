import { LoggerManager } from './LoggerManager';

export class ErrorHandler {
  private loggerManager: LoggerManager;
  private maxRetries: number = 3;
  private retryDelays: number[] = [1000, 2000, 5000]; // milliseconds

  constructor(loggerManager: LoggerManager) {
    this.loggerManager = loggerManager;
  }

  async handleFeishuError(error: Error, taskId: string = 'system'): Promise<void> {
    const message = error.message;

    if (message.includes('connection') || message.includes('network')) {
      this.loggerManager.logError(taskId, new Error('飞书连接失败，请检查网络'));
    } else if (message.includes('auth') || message.includes('token')) {
      this.loggerManager.logError(taskId, new Error('飞书认证失败，请检查 API 密钥'));
    } else if (message.includes('table') || message.includes('not found')) {
      this.loggerManager.logError(taskId, new Error('飞书表格不存在，请检查表格 ID'));
    } else {
      this.loggerManager.logError(taskId, error);
    }
  }

  async handlePublishError(error: Error, taskId: string): Promise<void> {
    const message = error.message;

    if (message.includes('auth') || message.includes('credential')) {
      this.loggerManager.logError(taskId, new Error('小红书账号凭证过期，请重新授权'));
    } else if (message.includes('policy') || message.includes('violation')) {
      this.loggerManager.logError(taskId, new Error('内容违规，无法发布'));
    } else if (message.includes('network') || message.includes('timeout')) {
      this.loggerManager.logError(taskId, new Error('网络错误，将自动重试'));
    } else if (message.includes('image') || message.includes('download')) {
      this.loggerManager.logError(taskId, new Error('图片下载失败'));
    } else {
      this.loggerManager.logError(taskId, error);
    }
  }

  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    taskId: string = 'system',
    customMaxRetries?: number
  ): Promise<T> {
    const maxRetries = customMaxRetries || this.maxRetries;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (i < maxRetries - 1) {
          const delay = this.retryDelays[Math.min(i, this.retryDelays.length - 1)];
          this.loggerManager.logTaskStatus(taskId, 'retrying', {
            attempt: i + 1,
            maxRetries,
            nextRetryIn: delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  async handleSystemError(error: Error): Promise<void> {
    const message = error.message;

    if (message.includes('memory') || message.includes('heap')) {
      this.loggerManager.logError('system', new Error('内存不足，请重启应用'));
    } else if (message.includes('storage') || message.includes('disk')) {
      this.loggerManager.logError('system', new Error('存储空间不足，请清理旧日志'));
    } else if (message.includes('config') || message.includes('corrupted')) {
      this.loggerManager.logError('system', new Error('配置文件损坏，请重新配置'));
    } else {
      this.loggerManager.logError('system', error);
    }
  }

  isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const retryableKeywords = ['network', 'timeout', 'connection', 'econnrefused', 'enotfound'];
    return retryableKeywords.some((keyword) => message.includes(keyword));
  }

  isFatalError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const fatalKeywords = ['auth', 'credential', 'policy', 'violation', 'corrupted'];
    return fatalKeywords.some((keyword) => message.includes(keyword));
  }
}
