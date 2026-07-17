const assert = require('assert');
const { isAllowedExternalUrl } = require('../electron/secure-url.cjs');

assert.strictEqual(isAllowedExternalUrl('https://github.com/Marfa/x'), true);
assert.strictEqual(isAllowedExternalUrl('http://127.0.0.1/oauth'), true);
assert.strictEqual(isAllowedExternalUrl('file:///etc/passwd'), false);
assert.strictEqual(isAllowedExternalUrl('javascript:alert(1)'), false);
assert.strictEqual(isAllowedExternalUrl(''), false);
assert.strictEqual(isAllowedExternalUrl(null), false);

console.log('secure-url self-check ok');
