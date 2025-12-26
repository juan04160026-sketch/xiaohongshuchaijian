import { useState, useEffect, useRef } from 'react';
import type { Log } from '../../types';
import './LogsViewer.css';

// 发布批次记录
interface PublishBatch {
  id: string;
  time: Date;
  totalCount: number;
  successCount: number;
  failedCount: number;
}

function LogsViewer(): JSX.Element {
  const [logs, setLogs] = useState<Log[]>([]);
  const [batches, setBatches] = useState<PublishBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLogs();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadLogs, 3000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  // 从日志中提取发布批次记录
  const extractBatches = (logs: Log[]): PublishBatch[] => {
    const batchList: PublishBatch[] = [];
    
    for (const log of logs) {
      const msg = log.message || '';
      const metadata = log.metadata as any;
      
      // 只提取"发布完成"的汇总记录
      if (msg.includes('发布完成') && metadata?.totalSuccess !== undefined) {
        batchList.push({
          id: log.id,
          time: new Date(log.timestamp),
          totalCount: (metadata.totalSuccess || 0) + (metadata.totalFailed || 0),
          successCount: metadata.totalSuccess || 0,
          failedCount: metadata.totalFailed || 0,
        });
      }
    }
    
    return batchList;
  };

  const loadLogs = async (): Promise<void> => {
    try {
      const allLogs = await (window as any).api.logs.get();
      setLogs(allLogs || []);
      setBatches(extractBatches(allLogs || []));
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleClearLogs = async (): Promise<void> => {
    try {
      await (window as any).api.logs.clear?.();
      setLogs([]);
      setBatches([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setLoading(true);
    await loadLogs();
    setLoading(false);
  };

  // 汇总统计
  const totalPublished = batches.reduce((sum, b) => sum + b.totalCount, 0);
  const totalSuccess = batches.reduce((sum, b) => sum + b.successCount, 0);
  const totalFailed = batches.reduce((sum, b) => sum + b.failedCount, 0);

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <h2>📊 发布记录</h2>
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

      {/* 总计统计卡片 */}
      <div className="stats-cards">
        <div className="stat-card total">
          <div className="stat-number">{batches.length}</div>
          <div className="stat-label">发布次数</div>
        </div>
        <div className="stat-card published">
          <div className="stat-number">{totalPublished}</div>
          <div className="stat-label">总笔记数</div>
        </div>
        <div className="stat-card success">
          <div className="stat-number">{totalSuccess}</div>
          <div className="stat-label">成功</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-number">{totalFailed}</div>
          <div className="stat-label">失败</div>
        </div>
      </div>

      {/* 发布记录列表 */}
      <div className="logs-content">
        {batches.length === 0 ? (
          <div className="empty-logs">暂无发布记录</div>
        ) : (
          <div className="records-list">
            {batches.map((batch) => (
              <div key={batch.id} className={`batch-item ${batch.failedCount > 0 ? 'has-failed' : 'all-success'}`}>
                <div className="batch-time">
                  🕐 {batch.time.toLocaleString('zh-CN')}
                </div>
                <div className="batch-stats">
                  <span className="batch-total">共 {batch.totalCount} 条</span>
                  <span className="batch-success">✅ 成功 {batch.successCount}</span>
                  {batch.failedCount > 0 && (
                    <span className="batch-failed">❌ 失败 {batch.failedCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LogsViewer;
