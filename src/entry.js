import { parseCPUListHTML, parseGPUListHTML } from "./parser.js";
import { getCached, setCached } from "./storage.js";
import { scanDocument, observeMutations } from "./annotate.js";

const CPU_URL = "https://www.cpubenchmark.net/cpu_list.php";
const GPU_URL = "https://www.videocardbenchmark.net/gpu_list.php";

async function bgFetch(url) {
  const resp = await chrome.runtime.sendMessage({ type: "fetchPassMark", url });
  if (!resp?.ok) throw new Error(resp?.error || "bg fetch failed");
  return resp.text;
}

async function ensureIndex(kind) {
  const cacheKey = `passmark-${kind}`;
  let mapObj = await getCached(cacheKey);
  if (mapObj) return new Map(mapObj);

  const html = await bgFetch(kind === "cpu" ? CPU_URL : GPU_URL);
  const list = kind === "cpu" ? parseCPUListHTML(html) : parseGPUListHTML(html);
  const map = new Map();
  for (const item of list) map.set(item.key, item);

  await setCached(cacheKey, Array.from(map.entries()));
  return map;
}

export default async function run() {
  try {
    const [cpuIndex, gpuIndex] = await Promise.all([
      ensureIndex("cpu"),
      ensureIndex("gpu")
    ]);

    const lookup = new Map(cpuIndex);
    for (const [k, v] of gpuIndex) if (!lookup.has(k)) lookup.set(k, v);

    scanDocument(lookup);
    observeMutations(lookup);
  } catch (err) {
    console.warn("SpecLens error:", err);
  }
}
