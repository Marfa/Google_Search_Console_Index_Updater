const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const auth = require('./auth.cjs');
const api = require('./api.cjs');
const settings = require('./settings.cjs');
const { extractUrlsFromFile } = require('./url-import.cjs');
const {
  initAutoUpdater,
  checkForUpdates,
  installUpdate,
  openReleasePage,
} = require('./updater.cjs');
const { formatError, appMessage } = require('./errors.cjs');
const { isAllowedExternalUrl } = require('./secure-url.cjs');
const pkg = require('../package.json');

const APP_TITLE = 'Google Search Console Updater';
const APP_BACKGROUND = '#f4f6f8';
const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
const RENDERER_INDEX = path.join(RENDERER_DIR, 'index.html');
const RENDERER_DIR_URL = pathToFileURL(RENDERER_DIR + path.sep).href;

let mainWindow = null;

function isTrustedRendererUrl(url) {
  return typeof url === 'string' && url.startsWith(RENDERER_DIR_URL);
}

function assertTrustedSender(event) {
  const url = event.senderFrame?.url || '';
  if (!isTrustedRendererUrl(url)) {
    throw new Error('Untrusted IPC sender');
  }
}

function openExternalSafe(url) {
  if (!isAllowedExternalUrl(url)) {
    throw new Error('Blocked external URL');
  }
  return shell.openExternal(url);
}

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
}

function getAppIconPath() {
  return path.join(__dirname, '..', 'build', 'icon.png');
}

function createWindow() {
  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: APP_TITLE,
    icon: iconPath,
    backgroundColor: APP_BACKGROUND,
    ...(process.platform === 'win32'
      ? {
          frame: false,
          thickFrame: false,
          hasShadow: false,
          backgroundMaterial: 'none',
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTrustedRendererUrl(url)) {
      return;
    }
    event.preventDefault();
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url);
    }
  });

  mainWindow.loadFile(RENDERER_INDEX);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  if (process.platform === 'win32') {
    mainWindow.on('maximize', () => {
      mainWindow.webContents.send('window:maximize-changed', true);
    });
    mainWindow.on('unmaximize', () => {
      mainWindow.webContents.send('window:maximize-changed', false);
    });
  }

  initAutoUpdater(mainWindow);
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null);
  }

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(getAppIconPath());
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('app:get-version', async () => pkg.version);

ipcMain.handle('app:get-about', async () => ({
  version: pkg.version,
  sourceUrl: 'https://github.com/Marfa/Google_Search_Console_Index_Updater',
  donateUrl: 'https://www.donationalerts.com/r/themarfa',
  cryptoDonateUrl: 'https://nowpayments.io/donation/themarfa',
}));

ipcMain.handle('app:get-platform', async () => process.platform);

ipcMain.handle('window:minimize', async () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', async () => {
  if (!mainWindow) {
    return { maximized: false };
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }

  return { maximized: mainWindow.isMaximized() };
});

ipcMain.handle('window:close', async () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', async () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('settings:get', async () => settings.loadSettings());

ipcMain.handle('settings:get-locale', async () => settings.loadSettings().locale);

ipcMain.handle('settings:set-locale', async (_event, locale) => {
  const saved = settings.saveSettings({ locale });
  return saved.locale;
});

ipcMain.handle('settings:set-setup-collapsed', async (_event, collapsed) => {
  const saved = settings.saveSettings({ setupCollapsed: Boolean(collapsed) });
  return saved.setupCollapsed;
});

ipcMain.handle('update:check', async () => {
  try {
    await checkForUpdates();
    return { success: true };
  } catch (error) {
    throw new Error(formatError(error));
  }
});

ipcMain.handle('update:install', async () => installUpdate());

ipcMain.handle('update:open-release', async () => {
  await openReleasePage();
  return { success: true };
});

ipcMain.handle('auth:get-config', async (event) => {
  assertTrustedSender(event);
  const config = auth.loadOAuthConfig();
  return {
    hasConfig: Boolean(config?.clientId && config?.clientSecret),
    hasClientSecret: Boolean(config?.clientSecret),
    clientId: config?.clientId || '',
  };
});

ipcMain.handle('auth:save-config', async (event, config) => {
  assertTrustedSender(event);
  const existing = auth.loadOAuthConfig();
  const clientId = config?.clientId?.trim();
  const clientSecret = config?.clientSecret?.trim() || existing?.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error(appMessage('clientCredentialsRequired'));
  }

  auth.saveOAuthConfig({
    clientId,
    clientSecret,
  });

  return {
    success: true,
    config: {
      clientId,
      hasClientSecret: true,
      hasConfig: true,
    },
  };
});

ipcMain.handle('auth:status', async (event) => {
  assertTrustedSender(event);
  try {
    const client = await auth.getAuthenticatedClient();
    if (!client) {
      return { authenticated: false };
    }

    const user = await auth.getUserInfo(client);
    return {
      authenticated: true,
      email: user.email,
      name: user.name,
    };
  } catch {
    return { authenticated: false };
  }
});

ipcMain.handle('auth:login', async (event, options = {}) => {
  assertTrustedSender(event);
  try {
    const locale = options.locale || settings.loadSettings().locale;
    const client = await auth.authenticate({ locale });
    const user = await auth.getUserInfo(client);
    return {
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    throw new Error(formatError(error));
  }
});

ipcMain.handle('auth:cancel-login', async (event) => {
  assertTrustedSender(event);
  auth.cancelAuthentication();
  return { success: true };
});

ipcMain.handle('auth:logout', async (event) => {
  assertTrustedSender(event);
  auth.clearTokens();
  return { success: true };
});

ipcMain.handle('auth:reset-config', async (event) => {
  assertTrustedSender(event);
  auth.resetOAuthSettings();
  return { success: true };
});

ipcMain.handle('sites:list', async (event) => {
  assertTrustedSender(event);
  try {
    const client = await auth.getAuthenticatedClient();
    if (!client) {
      throw new Error(appMessage('authRequired'));
    }
    return api.listSites(client);
  } catch (error) {
    throw new Error(formatError(error));
  }
});

ipcMain.handle('urls:import-file', async (event) => {
  assertTrustedSender(event);
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'URL lists', extensions: ['txt', 'csv', 'xls', 'xlsx'] },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);

  try {
    const urls = extractUrlsFromFile(filePath, buffer);
    return {
      canceled: false,
      fileName: path.basename(filePath),
      urls,
    };
  } catch (error) {
    if (error.message === 'unsupported_file_type') {
      throw new Error('unsupported_file_type');
    }
    throw error;
  }
});

ipcMain.handle('urls:process', async (event, payload) => {
  assertTrustedSender(event);
  try {
    const client = await auth.getAuthenticatedClient();
    if (!client) {
      throw new Error(appMessage('authRequired'));
    }

    const urls = (payload.urls || [])
      .map((line) => line.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      throw new Error(appMessage('urlListEmpty'));
    }

    const results = await api.processUrls(client, urls, {
      selectedSiteUrl: payload.siteUrl || null,
      onProgress: (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('urls:progress', progress);
        }
      },
    });

    return results;
  } catch (error) {
    throw new Error(formatError(error));
  }
});

ipcMain.handle('shell:open-external', async (event, url) => {
  assertTrustedSender(event);
  await openExternalSafe(url);
});
