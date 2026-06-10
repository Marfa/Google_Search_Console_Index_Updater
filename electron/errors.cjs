const API_ENABLE_LINKS = {
  searchconsole: 'https://console.cloud.google.com/apis/library/searchconsole.googleapis.com',
  indexing: 'https://console.cloud.google.com/apis/library/indexing.googleapis.com',
};

function extractProjectId(message) {
  const match = message.match(/project (\d+)/i);
  return match ? match[1] : null;
}

function formatGoogleApiError(message) {
  const projectId = extractProjectId(message);

  if (message.includes('searchconsole.googleapis.com') || message.includes('Search Console API')) {
    const link = projectId
      ? `https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=${projectId}`
      : API_ENABLE_LINKS.searchconsole;

    return (
      'Google Search Console API не включён в вашем проекте Google Cloud. ' +
      `Включите API по ссылке: ${link} ` +
      'После включения подождите 1–2 минуты и повторите попытку.'
    );
  }

  if (message.includes('indexing.googleapis.com') || message.includes('Indexing API')) {
    const link = projectId
      ? `https://console.developers.google.com/apis/api/indexing.googleapis.com/overview?project=${projectId}`
      : API_ENABLE_LINKS.indexing;

    return (
      'Web Search Indexing API не включён в вашем проекте Google Cloud. ' +
      `Включите API по ссылке: ${link} ` +
      'После включения подождите 1–2 минуты и повторите попытку.'
    );
  }

  return message;
}

function formatError(error) {
  let message = error?.message || String(error);

  const ipcMatch = message.match(/Error invoking remote method '[^']+': (?:Error: )?([\s\S]+)/);
  if (ipcMatch) {
    message = ipcMatch[1].trim();
  }

  return formatGoogleApiError(message);
}

module.exports = {
  API_ENABLE_LINKS,
  formatError,
  formatGoogleApiError,
};
