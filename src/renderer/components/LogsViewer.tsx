import { useState, useEffect, useRef } from 'react';
import type { Log } from '../../types';
import './LogsViewer.css';

function LogsViewer(): JSX.Element {
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLogs();
    
    // 自动刷新
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadLogs, 2000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  const loadLogs = async (): Promise<void> => {
    try {
      const allLogs = await (window as any).api.logs.get();
      setLogs(allLogs || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  // 清空日志
  const handleClearLogs = async (): Promise<void> => {
    try {
      await (window as any).api.logs.clear?.();
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!searchQuery.trim()) {
      loadLogs();
      return;
    }

    setLoading(true);
    try {
      const results = await (window as any).api.logs.search(searchQuery);
      setLogs(results || []);
    } catch (error) {
      console.error('Failed to search logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setLoading(true);
    await loadLogs();
    setLoading(false);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) {
      return false;
    }
    return true;
  });

  const getLevelColor = (level: string): string => {
    const colorMap: Record<string, string> = {
      info: '#1890ff',
      warn: '#faad14',
      error: '#f5222d',
    };
    return colorMap[level] || '#999';
  };

  const getLevelLabel = (level: string): string => {
    const labelMap: Record<string, string> = {
      info: '信息',
      warn: '警告',
      error: '错误',
    };
    return labelMap[level] || level;
  };

  // 格式化日志消息，使其更易读
  const formatMessage = (log: Log): string => {
    const msg = log.message || '';
    // 如果消息已经很清晰，直接返回
    if (msg.includes('发布成功') || msg.includes('发布失败') || msg.includes('开始发布')) {
      return msg;
    }
    // 处理状态变更消息
    if (msg.includes('任务状态变更')) {
      const metadata = log.metadata as any;
      if (metadata?.title) {
        return `${metadata.title} - ${metadata.status || msg}`;
      }
    }
    return msg;
  };

  // 获取简短的任务ID显示
  const getShortTaskId = (taskId: string): string => {
    if (!taskId || taskId === 'system') return '系统';
    if (taskId.length > 12) {
      return taskId.substring(0, 8) + '...';
    }
    return taskId;
  };

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <h2>📋 日志查询 ({logs.length})</h2>
        <div className="header-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自动刷新
          </label>
          <button onClick={handleRefresh} disabled={loading}>
            {loading ? '加载中...' : '🔄 刷新'}
          </button>
          <button onClick={handleClearLogs} className="btn-clear-logs">
            🗑️ 清空
          </button>
        </div>
      </div>

      <div className="logs-filters">
        <div className="search-box">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索日志（任务ID或消息）"
          />
          <button onClick={handleSearch}>搜索</button>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterLevel === 'all' ? 'active' : ''}`}
            onClick={() => setFilterLevel('all')}
          >
            全部
          </button>
          <button
            className={`filter-btn ${filterLevel === 'info' ? 'active' : ''}`}
            onClick={() => setFilterLevel('info')}
          >
            信息
          </button>
          <button
            className={`filter-btn ${filterLevel === 'warn' ? 'active' : ''}`}
            onClick={() => setFilterLevel('warn')}
          >
            警告
          </button>
          <button
            className={`filter-btn ${filterLevel === 'error' ? 'active' : ''}`}
            onClick={() => setFilterLevel('error')}
          >
            错误
          </button>
        </div>
      </div>

      <div className="logs-content">
        {filteredLogs.length === 0 ? (
          <div className="empty-logs">暂无日志</div>
        ) : (
          <div className="logs-table">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>级别</th>
                  <th>任务ID</th>
                  <th>消息</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className={`log-row log-${log.level}`}>
                    <td className="time">{new Date(log.timestamp).toLocaleString('zh-CN')}</td>
                    <td>
                      <span
                        className="level-badge"
                        style={{ backgroundColor: getLevelColor(log.level) }}
                      >
                        {getLevelLabel(log.level)}
                      </span>
                    </td>
                    <td className="task-id" title={log.taskId}>{getShortTaskId(log.taskId)}</td>
                    <td className="message" title={log.message}>{formatMessage(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="logs-footer">
        <span>共 {filteredLogs.length} 条日志</span>
      </div>
    </div>
  );
}

export default LogsViewer;
