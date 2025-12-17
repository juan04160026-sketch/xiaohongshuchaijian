import React, { useState, useEffect } from 'react';
import type { PublishTask } from '../../types';
import './NotesList.css';

function NotesList(): JSX.Element {
  const [notes, setNotes] = useState<PublishTask[]>([]);
  const [loading, setLoading] = useState(false);

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
        <h2>笔记列表</h2>
        <button onClick={loadNotes} disabled={loading}>
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <p>暂无笔记</p>
        </div>
      ) : (
        <div className="notes-table">
          <table>
            <thead>
              <tr>
                <th>标题</th>
                <th>主题</th>
                <th>状态</th>
                <th>定时时间</th>
                <th>发布时间</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id}>
                  <td className="title">{note.title}</td>
                  <td>{note.topic}</td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(note.status) }}>
                      {getStatusLabel(note.status)}
                    </span>
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
