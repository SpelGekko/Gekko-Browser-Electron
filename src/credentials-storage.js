const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// safeStorage is only available after app ready — require lazily
const getSafeStorage = () => require('electron').safeStorage;
const getFilePath = () => path.join(require('electron').app.getPath('userData'), 'credentials.json');

const EMPTY_STORE = { credentials: [], neverSave: [] };

const ensureFile = () => {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(EMPTY_STORE));
  }
};

const loadStore = () => {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(getFilePath(), 'utf8'));
    // Migrate old flat-array format
    if (Array.isArray(data)) return { credentials: data, neverSave: [] };
    return { credentials: data.credentials || [], neverSave: data.neverSave || [] };
  } catch {
    return { ...EMPTY_STORE };
  }
};

const saveStore = (store) => {
  try {
    fs.writeFileSync(getFilePath(), JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('credentials-storage: write failed', err);
    return false;
  }
};

const encrypt = (text) => {
  const ss = getSafeStorage();
  if (!ss.isEncryptionAvailable()) return Buffer.from(text).toString('base64');
  return ss.encryptString(text).toString('base64');
};

const decrypt = (encoded) => {
  try {
    const buf = Buffer.from(encoded, 'base64');
    const ss = getSafeStorage();
    if (!ss.isEncryptionAvailable()) return buf.toString('utf8');
    return ss.decryptString(buf);
  } catch {
    return '';
  }
};

const normaliseOrigin = (url) => {
  try { return new URL(url).origin; } catch { return url; }
};

// Save or update a credential. Keyed by (origin, username).
const saveCredential = (origin, username, password) => {
  origin = normaliseOrigin(origin);
  const store = loadStore();
  const idx = store.credentials.findIndex(e => e.origin === origin && e.username === username);
  const now = Date.now();
  if (idx >= 0) {
    store.credentials[idx].password = encrypt(password);
    store.credentials[idx].updatedAt = now;
  } else {
    store.credentials.push({ id: randomUUID(), origin, username, password: encrypt(password), createdAt: now, updatedAt: now });
  }
  return saveStore(store);
};

// Returns decrypted credentials for autofill — never exposed to page JS directly.
const getCredentialsForOrigin = (origin) => {
  origin = normaliseOrigin(origin);
  return loadStore().credentials
    .filter(e => e.origin === origin)
    .map(e => ({ id: e.id, origin: e.origin, username: e.username, password: decrypt(e.password), updatedAt: e.updatedAt }));
};

// Returns metadata only (no passwords) for the manager UI.
const getAllCredentials = () => {
  return loadStore().credentials.map(({ id, origin, username, createdAt, updatedAt }) => ({ id, origin, username, createdAt, updatedAt }));
};

const deleteCredential = (id) => {
  const store = loadStore();
  const before = store.credentials.length;
  store.credentials = store.credentials.filter(e => e.id !== id);
  if (store.credentials.length === before) return false;
  return saveStore(store);
};

const updateCredential = (id, { username, password }) => {
  const store = loadStore();
  const idx = store.credentials.findIndex(e => e.id === id);
  if (idx < 0) return false;
  if (username !== undefined) store.credentials[idx].username = username;
  if (password !== undefined) store.credentials[idx].password = encrypt(password);
  store.credentials[idx].updatedAt = Date.now();
  return saveStore(store);
};

// Returns one credential with password decrypted (for copy-password in the UI).
const getDecryptedCredential = (id) => {
  const entry = loadStore().credentials.find(e => e.id === id);
  if (!entry) return null;
  return { ...entry, password: decrypt(entry.password) };
};

const addNeverSave = (origin) => {
  origin = normaliseOrigin(origin);
  const store = loadStore();
  if (!store.neverSave.includes(origin)) {
    store.neverSave.push(origin);
    saveStore(store);
  }
};

const isNeverSave = (origin) => {
  origin = normaliseOrigin(origin);
  return loadStore().neverSave.includes(origin);
};

const removeNeverSave = (origin) => {
  origin = normaliseOrigin(origin);
  const store = loadStore();
  store.neverSave = store.neverSave.filter(o => o !== origin);
  return saveStore(store);
};

module.exports = {
  ensureFile,
  saveCredential,
  getCredentialsForOrigin,
  getAllCredentials,
  deleteCredential,
  updateCredential,
  getDecryptedCredential,
  addNeverSave,
  isNeverSave,
  removeNeverSave,
};
