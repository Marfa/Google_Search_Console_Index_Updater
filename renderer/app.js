const { t, setLocale, getLocale, applyTranslations } = window.i18n;

const state = {
  authenticated: false,
  userEmail: '',
  userName: '',
  sites: [],
  results: [],
  processing: false,
  loggingIn: false,
  about: null,
  setupCollapsed: false,
};

const elements = {
  setupCard: document.getElementById('setup-card'),
  toggleSetupBtn: document.getElementById('toggle-setup-btn'),
  authStatus: document.getElementById('auth-status'),
  loginBtn: document.getElementById('login-btn'),
  cancelLoginBtn: document.getElementById('cancel-login-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  aboutBtn: document.getElementById('about-btn'),
  aboutModal: document.getElementById('about-modal'),
  aboutBackdrop: document.getElementById('about-backdrop'),
  aboutCloseBtn: document.getElementById('about-close-btn'),
  aboutVersion: document.getElementById('about-version'),
  aboutSourceLink: document.getElementById('about-source-link'),
  aboutDonateLink: document.getElementById('about-donate-link'),
  aboutCryptoLink: document.getElementById('about-crypto-link'),
  langRu: document.getElementById('lang-ru'),
  langEn: document.getElementById('lang-en'),
  updateStatus: document.getElementById('update-status'),
  workCard: document.getElementById('work-card'),
  resultsCard: document.getElementById('results-card'),
  clientId: document.getElementById('client-id'),
  clientSecret: document.getElementById('client-secret'),
  saveConfigBtn: document.getElementById('save-config-btn'),
  resetConfigBtn: document.getElementById('reset-config-btn'),
  configMessage: document.getElementById('config-message'),
  siteSelect: document.getElementById('site-select'),
  urlsInput: document.getElementById('urls-input'),
  urlsError: document.getElementById('urls-error'),
  processBtn: document.getElementById('process-btn'),
  progressPanel: document.getElementById('progress-panel'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  summary: document.getElementById('summary'),
  resultsBody: document.getElementById('results-body'),
  exportBtn: document.getElementById('export-btn'),
  setupLink: document.getElementById('setup-link'),
  testUsersLink: document.getElementById('test-users-link'),
  enableSearchConsoleApi: document.getElementById('enable-search-console-api'),
  enableIndexingApi: document.getElementById('enable-indexing-api'),
};

function setConfigMessage(text, type = '') {
  elements.configMessage.textContent = text;
  elements.configMessage.className = `status-message ${type}`.trim();
}

function formatError(error) {
  return error?.message || String(error);
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseUrlList(rawValue) {
  const lines = rawValue
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const invalidLines = lines.filter((line) => !isValidUrl(line));

  return {
    lines,
    invalidLines,
    isEmpty: lines.length === 0,
    hasInvalid: invalidLines.length > 0,
  };
}

function updateUrlInputState() {
  const { isEmpty, hasInvalid } = parseUrlList(elements.urlsInput.value);

  elements.urlsInput.classList.toggle('invalid', hasInvalid);
  elements.urlsError.classList.toggle('hidden', !hasInvalid);
  elements.processBtn.disabled = isEmpty || hasInvalid || state.processing;

  return { isEmpty, hasInvalid };
}

function updateSetupCollapsedUi(collapsed) {
  state.setupCollapsed = collapsed;
  elements.setupCard.classList.toggle('collapsed', collapsed);
  elements.toggleSetupBtn.dataset.collapsed = collapsed ? 'true' : 'false';
  elements.toggleSetupBtn.textContent = collapsed ? t('showSetup') : t('hideSetup');
  elements.toggleSetupBtn.setAttribute('data-i18n', collapsed ? 'showSetup' : 'hideSetup');
}

async function setSetupCollapsed(collapsed) {
  updateSetupCollapsedUi(collapsed);
  await window.searchUpdater.setSetupCollapsed(collapsed);
}

function setLoginInProgress(inProgress) {
  state.loggingIn = inProgress;

  if (inProgress) {
    elements.loginBtn.disabled = true;
    elements.loginBtn.classList.add('hidden');
    elements.cancelLoginBtn.classList.remove('hidden');
    return;
  }

  elements.cancelLoginBtn.classList.add('hidden');
  elements.loginBtn.disabled = false;

  if (state.authenticated) {
    elements.loginBtn.classList.add('hidden');
  } else {
    elements.loginBtn.classList.remove('hidden');
  }
}

function formatDate(value) {
  if (!value) {
    return t('emDash');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(getLocale() === 'en' ? 'en-US' : 'ru-RU');
}

function statusLabel(result) {
  switch (result.status) {
    case 'indexed':
      return { text: t('statusIndexed'), className: 'indexed' };
    case 'indexing_requested':
      return { text: t('statusIndexingRequested'), className: 'requested' };
    case 'not_indexed':
      return { text: t('statusNotIndexed'), className: 'error' };
    case 'error':
      return { text: t('statusError'), className: 'error' };
    default:
      return { text: t('statusPending'), className: 'pending' };
  }
}

function actionLabel(result) {
  if (result.status === 'indexed') {
    return t('actionNotNeeded');
  }
  if (result.indexingRequested) {
    return t('actionIndexingSent');
  }
  if (result.indexingError) {
    return t('actionIndexingError', { error: result.indexingError });
  }
  if (result.error) {
    return result.error;
  }
  return t('emDash');
}

function updateAuthUi(auth) {
  state.authenticated = auth.authenticated;
  if (auth.email) {
    state.userEmail = auth.email;
  }
  if (auth.name) {
    state.userName = auth.name;
  }

  if (auth.authenticated) {
    elements.authStatus.textContent = state.userEmail || state.userName || t('authSignedIn');
    elements.loginBtn.classList.add('hidden');
    elements.cancelLoginBtn.classList.add('hidden');
    elements.logoutBtn.classList.remove('hidden');
    elements.workCard.classList.remove('hidden');
  } else {
    elements.authStatus.textContent = t('authNotSignedIn');
    if (!state.loggingIn) {
      elements.loginBtn.classList.remove('hidden');
      elements.loginBtn.disabled = false;
    }
    elements.cancelLoginBtn.classList.add('hidden');
    elements.logoutBtn.classList.add('hidden');
    elements.workCard.classList.add('hidden');
    elements.resultsCard.classList.add('hidden');
  }
}

function renderSites() {
  const selected = elements.siteSelect.value;
  elements.siteSelect.innerHTML = `<option value="">${t('autoDetectSite')}</option>`;

  for (const site of state.sites) {
    const option = document.createElement('option');
    option.value = site.siteUrl;
    option.textContent = `${site.siteUrl} (${site.permissionLevel})`;
    elements.siteSelect.appendChild(option);
  }

  if (selected) {
    elements.siteSelect.value = selected;
  }
}

function renderResults(results) {
  state.results = results;

  const indexed = results.filter((item) => item.status === 'indexed').length;
  const requested = results.filter((item) => item.status === 'indexing_requested').length;
  const failed = results.filter((item) => item.status === 'error' || item.status === 'not_indexed').length;

  elements.summary.innerHTML = `
    <div class="summary-item">
      <strong>${results.length}</strong>
      <span>${t('summaryTotal')}</span>
    </div>
    <div class="summary-item">
      <strong>${indexed}</strong>
      <span>${t('summaryIndexed')}</span>
    </div>
    <div class="summary-item">
      <strong>${requested}</strong>
      <span>${t('summaryRequested')}</span>
    </div>
    <div class="summary-item">
      <strong>${failed}</strong>
      <span>${t('summaryFailed')}</span>
    </div>
  `;

  elements.resultsBody.innerHTML = results
    .map((result) => {
      const status = statusLabel(result);
      return `
        <tr>
          <td class="url-cell">${result.url}</td>
          <td><span class="badge ${status.className}">${status.text}</span></td>
          <td>${result.coverageState || t('emDash')}</td>
          <td>${formatDate(result.lastCrawlTime)}</td>
          <td>${actionLabel(result)}</td>
        </tr>
      `;
    })
    .join('');

  elements.resultsCard.classList.remove('hidden');
}

function exportCsv() {
  const header = [t('colUrl'), t('colStatus'), t('colCoverage'), t('colCrawl'), t('colAction')];
  const rows = state.results.map((result) => {
    const status = statusLabel(result);
    return [
      result.url,
      status.text,
      result.coverageState || '',
      result.lastCrawlTime || '',
      actionLabel(result),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gsc-updater-results-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function applyAuthConfig(config) {
  if (config.clientId) {
    elements.clientId.value = config.clientId;
  }
  if (config.clientSecret) {
    elements.clientSecret.value = config.clientSecret;
  }
}

function progressMessage(progress) {
  if (progress.phase === 'indexing') {
    return t('progressIndexing', { current: progress.current, total: progress.total });
  }
  return t('progressInspecting', { current: progress.current, total: progress.total });
}

function showAboutModal() {
  elements.aboutModal.classList.remove('hidden');
}

function hideAboutModal() {
  elements.aboutModal.classList.add('hidden');
}

async function initAbout() {
  state.about = await window.searchUpdater.getAbout();
  elements.aboutVersion.textContent = state.about.version;
  elements.aboutSourceLink.textContent = state.about.sourceUrl;
  elements.aboutDonateLink.textContent = state.about.donateUrl;
  elements.aboutCryptoLink.textContent = state.about.cryptoDonateUrl;
}

function setUpdateStatus(message, type = '') {
  if (!message) {
    elements.updateStatus.classList.add('hidden');
    elements.updateStatus.textContent = '';
    return;
  }

  elements.updateStatus.textContent = message;
  elements.updateStatus.className = `update-status ${type}`.trim();
  elements.updateStatus.classList.remove('hidden');
}

async function switchLocale(locale) {
  await window.searchUpdater.setLocale(locale);
  setLocale(locale);
  applyTranslations();
  updateSetupCollapsedUi(state.setupCollapsed);
  updateAuthUi({
    authenticated: state.authenticated,
    email: state.userEmail,
    name: state.userName,
  });
  renderSites();
  updateUrlInputState();
  if (state.results.length > 0) {
    renderResults(state.results);
  }
}

async function loadSites() {
  try {
    state.sites = await window.searchUpdater.listSites();
    renderSites();
    return true;
  } catch (error) {
    setConfigMessage(formatError(error), 'error');
    state.sites = [];
    renderSites();
    return false;
  }
}

async function loadInitialState() {
  const appSettings = await window.searchUpdater.getSettings();
  setLocale(appSettings.locale || 'ru');
  applyTranslations();
  updateSetupCollapsedUi(Boolean(appSettings.setupCollapsed));
  await initAbout();
  updateUrlInputState();

  const config = await window.searchUpdater.getAuthConfig();
  applyAuthConfig(config);

  const auth = await window.searchUpdater.getAuthStatus();
  updateAuthUi(auth);

  if (auth.authenticated) {
    await loadSites();
  }
}

elements.resetConfigBtn.addEventListener('click', async () => {
  if (!window.confirm(t('resetConfirm'))) {
    return;
  }

  await window.searchUpdater.resetAuthConfig();
  elements.clientId.value = '';
  elements.clientSecret.value = '';
  state.sites = [];
  renderSites();
  state.userEmail = '';
  state.userName = '';
  updateAuthUi({ authenticated: false });
  setConfigMessage(t('settingsReset'), 'success');
});

elements.saveConfigBtn.addEventListener('click', async () => {
  try {
    const result = await window.searchUpdater.saveAuthConfig({
      clientId: elements.clientId.value,
      clientSecret: elements.clientSecret.value,
    });
    if (result.config) {
      applyAuthConfig(result.config);
    }
    setConfigMessage(t('settingsSaved'), 'success');
  } catch (error) {
    setConfigMessage(formatError(error), 'error');
  }
});

elements.loginBtn.addEventListener('click', async () => {
  setLoginInProgress(true);
  setConfigMessage(t('loginBrowser'), '');

  try {
    const user = await window.searchUpdater.login();
    updateAuthUi({ authenticated: true, ...user });

    const sitesLoaded = await loadSites();
    setConfigMessage(sitesLoaded ? t('loginSuccess') : t('loginSitesFailed'), sitesLoaded ? 'success' : 'error');
  } catch (error) {
    updateAuthUi({ authenticated: false });
    setConfigMessage(formatError(error), 'error');
  } finally {
    setLoginInProgress(false);
  }
});

elements.cancelLoginBtn.addEventListener('click', async () => {
  await window.searchUpdater.cancelLogin();
  setLoginInProgress(false);
  updateAuthUi({ authenticated: false });
  setConfigMessage(t('loginCancelled'), 'error');
});

elements.logoutBtn.addEventListener('click', async () => {
  await window.searchUpdater.logout();
  state.userEmail = '';
  state.userName = '';
  updateAuthUi({ authenticated: false });
  state.sites = [];
  renderSites();
  setConfigMessage(t('logoutDone'), '');
});

elements.urlsInput.addEventListener('input', updateUrlInputState);

elements.toggleSetupBtn.addEventListener('click', async () => {
  await setSetupCollapsed(!state.setupCollapsed);
});

elements.processBtn.addEventListener('click', async () => {
  if (state.processing) {
    return;
  }

  const { lines: urls, isEmpty, hasInvalid } = parseUrlList(elements.urlsInput.value);

  if (isEmpty) {
    setConfigMessage(t('addUrl'), 'error');
    updateUrlInputState();
    return;
  }

  if (hasInvalid) {
    updateUrlInputState();
    return;
  }

  state.processing = true;
  updateUrlInputState();
  elements.resultsCard.classList.add('hidden');
  elements.progressPanel.classList.remove('hidden');
  elements.progressFill.style.width = '0%';
  elements.progressText.textContent = t('processingStart');
  setConfigMessage('', '');

  try {
    const results = await window.searchUpdater.processUrls({
      urls,
      siteUrl: elements.siteSelect.value || null,
    });
    renderResults(results);
    elements.progressFill.style.width = '100%';
    elements.progressText.textContent = t('processingDone');

    const errors = results.filter((item) => item.status === 'error');
    if (errors.length > 0) {
      setConfigMessage(
        t('processingErrors', { failed: errors.length, total: results.length }),
        'error'
      );
    }
  } catch (error) {
    const message = formatError(error);
    setConfigMessage(message, 'error');
    elements.progressText.textContent = message;
  } finally {
    state.processing = false;
    updateUrlInputState();
  }
});

elements.exportBtn.addEventListener('click', exportCsv);
elements.aboutBtn.addEventListener('click', showAboutModal);
elements.aboutCloseBtn.addEventListener('click', hideAboutModal);
elements.aboutBackdrop.addEventListener('click', hideAboutModal);

elements.aboutSourceLink.addEventListener('click', async (event) => {
  event.preventDefault();
  if (state.about?.sourceUrl) {
    await window.searchUpdater.openExternal(state.about.sourceUrl);
  }
});

elements.aboutDonateLink.addEventListener('click', async (event) => {
  event.preventDefault();
  if (state.about?.donateUrl) {
    await window.searchUpdater.openExternal(state.about.donateUrl);
  }
});

elements.aboutCryptoLink.addEventListener('click', async (event) => {
  event.preventDefault();
  if (state.about?.cryptoDonateUrl) {
    await window.searchUpdater.openExternal(state.about.cryptoDonateUrl);
  }
});

elements.langRu.addEventListener('click', () => switchLocale('ru'));
elements.langEn.addEventListener('click', () => switchLocale('en'));

elements.setupLink.addEventListener('click', async (event) => {
  event.preventDefault();
  await window.searchUpdater.openExternal(
    'https://github.com/Marfa/Google_Search_Console_Index_Updater#readme'
  );
});

elements.testUsersLink.addEventListener('click', async (event) => {
  event.preventDefault();
  await window.searchUpdater.openExternal('https://console.cloud.google.com/auth/audience');
});

elements.enableSearchConsoleApi.addEventListener('click', async (event) => {
  event.preventDefault();
  await window.searchUpdater.openExternal(
    'https://console.cloud.google.com/apis/library/searchconsole.googleapis.com'
  );
});

elements.enableIndexingApi.addEventListener('click', async (event) => {
  event.preventDefault();
  await window.searchUpdater.openExternal(
    'https://console.cloud.google.com/apis/library/indexing.googleapis.com'
  );
});

window.searchUpdater.onProgress((progress) => {
  const percent = Math.round((progress.current / progress.total) * 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = progressMessage(progress);
});

window.searchUpdater.onUpdateStatus((status) => {
  switch (status.status) {
    case 'checking':
      setUpdateStatus(t('updateChecking'), 'info');
      break;
    case 'available':
      setUpdateStatus(t('updateAvailable', { version: status.version }), 'info');
      break;
    case 'ready':
      setUpdateStatus(t('updateReady'), 'success');
      break;
    case 'none':
      setUpdateStatus('', '');
      break;
    case 'error':
      setUpdateStatus(t('updateError'), 'error');
      break;
    default:
      break;
  }
});

loadInitialState();
