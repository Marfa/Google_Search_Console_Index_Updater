const fs = require('fs');
const { safeStorage } = require('electron');

const PLAIN_PREFIX = '{';

function canEncrypt() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath);

  if (raw.length > 0 && raw[0] === PLAIN_PREFIX.charCodeAt(0)) {
    return JSON.parse(raw.toString('utf8'));
  }

  if (!canEncrypt()) {
    return JSON.parse(raw.toString('utf8'));
  }

  const decrypted = safeStorage.decryptString(raw);
  return JSON.parse(decrypted);
}

function writeJson(filePath, value) {
  const json = JSON.stringify(value, null, 2);

  if (canEncrypt()) {
    fs.writeFileSync(filePath, safeStorage.encryptString(json), { mode: 0o600 });
    return;
  }

  // ponytail: no OS keychain — plaintext with restrictive mode; upgrade when safeStorage works
  fs.writeFileSync(filePath, json, { mode: 0o600 });
}

module.exports = { readJson, writeJson, canEncrypt };
