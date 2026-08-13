#!/usr/bin/env node
/**
 * Self-check for audit helpers (no network).
 * Run: node scripts/check-audit-helpers.cjs
 */
const assert = require('assert');
const {
  formatDateUtc,
  stableEndDate,
  rangeEndingOn,
} = require('../electron/api.cjs');
const {
  normalizeBaseUrl,
  assertAllowedAiBaseUrl,
} = require('../electron/ai-client.cjs');

const fixed = new Date(Date.UTC(2026, 7, 13));
const end = stableEndDate(fixed);
assert.strictEqual(formatDateUtc(end), '2026-08-10');

const r28 = rangeEndingOn(end, 28);
assert.strictEqual(r28.startDate, '2026-07-14');
assert.strictEqual(r28.endDate, '2026-08-10');

const r90 = rangeEndingOn(end, 90);
assert.strictEqual(r90.startDate, '2026-05-13');
assert.strictEqual(r90.endDate, '2026-08-10');

assert.strictEqual(normalizeBaseUrl('https://api.openai.com/v1/'), 'https://api.openai.com/v1');
assertAllowedAiBaseUrl('https://api.openai.com/v1');
assertAllowedAiBaseUrl('http://localhost:11434/v1');

let blocked = false;
try {
  assertAllowedAiBaseUrl('http://example.com/v1');
} catch {
  blocked = true;
}
assert.strictEqual(blocked, true);

console.log('check-audit-helpers: ok');
