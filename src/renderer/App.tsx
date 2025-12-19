import React, { useState } from 'react';
import './App.css';
import MultiAccountPublish from './components/MultiAccountPublish';
import ConfigSettings from './components/ConfigSettings';
import LogsViewer from './components/LogsViewer';

type TabType = 'config' | 'publish' | 'logs';

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('config');

  return (
    <div className="app">
      <header className="app-header">
        <h1>小红书自动发布插件</h1>
        <nav className="app-nav">
          <button
            className={`nav-button ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            系统设置
          </button>
          <button
            className={`nav-button ${activeTab === 'publish' ? 'active' : ''}`}
            onClick={() => setActiveTab('publish')}
          >
            发布管理
          </button>
          <button
            className={`nav-button ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            日志查询
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'config' && <ConfigSettings />}
        {activeTab === 'publish' && <MultiAccountPublish />}
        {activeTab === 'logs' && <LogsViewer />}
      </main>
    </div>
  );
}

export default App;
