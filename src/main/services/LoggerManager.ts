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

  // 添加通用日志方法
  log(level: 'info' | 'warn' | 'error', taskId: string, message: string, metadata?: any): void {
    const log: Log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      taskId,
      level,
      message,
      metadata,
    };

    this.logs.unshift(log);  // 新日志放在前面
    
    // 限制日志数量，最多保留1000条
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    
    this.saveLogs();
  }

  // 记录信息日志
  info(taskId: string, message: string, metadata?: any): void {
    this.log('info', taskId, message, metadata);
  }

  // 记录警告日志
  warn(taskId: string, message: string, metadata?: any): void {
    this.log('warn', taskId, message, metadata);
  }

  // 记录错误日志
  error(taskId: string, message: string, metadata?: any): void {
    this.log('error', taskId, message, metadata);
  }

  logTaskStatus(taskId: string, status: string, metadata?: any): void {
    const message = metadata?.message || `任务状态变更: ${status}`;
    const level = status === 'error' || status === 'failed' ? 'error' : 'info';
    this.log(level, taskId, message, { status, ...metadata });
  }

  logPublishResult(taskId: string, result: any): void {
    const message = result.message || (result.success ? '发布成功' : `发布失败: ${result.errorMessage}`);
    const level = result.success ? 'info' : 'error';
    this.log(level, taskId, message, result);
  }

  logError(taskId: string, error: Error): void {
    this.log('error', taskId, error.message, {
      stack: error.stack,
    });
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

  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
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
