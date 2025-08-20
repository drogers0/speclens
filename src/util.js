// Name normalization helpers shared by CPU/GPU parsing & matching
export function normalizeName(raw) {
  if (!raw) return "";
  //replace anything non-alphanumeric with spaces and then replace multiple spaces with a single space
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
