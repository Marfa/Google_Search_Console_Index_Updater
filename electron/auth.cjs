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

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/indexing',
  'openid',
  'email',
  'profile',
];

const REDIRECT_PATH = '/oauth/callback';

const AUTH_TIMEOUT_MS = 90 * 1000;

let activeAuthSession = null;

function cancelAuthentication() {
  if (!activeAuthSession) {
    return false;
  }

  const { cleanup, reject } = activeAuthSession;
  activeAuthSession = null;
  cleanup();
  reject(new Error('Авторизация отменена'));
  return true;
}

function formatOAuthError(error, description = '') {
  if (error === 'access_denied') {
    return (
      'Доступ запрещён (403: access_denied). OAuth-приложение в Google Cloud находится в режиме тестирования. ' +
      'Добавьте свой Google-email в список тестовых пользователей: Google Cloud Console → Google Auth Platform → Audience → Test users → Add users. ' +
      'Используйте тот же email, с которым входите в Search Console.'
    );
  }

  if (description) {
    return `Ошибка OAuth (${error}): ${description}`;
  }

  return `Ошибка OAuth: ${error}`;
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
  const config = loadOAuthConfig();
  if (!config?.clientId || !config?.clientSecret) {
    throw new Error('OAuth credentials not configured');
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

async function authenticate() {
  const config = loadOAuthConfig();
  if (!config?.clientId || !config?.clientSecret) {
    throw new Error(
      'Укажите OAuth credentials (Client ID и Client Secret) в настройках приложения'
    );
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
      reject(
        new Error(
          'Время ожидания авторизации истекло. Если Google показал ошибку в браузере, закройте вкладку и попробуйте снова.'
        )
      );
    }, AUTH_TIMEOUT_MS);

    activeAuthSession = { cleanup, reject };

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
        res.end(renderErrorPage(error, description));
        activeAuthSession = null;
        cleanup();
        reject(new Error(formatOAuthError(error, description)));
        return;
      }

      const authCode = requestUrl.searchParams.get('code');
      if (!authCode) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderNoCodePage());
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderSuccessPage());

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
  const token = client.credentials.access_token;
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Не удалось получить информацию о пользователе');
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
