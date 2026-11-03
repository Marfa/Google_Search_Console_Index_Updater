const path = require('path');
const zlib = require('zlib');

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.csv', '.xls', '.xlsx', '.numbers']);
const URL_RE = /https?:\/\/[^\s"'<>,;\x00-\x1f]+/gi;
const TRAILING_JUNK = /[)>:@;,]+$/;
const IGNORED_URL_HOSTS = new Set(['schemas.openxmlformats.org', 'www.w3.org']);
const XLSX_XML_RE = /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/;
const NUMBERS_IWA_RE = /^Index\/.+\.iwa$/i;

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

function readZipLocalEntries(buffer, nameRe, onEntry) {
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

    if (nameRe.test(name)) {
      let payload = null;
      if (method === 0) {
        payload = data;
      } else if (method === 8) {
        try {
          payload = zlib.inflateRawSync(data);
        } catch {
          payload = null;
        }
      }

      if (payload) {
        onEntry(name, payload);
      }
    }

    offset = dataStart + compSize;
  }
}

function extractTextFromXlsxBuffer(buffer) {
  const texts = [];
  readZipLocalEntries(buffer, XLSX_XML_RE, (_name, xml) => {
    texts.push(xml.toString('utf8'));
  });
  return texts.join('\n');
}

function snappyDecompress(data) {
  let offset = 0;
  while (offset < data.length) {
    const byte = data[offset];
    offset += 1;
    if ((byte & 0x80) === 0) {
      break;
    }
  }

  let out = Buffer.alloc(Math.max(data.length * 2, 64));
  let outLen = 0;

  const ensure = (need) => {
    if (outLen + need <= out.length) {
      return;
    }
    const next = Buffer.alloc(Math.max(out.length * 2, outLen + need));
    out.copy(next, 0, 0, outLen);
    out = next;
  };

  while (offset < data.length) {
    const tag = data[offset];
    offset += 1;
    const element = tag & 0x03;

    if (element === 0) {
      let length = (tag >> 2) + 1;
      if (length >= 61) {
        const nbytes = length - 60;
        length = 1;
        for (let i = 0; i < nbytes; i += 1) {
          length += data[offset + i] << (8 * i);
        }
        offset += nbytes;
      }
      ensure(length);
      data.copy(out, outLen, offset, offset + length);
      outLen += length;
      offset += length;
      continue;
    }

    let length = 0;
    let copyOffset = 0;
    if (element === 1) {
      length = ((tag >> 2) & 0x07) + 4;
      copyOffset = ((tag & 0xe0) << 3) | data[offset];
      offset += 1;
    } else if (element === 2) {
      length = (tag >> 2) + 1;
      copyOffset = data.readUInt16LE(offset);
      offset += 2;
    } else {
      length = (tag >> 2) + 1;
      copyOffset = data.readUInt32LE(offset);
      offset += 4;
    }

    if (copyOffset === 0 || copyOffset > outLen) {
      break;
    }

    ensure(length);
    const start = outLen - copyOffset;
    for (let i = 0; i < length; i += 1) {
      out[outLen + i] = out[start + i];
    }
    outLen += length;
  }

  return out.subarray(0, outLen);
}

function decompressIwaBuffer(buffer) {
  const parts = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const compressedLength = buffer[offset + 1] | (buffer[offset + 2] << 8) | (buffer[offset + 3] << 16);
    offset += 4;
    const chunk = buffer.subarray(offset, offset + compressedLength);
    offset += compressedLength;
    if (!chunk.length) {
      break;
    }

    try {
      parts.push(snappyDecompress(chunk));
    } catch {
      parts.push(chunk);
    }
  }

  return Buffer.concat(parts);
}

function extractTextFromNumbersBuffer(buffer) {
  const texts = [];
  readZipLocalEntries(buffer, NUMBERS_IWA_RE, (_name, iwa) => {
    texts.push(decompressIwaBuffer(iwa).toString('utf8'));
  });
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
  if (ext === '.numbers') {
    return extractUrlsFromText(extractTextFromNumbersBuffer(buffer));
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
