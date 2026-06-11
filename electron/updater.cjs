const { execSync } = require('child_process');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { app, shell } = require('electron');

const RELEASE_PAGE_URL =
  'https://github.com/Marfa/Google_Search_Console_Index_Updater/releases/latest';

let mainWindow = null;
let autoInstallSupported = null;

function getAppBundlePath() {
  if (process.platform !== 'darwin') {
    return null;
  }

  return path.resolve(path.dirname(process.execPath), '..', '..', '..');
}

function isAutoInstallSupported() {
  if (autoInstallSupported !== null) {
    return autoInstallSupported;
  }

  if (!app.isPackaged || process.platform !== 'darwin') {
    autoInstallSupported = true;
    return autoInstallSupported;
  }

  try {
    execSync(`codesign --verify --deep --strict "${getAppBundlePath()}"`, {
      stdio: 'pipe',
    });
    autoInstallSupported = true;
  } catch {
    autoInstallSupported = false;
  }

  return autoInstallSupported;
}

function isSignatureInstallError(message = '') {
  return /code signature|подпис|ShipIt|ресурсы кода/i.test(message);
}

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
    const manualInstallRequired = !isAutoInstallSupported();
    sendToWindow('update:status', {
      status: 'ready',
      version: info.version,
      releasePageUrl: RELEASE_PAGE_URL,
      manualInstallRequired,
    });
  });

  autoUpdater.on('error', (error) => {
    const rawMessage = error?.message || 'Unknown update error';
    const manualInstallRequired =
      !isAutoInstallSupported() || isSignatureInstallError(rawMessage);

    sendToWindow('update:status', {
      status: 'error',
      message: manualInstallRequired ? 'unsigned_mac_install' : rawMessage,
      releasePageUrl: RELEASE_PAGE_URL,
      manualInstallRequired,
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

async function installUpdate() {
  if (!app.isPackaged) {
    return { success: false };
  }

  if (!isAutoInstallSupported()) {
    await openReleasePage();
    return {
      success: false,
      manualRequired: true,
      openedBrowser: true,
    };
  }

  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    await openReleasePage();
    return {
      success: false,
      openedBrowser: true,
      manualRequired: isSignatureInstallError(error.message),
      message: error.message,
    };
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
  isAutoInstallSupported,
};
