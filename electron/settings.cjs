const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SUPPORTED_LOCALES = ['ru', 'en'];

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return { locale: 'ru', setupCollapsed: false };
  }

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (!SUPPORTED_LOCALES.includes(settings.locale)) {
      settings.locale = 'ru';
    }
    if (typeof settings.setupCollapsed !== 'boolean') {
      settings.setupCollapsed = false;
    }
    return settings;
  } catch {
    return { locale: 'ru', setupCollapsed: false };
  }
}

function saveSettings(settings) {
  const current = loadSettings();
  const next = { ...current, ...settings };

  if (next.locale && !SUPPORTED_LOCALES.includes(next.locale)) {
    next.locale = 'ru';
  }

  fs.writeFileSync(getSettingsPath(), JSON.stringify(next, null, 2));
  return next;
}

module.exports = {
  SUPPORTED_LOCALES,
  loadSettings,
  saveSettings,
};
