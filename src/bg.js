// src/bg.js - MV3 service worker (module) to perform cross-origin fetches
// Requires host_permissions to the PassMark domains in manifest.json

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "fetchPassMark" && typeof msg.url === "string") {
        const res = await fetch(msg.url, { credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        sendResponse({ ok: true, text });
      } else {
        sendResponse({ ok: false, error: "Unknown message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  // keep channel open for async response
  return true;
});
