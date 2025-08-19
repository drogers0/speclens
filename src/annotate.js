import { addCommonAliases, isLikelyHardwareText, keyFor, normalizeName } from "./util.js";

const ANNO_CLASS = "spa-ann";

export function annotateNode(node, lookup) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const raw = node.nodeValue;
  if (!raw || !isLikelyHardwareText(raw)) return;
  const parent = node.parentElement;
  if (!parent || parent.closest(`.${ANNO_CLASS}`)) return; // avoid re-entry

  // Try to find a hardware model name inside the text by sliding window.
  // Heuristic: look at substrings bounded by punctuation/parentheses.
  const candidates = extractCandidates(raw);
  for (const cand of candidates) {
    const match = resolveCandidate(cand, lookup);
    if (match) {
      injectAnnotation(node, cand, match);
      return; // handle one per node to reduce churn
    }
  }
}

function extractCandidates(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const cands = new Set();
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j <= Math.min(tokens.length, i + 8); j++) {
      const frag = tokens.slice(i, j).join(" ");
      if (/\b(Intel|AMD|Ryzen|Core|Xeon|Threadripper|GeForce|Radeon|RTX|GTX|RX)\b/i.test(frag)) {
        cands.add(frag);
      }
    }
  }
  // Sort by descending length to prefer longer, more specific matches first
  return Array.from(cands).sort((a, b) => b.length - a.length);
}

function resolveCandidate(candidate, lookup) {
  const norm = normalizeName(candidate);
  const aliases = addCommonAliases(norm);
  for (const a of aliases) {
    const item = lookup.get(keyFor(a)) || null;
    if (item) return item;
  }
  return null;
}

function injectAnnotation(textNode, fragment, item) {
  const full = textNode.nodeValue;
  const idx = full.indexOf(fragment);
  if (idx === -1) return;

  const before = document.createTextNode(full.slice(0, idx));
  const after = document.createTextNode(full.slice(idx + fragment.length));

  const wrapper = document.createElement("span");
  wrapper.className = ANNO_CLASS;

  const nameSpan = document.createElement("span");
  nameSpan.textContent = fragment;

  const meta = document.createElement("span");
  const scoreShort = item.score >= 1000 ? `${Math.round(item.score / 1000)}k` : String(item.score);
  const price = item.price;
  const pieces = [scoreShort, item.rank ? `ranked ${item.rank}` : null, price || null].filter(Boolean);
  meta.textContent = ` (${pieces.join(", ")})`;
  meta.className = "spa-chip";

  wrapper.appendChild(nameSpan);
  wrapper.appendChild(meta);

  const parent = textNode.parentNode;
  parent.replaceChild(after, textNode);
  parent.insertBefore(wrapper, after);
  parent.insertBefore(before, wrapper);
}

export function scanDocument(lookup) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || node.nodeValue.trim().length < 3) return NodeFilter.FILTER_REJECT;
      // Skip inside scripts/styles/inputs
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT)/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
      if (p.classList?.contains("spa-skip")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) annotateNode(n, lookup);
}

export function observeMutations(lookup) {
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes?.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) annotateNode(node, lookup);
        else if (node.nodeType === Node.ELEMENT_NODE) {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          const batch = [];
          while (walker.nextNode()) batch.push(walker.currentNode);
          for (const n of batch) annotateNode(n, lookup);
        }
      });
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
