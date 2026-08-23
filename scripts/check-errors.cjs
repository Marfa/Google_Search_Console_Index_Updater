const assert = require('assert');
const { formatGoogleApiError } = require('../electron/errors.cjs');

const sc = formatGoogleApiError(
  'Search Console API has not been used in project 123 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=123 then retry.',
  'en'
);
assert.ok(sc.includes('Search Console API is not enabled'));
assert.ok(sc.includes('project=123'));

const indexing = formatGoogleApiError(
  'Indexing API has not been used in project 456 before. Visit https://console.developers.google.com/apis/api/indexing.googleapis.com/overview?project=456',
  'en'
);
assert.ok(indexing.includes('Web Search Indexing API is not enabled'));
assert.ok(indexing.includes('project=456'));

assert.strictEqual(
  formatGoogleApiError('evilsearchconsole.googleapis.com.attacker', 'en'),
  'evilsearchconsole.googleapis.com.attacker'
);
assert.strictEqual(
  formatGoogleApiError('prefixindexing.googleapis.com', 'en'),
  'prefixindexing.googleapis.com'
);

console.log('errors self-check ok');
