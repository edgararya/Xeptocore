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

  // Live scan. captureScreen returns a raw base64 JPEG of the primary display.
  // The widget reports its status to the main process (tray label, widget
  // visibility) and receives start/stop commands from it (tray menu).
  captureScreen: () => ipcRenderer.invoke('capture:screen'),

  // Main window: start/stop the scan and follow its status.
  toggleLiveScan: () => ipcRenderer.send('livescan:toggle'),
  getLiveScanState: () => ipcRenderer.invoke('livescan:get-state'),
  onLiveScanState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('livescan:state', listener);
    return () => ipcRenderer.removeListener('livescan:state', listener);
  },
  reportLiveScanStatus: (status) => ipcRenderer.send('livescan:status', status),
  onLiveScanCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('livescan:command', listener);
    return () => ipcRenderer.removeListener('livescan:command', listener);
  },
});