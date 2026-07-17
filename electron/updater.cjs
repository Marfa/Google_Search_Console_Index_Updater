const { execSync } = require('child_process');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { app, shell } = require('electron');
const { findLatestPlatformRelease, isNewerVersion } = require('./update-check.cjs');
const { isAllowedExternalUrl } = require('./secure-url.cjs');

const RELEASE_PAGE_URL =
  'https://github.com/Marfa/Google_Search_Console_Index_Updater/releases/latest';

function isTrustedReleaseUrl(urlString) {
  if (!isAllowedExternalUrl(urlString)) {
    return false;
  }
  try {
    const url = new URL(urlString);
    return (
      url.hostname === 'github.com' &&
      url.pathname.startsWith('/Marfa/Google_Search_Console_Index_Updater')
    );
  } catch {
    return false;
  }
}

let mainWindow = null;
let autoInstallSupported = null;
let pendingUpdate = null;
let autoUpdaterListenersAttached = false;

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
    autoInstallSupported = false;
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

function requiresManualInstall() {
  return process.platform === 'win32' || !isAutoInstallSupported();
}

function isSignatureInstallError(message = '') {
  return /code signature|подпис|ShipIt|ресурсы кода/i.test(message);
}

function sendToWindow(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function attachAutoUpdaterListeners() {
  if (autoUpdaterListenersAttached) {
    return;
  }

  autoUpdaterListenersAttached = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('update-available', (info) => {
    sendToWindow('update:status', {
      status: 'available',
      version: info.version,
      releasePageUrl: pendingUpdate?.releasePageUrl || RELEASE_PAGE_URL,
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToWindow('update:status', {
      status: 'none',
      installedVersion: app.getVersion(),
      latestVersion: pendingUpdate?.version || app.getVersion(),
    });
    pendingUpdate = null;
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
      releasePageUrl: pendingUpdate?.releasePageUrl || RELEASE_PAGE_URL,
      manualInstallRequired: false,
    });
  });

  autoUpdater.on('error', (error) => {
    const rawMessage = error?.message || 'Unknown update error';
    const manualInstallRequired =
      requiresManualInstall() || isSignatureInstallError(rawMessage);

    if (manualInstallRequired && pendingUpdate) {
      sendToWindow('update:status', {
        status: 'ready',
        version: pendingUpdate.version,
        releasePageUrl: pendingUpdate.releasePageUrl,
        manualInstallRequired: true,
      });
      return;
    }

    sendToWindow('update:status', {
      status: 'error',
      message: manualInstallRequired ? 'unsigned_mac_install' : rawMessage,
      releasePageUrl: pendingUpdate?.releasePageUrl || RELEASE_PAGE_URL,
      manualInstallRequired,
    });
  });
}

function initAutoUpdater(window) {
  mainWindow = window;

  if (!app.isPackaged) {
    return;
  }

  attachAutoUpdaterListeners();

  setTimeout(() => {
    checkForUpdates().catch(() => {
      sendToWindow('update:status', {
        status: 'error',
        releasePageUrl: RELEASE_PAGE_URL,
        manualInstallRequired: requiresManualInstall(),
      });
    });
  }, 3000);
}

async function checkForUpdates() {
  if (!app.isPackaged) {
    sendToWindow('update:status', { status: 'dev' });
    return null;
  }

  sendToWindow('update:status', { status: 'checking' });

  const latest = await findLatestPlatformRelease(process.platform);
  const installedVersion = app.getVersion();

  if (!latest) {
    pendingUpdate = null;
    sendToWindow('update:status', {
      status: 'none',
      installedVersion,
    });
    return null;
  }

  pendingUpdate = latest;

  if (!isNewerVersion(latest.version, installedVersion)) {
    pendingUpdate = null;
    sendToWindow('update:status', {
      status: 'none',
      installedVersion,
      latestVersion: latest.version,
    });
    return null;
  }

  if (requiresManualInstall()) {
    sendToWindow('update:status', {
      status: 'ready',
      version: latest.version,
      releasePageUrl: latest.releasePageUrl,
      manualInstallRequired: true,
    });
    return null;
  }

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: latest.downloadBaseUrl,
  });
  autoUpdater.autoDownload = true;

  return autoUpdater.checkForUpdates();
}

async function installUpdate() {
  if (!app.isPackaged) {
    return { success: false };
  }

  if (requiresManualInstall()) {
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
  const url = pendingUpdate?.releasePageUrl || RELEASE_PAGE_URL;
  if (!isTrustedReleaseUrl(url)) {
    return shell.openExternal(RELEASE_PAGE_URL);
  }
  return shell.openExternal(url);
}

module.exports = {
  RELEASE_PAGE_URL,
  initAutoUpdater,
  checkForUpdates,
  installUpdate,
  openReleasePage,
  isAutoInstallSupported,
};
