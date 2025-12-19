import React, { useState, useEffect } from 'react';
import type { Log } from '../../types';
import './LogsViewer.css';

// 测试日志数据
const TEST_LOGS: Log[] = [
  {
    id: 'log-001',
    timestamp: new Date(),
    taskId: 'test-001',
    level: 'info',
    message: '开始从飞书同步数据...',
  },
  {
    id: 'log-002',
    timestamp: new Date(Date.now() - 1000),
    taskId: 'test-001',
    level: 'info',
    message: '成功获取 4 条待发布记录',
  },
  {
    id: 'log-003',
    timestamp: new Date(Date.now() - 2000),
    taskId: 'test-002',
    level: 'info',
    message: '开始发布: 即梦AI绘画教程',
  },
  {
    id: 'log-004',
    timestamp: new Date(Date.now() - 3000),
    taskId: 'test-002',
    level: 'info',
    message: '图片上传成功 (3张)',
  },
  {
    id: 'log-005',
    timestamp: new Date(Date.now() - 4000),
    taskId: 'test-002',
    level: 'info',
    message: '发布成功！',
  },
  {
    id: 'log-006',
    timestamp: new Date(Date.now() - 5000),
    taskId: 'test-003',
    level: 'warn',
    message: '标题超过20字，已自动截断',
  },
  {
    id: 'log-007',
    timestamp: new Date(Date.now() - 6000),
    taskId: 'test-004',
    level: 'error',
    message: '发布失败: 找不到图片文件 test-product-004.png',
  },
  {
    id: 'log-008',
    timestamp: new Date(Date.now() - 7000),
    taskId: 'system',
    level: 'info',
    message: '比特浏览器连接成功，找到 3 个窗口',
  },
];

function LogsViewer(): JSX.Element {
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (): Promise<void> => {
    setLoading(true);
    try {
      const allLogs = await (window as any).api.logs.get();
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
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
      setLogs(results);
    } catch (error) {
      console.error('Failed to search logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载测试数据
  const loadTestLogs = (): void => {
    setLogs(TEST_LOGS);
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

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <h2>日志查询 ({logs.length})</h2>
        <div className="header-actions">
          <button className="btn-test" onClick={loadTestLogs}>
            加载测试日志
          </button>
          <button onClick={loadLogs} disabled={loading}>
            {loading ? '加载中...' : '刷新'}
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
                  <tr key={log.id}>
                    <td className="time">{new Date(log.timestamp).toLocaleString('zh-CN')}</td>
                    <td>
                      <span
                        className="level-badge"
                        style={{ backgroundColor: getLevelColor(log.level) }}
                      >
                        {getLevelLabel(log.level)}
                      </span>
                    </td>
                    <td className="task-id">{log.taskId}</td>
                    <td className="message" title="">{log.message}</td>
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
