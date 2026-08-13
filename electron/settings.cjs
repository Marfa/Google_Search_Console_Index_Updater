const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SUPPORTED_LOCALES = ['ru', 'en'];
const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_AI_MODEL = 'gpt-4o-mini';

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function defaultSettings() {
  return {
    locale: 'ru',
    setupCollapsed: false,
    aiBaseUrl: DEFAULT_AI_BASE_URL,
    aiModel: DEFAULT_AI_MODEL,
  };
}

function normalizeSettings(settings) {
  const next = { ...defaultSettings(), ...settings };

  if (!SUPPORTED_LOCALES.includes(next.locale)) {
    next.locale = 'ru';
  }
  if (typeof next.setupCollapsed !== 'boolean') {
    next.setupCollapsed = false;
  }
  if (typeof next.aiBaseUrl !== 'string' || !next.aiBaseUrl.trim()) {
    next.aiBaseUrl = DEFAULT_AI_BASE_URL;
  }
  if (typeof next.aiModel !== 'string' || !next.aiModel.trim()) {
    next.aiModel = DEFAULT_AI_MODEL;
  }

  return next;
}

function loadSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return defaultSettings();
  }

  try {
    return normalizeSettings(JSON.parse(fs.readFileSync(settingsPath, 'utf8')));
  } catch {
    return defaultSettings();
  }
}

function saveSettings(settings) {
  const next = normalizeSettings({ ...loadSettings(), ...settings });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(next, null, 2));
  return next;
}

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  loadSettings,
  saveSettings,
};
