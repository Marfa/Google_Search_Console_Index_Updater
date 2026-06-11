const { autoUpdater } = require('electron-updater');
const { app, shell } = require('electron');

const RELEASE_PAGE_URL =
  'https://github.com/Marfa/Google_Search_Console_Index_Updater/releases/latest';

let mainWindow = null;

function sendToWindow(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function initAutoUpdater(window) {
  mainWindow = window;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.disableDifferentialDownload = true;

  if (!app.isPackaged) {
    return;
  }

  autoUpdater.on('checking-for-update', () => {
    sendToWindow('update:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendToWindow('update:status', {
      status: 'available',
      version: info.version,
      releasePageUrl: RELEASE_PAGE_URL,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendToWindow('update:status', {
      status: 'none',
      installedVersion: app.getVersion(),
      latestVersion: info?.version || app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToWindow('update:status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToWindow('update:status', {
      status: 'ready',
      version: info.version,
      releasePageUrl: RELEASE_PAGE_URL,
    });
  });

  autoUpdater.on('error', (error) => {
    sendToWindow('update:status', {
      status: 'error',
      message: error?.message || 'Unknown update error',
      releasePageUrl: RELEASE_PAGE_URL,
    });
  });

  setTimeout(() => {
    checkForUpdates().catch(() => {
      sendToWindow('update:status', {
        status: 'error',
        releasePageUrl: RELEASE_PAGE_URL,
      });
    });
  }, 3000);
}

async function checkForUpdates() {
  if (!app.isPackaged) {
    sendToWindow('update:status', { status: 'dev' });
    return null;
  }

  return autoUpdater.checkForUpdates();
}

function installUpdate() {
  if (!app.isPackaged) {
    return { success: false };
  }

  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    shell.openExternal(RELEASE_PAGE_URL);
    return { success: false, openedBrowser: true, message: error.message };
  }
}

function openReleasePage() {
  return shell.openExternal(RELEASE_PAGE_URL);
}

module.exports = {
  RELEASE_PAGE_URL,
  initAutoUpdater,
  checkForUpdates,
  installUpdate,
  openReleasePage,
};
