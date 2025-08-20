import { isLikelyHardwareText, normalizeName } from "./util.js";

const ANNO_CLASS = "spa-ann";

export function annotateNode(node, lookup) {
  // Assume node is a valid text node with a likely hardware string
  const raw = node.nodeValue;

  const match = extractMatch(raw, lookup);
  if (match) {
    injectAnnotation(node, match);
    return; // handle one per node to reduce churn
  }
}

function extractMatch(text, lookup) {
  // TODO REWRITE FUNCTION
  //iterate over lookup and check for any matches
  // sort lookup entries by key length and iterate through it checking if text includes key
  const entries = Array.from(lookup.entries()).sort((a, b) => b[0].length - a[0].length);
  const normtext = normalizeName(text);
  for (const [key, value] of entries) {
    if (normtext.includes(key)) {
      // TODO THIS DOES NOT WORK RELIABLY (NORMALIZE NAME CHANGES LENGTH)
      const startIndex = normtext.indexOf(key);
      const endIndex = startIndex + key.length;
      return { key, value, startIndex, endIndex };
    }
  }
  return null;

}

function injectAnnotation(textNode, fragment) {
  // fragment is now the match object: { original, startIndex, endIndex, value }
  const full = textNode.nodeValue;
  const idx = fragment.startIndex;
  const len = fragment.endIndex - fragment.startIndex;
  const item = fragment.value;
  if (idx === -1 || len <= 0) return;

  const before = document.createTextNode(full.slice(0, idx));
  const after = document.createTextNode(full.slice(idx + len));

  const wrapper = document.createElement("span");
  wrapper.className = ANNO_CLASS;

  const nameSpan = document.createElement("span");
  nameSpan.textContent = full.slice(idx, idx + len);

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

export function scanDocument(lookup, roots) {
  // roots: optional array of root nodes to scan; defaults to [document.body]
  const rootNodes = Array.isArray(roots) && roots.length ? roots : [document.body];
  for (const root of rootNodes) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        // Fastest/easiest rejects first
        if (!node) return NodeFilter.FILTER_REJECT;
        if (node.nodeType !== Node.TEXT_NODE) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        // Tag name check (skip scripts/styles/inputs)
        if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT)/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        // Class skip
        if (p.classList?.contains("spa-skip")) return NodeFilter.FILTER_REJECT;
        if (p.closest(`.${ANNO_CLASS}`)) return; // avoid re-entry
        // Only check text value after DOM/structural rejects
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (node.nodeValue.trim().length < 3) return NodeFilter.FILTER_REJECT;
        if (!isLikelyHardwareText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) annotateNode(n, lookup);
  }
}

export function observeMutations(lookup) {
  const obs = new MutationObserver((muts) => {
    // Collect all added nodes and filter for elements/text nodes
    const nodes = [];
    for (const m of muts) {
      m.addedNodes && m.addedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) nodes.push(n);
      });
    }
    scanDocument(lookup, nodes);
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
