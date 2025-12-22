import { useState, useEffect } from 'react';
import type { Config, BitBrowserWindow, WindowTableMapping, BrowserType } from '../../types';
import './ConfigSettings.css';

function ConfigSettings(): JSX.Element {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // 比特浏览器窗口
  const [windows, setWindows] = useState<BitBrowserWindow[]>([]);
  const [mappings, setMappings] = useState<WindowTableMapping[]>([]);
  const [loadingWindows, setLoadingWindows] = useState(false);
  
  // 飞书测试
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
    loadWindows();
  }, []);

  const loadConfig = async (): Promise<void> => {
    try {
      const cfg = await (window as any).api.config.get();
      console.log('Loaded config:', cfg);
      console.log('Window table mappings:', cfg.windowTableMappings);
      setConfig(cfg);
      setMappings(cfg.windowTableMappings || []);
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage('❌ 加载配置失败');
    }
  };

  const loadWindows = async (): Promise<void> => {
    setLoadingWindows(true);
    try {
      const windowList = await (window as any).api.bitBrowser.getWindows();
      setWindows(windowList);
    } catch (error) {
      console.log('获取比特浏览器窗口失败，请确保比特浏览器已启动');
    } finally {
      setLoadingWindows(false);
    }
  };

  // 测试飞书连接
  const handleTestFeishu = async (tableId?: string): Promise<void> => {
    if (!config?.feishu.appId || !config?.feishu.appSecret) {
      setMessage('❌ 请先填写 App ID 和 App Secret');
      return;
    }

    const testTableId = tableId || config.feishu.tableId || (mappings.length > 0 ? mappings[0].feishuTableId : '');
    if (!testTableId) {
      setMessage('❌ 请填写表格ID');
      return;
    }

    setTesting(true);
    setMessage('正在测试飞书连接...');
    setTestResult(null);

    try {
      const result = await (window as any).api.feishu.test(
        config.feishu.appId,
        config.feishu.appSecret,
        testTableId
      );
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

  const handleAddMapping = (win: BitBrowserWindow): void => {
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

  const handleSaveConfig = async (): Promise<void> => {
    if (!config) return;

    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        windowTableMappings: mappings,
      };
      await (window as any).api.config.set(updatedConfig);
      await (window as any).api.config.save();
      setMessage('✅ 配置保存成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage('❌ 配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return <div className="config-settings">加载中...</div>;
  }

  return (
    <div className="config-settings">
      <h2>系统设置</h2>

      {/* 飞书配置 */}
      <div className="config-section">
        <div className="section-header">
          <h3>飞书配置</h3>
          <button 
            className="btn-test" 
            onClick={() => handleTestFeishu()} 
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>App ID</label>
            <input
              type="text"
              value={config.feishu.appId}
              onChange={(e) =>
                setConfig({
                  ...config,
                  feishu: { ...config.feishu, appId: e.target.value },
                })
              }
              placeholder="cli_xxxxxxxxx"
            />
          </div>
          <div className="form-group">
            <label>App Secret</label>
            <input
              type="password"
              value={config.feishu.appSecret}
              onChange={(e) =>
                setConfig({
                  ...config,
                  feishu: { ...config.feishu, appSecret: e.target.value },
                })
              }
              placeholder="输入 App Secret"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>默认表格ID (Base ID)</label>
            <input
              type="text"
              value={config.feishu.tableId}
              onChange={(e) =>
                setConfig({
                  ...config,
                  feishu: { ...config.feishu, tableId: e.target.value },
                })
              }
              placeholder="GGh2bW3Q2aHpi1shiVqcAlhmnMd"
            />
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
          </div>
        )}
      </div>


      {/* 图片和发布设置 */}
      <div className="config-section">
        <h3>发布设置</h3>
        
        {/* 浏览器类型选择 */}
        <div className="form-row">
          <div className="form-group">
            <label>浏览器类型</label>
            <div className="browser-selector">
              <label className={`browser-option ${config.browserType === 'bitbrowser' || !config.browserType ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="browserType"
                  value="bitbrowser"
                  checked={config.browserType === 'bitbrowser' || !config.browserType}
                  onChange={() => setConfig({ ...config, browserType: 'bitbrowser' as BrowserType })}
                />
                <span className="browser-icon">🌐</span>
                <span className="browser-name">比特浏览器</span>
                <span className="browser-desc">多账号并行发布</span>
              </label>
              <label className={`browser-option ${config.browserType === 'chrome' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="browserType"
                  value="chrome"
                  checked={config.browserType === 'chrome'}
                  onChange={() => setConfig({ ...config, browserType: 'chrome' as BrowserType })}
                />
                <span className="browser-icon">🔵</span>
                <span className="browser-name">谷歌浏览器</span>
                <span className="browser-desc">单账号串行发布</span>
              </label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>本地图片目录</label>
            <div className="input-with-button">
              <input
                type="text"
                value={config.imageDir || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    imageDir: e.target.value,
                  })
                }
                placeholder="选择图片存放目录"
              />
              <button
                className="btn-browse"
                onClick={async () => {
                  try {
                    const dir = await (window as any).api.dialog.selectDirectory();
                    if (dir) {
                      setConfig({ ...config, imageDir: dir });
                    }
                  } catch (error) {
                    console.error('选择目录失败:', error);
                  }
                }}
              >
                浏览
              </button>
            </div>
            <p className="help-text">图片文件名需与商品ID一致，如：123456.png</p>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>发布间隔（秒）</label>
            <input
              type="number"
              value={config.publishInterval}
              onChange={(e) =>
                setConfig({
                  ...config,
                  publishInterval: parseInt(e.target.value) || 30,
                })
              }
              min="10"
              max="300"
            />
          </div>
        </div>
      </div>

      {/* 比特浏览器窗口配置 - 仅在选择比特浏览器时显示 */}
      {(config.browserType === 'bitbrowser' || !config.browserType) && (
      <div className="config-section">
        <div className="section-header">
          <h3>比特浏览器窗口</h3>
          <button className="btn-refresh" onClick={loadWindows} disabled={loadingWindows}>
            {loadingWindows ? '加载中...' : '刷新窗口'}
          </button>
        </div>
        <p className="help-text">为每个比特浏览器窗口配置对应的飞书表格，实现多账号分别发布不同内容</p>
        
        <div className="windows-grid">
          {windows.length === 0 ? (
            <p className="empty-text">未找到窗口，请启动比特浏览器后点击"刷新窗口"</p>
          ) : (
            windows.map(win => {
              const mapping = mappings.find(m => m.windowId === win.id);
              const isConfigured = !!mapping;
              const hasTableId = mapping && mapping.feishuTableId;
              
              return (
                <div key={win.id} className={`window-card ${isConfigured ? 'configured' : ''} ${hasTableId ? 'has-table' : ''}`}>
                  <div className="window-info">
                    <span className="window-name">{win.name}</span>
                    <span className="window-id">{win.id.substring(0, 8)}...</span>
                    {hasTableId && (
                      <span className="table-id-badge" title={mapping.feishuTableId}>
                        📋 {mapping.feishuTableId.substring(0, 12)}...
                      </span>
                    )}
                  </div>
                  <button
                    className={`btn-add ${isConfigured ? 'added' : ''}`}
                    onClick={() => handleAddMapping(win)}
                    disabled={isConfigured}
                  >
                    {isConfigured ? '✓ 已添加' : '添加'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* 谷歌浏览器配置 - 仅在选择谷歌浏览器时显示 */}
      {config.browserType === 'chrome' && (
      <div className="config-section">
        <h3>谷歌浏览器配置</h3>
        <p className="help-text">使用本地 Chrome 浏览器发布，首次使用需要手动登录小红书</p>
        <div className="form-row">
          <div className="form-group">
            <label>Chrome 路径（可选）</label>
            <div className="input-with-button">
              <input
                type="text"
                value={config.chrome?.executablePath || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    chrome: { ...config.chrome, executablePath: e.target.value },
                  })
                }
                placeholder="留空自动检测"
              />
              <button
                className="btn-browse"
                onClick={async () => {
                  try {
                    const result = await (window as any).api.dialog.selectFile?.();
                    if (result) {
                      setConfig({ ...config, chrome: { ...config.chrome, executablePath: result } });
                    }
                  } catch (error) {
                    console.error('选择文件失败:', error);
                  }
                }}
              >
                浏览
              </button>
            </div>
            <p className="help-text">通常无需设置，程序会自动查找 Chrome</p>
          </div>
        </div>
        <div className="chrome-info">
          <p>💡 使用谷歌浏览器时：</p>
          <ul>
            <li>首次发布需要手动登录小红书账号</li>
            <li>登录状态会自动保存，下次无需重新登录</li>
            <li>所有任务将串行发布（一个接一个）</li>
          </ul>
        </div>
      </div>
      )}

      {/* 窗口与表格映射 */}
      <div className="config-section">
        <h3>窗口与表格映射 ({mappings.length})</h3>
        {mappings.length === 0 ? (
          <p className="empty-text">暂无映射配置，请从上方添加浏览器窗口</p>
        ) : (
          <div className="mappings-list">
            {mappings.map(mapping => (
              <div key={mapping.windowId} className="mapping-item">
                <div className="mapping-window">
                  <span className="label">窗口:</span>
                  <span className="value">{mapping.windowName}</span>
                  <span className="window-id-small">({mapping.windowId.substring(0, 8)}...)</span>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={mapping.feishuTableId}
                    onChange={(e) => handleTableIdChange(mapping.windowId, e.target.value)}
                    placeholder="飞书表格ID (Base ID)"
                  />
                </div>
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
            ))}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <div className="config-actions">
        <button className="btn-save" onClick={handleSaveConfig} disabled={saving}>
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default ConfigSettings;
