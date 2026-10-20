const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rose', { invoke: (channel, data) => ipcRenderer.invoke(channel, data), on: (channel, fn) => { const cb = (_, value) => fn(value); ipcRenderer.on(channel, cb); return () => ipcRenderer.removeListener(channel, cb); } });
