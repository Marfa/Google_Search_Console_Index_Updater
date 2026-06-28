const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const { app, shell } = require('electron');
const {
  renderSuccessPage,
  renderErrorPage,
  renderNoCodePage,
} = require('./oauth-pages.cjs');
const { loadSettings } = require('./settings.cjs');

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/indexing',
  'openid',
  'email',
  'profile',
];

const REDIRECT_PATH = '/oauth/callback';

const AUTH_TIMEOUT_MS = 90 * 1000;

const AUTH_MESSAGES = {
  ru: {
    cancelled: 'Авторизация отменена',
    credentialsRequired:
      'Укажите OAuth credentials (Client ID и Client Secret) в настройках приложения',
    credentialsNotConfigured: 'OAuth credentials не настроены',
    timeout:
      'Время ожидания авторизации истекло. Если Google показал ошибку в браузере, закройте вкладку и попробуйте снова.',
    userInfoFailed: 'Не удалось получить информацию о пользователе',
    accessDenied:
      'Доступ запрещён (403: access_denied). OAuth-приложение в Google Cloud находится в режиме тестирования. ' +
      'Добавьте свой Google-email в список тестовых пользователей: Google Cloud Console → Google Auth Platform → Audience → Test users → Add users. ' +
      'Используйте тот же email, с которым входите в Search Console.',
    oauthError: (error) => `Ошибка OAuth: ${error}`,
    oauthErrorWithDescription: (error, description) =>
      `Ошибка OAuth (${error}): ${description}`,
  },
  en: {
    cancelled: 'Sign-in cancelled',
    credentialsRequired: 'Enter OAuth credentials (Client ID and Client Secret) in app settings',
    credentialsNotConfigured: 'OAuth credentials are not configured',
    timeout:
      'Sign-in timed out. If Google showed an error in the browser, close the tab and try again.',
    userInfoFailed: 'Failed to fetch user profile',
    accessDenied:
      'Access denied (403: access_denied). The OAuth app in Google Cloud is in testing mode. ' +
      'Add your Google email to test users: Google Cloud Console → Google Auth Platform → Audience → Test users → Add users. ' +
      'Use the same email you sign in to Search Console with.',
    oauthError: (error) => `OAuth error: ${error}`,
    oauthErrorWithDescription: (error, description) =>
      `OAuth error (${error}): ${description}`,
  },
};

let activeAuthSession = null;

function resolveLocale(locale) {
  return locale === 'en' ? 'en' : 'ru';
}

function authText(locale) {
  return AUTH_MESSAGES[resolveLocale(locale)];
}

function cancelAuthentication() {
  if (!activeAuthSession) {
    return false;
  }

  const { cleanup, reject, locale } = activeAuthSession;
  activeAuthSession = null;
  cleanup();
  reject(new Error(authText(locale).cancelled));
  return true;
}

function formatOAuthError(error, description = '', locale = loadSettings().locale) {
  const t = authText(locale);

  if (error === 'access_denied') {
    return t.accessDenied;
  }

  if (description) {
    return t.oauthErrorWithDescription(error, description);
  }

  return t.oauthError(error);
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'oauth-config.json');
}

function getTokenPath() {
  return path.join(app.getPath('userData'), 'tokens.json');
}

function loadOAuthConfig() {
  const userConfig = getConfigPath();
  if (fs.existsSync(userConfig)) {
    return JSON.parse(fs.readFileSync(userConfig, 'utf8'));
  }

  return null;
}

function saveOAuthConfig(config) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

function createOAuthClient(config) {
  return new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: 'http://127.0.0.1:0/oauth/callback',
  });
}

function loadTokens() {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
}

function saveTokens(tokens) {
  fs.writeFileSync(getTokenPath(), JSON.stringify(tokens, null, 2));
}

function clearTokens() {
  const tokenPath = getTokenPath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}

function clearOAuthConfig() {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

function resetOAuthSettings() {
  cancelAuthentication();
  clearTokens();
  clearOAuthConfig();
}

async function getAuthenticatedClient() {
  const locale = loadSettings().locale;
  const config = loadOAuthConfig();
  if (!config?.clientId || !config?.clientSecret) {
    throw new Error(authText(locale).credentialsNotConfigured);
  }

  const client = createOAuthClient(config);
  const tokens = loadTokens();

  if (tokens) {
    client.setCredentials(tokens);
    client.on('tokens', (newTokens) => {
      saveTokens({ ...tokens, ...newTokens });
    });

    try {
      await client.getAccessToken();
      return client;
    } catch {
      clearTokens();
    }
  }

  return null;
}

function startCallbackServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
    server.on('error', reject);
  });
}

async function authenticate(options = {}) {
  const locale = options.locale || loadSettings().locale;
  const t = authText(locale);
  const config = loadOAuthConfig();
  if (!config?.clientId || !config?.clientSecret) {
    throw new Error(t.credentialsRequired);
  }

  const client = createOAuthClient(config);
  const { server, port } = await startCallbackServer();
  const redirectUri = `http://127.0.0.1:${port}${REDIRECT_PATH}`;
  client.redirectUri = redirectUri;

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  const codePromise = new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      if (!server.listening) {
        return;
      }
      server.close();
    };

    const timeout = setTimeout(() => {
      activeAuthSession = null;
      cleanup();
      reject(new Error(t.timeout));
    }, AUTH_TIMEOUT_MS);

    activeAuthSession = { cleanup, reject, locale };

    server.on('request', (req, res) => {
      const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);

      if (requestUrl.pathname !== REDIRECT_PATH) {
        res.writeHead(404);
        res.end();
        return;
      }

      const error = requestUrl.searchParams.get('error');
      if (error) {
        const description = requestUrl.searchParams.get('error_description') || '';
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderErrorPage(error, description, locale));
        activeAuthSession = null;
        cleanup();
        reject(new Error(formatOAuthError(error, description, locale)));
        return;
      }

      const authCode = requestUrl.searchParams.get('code');
      if (!authCode) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderNoCodePage(locale));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderSuccessPage(locale));

      activeAuthSession = null;
      cleanup();
      resolve(authCode);
    });
  });

  await shell.openExternal(authUrl);

  let code;
  try {
    code = await codePromise;
  } catch (error) {
    activeAuthSession = null;
    throw error;
  }

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  saveTokens(tokens);

  client.on('tokens', (newTokens) => {
    saveTokens({ ...tokens, ...newTokens });
  });

  return client;
}

async function getUserInfo(client) {
  const locale = loadSettings().locale;
  const token = client.credentials.access_token;
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(authText(locale).userInfoFailed);
  }

  return response.json();
}

module.exports = {
  SCOPES,
  loadOAuthConfig,
  saveOAuthConfig,
  getAuthenticatedClient,
  authenticate,
  cancelAuthentication,
  getUserInfo,
  clearTokens,
  clearOAuthConfig,
  resetOAuthSettings,
};
