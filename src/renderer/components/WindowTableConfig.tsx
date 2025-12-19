import React, { useState, useEffect } from 'react';
import type { BitBrowserWindow, WindowTableMapping } from '../../types';
import './WindowTableConfig.css';

function WindowTableConfig(): JSX.Element {
  const [windows, setWindows] = useState<BitBrowserWindow[]>([]);
  const [mappings, setMappings] = useState<WindowTableMapping[]>([]);
  const [feishuAppId, setFeishuAppId] = useState('');
  const [feishuAppSecret, setFeishuAppSecret] = useState('');
  const [feishuTestTableId, setFeishuTestTableId] = useState(''); // 用于直接测试的表格ID
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
    loadWindows();
  }, []);

  const loadConfig = async (): Promise<void> => {
    try {
      const config = await (window as any).api.config.get();
      setFeishuAppId(config.feishu?.appId || '');
      setFeishuAppSecret(config.feishu?.appSecret || '');
      setFeishuTestTableId(config.feishu?.tableId || ''); // 加载默认表格ID
      setMappings(config.windowTableMappings || []);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const loadWindows = async (): Promise<void> => {
    setLoading(true);
    try {
      const windowList = await (window as any).api.bitBrowser.getWindows();
      setWindows(windowList);
      setMessage(`找到 ${windowList.length} 个浏览器窗口`);
    } catch (error) {
      setMessage('获取比特浏览器窗口失败，请确保比特浏览器已启动');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAddMapping = (win: BitBrowserWindow): void => {
    // 检查是否已存在
    if (mappings.find(m => m.windowId === win.id)) {
      setMessage('该窗口已添加');
      return;
    }
    
    const newMapping: WindowTableMapping = {
      windowId: win.id,
      windowName: win.name,
      feishuTableId: '',
    };
    setMappings([...mappings, newMapping]);
  };

  const handleRemoveMapping = (windowId: string): void => {
    setMappings(mappings.filter(m => m.windowId !== windowId));
  };

  const handleTableIdChange = (windowId: string, tableId: string): void => {
    setMappings(mappings.map(m => 
      m.windowId === windowId ? { ...m, feishuTableId: tableId } : m
    ));
  };

  const handleTableNameChange = (windowId: string, tableName: string): void => {
    setMappings(mappings.map(m => 
      m.windowId === windowId ? { ...m, feishuTableName: tableName } : m
    ));
  };


  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // 测试飞书连接
  const handleTestFeishu = async (tableId?: string): Promise<void> => {
    if (!feishuAppId || !feishuAppSecret) {
      setMessage('❌ 请先填写 App ID 和 App Secret');
      return;
    }

    // 优先使用传入的tableId，其次使用测试表格ID，最后使用映射中的第一个
    const testTableId = tableId || feishuTestTableId || (mappings.length > 0 ? mappings[0].feishuTableId : '');
    if (!testTableId) {
      setMessage('❌ 请填写表格ID (Base ID)');
      return;
    }

    setTesting(true);
    setMessage('正在测试飞书连接...');
    setTestResult(null);

    try {
      const result = await (window as any).api.feishu.test(feishuAppId, feishuAppSecret, testTableId);
      setTestResult(result);
      
      if (result.success) {
        setMessage(`✅ 连接成功！表格: ${result.tableName}, 总记录: ${result.recordCount}, 待发布: ${result.pendingCount}`);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ 测试失败: ' + (error as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    // 验证
    const invalidMappings = mappings.filter(m => !m.feishuTableId);
    if (invalidMappings.length > 0) {
      setMessage('请为所有窗口填写飞书表格ID');
      return;
    }

    try {
      const config = await (window as any).api.config.get();
      await (window as any).api.config.set({
        ...config,
        feishu: {
          ...config.feishu,
          appId: feishuAppId,
          appSecret: feishuAppSecret,
        },
        windowTableMappings: mappings,
      });
      await (window as any).api.config.save();
      setMessage('✅ 配置保存成功！');
    } catch (error) {
      setMessage('❌ 保存失败: ' + (error as Error).message);
    }
    setTimeout(() => setMessage(''), 5000);
  };

  return (
    <div className="window-table-config">
      <h2>窗口与表格配置</h2>
      <p className="description">为每个比特浏览器窗口配置对应的飞书表格，实现多账号分别发布不同内容</p>

      {/* 飞书凭证配置 */}
      <div className="config-section">
        <div className="section-header">
          <h3>飞书凭证（所有表格共用）</h3>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>App ID</label>
            <input
              type="text"
              value={feishuAppId}
              onChange={(e) => setFeishuAppId(e.target.value)}
              placeholder="cli_xxxxxxxxx"
            />
          </div>
          <div className="form-group">
            <label>App Secret</label>
            <input
              type="password"
              value={feishuAppSecret}
              onChange={(e) => setFeishuAppSecret(e.target.value)}
              placeholder="输入 App Secret"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>测试表格ID (Base ID)</label>
            <input
              type="text"
              value={feishuTestTableId}
              onChange={(e) => setFeishuTestTableId(e.target.value)}
              placeholder="GGh2bW3Q2aHpi1shiVqcAlhmnMd"
            />
          </div>
          <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <button 
              className="btn-test" 
              onClick={() => handleTestFeishu()} 
              disabled={testing}
              style={{ width: '100%', marginBottom: 0 }}
            >
              {testing ? '测试中...' : '测试飞书连接'}
            </button>
          </div>
        </div>
        
        {/* 测试结果 */}
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <div className="result-item">
              <span className="label">Token获取:</span>
              <span className={testResult.tokenOk ? 'ok' : 'fail'}>
                {testResult.tokenOk ? '✅ 成功' : '❌ 失败'}
              </span>
            </div>
            <div className="result-item">
              <span className="label">表格访问:</span>
              <span className={testResult.tableOk ? 'ok' : 'fail'}>
                {testResult.tableOk ? `✅ ${testResult.tableName}` : '❌ 失败'}
              </span>
            </div>
            <div className="result-item">
              <span className="label">记录数量:</span>
              <span>{testResult.recordCount} 条 (待发布: {testResult.pendingCount} 条)</span>
            </div>
            {testResult.fields && testResult.fields.length > 0 && (
              <div className="result-item">
                <span className="label">字段列表:</span>
                <span className="fields">{testResult.fields.join(', ')}</span>
              </div>
            )}
            {testResult.pendingCount === 0 && testResult.recordCount > 0 && (
              <div className="result-hint">
                ⚠️ 没有"待发布"状态的记录。请确保表格中有"状态"字段，且值为"待发布"
              </div>
            )}
          </div>
        )}
      </div>

      {/* 可用窗口列表 */}
      <div className="config-section">
        <div className="section-header">
          <h3>可用浏览器窗口</h3>
          <button className="btn-refresh" onClick={loadWindows} disabled={loading}>
            {loading ? '加载中...' : '刷新窗口'}
          </button>
        </div>
        <div className="windows-grid">
          {windows.length === 0 ? (
            <p className="empty-text">未找到窗口，请启动比特浏览器</p>
          ) : (
            windows.map(win => (
              <div key={win.id} className="window-card">
                <div className="window-info">
                  <span className="window-name">{win.name}</span>
                  <span className="window-id">{win.id}</span>
                </div>
                <button
                  className="btn-add"
                  onClick={() => handleAddMapping(win)}
                  disabled={mappings.some(m => m.windowId === win.id)}
                >
                  {mappings.some(m => m.windowId === win.id) ? '已添加' : '添加'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>


      {/* 已配置的映射 */}
      <div className="config-section">
        <h3>窗口与表格映射 ({mappings.length})</h3>
        {mappings.length === 0 ? (
          <p className="empty-text">请从上方添加窗口</p>
        ) : (
          <div className="mappings-list">
            {mappings.map(mapping => (
              <div key={mapping.windowId} className="mapping-item">
                <div className="mapping-window">
                  <span className="label">浏览器窗口:</span>
                  <span className="value">{mapping.windowName}</span>
                </div>
                <div className="mapping-inputs">
                  <div className="form-group">
                    <label>飞书表格ID (Base ID)</label>
                    <input
                      type="text"
                      value={mapping.feishuTableId}
                      onChange={(e) => handleTableIdChange(mapping.windowId, e.target.value)}
                      placeholder="GGh2bW3Q2aHpi1shiVqcAlhmnMd"
                    />
                  </div>
                  <div className="form-group">
                    <label>备注名称（可选）</label>
                    <input
                      type="text"
                      value={mapping.feishuTableName || ''}
                      onChange={(e) => handleTableNameChange(mapping.windowId, e.target.value)}
                      placeholder="如：账号1的发布内容"
                    />
                  </div>
                </div>
                <div className="mapping-actions">
                  <button
                    className="btn-test-small"
                    onClick={() => handleTestFeishu(mapping.feishuTableId)}
                    disabled={testing || !mapping.feishuTableId}
                  >
                    测试
                  </button>
                  <button
                    className="btn-remove"
                    onClick={() => handleRemoveMapping(mapping.windowId)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <div className="config-actions">
        <button className="btn-save" onClick={handleSave}>
          保存配置
        </button>
      </div>

      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default WindowTableConfig;
