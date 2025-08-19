// Name normalization helpers shared by CPU/GPU parsing & matching
export function normalizeName(raw) {
  if (!raw) return "";
  return raw
    .replace(/[\u2122\u00AE]/g, "") // ™ ®
    .replace(/\s+/g, " ")
    .replace(/\s*\(R\)|\s*\(TM\)/gi, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/^Intel\s+CPU\s+/i, "Intel ")
    .replace(/^AMD\s+CPU\s+/i, "AMD ")
    .replace(/^NVIDIA\s+GPU\s+/i, "NVIDIA ")
    .trim();
}

export function keyFor(raw) {
  // Case-insensitive lookup key with minimal punctuation sensitivity
  return normalizeName(raw).toLowerCase();
}

export function addCommonAliases(name) {
  // Generate simple alias variants to increase exact-match hit rate
  const n = normalizeName(name);
  const aliases = new Set([n]);

  // CPUs: allow missing brand or family words
  if (/^(Intel|AMD)/i.test(n)) {
    const parts = n.split(" ");
    // remove redundant words like "Processor", "CPU"
    aliases.add(n.replace(/\b(Processor|CPU)\b/gi, "").replace(/\s+/g, " ").trim());
  }

  // GPUs: sometimes sellers omit NVIDIA/AMD prefix
  if (/^(NVIDIA|AMD)\s+(GeForce|Radeon)/i.test(n)) {
    aliases.add(n.replace(/^(NVIDIA|AMD)\s+/i, "").trim());
  }

  return Array.from(aliases);
}

// Configurable list of hardware-related keywords
export const HARDWARE_KEYWORDS = [
  "Intel", "AMD", "Ryzen", "Core", "Xeon", "Celeron", "Pentium", "Threadripper",
  "GeForce", "Radeon", "RTX", "GTX", "RX"
];

// Build regex from the keyword list
const hardwareRegex = new RegExp(`(${HARDWARE_KEYWORDS.join("|")})\\b`, "i");

export function isLikelyHardwareText(text) {
  return hardwareRegex.test(text);
}
