const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const auth = require('./auth.cjs');
const api = require('./api.cjs');
const settings = require('./settings.cjs');
const {
  initAutoUpdater,
  checkForUpdates,
  installUpdate,
  openReleasePage,
} = require('./updater.cjs');
const { formatError } = require('./errors.cjs');
const pkg = require('../package.json');

const APP_TITLE = 'Google Search Console Updater';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: APP_TITLE,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  initAutoUpdater(mainWindow);
}

app.whenReady().then(() => {
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

ipcMain.handle('auth:get-config', async () => {
  const config = auth.loadOAuthConfig();
  return {
    hasConfig: Boolean(config?.clientId && config?.clientSecret),
    clientId: config?.clientId || '',
    clientSecret: config?.clientSecret || '',
  };
});

ipcMain.handle('auth:save-config', async (_event, config) => {
  const existing = auth.loadOAuthConfig();
  const clientId = config?.clientId?.trim();
  const clientSecret = config?.clientSecret?.trim() || existing?.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error('Client ID and Client Secret are required');
  }

  const saved = {
    clientId,
    clientSecret,
  };

  auth.saveOAuthConfig(saved);

  return { success: true, config: saved };
});

ipcMain.handle('auth:status', async () => {
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

ipcMain.handle('auth:login', async () => {
  try {
    const client = await auth.authenticate();
    const user = await auth.getUserInfo(client);
    return {
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    throw new Error(formatError(error));
  }
});

ipcMain.handle('auth:cancel-login', async () => {
  auth.cancelAuthentication();
  return { success: true };
});

ipcMain.handle('auth:logout', async () => {
  auth.clearTokens();
  return { success: true };
});

ipcMain.handle('auth:reset-config', async () => {
  auth.resetOAuthSettings();
  return { success: true };
});

ipcMain.handle('sites:list', async () => {
  try {
    const client = await auth.getAuthenticatedClient();
    if (!client) {
      throw new Error('Authentication required');
    }
    return api.listSites(client);
  } catch (error) {
    throw new Error(formatError(error));
  }
});

ipcMain.handle('urls:process', async (_event, payload) => {
  try {
    const client = await auth.getAuthenticatedClient();
    if (!client) {
      throw new Error('Authentication required');
    }

    const urls = (payload.urls || [])
      .map((line) => line.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      throw new Error('URL list is empty');
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

ipcMain.handle('shell:open-external', async (_event, url) => {
  await shell.openExternal(url);
});
