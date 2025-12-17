import React, { useState, useEffect } from 'react';
import type { Config, XhsAccount } from '../../types';
import './ConfigSettings.css';

function ConfigSettings(): JSX.Element {
  const [config, setConfig] = useState<Config | null>(null);
  const [newAccount, setNewAccount] = useState<Partial<XhsAccount>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async (): Promise<void> => {
    try {
      const cfg = await (window as any).api.config.get();
      setConfig(cfg);
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage('加载配置失败');
    }
  };

  const handleSaveConfig = async (): Promise<void> => {
    if (!config) return;

    setSaving(true);
    try {
      await (window as any).api.config.set(config);
      await (window as any).api.config.save();
      setMessage('配置保存成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage('配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = async (): Promise<void> => {
    if (!newAccount.username || !newAccount.password) {
      setMessage('请填写用户名和密码');
      return;
    }

    if (!config) return;

    const account: XhsAccount = {
      id: `account_${Date.now()}`,
      username: newAccount.username,
      password: newAccount.password,
      isValid: true,
      lastValidated: new Date(),
      createdTime: new Date(),
    };

    const updatedConfig = {
      ...config,
      xhsAccounts: [...config.xhsAccounts, account],
    };

    setConfig(updatedConfig);
    setNewAccount({});
    setMessage('账号添加成功');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRemoveAccount = (accountId: string): void => {
    if (!config) return;

    const updatedConfig = {
      ...config,
      xhsAccounts: config.xhsAccounts.filter((acc) => acc.id !== accountId),
    };

    setConfig(updatedConfig);
    setMessage('账号删除成功');
    setTimeout(() => setMessage(''), 3000);
  };

  if (!config) {
    return <div className="config-settings">加载中...</div>;
  }

  return (
    <div className="config-settings">
      <div className="config-section">
        <h3>飞书配置</h3>
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
            placeholder="输入飞书 App ID"
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
            placeholder="输入飞书 App Secret"
          />
        </div>
        <div className="form-group">
          <label>表格 ID</label>
          <input
            type="text"
            value={config.feishu.tableId}
            onChange={(e) =>
              setConfig({
                ...config,
                feishu: { ...config.feishu, tableId: e.target.value },
              })
            }
            placeholder="输入飞书表格 ID"
          />
        </div>
      </div>

      <div className="config-section">
        <h3>图片设置</h3>
        <div className="form-group">
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
              readOnly
            />
            <button
              className="btn-browse"
              onClick={async () => {
                try {
                  const dir = await (window as any).api.dialog.selectDirectory();
                  if (dir) {
                    setConfig({
                      ...config,
                      imageDir: dir,
                    });
                    setMessage('图片目录已选择: ' + dir);
                    setTimeout(() => setMessage(''), 3000);
                  }
                } catch (error) {
                  console.error('选择目录失败:', error);
                }
              }}
            >
              浏览...
            </button>
          </div>
          <p className="help-text">
            图片文件名需与商品ID一致，如：123456.png
          </p>
        </div>
      </div>

      <div className="config-section">
        <h3>发布设置</h3>
        <div className="form-group">
          <label>发布间隔（秒）</label>
          <input
            type="number"
            value={config.publishInterval}
            onChange={(e) =>
              setConfig({
                ...config,
                publishInterval: parseInt(e.target.value),
              })
            }
            min="1"
            max="300"
          />
        </div>
        <div className="form-group">
          <label>过期任务处理</label>
          <select
            value={config.expiredTaskBehavior}
            onChange={(e) =>
              setConfig({
                ...config,
                expiredTaskBehavior: e.target.value as 'publish' | 'skip',
              })
            }
          >
            <option value="publish">立即发布</option>
            <option value="skip">标记为已过期</option>
          </select>
        </div>
      </div>

      <div className="config-section">
        <h3>小红书账号管理</h3>
        <div className="accounts-list">
          {config.xhsAccounts.length === 0 ? (
            <p className="empty-text">暂无账号</p>
          ) : (
            config.xhsAccounts.map((account) => (
              <div key={account.id} className="account-item">
                <div className="account-info">
                  <div className="account-username">{account.username}</div>
                  <div className="account-status">{account.isValid ? '有效' : '无效'}</div>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveAccount(account.id)}
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>

        <div className="add-account">
          <h4>添加新账号</h4>
          <div className="form-group">
            <input
              type="text"
              value={newAccount.username || ''}
              onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
              placeholder="用户名"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={newAccount.password || ''}
              onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
              placeholder="密码"
            />
          </div>
          <button className="btn-add" onClick={handleAddAccount}>
            添加账号
          </button>
        </div>
      </div>

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
