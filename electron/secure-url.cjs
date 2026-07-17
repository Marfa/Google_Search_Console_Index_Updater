/**
 * Only http(s) URLs may leave the app. Blocks file:, javascript:, custom protocols.
 */
function isAllowedExternalUrl(urlString) {
  if (typeof urlString !== 'string' || !urlString.trim()) {
    return false;
  }

  try {
    const url = new URL(urlString);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

module.exports = { isAllowedExternalUrl };
