// frontend/src/main/liveScan.js
// Main-process side of live scan: screen capture, the always-on-top widget
// window, and the system tray.
//
// The WebSocket itself lives in the widget's renderer (hooks/useLiveScan.js).
// This file only captures frames on request and wires the tray to the widget:
//   tray menu  --'livescan:command'-->  widget  (start / stop)
//   widget     --'livescan:status'-->   main    (tray label, widget visibility)

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  desktopCapturer,
  ipcMain,
  nativeImage,
  screen,
} = require('electron');
const path = require('path');

const DEV_SERVER_URL = process.env.ELECTRON_START_URL;

// Frames are downscaled before they are sent: full-resolution screens would make
// every WebSocket message several MB. Raise this if small faces are missed.
const CAPTURE_MAX_WIDTH = 1280;
const JPEG_QUALITY = 80;

const WIDGET_SIZE = { width: 280, height: 88 };
const WIDGET_MARGIN = 16;

// Statuses reported by the widget (see useLiveScan) while a scan is running.
const ACTIVE_STATUSES = new Set(['connecting', 'scanning', 'alert']);

let widgetWindow = null;
let tray = null;
let showMainWindow = () => {};
let scanning = false;
let isQuitting = false;

// Captures the primary display and returns a raw base64 JPEG (no "data:" prefix,
// which is what the backend's base64 decoder expects).
async function captureScreen() {
  const display = screen.getPrimaryDisplay();
  const pixelWidth = Math.round(display.size.width * display.scaleFactor);
  const pixelHeight = Math.round(display.size.height * display.scaleFactor);
  const width = Math.min(CAPTURE_MAX_WIDTH, pixelWidth);
  const height = Math.round((width * pixelHeight) / pixelWidth);

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });
  const source = sources.find((item) => item.display_id === String(display.id)) || sources[0];

  if (!source || source.thumbnail.isEmpty()) {
    throw new Error('Could not capture the screen');
  }
  return source.thumbnail.toJPEG(JPEG_QUALITY).toString('base64');
}

function loadWidget(win) {
  if (!app.isPackaged && DEV_SERVER_URL) {
    win.loadURL(`${DEV_SERVER_URL}#widget`);
  } else {
    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { hash: 'widget' });
  }
}

// Sends a command to the widget renderer, waiting for it to finish loading first.
function sendCommand(command) {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    return;
  }

  const { webContents } = widgetWindow;
  if (webContents.isLoading()) {
    webContents.once('did-finish-load', () => webContents.send('livescan:command', command));
  } else {
    webContents.send('livescan:command', command);
  }
}

function createWidgetWindow() {
  const { workArea } = screen.getPrimaryDisplay();

  widgetWindow = new BrowserWindow({
    width: WIDGET_SIZE.width,
    height: WIDGET_SIZE.height,
    x: workArea.x + workArea.width - WIDGET_SIZE.width - WIDGET_MARGIN,
    y: workArea.y + WIDGET_MARGIN,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // The scan loop must keep running while the widget is not focused.
      backgroundThrottling: false,
    },
  });

  // Stay above other windows, including most fullscreen video players.
  widgetWindow.setAlwaysOnTop(true, 'screen-saver');

  // Closing the widget (e.g. Alt+F4) hides it and stops the scan instead of
  // destroying the window; it is only destroyed when the app is quitting.
  widgetWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      sendCommand('stop');
      widgetWindow.hide();
    }
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  loadWidget(widgetWindow);
}

function startScan() {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidgetWindow();
  }
  // showInactive: do not steal focus from the app the user is watching.
  widgetWindow.showInactive();
  sendCommand('start');
}

function stopScan() {
  sendCommand('stop');
}

// Placeholder tray icon drawn from raw pixels (a teal dot), so no image asset is
// needed yet. Replace with the real app icon (build/icon.ico) later.
function createTrayIcon() {
  const size = 32;
  const buffer = Buffer.alloc(size * size * 4);
  const center = (size - 1) / 2;
  const radius = size / 2 - 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (Math.hypot(x - center, y - center) <= radius) {
        const offset = (y * size + x) * 4;
        buffer[offset] = 0x88; // B
        buffer[offset + 1] = 0x94; // G
        buffer[offset + 2] = 0x0d; // R
        buffer[offset + 3] = 0xff; // A
      }
    }
  }

  return nativeImage.createFromBitmap(buffer, { width: size, height: size, scaleFactor: 2 });
}

function updateTray() {
  if (!tray) {
    return;
  }

  tray.setToolTip(scanning ? 'Xeptocore - live scan active' : 'Xeptocore');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: scanning ? 'Stop Live Scan' : 'Start Live Scan',
        click: () => (scanning ? stopScan() : startScan()),
      },
      { label: 'Open Xeptocore', click: () => showMainWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  );
}

function createTray() {
  try {
    tray = new Tray(createTrayIcon());
    tray.on('click', () => showMainWindow());
    updateTray();
  } catch (err) {
    // The tray is a convenience; the app must still start without it.
    console.error(`[liveScan] Failed to create tray: ${err.message}`);
    tray = null;
  }
}

// Call once, after the app is ready. `options.showMainWindow` shows or re-creates
// the main window (used by the tray).
function initLiveScan(options = {}) {
  if (typeof options.showMainWindow === 'function') {
    showMainWindow = options.showMainWindow;
  }

  app.on('before-quit', () => {
    isQuitting = true;
  });

  ipcMain.handle('capture:screen', () => captureScreen());

  ipcMain.on('livescan:status', (_event, status) => {
    if (typeof status !== 'string') {
      return;
    }

    scanning = ACTIVE_STATUSES.has(status);
    updateTray();

    if (status === 'idle' && widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
      widgetWindow.hide();
    }
  });

  createWidgetWindow();
  createTray();
}

// The hidden widget window keeps the app alive, so 'window-all-closed' never
// fires on its own. Quit with the main window unless a scan is still running;
// in that case the app stays in the tray until the scan is stopped or the user
// picks Quit.
function handleMainWindowClosed() {
  if (process.platform !== 'darwin' && !scanning) {
    app.quit();
  }
}

module.exports = {
  initLiveScan,
  handleMainWindowClosed,
};