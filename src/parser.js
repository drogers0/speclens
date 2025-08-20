import { normalizeName } from "./util.js";

export function parseCPUListHTML(html) {
  return parsePassMarkTable(html);
}

export function parseGPUListHTML(html) {
  return parsePassMarkTable(html);
}

function parsePassMarkTable(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll("table tbody tr"));
  const items = [];
  for (const tr of rows) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 3) continue;
    const name = tds[0]?.textContent?.trim();
    const score = tds[1]?.textContent?.trim().replace(/,/g, "");
    const rank = tds[2]?.textContent?.trim().replace(/,/g, "");
    const value = tds[3]?.textContent?.trim();
    const price = tds[4]?.textContent?.trim();
    if (!name || !/\d/.test(score || "")) continue;
    items.push({
      name,
      key: normalizeName(name),
      score: Number(score),
      rank: Number(rank) || null,
      value: value || null,
      price: price || null
    });
  }
  return items;
}
