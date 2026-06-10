const { autoUpdater } = require('electron-updater');
const { app } = require('electron');

function sendToWindow(mainWindow, channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function initAutoUpdater(mainWindow) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  if (!app.isPackaged) {
    return;
  }

  autoUpdater.on('checking-for-update', () => {
    sendToWindow(mainWindow, 'update:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendToWindow(mainWindow, 'update:status', {
      status: 'available',
      version: info.version,
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToWindow(mainWindow, 'update:status', { status: 'none' });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToWindow(mainWindow, 'update:status', {
      status: 'ready',
      version: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    sendToWindow(mainWindow, 'update:status', {
      status: 'error',
      message: error.message,
    });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      sendToWindow(mainWindow, 'update:status', { status: 'error' });
    });
  }, 3000);
}

function installUpdate() {
  autoUpdater.quitAndInstall();
}

module.exports = {
  initAutoUpdater,
  installUpdate,
};
