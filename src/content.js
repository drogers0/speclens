(async () => {
  try {
    const url = chrome.runtime.getURL("src/entry.js");
    const mod = await import(url);
    await (mod.default ? mod.default() : mod.run?.());
  } catch (e) {
    console.warn("SpecLens bootstrap failed:", e);
  }
})();
