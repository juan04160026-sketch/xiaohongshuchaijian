import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config: any) => ipcRenderer.invoke('config:set', config),
    save: () => ipcRenderer.invoke('config:save'),
  },
  tasks: {
    get: () => ipcRenderer.invoke('tasks:get'),
    start: () => ipcRenderer.invoke('tasks:start'),
    pause: () => ipcRenderer.invoke('tasks:pause'),
    resume: () => ipcRenderer.invoke('tasks:resume'),
    stop: () => ipcRenderer.invoke('tasks:stop'),
  },
  logs: {
    get: (filter?: any) => ipcRenderer.invoke('logs:get', filter),
    search: (query: string) => ipcRenderer.invoke('logs:search', query),
    clear: () => ipcRenderer.invoke('logs:clear'),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  // 比特浏览器 API
  bitBrowser: {
    getWindows: () => ipcRenderer.invoke('bitbrowser:getWindows'),
    openWindow: (windowId: string) => ipcRenderer.invoke('bitbrowser:openWindow', windowId),
    closeWindow: (windowId: string) => ipcRenderer.invoke('bitbrowser:closeWindow', windowId),
  },
  // 多账号发布 API
  publish: {
    multi: (tasks: any[], mode: 'serial' | 'parallel') => ipcRenderer.invoke('publish:multi', tasks, mode),
    byWindows: (windowTasks: any[]) => ipcRenderer.invoke('publish:byWindows', windowTasks),
    stop: () => ipcRenderer.invoke('publish:stop'),
  },
  // 飞书测试 API
  feishu: {
    test: (appId: string, appSecret: string, tableId: string, dataTableId?: string) => 
      ipcRenderer.invoke('feishu:test', appId, appSecret, tableId, dataTableId),
    loadByWindows: () => ipcRenderer.invoke('feishu:loadByWindows'),
  },
  // 文件操作 API
  file: {
    save: (dir: string, fileName: string, data: number[]) => 
      ipcRenderer.invoke('file:save', dir, fileName, data),
  },
});
