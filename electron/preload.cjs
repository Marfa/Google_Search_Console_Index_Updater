const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('searchUpdater', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getAbout: () => ipcRenderer.invoke('app:get-about'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximizeChange: (callback) => {
    const listener = (_event, maximized) => callback(maximized);
    ipcRenderer.on('window:maximize-changed', listener);
    return () => ipcRenderer.removeListener('window:maximize-changed', listener);
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getLocale: () => ipcRenderer.invoke('settings:get-locale'),
  setLocale: (locale) => ipcRenderer.invoke('settings:set-locale', locale),
  setSetupCollapsed: (collapsed) => ipcRenderer.invoke('settings:set-setup-collapsed', collapsed),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  openReleasePage: () => ipcRenderer.invoke('update:open-release'),
  getAuthConfig: () => ipcRenderer.invoke('auth:get-config'),
  saveAuthConfig: (config) => ipcRenderer.invoke('auth:save-config', config),
  getAuthStatus: () => ipcRenderer.invoke('auth:status'),
  login: () => ipcRenderer.invoke('auth:login'),
  cancelLogin: () => ipcRenderer.invoke('auth:cancel-login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  resetAuthConfig: () => ipcRenderer.invoke('auth:reset-config'),
  listSites: () => ipcRenderer.invoke('sites:list'),
  processUrls: (payload) => ipcRenderer.invoke('urls:process', payload),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('urls:progress', listener);
    return () => ipcRenderer.removeListener('urls:progress', listener);
  },
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
});
