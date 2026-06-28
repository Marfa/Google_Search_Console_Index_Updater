const path = require('path');

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.csv', '.xls', '.xlsx']);
// ponytail: regex over file bytes, not a real spreadsheet parser; ceiling: exotic xls/xlsx layouts; upgrade: sheetjs
const URL_RE = /https?:\/\/[^\s"'<>,;\x00-\x1f]+/gi;
const TRAILING_JUNK = /[)>:@;,]+$/;

function isSupportedImportFile(filePath) {
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanUrlCandidate(raw) {
  let candidate = String(raw).trim().replace(TRAILING_JUNK, '');

  while (candidate.length > 8) {
    if (!isValidHttpUrl(candidate)) {
      candidate = candidate.slice(0, -1);
      continue;
    }

    const url = new URL(candidate);
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];

    if (last && last.length === 1 && /^[0-9A-Za-z@:)$]$/.test(last)) {
      segments.pop();
      url.pathname = segments.length ? `/${segments.join('/')}` : '/';
      candidate = url.href;
      continue;
    }

    return url.href;
  }

  return null;
}

function decodeBuffer(buffer) {
  const chunks = [buffer.toString('utf8'), buffer.toString('latin1')];
  const utf16Chars = [];

  for (let index = 0; index + 1 < buffer.length; index += 2) {
    const code = buffer[index] | (buffer[index + 1] << 8);

    if (code >= 32 && code < 127) {
      utf16Chars.push(String.fromCharCode(code));
    } else if (code === 10 || code === 13) {
      utf16Chars.push('\n');
    } else {
      utf16Chars.push(' ');
    }
  }

  chunks.push(utf16Chars.join(''));
  return chunks;
}

function extractUrlsFromText(text) {
  const found = new Set();

  for (const match of String(text).matchAll(URL_RE)) {
    const url = cleanUrlCandidate(match[0]);
    if (url) {
      found.add(url);
    }
  }

  return [...found];
}

function extractUrlsFromBuffer(buffer) {
  const found = new Set();

  for (const text of decodeBuffer(buffer)) {
    for (const url of extractUrlsFromText(text)) {
      found.add(url);
    }
  }

  return [...found];
}

function extractUrlsFromFile(filePath, buffer) {
  if (!isSupportedImportFile(filePath)) {
    throw new Error('unsupported_file_type');
  }

  return extractUrlsFromBuffer(buffer);
}

if (require.main === module) {
  const assert = require('assert');
  const fs = require('fs');

  const sample = fs.readFileSync(
    process.argv[2] || '/Users/Blogger/Downloads/393879_DataTable_24062026131646.xls'
  );
  const urls = extractUrlsFromFile('sample.xls', sample);

  assert(urls.length >= 10, 'expected multiple urls');
  assert(
    urls.every((url) => isValidHttpUrl(url)),
    'all extracted values must be valid urls'
  );
  assert(
    !urls.some((url) => /\/[0-9A-Za-z@:)$]$/.test(url)),
    'single-character path suffixes should be trimmed'
  );
  console.log(`url-import ok (${urls.length} urls)`);
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  isSupportedImportFile,
  extractUrlsFromText,
  extractUrlsFromBuffer,
  extractUrlsFromFile,
};
