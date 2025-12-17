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
  },
  logs: {
    get: (filter?: any) => ipcRenderer.invoke('logs:get', filter),
    search: (query: string) => ipcRenderer.invoke('logs:search', query),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
});
