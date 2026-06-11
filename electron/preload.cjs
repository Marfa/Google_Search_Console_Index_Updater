const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('searchUpdater', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getAbout: () => ipcRenderer.invoke('app:get-about'),
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
