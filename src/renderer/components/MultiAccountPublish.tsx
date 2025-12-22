import React, { useState, useEffect, useCallback } from 'react';
import type { WindowPublishState, WindowTableMapping, ImageSourceType } from '../../types';
import './MultiAccountPublish.css';

function MultiAccountPublish(): JSX.Element {
  const [windowStates, setWindowStates] = useState<WindowPublishState[]>([]);
  const [mappings, setMappings] = useState<WindowTableMapping[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [imageSource, setImageSource] = useState<ImageSourceType>('local');

  // 显示消息，自动消失
  const showMessage = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 5000) => {
    setMessage(msg);
    setMessageType(type);
    if (duration > 0) {
      setTimeout(() => setMessage(''), duration);
    }
  }, []);

  // 关闭消息
  const closeMessage = useCallback(() => {
    setMessage('');
  }, []);

  // 组件挂载和每次显示时都重新加载配置
  useEffect(() => {
    loadMappings();
    
    // 监听 visibilitychange 事件，当页面重新可见时刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMappings();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 加载窗口-表格映射配置
  const loadMappings = async (): Promise<void> => {
    try {
      const config = await (window as any).api.config.get();
      setMappings(config.windowTableMappings || []);
      setImageSource(config.imageSource || 'local');
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 从各个表格加载笔记
  const handleLoadNotes = async (): Promise<void> => {
    if (mappings.length === 0) {
      showMessage('请先在系统设置中配置窗口与表格的映射关系', 'error');
      return;
    }

    setLoading(true);
    showMessage('正在从各个表格加载笔记...', 'info', 0); // 不自动消失

    try {
      const states = await (window as any).api.feishu.loadByWindows();
      setWindowStates(states);
      
      const totalTasks = states.reduce((sum: number, s: WindowPublishState) => sum + s.tasks.length, 0);
      const errorCount = states.filter((s: WindowPublishState) => s.status === 'error').length;
      
      if (errorCount > 0) {
        showMessage(`加载完成，共 ${totalTasks} 条待发布笔记，${errorCount} 个窗口加载失败`, 'warning');
      } else if (totalTasks === 0) {
        showMessage('所有表格中都没有待发布的笔记', 'info');
      } else {
        showMessage(`加载完成，共 ${totalTasks} 条待发布笔记`, 'success');
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      showMessage('加载失败: ' + (error as Error).message, 'error', 0);
    } finally {
      setLoading(false);
    }
  };

  // 切换图片来源
  const handleImageSourceChange = async (source: ImageSourceType): Promise<void> => {
    setImageSource(source);
    try {
      const config = await (window as any).api.config.get();
      await (window as any).api.config.set({ ...config, imageSource: source });
      await (window as any).api.config.save();
      showMessage(`已切换为${source === 'feishu' ? '飞书图片' : '本地合成图片'}`, 'success');
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };

  // 开始发布
  const handleStartPublish = async (): Promise<void> => {
    const windowsWithTasks = windowStates.filter(s => s.tasks.length > 0 && s.status !== 'error');
    
    if (windowsWithTasks.length === 0) {
      showMessage('没有可发布的笔记', 'error');
      return;
    }

    setIsPublishing(true);
    showMessage(`开始并行发布 ${windowsWithTasks.length} 个窗口的笔记...`, 'info', 0);

    // 更新所有窗口状态为 publishing
    setWindowStates(prev => prev.map(s => 
      s.tasks.length > 0 && s.status !== 'error' 
        ? { ...s, status: 'publishing' as const } 
        : s
    ));

    try {
      const windowTasks = windowsWithTasks.map(s => ({
        windowId: s.windowId,
        windowName: s.windowName,
        tasks: s.tasks,
      }));

      const results = await (window as any).api.publish.byWindows(windowTasks);
      
      // 更新各窗口的发布结果
      setWindowStates(prev => prev.map(s => {
        const windowResult = results.find((r: any) => r.windowId === s.windowId);
        if (!windowResult) return s;

        const successCount = windowResult.results.filter((r: any) => r.success).length;
        const failCount = windowResult.results.length - successCount;

        return {
          ...s,
          status: 'completed' as const,
          progress: {
            total: windowResult.results.length,
            completed: successCount,
            failed: failCount,
          },
        };
      }));

      const totalSuccess = results.reduce((sum: number, r: any) => 
        sum + r.results.filter((x: any) => x.success).length, 0);
      const totalFail = results.reduce((sum: number, r: any) => 
        sum + r.results.filter((x: any) => !x.success).length, 0);

      showMessage(`发布完成！成功: ${totalSuccess}, 失败: ${totalFail}。正在刷新列表...`, totalFail > 0 ? 'warning' : 'success', 5000);
      
      // 发布完成后自动重新加载笔记列表
      setTimeout(async () => {
        try {
          const states = await (window as any).api.feishu.loadByWindows();
          setWindowStates(states);
          const newTotalTasks = states.reduce((sum: number, s: WindowPublishState) => sum + s.tasks.length, 0);
          showMessage(`列表已刷新，剩余 ${newTotalTasks} 条待发布笔记`, 'info');
        } catch (e) {
          console.error('刷新列表失败:', e);
        }
      }, 2000);
    } catch (error) {
      console.error('发布失败:', error);
      showMessage('发布失败: ' + (error as Error).message, 'error', 0);
      
      // 更新状态为错误
      setWindowStates(prev => prev.map(s => 
        s.status === 'publishing' 
          ? { ...s, status: 'error' as const, errorMessage: (error as Error).message } 
          : s
      ));
    } finally {
      setIsPublishing(false);
    }
  };

  // 停止发布
  const handleStopPublish = async (): Promise<void> => {
    try {
      await (window as any).api.publish.stop();
      showMessage('已停止发布', 'info');
      setIsPublishing(false);
      
      setWindowStates(prev => prev.map(s => 
        s.status === 'publishing' 
          ? { ...s, status: 'paused' as const } 
          : s
      ));
    } catch (error) {
      console.error('停止失败:', error);
    }
  };

  // 计算总数
  const totalTasks = windowStates.reduce((sum, s) => sum + s.tasks.length, 0);
  const windowsWithTasks = windowStates.filter(s => s.tasks.length > 0 && s.status !== 'error').length;

  return (
    <div className="multi-account-publish">
      <div className="publish-header">
        <h2>多账号批量发布</h2>
        <p className="description">
          每个浏览器窗口对应一个飞书表格，自动从各自的表格加载并发布笔记
        </p>
      </div>

      {/* 映射配置提示 */}
      {mappings.length === 0 ? (
        <div className="no-mappings">
          <p>⚠️ 尚未配置窗口与表格的映射关系</p>
          <p>请先到「系统设置」页面，添加比特浏览器窗口并配置对应的飞书表格ID</p>
          <button className="btn-refresh-config" onClick={loadMappings}>
            🔄 刷新配置
          </button>
        </div>
      ) : (
        <>
          {/* 操作按钮 */}
          <div className="action-bar">
            <button 
              className="btn-load" 
              onClick={handleLoadNotes} 
              disabled={loading || isPublishing}
            >
              {loading ? '加载中...' : '📥 加载笔记'}
            </button>
            
            {!isPublishing ? (
              <button
                className="btn-publish"
                onClick={handleStartPublish}
                disabled={loading || totalTasks === 0}
              >
                🚀 开始发布 ({totalTasks} 条)
              </button>
            ) : (
              <button className="btn-stop" onClick={handleStopPublish}>
                ⏹️ 停止发布
              </button>
            )}

            <span className="stats">
              已配置 {mappings.length} 个窗口 | 
              {windowsWithTasks > 0 ? ` ${windowsWithTasks} 个窗口有待发布内容` : ' 请点击加载笔记'}
            </span>
          </div>

          {/* 图片来源选择 */}
          <div className="image-source-selector">
            <span className="selector-label">图片来源：</span>
            <div className="selector-options">
              <label className={`option ${imageSource === 'local' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="imageSource"
                  value="local"
                  checked={imageSource === 'local'}
                  onChange={() => handleImageSourceChange('local')}
                  disabled={isPublishing}
                />
                <span className="option-icon">📁</span>
                <span className="option-text">本地合成图片</span>
                <span className="option-desc">使用图文合成器生成的图片</span>
              </label>
              <label className={`option ${imageSource === 'feishu' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="imageSource"
                  value="feishu"
                  checked={imageSource === 'feishu'}
                  onChange={() => handleImageSourceChange('feishu')}
                  disabled={isPublishing}
                />
                <span className="option-icon">📋</span>
                <span className="option-text">飞书图片</span>
                <span className="option-desc">使用飞书表格中的封面图片</span>
              </label>
            </div>
          </div>

          {/* 窗口列表 */}
          <div className="windows-list">
            {windowStates.length === 0 ? (
              <div className="empty-state">
                <p>点击「加载笔记」从各个表格获取待发布内容</p>
              </div>
            ) : (
              windowStates.map(state => (
                <WindowCard key={state.windowId} state={state} />
              ))
            )}
          </div>
        </>
      )}

      {message && (
        <div className={`message message-${messageType}`}>
          <span>{message}</span>
          <button className="message-close" onClick={closeMessage}>×</button>
        </div>
      )}
    </div>
  );
}

// 窗口卡片组件
function WindowCard({ state }: { state: WindowPublishState }): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = () => {
    switch (state.status) {
      case 'loading':
        return <span className="badge loading">加载中</span>;
      case 'publishing':
        return <span className="badge publishing">发布中</span>;
      case 'completed':
        return <span className="badge completed">已完成</span>;
      case 'paused':
        return <span className="badge paused">已暂停</span>;
      case 'error':
        return <span className="badge error">错误</span>;
      default:
        return <span className="badge idle">待发布</span>;
    }
  };

  const progressPercent = state.progress.total > 0 
    ? Math.round((state.progress.completed / state.progress.total) * 100) 
    : 0;

  return (
    <div className={`window-card ${state.status}`}>
      <div className="window-header" onClick={() => setExpanded(!expanded)}>
        <div className="window-info">
          <span className="window-name">{state.windowName}</span>
          <span className="table-name">{state.feishuTableName || state.feishuTableId}</span>
        </div>
        <div className="window-status">
          {getStatusBadge()}
          <span className="task-count">{state.tasks.length} 条笔记</span>
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* 进度条 */}
      {(state.status === 'publishing' || state.status === 'completed') && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercent}%` }}
          />
          <span className="progress-text">
            {state.progress.completed}/{state.progress.total} 
            {state.progress.failed > 0 && ` (${state.progress.failed} 失败)`}
          </span>
        </div>
      )}

      {/* 错误信息 */}
      {state.status === 'error' && state.errorMessage && (
        <div className="error-message">
          ❌ {state.errorMessage}
        </div>
      )}

      {/* 展开的笔记列表 */}
      {expanded && state.tasks.length > 0 && (
        <div className="tasks-list">
          {state.tasks.map(task => (
            <div key={task.id} className="task-item">
              <span className="task-title">{task.title}</span>
              <span className="task-product">商品ID: {task.productId || '无'}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && state.tasks.length === 0 && (
        <div className="no-tasks">
          该表格没有待发布的笔记
        </div>
      )}
    </div>
  );
}

export default MultiAccountPublish;
