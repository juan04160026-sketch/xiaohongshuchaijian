import React, { useState, useEffect } from 'react';
import type { Log } from '../../types';
import './PublishMonitor.css';

interface PublishStats {
  total: number;
  published: number;
  failed: number;
  pending: number;
  percentage: number;
}

function PublishMonitor(): JSX.Element {
  const [stats, setStats] = useState<PublishStats>({
    total: 0,
    published: 0,
    failed: 0,
    pending: 0,
    percentage: 0,
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadStats();
    loadLogs();
    const interval = setInterval(() => {
      loadStats();
      loadLogs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async (): Promise<void> => {
    try {
      const tasks = await (window as any).api.tasks.get();
      const total = tasks.length;
      const published = tasks.filter((t: any) => t.status === 'published').length;
      const failed = tasks.filter((t: any) => t.status === 'failed').length;
      const pending = tasks.filter((t: any) => t.status === 'pending').length;
      const percentage = total > 0 ? Math.round((published / total) * 100) : 0;

      setStats({ total, published, failed, pending, percentage });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadLogs = async (): Promise<void> => {
    try {
      const allLogs = await (window as any).api.logs.get();
      setLogs(allLogs.slice(-20)); // Show last 20 logs
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleStart = async (): Promise<void> => {
    try {
      await (window as any).api.tasks.start();
      setIsRunning(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to start:', error);
    }
  };

  const handlePause = async (): Promise<void> => {
    try {
      await (window as any).api.tasks.pause();
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const handleResume = async (): Promise<void> => {
    try {
      await (window as any).api.tasks.resume();
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  };

  return (
    <div className="publish-monitor">
      <div className="monitor-header">
        <h2>发布监控</h2>
        <div className="monitor-controls">
          {!isRunning ? (
            <button className="btn-primary" onClick={handleStart}>
              开始发布
            </button>
          ) : isPaused ? (
            <button className="btn-primary" onClick={handleResume}>
              继续发布
            </button>
          ) : (
            <button className="btn-danger" onClick={handlePause}>
              暂停发布
            </button>
          )}
        </div>
      </div>

      <div className="monitor-stats">
        <div className="stat-card">
          <div className="stat-label">总数</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已发布</div>
          <div className="stat-value" style={{ color: '#52c41a' }}>
            {stats.published}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">失败</div>
          <div className="stat-value" style={{ color: '#f5222d' }}>
            {stats.failed}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待发布</div>
          <div className="stat-value" style={{ color: '#faad14' }}>
            {stats.pending}
          </div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span>发布进度</span>
          <span className="progress-percentage">{stats.percentage}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${stats.percentage}%` }}></div>
        </div>
        <div className="progress-text">
          {stats.published} / {stats.total}
        </div>
      </div>

      <div className="logs-section">
        <h3>发布日志</h3>
        <div className="logs-list">
          {logs.length === 0 ? (
            <div className="empty-logs">暂无日志</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={`log-item log-${log.level}`}>
                <div className="log-time">{new Date(log.timestamp).toLocaleTimeString('zh-CN')}</div>
                <div className="log-message">{log.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PublishMonitor;
