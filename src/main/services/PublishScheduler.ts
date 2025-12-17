import { ConfigManager } from './ConfigManager';
import { FeishuReader } from './FeishuReader';
import { TaskScheduler } from './TaskScheduler';
import { PublishingEngine } from './PublishingEngine';
import { LoggerManager } from './LoggerManager';
import { XhsPublishManager } from './XhsPublishManager';
import { PublishTask } from '../../types';

export class PublishScheduler {
  private configManager: ConfigManager;
  private feishuReader: FeishuReader;
  private taskScheduler: TaskScheduler;
  private publishingEngine: PublishingEngine;
  private loggerManager: LoggerManager;
  private xhsPublishManager: XhsPublishManager;
  private isRunning: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    configManager: ConfigManager,
    feishuReader: FeishuReader,
    taskScheduler: TaskScheduler,
    publishingEngine: PublishingEngine,
    loggerManager: LoggerManager
  ) {
    this.configManager = configManager;
    this.feishuReader = feishuReader;
    this.taskScheduler = taskScheduler;
    this.publishingEngine = publishingEngine;
    this.loggerManager = loggerManager;
    this.xhsPublishManager = new XhsPublishManager(loggerManager);

    this.setupEventHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Initialize services
    const feishuConfig = this.configManager.getFeishuConfig();
    if (!feishuConfig.appId || !feishuConfig.appSecret || !feishuConfig.tableId) {
      throw new Error('Feishu config not set');
    }

    try {
      await this.feishuReader.connect(feishuConfig);
      const isConnected = await this.feishuReader.validateConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Feishu');
      }
    } catch (error) {
      this.loggerManager.logError('system', error as Error);
      throw error;
    }

    // Set publish interval
    const interval = this.configManager.getPublishInterval();
    this.publishingEngine.setInterval(interval);

    // Start task scheduler
    this.taskScheduler.start();

    // Sync tasks from Feishu every 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncTasksFromFeishu();
    }, 5 * 60 * 1000);

    // Initial sync
    await this.syncTasksFromFeishu();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.taskScheduler.stop();

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Close all automation instances
    await this.xhsPublishManager.closeAll();
  }

  pause(): void {
    this.taskScheduler.pause();
    this.publishingEngine.pause();
  }

  resume(): void {
    this.taskScheduler.resume();
    this.publishingEngine.resume();
  }

  private setupEventHandlers(): void {
    // Task ready to publish
    this.taskScheduler.on('task-ready', async (task: PublishTask) => {
      await this.handleTaskReady(task);
    });

    // Task expired
    this.taskScheduler.on('task-expired', (task: PublishTask) => {
      this.handleTaskExpired(task);
    });

    // Publish success
    this.publishingEngine.on('publish-success', (result: any) => {
      this.loggerManager.logPublishResult(result.taskId, result);
    });

    // Publish failed
    this.publishingEngine.on('publish-failed', (error: any) => {
      this.loggerManager.logError('publish', error);
    });
  }

  private async handleTaskReady(task: PublishTask): Promise<void> {
    try {
      this.loggerManager.logTaskStatus(task.id, 'processing');

      const account = this.configManager.getXhsAccount(task.targetAccount);
      if (!account) {
        throw new Error(`Account ${task.targetAccount} not found`);
      }

      if (!account.isValid) {
        throw new Error(`Account ${task.targetAccount} is not valid`);
      }

      // Use XhsPublishManager for actual publishing
      const result = await this.xhsPublishManager.publish(task, account);

      // Update task status
      task.status = 'published';
      task.publishedTime = result.publishedTime;
      task.publishedUrl = result.contentUrl;

      this.loggerManager.logTaskStatus(task.id, 'published', { url: result.contentUrl });
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.loggerManager.logTaskStatus(task.id, 'failed', { error: task.errorMessage });
    }
  }

  private handleTaskExpired(task: PublishTask): void {
    const behavior = this.configManager.getExpiredTaskBehavior();

    if (behavior === 'publish') {
      // Publish immediately
      this.handleTaskReady(task);
    } else {
      // Mark as expired
      task.status = 'expired';
      this.loggerManager.logTaskStatus(task.id, 'expired');
    }
  }

  private async syncTasksFromFeishu(): Promise<void> {
    try {
      const records = await this.feishuReader.fetchRecords();

      // Add new tasks
      for (const record of records) {
        const existingTask = this.taskScheduler.getTasks().find((t) => t.id === record.id);
        if (!existingTask) {
          this.taskScheduler.addTask(record);
          this.loggerManager.logTaskStatus(record.id, 'pending', { source: 'feishu' });
        }
      }
    } catch (error) {
      this.loggerManager.logError('sync', error as Error);
    }
  }
}
