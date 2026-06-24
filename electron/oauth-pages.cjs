const { loadSettings } = require('./settings.cjs');

const OAUTH_AUDIENCE_URL = 'https://console.cloud.google.com/auth/audience';

const TEXT = {
  ru: {
    successTitle: 'Авторизация успешна',
    successBody: 'Можно закрыть это окно и вернуться в приложение.',
    errorTitle: 'Ошибка авторизации',
    accessDeniedHint:
      'Если видите <em>access_denied</em>, добавьте свой Google-email в Google Auth Platform → Audience → Test users.',
    openAudience: 'Открыть раздел Audience',
    closeWindow: 'Можно закрыть это окно и вернуться в приложение.',
    noCodeTitle: 'Код авторизации не получен',
  },
  en: {
    successTitle: 'Authorization successful',
    successBody: 'You can close this window and return to the app.',
    errorTitle: 'Authorization error',
    accessDeniedHint:
      'If you see <em>access_denied</em>, add your Google email in Google Auth Platform → Audience → Test users.',
    openAudience: 'Open Audience',
    closeWindow: 'You can close this window and return to the app.',
    noCodeTitle: 'Authorization code was not received',
  },
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveLocale(locale) {
  if (locale === 'en' || locale === 'ru') {
    return locale;
  }

  return loadSettings().locale === 'en' ? 'en' : 'ru';
}

function getTexts(locale) {
  const resolved = resolveLocale(locale);
  return TEXT[resolved] || TEXT.ru;
}

function pageHtml(title, body, locale) {
  const resolved = resolveLocale(locale);

  return `<!DOCTYPE html>
<html lang="${resolved}"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:40px auto;line-height:1.5">
${body}
</body></html>`;
}

function renderSuccessPage(locale) {
  const t = getTexts(locale);
  return pageHtml(t.successTitle, `<h1>${t.successTitle}</h1><p>${t.successBody}</p>`, locale);
}

function renderErrorPage(error, description = '', locale) {
  const t = getTexts(locale);
  const details = description
    ? `: ${escapeHtml(description)}`
    : '';

  return pageHtml(
    t.errorTitle,
    `<h1>${t.errorTitle}</h1>
<p><strong>${escapeHtml(error)}</strong>${details}</p>
<p>${t.accessDeniedHint}</p>
<p><a href="${OAUTH_AUDIENCE_URL}">${t.openAudience}</a></p>
<p>${t.closeWindow}</p>`,
    locale
  );
}

function renderNoCodePage(locale) {
  const t = getTexts(locale);
  return pageHtml(t.noCodeTitle, `<h1>${t.noCodeTitle}</h1><p>${t.closeWindow}</p>`, locale);
}

module.exports = {
  renderSuccessPage,
  renderErrorPage,
  renderNoCodePage,
};
