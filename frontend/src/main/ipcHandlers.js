// frontend/src/main/ipcHandlers.js
// Registers IPC handlers that bridge renderer calls to the local FastAPI backend.

const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const { getBackendPort } = require('./pythonBridge');

// Extensions the backend accepts, mapped to the MIME types it validates against.
const EXTENSION_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
};

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MIME[ext] || 'application/octet-stream';
}

// The backend only reports its port after the ML models have loaded, which can
// take a while on first launch. Wait for it instead of failing immediately.
const BACKEND_WAIT_TIMEOUT_MS = 60000;
const BACKEND_WAIT_INTERVAL_MS = 250;

async function waitForBackendPort() {
  const deadline = Date.now() + BACKEND_WAIT_TIMEOUT_MS;
  let port = getBackendPort();
  while ((port === null || port === undefined) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, BACKEND_WAIT_INTERVAL_MS));
    port = getBackendPort();
  }
  return port;
}

// Single entry point for every backend call: resolves the port, performs the
// request, and turns failures into plain Errors with readable messages.
async function backendFetch(route, options = {}) {
  const port = await waitForBackendPort();
  if (port === null || port === undefined) {
    throw new Error('Backend is not ready yet');
  }

  let response;
  try {
    response = await fetch(`http://localhost:${port}${route}`, options);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Backend request failed: ${reason}`);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null; // non-JSON body (e.g. an empty 204)
  }

  if (!response.ok) {
    const message =
      data && typeof data.message === 'string' && data.message
        ? data.message
        : `Backend responded with status ${response.status}`;

    // ipcMain only forwards the message string, so keep the backend's error_code
    // recoverable by prefixing it; renderer code can split on the first ': '.
    const errorCode = data && typeof data.error_code === 'string' && data.error_code;
    throw new Error(errorCode ? `${errorCode}: ${message}` : message);
  }

  return data;
}

function registerIpcHandlers() {
  // The port lives in this process, so it needs no HTTP round trip.
  ipcMain.handle('backend:port', () => getBackendPort());

  ipcMain.handle('detect:file', async (_event, filePath) => {
    try {
      if (typeof filePath !== 'string' || filePath.length === 0) {
        throw new Error('filePath is required');
      }

      const buffer = await fs.promises.readFile(filePath);
      const filename = path.basename(filePath);
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimeFor(filePath) }), filename);

      return await backendFetch('/detect', { method: 'POST', body: form });
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  });

  ipcMain.handle('history:list', async () => {
    try {
      return await backendFetch('/history');
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  });

  ipcMain.handle('history:delete', async (_event, id) => {
    try {
      if (typeof id !== 'string' || id.length === 0) {
        throw new Error('id is required');
      }

      await backendFetch(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  });

  ipcMain.handle('history:clear', async () => {
    try {
      await backendFetch('/history', { method: 'DELETE' });
      return true;
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  });
}

module.exports = {
  registerIpcHandlers,
};