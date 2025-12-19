import React, { useState, useEffect } from 'react';
import type { PublishTask } from '../../types';
import './NotesList.css';

// 测试数据
const TEST_NOTES: PublishTask[] = [
  {
    id: 'test-001',
    title: '即梦AI绘画教程：零基础入门指南',
    content: '今天分享一个超实用的AI绘画技巧！#即梦AI提示词技巧 #即梦AI绘画教程 学会这几个关键词，小白也能画出大片感！',
    coverImage: '',
    images: [],
    topic: 'AI绘画',
    status: 'pending',
    scheduledTime: new Date(),
    createdTime: new Date(),
    targetAccount: 'default',
    productId: '6801f4dc4a46c2000192ad93',
  },
  {
    id: 'test-002',
    title: '小红书爆款标题公式大揭秘',
    content: '研究了100篇爆款笔记，总结出这5个标题公式！#小红书运营 #自媒体干货 赶紧收藏起来～',
    coverImage: '',
    images: [],
    topic: '运营技巧',
    status: 'pending',
    scheduledTime: new Date(Date.now() + 3600000),
    createdTime: new Date(),
    targetAccount: 'default',
    productId: 'test-product-002',
  },
  {
    id: 'test-003',
    title: '国风插画创作分享',
    content: '用即梦AI生成的国风美人图 #即梦AI国风创作 #即梦AI人物生成 太惊艳了！',
    coverImage: '',
    images: [],
    topic: '国风插画',
    status: 'published',
    scheduledTime: new Date(Date.now() - 7200000),
    createdTime: new Date(Date.now() - 86400000),
    targetAccount: 'default',
    productId: 'test-product-003',
    publishedTime: new Date(Date.now() - 7200000),
  },
  {
    id: 'test-004',
    title: 'AI商业设计案例分享',
    content: '帮客户用AI做的一组商业海报 #即梦AI商业设计 #即梦AI实用技巧 效率提升10倍！',
    coverImage: '',
    images: [],
    topic: '商业设计',
    status: 'failed',
    scheduledTime: new Date(Date.now() - 3600000),
    createdTime: new Date(Date.now() - 86400000),
    targetAccount: 'default',
    productId: 'test-product-004',
    errorMessage: '图片上传失败',
  },
];

function NotesList(): JSX.Element {
  const [notes, setNotes] = useState<PublishTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async (): Promise<void> => {
    setLoading(true);
    try {
      const tasks = await (window as any).api.tasks.get();
      setNotes(tasks);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };


  // 加载测试数据
  const loadTestData = (): void => {
    setNotes(TEST_NOTES);
    setMessage('已加载 4 条测试数据');
    setTimeout(() => setMessage(''), 3000);
  };

  // 从飞书同步
  const syncFromFeishu = async (): Promise<void> => {
    setSyncing(true);
    setMessage('正在检查飞书配置...');
    try {
      // 先检查配置
      const config = await (window as any).api.config.get();
      if (!config.feishu?.appId || !config.feishu?.appSecret || !config.feishu?.tableId) {
        setMessage('❌ 请先在"配置设置"中填写飞书 App ID、App Secret 和表格 ID');
        setSyncing(false);
        return;
      }
      
      setMessage('正在从飞书同步...');
      await (window as any).api.tasks.start();
      await loadNotes();
      const tasks = await (window as any).api.tasks.get();
      setMessage(`✅ 同步成功！获取到 ${tasks.length} 条记录`);
    } catch (error) {
      console.error('同步失败:', error);
      const errMsg = (error as Error).message;
      if (errMsg.includes('Feishu config not set')) {
        setMessage('❌ 请先在"配置设置"中填写飞书配置');
      } else if (errMsg.includes('Failed to connect')) {
        setMessage('❌ 连接飞书失败，请检查 App ID 和 App Secret 是否正确');
      } else {
        setMessage('❌ 同步失败: ' + errMsg);
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: '待发布',
      processing: '处理中',
      published: '已发布',
      failed: '失败',
      expired: '已过期',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: '#faad14',
      processing: '#1890ff',
      published: '#52c41a',
      failed: '#f5222d',
      expired: '#999',
    };
    return colorMap[status] || '#999';
  };

  return (
    <div className="notes-list">
      <div className="notes-header">
        <h2>笔记列表 ({notes.length})</h2>
        <div className="header-actions">
          <button className="btn-test" onClick={loadTestData}>
            加载测试数据
          </button>
          <button className="btn-sync" onClick={syncFromFeishu} disabled={syncing}>
            {syncing ? '同步中...' : '从飞书同步'}
          </button>
          <button onClick={loadNotes} disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

      {message && <div className="message-bar">{message}</div>}

      {notes.length === 0 ? (
        <div className="empty-state">
          <p>暂无笔记</p>
          <p className="hint">点击"加载测试数据"查看示例，或"从飞书同步"获取真实数据</p>
        </div>
      ) : (
        <div className="notes-table">
          <table>
            <thead>
              <tr>
                <th>标题</th>
                <th>商品ID</th>
                <th>主题</th>
                <th>状态</th>
                <th>定时时间</th>
                <th>发布时间</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id} className={note.status === 'failed' ? 'row-failed' : ''}>
                  <td className="title" title={note.content}>{note.title}</td>
                  <td className="product-id">{note.productId || '-'}</td>
                  <td>{note.topic || '-'}</td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(note.status) }}>
                      {getStatusLabel(note.status)}
                    </span>
                    {note.errorMessage && (
                      <span className="error-hint" title={note.errorMessage}>⚠️</span>
                    )}
                  </td>
                  <td>{new Date(note.scheduledTime).toLocaleString('zh-CN')}</td>
                  <td>{note.publishedTime ? new Date(note.publishedTime).toLocaleString('zh-CN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default NotesList;
