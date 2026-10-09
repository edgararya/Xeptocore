// frontend/src/main/preload.js
// Exposes a small, explicit API to the renderer through contextBridge.
// The renderer never touches ipcRenderer or electron directly.

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Channel names must match the handlers registered in ipcHandlers.js.
  detectFile: (filePath) => ipcRenderer.invoke('detect:file', filePath),
  getHistory: () => ipcRenderer.invoke('history:list'),
  deleteHistoryEntry: (id) => ipcRenderer.invoke('history:delete', id),
  getBackendPort: () => ipcRenderer.invoke('backend:port'),

  // Electron 32+ removed the non-standard File.path. webUtils is only
  // reachable from the preload script, so the renderer asks for the path here.
  getPathForFile: (file) => webUtils.getPathForFile(file),
});
