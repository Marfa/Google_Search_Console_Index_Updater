const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { readJson, writeJson } = require('./secure-store.cjs');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

function getAiConfigPath() {
  return path.join(app.getPath('userData'), 'ai-config.json');
}

function loadAiSecrets() {
  try {
    return readJson(getAiConfigPath()) || {};
  } catch {
    return {};
  }
}

function getApiKey() {
  const secrets = loadAiSecrets();
  return typeof secrets.apiKey === 'string' ? secrets.apiKey : '';
}

function saveApiKey(apiKey) {
  const trimmed = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!trimmed) {
    throw new Error('API key is required');
  }
  writeJson(getAiConfigPath(), { apiKey: trimmed });
}

function clearApiKey() {
  const configPath = getAiConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

function hasApiKey() {
  return Boolean(getApiKey());
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  getApiKey,
  saveApiKey,
  clearApiKey,
  hasApiKey,
};
