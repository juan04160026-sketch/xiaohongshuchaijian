import { Log, LogFilter } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

export class LoggerManager {
  private logs: Log[] = [];
  private logFilePath: string;

  constructor() {
    this.logFilePath = path.join(process.env.APPDATA || '.', 'xiaohongshu-auto-publish', 'logs.json');
    this.ensureLogDirectory();
    this.loadLogs();
  }

  logTaskStatus(taskId: string, status: string, metadata?: any): void {
    const log: Log = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      taskId,
      level: 'info',
      message: `Task status changed to ${status}`,
      metadata: { status, ...metadata },
    };

    this.logs.push(log);
    this.saveLogs();
  }

  logPublishResult(taskId: string, result: any): void {
    const log: Log = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      taskId,
      level: result.success ? 'info' : 'warn',
      message: result.success ? 'Publish successful' : 'Publish failed',
      metadata: result,
    };

    this.logs.push(log);
    this.saveLogs();
  }

  logError(taskId: string, error: Error): void {
    const log: Log = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      taskId,
      level: 'error',
      message: error.message,
      metadata: {
        stack: error.stack,
      },
    };

    this.logs.push(log);
    this.saveLogs();
  }

  getLogs(filter?: LogFilter): Log[] {
    if (!filter) {
      return this.logs;
    }

    return this.logs.filter((log) => {
      if (filter.taskId && log.taskId !== filter.taskId) {
        return false;
      }
      if (filter.level && log.level !== filter.level) {
        return false;
      }
      if (filter.startTime && log.timestamp < filter.startTime) {
        return false;
      }
      if (filter.endTime && log.timestamp > filter.endTime) {
        return false;
      }
      return true;
    });
  }

  searchLogs(query: string): Log[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter((log) => log.message.toLowerCase().includes(lowerQuery) || log.taskId.toLowerCase().includes(lowerQuery));
  }

  getLogsByTask(taskId: string): Log[] {
    return this.logs.filter((log) => log.taskId === taskId);
  }

  async exportLogs(format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'TaskID', 'Level', 'Message'];
      const rows = this.logs.map((log) => [log.id, log.timestamp.toISOString(), log.taskId, log.level, log.message]);
      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      return csv;
    }
    throw new Error('Unsupported format');
  }

  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, 'utf-8');
        this.logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.logs = [];
    }
  }
}
