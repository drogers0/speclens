# SpecLens – Chrome Extension

Annotates CPU/GPU model names on shopping sites with PassMark performance, rank, **value**, and price.

## Usage (Unpacked Install)

1. Download or clone the repo.
2. Open `chrome://extensions` and toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select the project folder (unzipped).
4. Visit any page listing CPUs/GPUs (e.g., product pages or search results). Matches will be annotated inline.

**Example**
`Intel Core i5-13500` → `Intel Core i5-13500 (31k, ranked 415, value 150.05, $208)`

---

## How SpecLens Works (Key Parts)

This section focuses only on the regexes and replace/remove commands that determine what gets annotated, so you can quickly see if your use case is covered.

### 1. **Fetching Reference Data**
- On first use, SpecLens requests two PassMark pages through its **background service worker**:
  - CPUs: `https://www.cpubenchmark.net/cpu_list.php`
  - GPUs: `https://www.videocardbenchmark.net/gpu_list.php`
- The background script performs `fetch` with `credentials: "omit"`, bypassing CORS restrictions.
- The raw HTML is returned to the content script via `chrome.runtime.sendMessage`.

### 2. **Parsing the Benchmark Tables**
- The HTML is parsed with a `DOMParser`, scanning the `<table><tbody><tr>` rows.
- Each row typically has:
  1. Name (`<td><a>Intel Core i5-13500</a></td>`)
  2. Score (e.g., `31,236`)
  3. Rank (e.g., `415`)
  4. Value score (e.g., `150.05`)
  5. Price (e.g., `$208.17`)
- For each entry, SpecLens stores a normalized object:
  ```json
  {
    "name": "Intel Core i5-13500",
    "key": "intel core i5-13500",  // lowercased normalized key
    "score": 31236,
    "rank": 415,
    "value": 150.05,
    "price": "$208.17"
  }

### 3) Detection Regex

Used to decide if a text node might contain hardware names:

```js
//annotate.js
/(Intel|AMD|Ryzen|Core|Xeon|Celeron|Pentium|Threadripper|GeForce|Radeon|RTX|GTX|RX)\b/i
```

This ensures we only process nodes that look like CPU/GPU names.

### 4) Candidate Extraction

Sliding window of up to 8 tokens; any substring that matches the detection regex above is considered a candidate.

### 5) Normalization (replace/remove steps)

These ensure that product names with trademarks, spacing, or vendor prefixes still match the benchmark table.

```js
/[\u2122\u00AE]/g          // remove ™ and ®
/\s+/g                     // collapse whitespace
/\s*\(R\)|\s*\(TM\)/gi   // remove (R) and (TM)
/\s*-\s*/g                 // normalize spaces around dashes
/^Intel\s+CPU\s+/i         // tidy prefixed descriptors
/^AMD\s+CPU\s+/i
/^NVIDIA\s+GPU\s+/i
```

### 4) Alias Rules

* Remove redundant words like `Processor` or `CPU` from the name.
* Allow GPU names without vendor prefix (e.g., `NVIDIA GeForce RTX 4070` → `GeForce RTX 4070`).

### 5) Annotation Injection

When a match is found, the name is annotated inline with:

```
(score, ranked X, value Y, $price)
```

---

## Data Freshness

* Benchmark tables (CPU & GPU lists) are fetched and cached for 7 days.
* Clearing extension storage or reloading forces a refresh.

## Limitations

* Matching is **exact after normalization** (not fuzzy beyond the rules above).
* If PassMark table markup changes, selectors will need updating.
* Price/value data is PassMark’s snapshot, not live retailer info.
