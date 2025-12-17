import React, { useState } from 'react';
import './App.css';
import NotesList from './components/NotesList';
import PublishMonitor from './components/PublishMonitor';
import ConfigSettings from './components/ConfigSettings';
import LogsViewer from './components/LogsViewer';

type TabType = 'notes' | 'monitor' | 'config' | 'logs';

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('notes');

  return (
    <div className="app">
      <header className="app-header">
        <h1>小红书自动发布插件</h1>
        <nav className="app-nav">
          <button
            className={`nav-button ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            笔记列表
          </button>
          <button
            className={`nav-button ${activeTab === 'monitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitor')}
          >
            发布监控
          </button>
          <button
            className={`nav-button ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            配置设置
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
        {activeTab === 'notes' && <NotesList />}
        {activeTab === 'monitor' && <PublishMonitor />}
        {activeTab === 'config' && <ConfigSettings />}
        {activeTab === 'logs' && <LogsViewer />}
      </main>
    </div>
  );
}

export default App;
