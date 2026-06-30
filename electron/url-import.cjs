const path = require('path');
const zlib = require('zlib');

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.csv', '.xls', '.xlsx']);
const URL_RE = /https?:\/\/[^\s"'<>,;\x00-\x1f]+/gi;
const TRAILING_JUNK = /[)>:@;,]+$/;
const IGNORED_URL_HOSTS = new Set(['schemas.openxmlformats.org', 'www.w3.org']);
const XLSX_XML_RE = /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/;

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

function isIgnoredUrl(url) {
  try {
    return IGNORED_URL_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return true;
  }
}

function extractTextFromXlsxBuffer(buffer) {
  const texts = [];
  let offset = 0;

  while (offset < buffer.length - 4) {
    if (
      buffer[offset] !== 0x50 ||
      buffer[offset + 1] !== 0x4b ||
      buffer[offset + 2] !== 0x03 ||
      buffer[offset + 3] !== 0x04
    ) {
      offset += 1;
      continue;
    }

    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.slice(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buffer.slice(dataStart, dataStart + compSize);

    if (XLSX_XML_RE.test(name)) {
      let xml = null;
      if (method === 0) {
        xml = data;
      } else if (method === 8) {
        try {
          xml = zlib.inflateRawSync(data);
        } catch {
          xml = null;
        }
      }

      if (xml) {
        texts.push(xml.toString('utf8'));
      }
    }

    offset = dataStart + compSize;
  }

  return texts.join('\n');
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
    if (url && !isIgnoredUrl(url)) {
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

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx') {
    return extractUrlsFromText(extractTextFromXlsxBuffer(buffer));
  }

  return extractUrlsFromBuffer(buffer);
}

if (require.main === module) {
  const assert = require('assert');
  const fs = require('fs');

  const samplePath = process.argv[2] || '/Users/konstantiedokucaev/Downloads/fix.xlsx';
  const sample = fs.readFileSync(samplePath);
  const urls = extractUrlsFromFile(path.basename(samplePath), sample);

  assert(urls.length >= 1, 'expected at least one url');
  assert(
    urls.every((url) => isValidHttpUrl(url)),
    'all extracted values must be valid urls'
  );
  assert(
    urls.every((url) => !isIgnoredUrl(url)),
    'xml namespace urls must be filtered out'
  );
  assert(
    !urls.some((url) => /\/[0-9A-Za-z@:)$]$/.test(url)),
    'single-character path suffixes should be trimmed'
  );
  console.log(`url-import ok (${urls.length} urls from ${path.basename(samplePath)})`);
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  isSupportedImportFile,
  extractUrlsFromText,
  extractUrlsFromBuffer,
  extractUrlsFromFile,
};
