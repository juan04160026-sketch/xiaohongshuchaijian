import { LoggerManager } from './LoggerManager';
import * as fs from 'fs';
import * as path from 'path';

export class PerformanceOptimizer {
  private loggerManager: LoggerManager;
  private maxLogSize: number = 100 * 1024 * 1024; // 100MB
  private maxLogAge: number = 30 * 24 * 60 * 60 * 1000; // 30 days
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(loggerManager: LoggerManager) {
    this.loggerManager = loggerManager;
  }

  startCleanupSchedule(): void {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);

    // Initial cleanup
    this.cleanupOldLogs();
  }

  stopCleanupSchedule(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanupOldLogs(): void {
    try {
      const logDir = path.join(process.env.APPDATA || '.', 'xiaohongshu-auto-publish');
      const logFile = path.join(logDir, 'logs.json');

      if (!fs.existsSync(logFile)) {
        return;
      }

      const stats = fs.statSync(logFile);
      const fileSize = stats.size;
      const fileAge = Date.now() - stats.mtimeMs;

      // Check if cleanup is needed
      if (fileSize > this.maxLogSize || fileAge > this.maxLogAge) {
        this.loggerManager.logTaskStatus('system', 'cleanup', {
          fileSize,
          fileAge,
          reason: fileSize > this.maxLogSize ? 'size' : 'age',
        });

        // Archive old logs
        const archiveFile = path.join(logDir, `logs-${Date.now()}.json.bak`);
        fs.copyFileSync(logFile, archiveFile);

        // Clear logs
        fs.writeFileSync(logFile, JSON.stringify([], null, 2));

        this.loggerManager.logTaskStatus('system', 'cleanup-complete', {
          archivedFile: archiveFile,
        });
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  }

  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  logMemoryUsage(): void {
    const usage = this.getMemoryUsage();
    this.loggerManager.logTaskStatus('system', 'memory-usage', {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(usage.external / 1024 / 1024) + 'MB',
    });
  }

  checkMemoryThreshold(threshold: number = 0.8): boolean {
    const usage = this.getMemoryUsage();
    const heapUsageRatio = usage.heapUsed / usage.heapTotal;
    return heapUsageRatio > threshold;
  }

  optimizeTaskQueue(tasks: any[]): any[] {
    // Remove duplicate tasks
    const uniqueTasks = Array.from(new Map(tasks.map((t) => [t.id, t])).values());

    // Sort by priority and scheduled time
    return uniqueTasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });
  }
}
