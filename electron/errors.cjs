const { loadSettings } = require('./settings.cjs');

const API_ENABLE_LINKS = {
  searchconsole: 'https://console.cloud.google.com/apis/library/searchconsole.googleapis.com',
  indexing: 'https://console.cloud.google.com/apis/library/indexing.googleapis.com',
};

const MESSAGES = {
  en: {
    searchConsoleApi:
      'Google Search Console API is not enabled in your Google Cloud project. Enable it here: {link} Wait 1–2 minutes after enabling, then try again.',
    indexingApi:
      'Web Search Indexing API is not enabled in your Google Cloud project. Enable it here: {link} Wait 1–2 minutes after enabling, then try again.',
    clientCredentialsRequired: 'Client ID and Client Secret are required',
    authRequired: 'Authentication required',
    urlListEmpty: 'URL list is empty',
  },
  ru: {
    searchConsoleApi:
      'Google Search Console API не включён в вашем проекте Google Cloud. Включите API по ссылке: {link} После включения подождите 1–2 минуты и повторите попытку.',
    indexingApi:
      'Web Search Indexing API не включён в вашем проекте Google Cloud. Включите API по ссылке: {link} После включения подождите 1–2 минуты и повторите попытку.',
    clientCredentialsRequired: 'Укажите Client ID и Client Secret',
    authRequired: 'Требуется авторизация',
    urlListEmpty: 'Список URL пуст',
  },
};

function resolveLocale(locale) {
  return locale === 'en' ? 'en' : 'ru';
}

function fill(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

function extractProjectId(message) {
  const match = message.match(/project (\d+)/i);
  return match ? match[1] : null;
}

function formatGoogleApiError(message, locale = loadSettings().locale) {
  const texts = MESSAGES[resolveLocale(locale)];
  const projectId = extractProjectId(message);

  if (message.includes('searchconsole.googleapis.com') || message.includes('Search Console API')) {
    const link = projectId
      ? `https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=${projectId}`
      : API_ENABLE_LINKS.searchconsole;

    return fill(texts.searchConsoleApi, { link });
  }

  if (message.includes('indexing.googleapis.com') || message.includes('Indexing API')) {
    const link = projectId
      ? `https://console.developers.google.com/apis/api/indexing.googleapis.com/overview?project=${projectId}`
      : API_ENABLE_LINKS.indexing;

    return fill(texts.indexingApi, { link });
  }

  return message;
}

function formatError(error, locale = loadSettings().locale) {
  let message = error?.message || String(error);

  const ipcMatch = message.match(/Error invoking remote method '[^']+': (?:Error: )?([\s\S]+)/);
  if (ipcMatch) {
    message = ipcMatch[1].trim();
  }

  return formatGoogleApiError(message, locale);
}

function appMessage(key, locale = loadSettings().locale) {
  return MESSAGES[resolveLocale(locale)][key];
}

module.exports = {
  API_ENABLE_LINKS,
  formatError,
  formatGoogleApiError,
  appMessage,
};
