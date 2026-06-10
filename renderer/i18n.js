const TRANSLATIONS = {
  ru: {
    appTitle: 'Google Search Console Updater',
    subtitle: 'Проверка URL и запрос индексирования через Google Search Console',
    authNotSignedIn: 'Не авторизован',
    authSignedIn: 'Авторизован',
    login: 'Войти в Google',
    cancelLogin: 'Отменить вход',
    logout: 'Выйти',
    about: 'О программе',
    language: 'Язык',
    setupTitle: 'Настройка OAuth',
    setupHint: 'Для работы приложения нужны OAuth-учётные данные из Google Cloud Console.',
    setupLink: 'Инструкция по настройке',
    accessDeniedNotice: 'Ошибка access_denied: добавьте свой Google-email в Google Auth Platform → Audience → Test users.',
    openAudience: 'Открыть Audience',
    apiNotice: 'Обязательные API: включите в Google Cloud Console',
    searchConsoleApi: 'Google Search Console API',
    indexingApi: 'Web Search Indexing API',
    and: 'и',
    clientId: 'Client ID',
    clientSecret: 'Client Secret',
    clientIdPlaceholder: 'xxx.apps.googleusercontent.com',
    clientSecretPlaceholder: 'Введите Client Secret',
    saveSettings: 'Сохранить настройки',
    resetSettings: 'Сбросить настройки',
    workTitle: 'Проверка URL',
    siteProperty: 'Свойство Search Console',
    autoDetectSite: 'Автоопределение по URL',
    urlList: 'Список URL (по одному на строку)',
    urlPlaceholder: 'https://example.com/page-1\nhttps://example.com/page-2',
    processBtn: 'Проверить и запросить индексирование',
    waiting: 'Ожидание...',
    resultsTitle: 'Результаты',
    colUrl: 'URL',
    colStatus: 'Статус',
    colCoverage: 'Состояние индекса',
    colCrawl: 'Последний обход',
    colAction: 'Действие',
    exportCsv: 'Экспорт CSV',
    settingsSaved: 'Настройки сохранены',
    settingsReset: 'OAuth-настройки сброшены',
    resetConfirm: 'Удалить сохранённые OAuth-настройки и выйти из аккаунта Google?',
    loginBrowser: 'Откроется браузер для входа в Google...',
    loginSuccess: 'Авторизация успешна',
    loginSitesFailed: 'Авторизация прошла, но не удалось загрузить свойства Search Console. Проверьте включённые API.',
    loginCancelled: 'Авторизация отменена',
    logoutDone: 'Вы вышли из аккаунта',
    addUrl: 'Добавьте хотя бы один URL',
    processingStart: 'Запуск проверки...',
    processingDone: 'Обработка завершена',
    processingErrors: 'Обработка завершена с ошибками: {failed} из {total}',
    statusIndexed: 'В индексе',
    statusIndexingRequested: 'Запрошено индексирование',
    statusNotIndexed: 'Не в индексе',
    statusError: 'Ошибка',
    statusPending: 'Ожидание',
    actionNotNeeded: 'Действие не требуется',
    actionIndexingSent: 'Отправлен запрос на индексирование',
    actionIndexingError: 'Ошибка запроса: {error}',
    summaryTotal: 'Всего URL',
    summaryIndexed: 'В индексе',
    summaryRequested: 'Запрошено индексирование',
    summaryFailed: 'Ошибки / не в индексе',
    progressInspecting: 'Проверка URL {current} из {total}',
    progressIndexing: 'Запрос индексирования для URL {current} из {total}',
    aboutTitle: 'О программе',
    aboutVersion: 'Версия',
    aboutSource: 'Исходный код',
    aboutDonate: 'Донат',
    aboutDonateCrypto: 'Донат криптой',
    aboutClose: 'Закрыть',
    updateChecking: 'Проверка обновлений...',
    updateAvailable: 'Доступна новая версия {version}. Загрузка...',
    updateReady: 'Обновление загружено. Перезапустите приложение.',
    updateNone: 'Установлена последняя версия',
    updateError: 'Не удалось проверить обновления',
    emDash: '—',
  },
  en: {
    appTitle: 'Google Search Console Updater',
    subtitle: 'URL inspection and indexing requests via Google Search Console',
    authNotSignedIn: 'Not signed in',
    authSignedIn: 'Signed in',
    login: 'Sign in with Google',
    cancelLogin: 'Cancel sign-in',
    logout: 'Sign out',
    about: 'About',
    language: 'Language',
    setupTitle: 'OAuth setup',
    setupHint: 'The app requires OAuth credentials from Google Cloud Console.',
    setupLink: 'Setup guide',
    accessDeniedNotice: 'access_denied error: add your Google email to Google Auth Platform → Audience → Test users.',
    openAudience: 'Open Audience',
    apiNotice: 'Required APIs: enable in Google Cloud Console',
    searchConsoleApi: 'Google Search Console API',
    indexingApi: 'Web Search Indexing API',
    and: 'and',
    clientId: 'Client ID',
    clientSecret: 'Client Secret',
    clientIdPlaceholder: 'xxx.apps.googleusercontent.com',
    clientSecretPlaceholder: 'Enter Client Secret',
    saveSettings: 'Save settings',
    resetSettings: 'Reset settings',
    workTitle: 'URL inspection',
    siteProperty: 'Search Console property',
    autoDetectSite: 'Auto-detect from URL',
    urlList: 'URL list (one per line)',
    urlPlaceholder: 'https://example.com/page-1\nhttps://example.com/page-2',
    processBtn: 'Inspect and request indexing',
    waiting: 'Waiting...',
    resultsTitle: 'Results',
    colUrl: 'URL',
    colStatus: 'Status',
    colCoverage: 'Index state',
    colCrawl: 'Last crawl',
    colAction: 'Action',
    exportCsv: 'Export CSV',
    settingsSaved: 'Settings saved',
    settingsReset: 'OAuth settings reset',
    resetConfirm: 'Delete saved OAuth settings and sign out of Google?',
    loginBrowser: 'A browser window will open for Google sign-in...',
    loginSuccess: 'Signed in successfully',
    loginSitesFailed: 'Signed in, but failed to load Search Console properties. Check enabled APIs.',
    loginCancelled: 'Sign-in cancelled',
    logoutDone: 'Signed out',
    addUrl: 'Add at least one URL',
    processingStart: 'Starting inspection...',
    processingDone: 'Processing complete',
    processingErrors: 'Completed with errors: {failed} of {total}',
    statusIndexed: 'Indexed',
    statusIndexingRequested: 'Indexing requested',
    statusNotIndexed: 'Not indexed',
    statusError: 'Error',
    statusPending: 'Pending',
    actionNotNeeded: 'No action needed',
    actionIndexingSent: 'Indexing request sent',
    actionIndexingError: 'Request error: {error}',
    summaryTotal: 'Total URLs',
    summaryIndexed: 'Indexed',
    summaryRequested: 'Indexing requested',
    summaryFailed: 'Errors / not indexed',
    progressInspecting: 'Inspecting URL {current} of {total}',
    progressIndexing: 'Requesting indexing for URL {current} of {total}',
    aboutTitle: 'About',
    aboutVersion: 'Version',
    aboutSource: 'Source code',
    aboutDonate: 'Donate',
    aboutDonateCrypto: 'Crypto donation',
    aboutClose: 'Close',
    updateChecking: 'Checking for updates...',
    updateAvailable: 'Update {version} available. Downloading...',
    updateReady: 'Update downloaded. Restart the app.',
    updateNone: 'You have the latest version',
    updateError: 'Failed to check for updates',
    emDash: '—',
  },
};

let currentLocale = 'ru';

function t(key, params = {}) {
  const dict = TRANSLATIONS[currentLocale] || TRANSLATIONS.ru;
  let value = dict[key] || TRANSLATIONS.ru[key] || key;

  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }

  return value;
}

function setLocale(locale) {
  currentLocale = TRANSLATIONS[locale] ? locale : 'ru';
  document.documentElement.lang = currentLocale;
  applyTranslations();
  return currentLocale;
}

function getLocale() {
  return currentLocale;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-html]').forEach((element) => {
    const key = element.dataset.i18nHtml;
    element.innerHTML = t(key);
  });

  const langRu = document.getElementById('lang-ru');
  const langEn = document.getElementById('lang-en');
  if (langRu && langEn) {
    langRu.classList.toggle('active', currentLocale === 'ru');
    langEn.classList.toggle('active', currentLocale === 'en');
  }
}

window.i18n = {
  t,
  setLocale,
  getLocale,
  applyTranslations,
};
