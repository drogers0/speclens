const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getCached(key) {
  const data = await chrome.storage.local.get(key);
  const entry = data[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) return null;
  return entry.payload;
}

export async function setCached(key, payload) {
  await chrome.storage.local.set({ [key]: { timestamp: Date.now(), payload } });
}
