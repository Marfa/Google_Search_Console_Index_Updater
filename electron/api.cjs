const { formatGoogleApiError } = require('./errors.cjs');

const SEARCH_CONSOLE_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';
const URL_INSPECTION_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const INDEXING_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

const INDEXED_STATES = new Set([
  'SUBMITTED_AND_INDEXED',
  'INDEXED',
]);

const INDEXED_VERDICTS = new Set(['PASS']);

async function apiRequest(client, url, options = {}) {
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const rawMessage =
      data?.error?.message ||
      data?.error?.errors?.[0]?.message ||
      `HTTP ${response.status}`;
    const error = new Error(formatGoogleApiError(rawMessage));
    error.status = response.status;
    error.data = data;
    error.rawMessage = rawMessage;
    throw error;
  }

  return data;
}

async function listSites(client) {
  const data = await apiRequest(client, `${SEARCH_CONSOLE_BASE}/sites`);
  const entries = data.siteEntry || [];

  return entries
    .filter((site) => site.permissionLevel && site.permissionLevel !== 'siteUnverifiedUser')
    .map((site) => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel,
    }))
    .sort((a, b) => a.siteUrl.localeCompare(b.siteUrl));
}

function normalizeSiteUrl(siteUrl) {
  if (siteUrl.startsWith('sc-domain:')) {
    return siteUrl;
  }
  return siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
}

function urlBelongsToProperty(url, siteUrl) {
  try {
    const parsed = new URL(url);

    if (siteUrl.startsWith('sc-domain:')) {
      const domain = siteUrl.replace('sc-domain:', '');
      return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
    }

    const property = new URL(siteUrl);
    const propertyPath = property.pathname === '/' ? '' : property.pathname.replace(/\/$/, '');
    const urlPath = parsed.pathname.replace(/\/$/, '');

    return (
      parsed.protocol === property.protocol &&
      parsed.hostname === property.hostname &&
      parsed.port === property.port &&
      (propertyPath === '' || urlPath.startsWith(propertyPath))
    );
  } catch {
    return false;
  }
}

function findPropertyForUrl(url, sites) {
  const matches = sites.filter((site) => urlBelongsToProperty(url, site.siteUrl));

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => {
    const aLen = a.siteUrl.startsWith('sc-domain:') ? 0 : a.siteUrl.length;
    const bLen = b.siteUrl.startsWith('sc-domain:') ? 0 : b.siteUrl.length;
    return bLen - aLen;
  })[0];
}

function isIndexed(inspectionResult) {
  const indexStatus = inspectionResult?.indexStatusResult;
  if (!indexStatus) {
    return false;
  }

  const coverageState = indexStatus.coverageState || '';
  const verdict = indexStatus.verdict || '';

  if (INDEXED_STATES.has(coverageState)) {
    return true;
  }

  if (INDEXED_VERDICTS.has(verdict) && coverageState !== 'URL_IS_UNKNOWN') {
    return true;
  }

  return false;
}

async function inspectUrl(client, inspectionUrl, siteUrl) {
  const data = await apiRequest(client, URL_INSPECTION_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      inspectionUrl,
      siteUrl: normalizeSiteUrl(siteUrl),
      languageCode: 'ru-RU',
    }),
  });

  const indexStatus = data.inspectionResult?.indexStatusResult || {};

  return {
    inspectionUrl,
    siteUrl,
    indexed: isIndexed(data.inspectionResult),
    coverageState: indexStatus.coverageState || 'UNKNOWN',
    verdict: indexStatus.verdict || 'UNKNOWN',
    lastCrawlTime: indexStatus.lastCrawlTime || null,
    pageFetchState: indexStatus.pageFetchState || null,
    indexingState: indexStatus.indexingState || null,
    raw: data.inspectionResult,
  };
}

async function requestIndexing(client, url) {
  const data = await apiRequest(client, INDEXING_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      url,
      type: 'URL_UPDATED',
    }),
  });

  return {
    url,
    success: true,
    notifyTime: data.urlNotificationMetadata?.latestUpdate?.notifyTime || null,
    raw: data,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateUtc(date) {
  return date.toISOString().slice(0, 10);
}

/** Last complete GSC day (data lag ~2–3 days). */
function stableEndDate(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - 3);
  return end;
}

function rangeEndingOn(endDate, days) {
  const start = new Date(endDate.getTime());
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    startDate: formatDateUtc(start),
    endDate: formatDateUtc(endDate),
  };
}

function encodeSiteUrl(siteUrl) {
  return encodeURIComponent(siteUrl);
}

function mapMetricRow(row) {
  if (!row) {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }
  return {
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  };
}

function mapDimensionRows(rows) {
  return (rows || []).map((row) => ({
    keys: row.keys || [],
    ...mapMetricRow(row),
  }));
}

async function searchAnalyticsQuery(client, siteUrl, body) {
  const url = `${SEARCH_CONSOLE_BASE}/sites/${encodeSiteUrl(siteUrl)}/searchAnalytics/query`;
  return apiRequest(client, url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function listSitemaps(client, siteUrl) {
  const url = `${SEARCH_CONSOLE_BASE}/sites/${encodeSiteUrl(siteUrl)}/sitemaps`;
  const data = await apiRequest(client, url);
  return (data.sitemap || []).map((entry) => ({
    path: entry.path,
    lastSubmitted: entry.lastSubmitted || null,
    lastDownloaded: entry.lastDownloaded || null,
    isPending: Boolean(entry.isPending),
    isSitemapsIndex: Boolean(entry.isSitemapsIndex),
    errors: Number(entry.errors || 0),
    warnings: Number(entry.warnings || 0),
  }));
}

async function collectAuditBaseline(client, siteUrl) {
  const end = stableEndDate();
  const range28 = rangeEndingOn(end, 28);
  const range90 = rangeEndingOn(end, 90);

  const [totals28, totals90, topQueries, topPages, sitemaps] = await Promise.all([
    searchAnalyticsQuery(client, siteUrl, {
      startDate: range28.startDate,
      endDate: range28.endDate,
      searchType: 'web',
    }),
    searchAnalyticsQuery(client, siteUrl, {
      startDate: range90.startDate,
      endDate: range90.endDate,
      searchType: 'web',
    }),
    searchAnalyticsQuery(client, siteUrl, {
      startDate: range28.startDate,
      endDate: range28.endDate,
      dimensions: ['query'],
      rowLimit: 50,
      searchType: 'web',
    }),
    searchAnalyticsQuery(client, siteUrl, {
      startDate: range28.startDate,
      endDate: range28.endDate,
      dimensions: ['page'],
      rowLimit: 50,
      searchType: 'web',
    }),
    listSitemaps(client, siteUrl),
  ]);

  return {
    siteUrl,
    collectedAt: new Date().toISOString(),
    windows: {
      d28: range28,
      d90: range90,
    },
    totals: {
      d28: mapMetricRow(totals28.rows?.[0]),
      d90: mapMetricRow(totals90.rows?.[0]),
    },
    topQueries: mapDimensionRows(topQueries.rows),
    topPages: mapDimensionRows(topPages.rows),
    sitemaps,
  };
}

async function processUrls(client, urls, options = {}) {
  const { onProgress, selectedSiteUrl, delayMs = 1100 } = options;
  const sites = await listSites(client);
  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) {
      continue;
    }

    const result = {
      url,
      status: 'pending',
      indexed: false,
      coverageState: null,
      verdict: null,
      lastCrawlTime: null,
      indexingRequested: false,
      indexingError: null,
      error: null,
      siteUrl: null,
    };

    try {
      let siteUrl = selectedSiteUrl;

      if (!siteUrl) {
        const property = findPropertyForUrl(url, sites);
        if (!property) {
          throw new Error('URL не принадлежит ни одному доступному свойству Search Console');
        }
        siteUrl = property.siteUrl;
      } else if (!urlBelongsToProperty(url, siteUrl)) {
        throw new Error('URL не принадлежит выбранному свойству Search Console');
      }

      result.siteUrl = siteUrl;

      if (onProgress) {
        onProgress({
          phase: 'inspecting',
          current: i + 1,
          total: urls.length,
          url,
        });
      }

      const inspection = await inspectUrl(client, url, siteUrl);
      result.indexed = inspection.indexed;
      result.coverageState = inspection.coverageState;
      result.verdict = inspection.verdict;
      result.lastCrawlTime = inspection.lastCrawlTime;
      result.status = inspection.indexed ? 'indexed' : 'not_indexed';

      if (!inspection.indexed) {
        if (onProgress) {
          onProgress({
            phase: 'indexing',
            current: i + 1,
            total: urls.length,
            url,
          });
        }

        try {
          await requestIndexing(client, url);
          result.indexingRequested = true;
          result.status = 'indexing_requested';
        } catch (indexError) {
          result.indexingError = indexError.message;
          result.status = 'not_indexed';
        }
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
    }

    results.push(result);

    if (i < urls.length - 1) {
      await delay(delayMs);
    }
  }

  return results;
}

module.exports = {
  listSites,
  inspectUrl,
  requestIndexing,
  processUrls,
  findPropertyForUrl,
  urlBelongsToProperty,
  searchAnalyticsQuery,
  listSitemaps,
  collectAuditBaseline,
  stableEndDate,
  rangeEndingOn,
  formatDateUtc,
};
