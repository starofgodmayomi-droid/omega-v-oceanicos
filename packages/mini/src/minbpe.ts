/**
 * 🌊 OceanicOS Living Tokenization Studio
 * TypeScript port of Karpathy's minBPE
 * Core BPE algorithm — platform-agnostic, living, open
 *
 * Constitution: "Receive. Hold. Clarify. Connect. Adapt. Nourish. Restore. Flow. Return Better."
 */

export interface MergeStep {
  step: number;
  pair: [number, number];
  newId: number;
  occurrences: number;
  vocabValue: string;
}

export interface TrainResult {
  merges: Map<string, number>;
  vocab: Map<number, Uint8Array>;
  steps: MergeStep[];
  finalIds: number[];
  compressionRatio: number;
  originalByteLength: number;
  compressedTokenLength: number;
}

export interface TokenizerConfig {
  id?: number;
  name: string;
  vocabSize: number;
  pattern: string;
  textSample: string;
  merges: Array<{ pair: [number, number]; newId: number }>;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

export function getStats(ids: number[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < ids.length - 1; i++) {
    const key = `${ids[i]},${ids[i + 1]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function merge(ids: number[], pair: [number, number], newId: number): number[] {
  const result: number[] = [];
  let i = 0;
  while (i < ids.length) {
    if (ids[i] === pair[0] && i < ids.length - 1 && ids[i + 1] === pair[1]) {
      result.push(newId);
      i += 2;
    } else {
      result.push(ids[i]);
      i += 1;
    }
  }
  return result;
}

export function bytesToString(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return Array.from(bytes)
      .map((b) => `\\x${b.toString(16).padStart(2, '0')}`)
      .join('');
  }
}

// ─── Train ─────────────────────────────────────────────────────────

export function trainBPE(text: string, vocabSize: number, verbose = false): TrainResult {
  if (vocabSize < 256) throw new Error('vocabSize must be >= 256');
  const numMerges = vocabSize - 256;

  const textBytes = new TextEncoder().encode(text);
  let ids = Array.from(textBytes);
  const originalByteLength = ids.length;

  const merges = new Map<string, number>();
  const vocab = new Map<number, Uint8Array>();
  for (let i = 0; i < 256; i++) vocab.set(i, new Uint8Array([i]));

  const steps: MergeStep[] = [];

  for (let i = 0; i < numMerges; i++) {
    const stats = getStats(ids);
    if (stats.size === 0) break;

    let bestPair: [number, number] = [0, 0];
    let bestCount = 0;
    stats.forEach((count, key) => {
      if (count > bestCount) {
        bestCount = count;
        bestPair = key.split(',').map(Number) as [number, number];
      }
    });

    if (bestCount < 2) break;

    const newId = 256 + i;
    ids = merge(ids, bestPair, newId);
    const key = `${bestPair[0]},${bestPair[1]}`;
    merges.set(key, newId);

    const v0 = vocab.get(bestPair[0])!;
    const v1 = vocab.get(bestPair[1])!;
    const merged = new Uint8Array(v0.length + v1.length);
    merged.set(v0, 0);
    merged.set(v1, v0.length);
    vocab.set(newId, merged);

    steps.push({
      step: i + 1,
      pair: bestPair,
      newId,
      occurrences: bestCount,
      vocabValue: bytesToString(merged),
    });

    if (verbose) {
      console.log(
        `merge ${i + 1}/${numMerges}: (${bestPair[0]},${bestPair[1]}) -> ${newId} "${bytesToString(
          merged
        )}" had ${bestCount} occurrences`
      );
    }
  }

  const compressedTokenLength = ids.length;
  const compressionRatio = compressedTokenLength > 0 ? originalByteLength / compressedTokenLength : 1;

  return {
    merges,
    vocab,
    steps,
    finalIds: ids,
    compressionRatio,
    originalByteLength,
    compressedTokenLength,
  };
}

// ─── Encode / Decode ───────────────────────────────────────────────

export function encode(text: string, merges: Map<string, number>): number[] {
  const textBytes = new TextEncoder().encode(text);
  let ids = Array.from(textBytes);

  while (ids.length >= 2) {
    const stats = getStats(ids);
    if (stats.size === 0) break;

    let bestPair: [number, number] | null = null;
    let bestRank = Infinity;

    stats.forEach((_, key) => {
      const pair = key.split(',').map(Number) as [number, number];
      const rank = merges.get(key);
      if (rank !== undefined && rank < bestRank) {
        bestRank = rank;
        bestPair = pair;
      }
    });

    if (bestPair === null) break;
    const newId = merges.get(`${bestPair[0]},${bestPair[1]}`)!;
    ids = merge(ids, bestPair, newId);
  }

  return ids;
}

export function decode(ids: number[], vocab: Map<number, Uint8Array>): string {
  const chunks: Uint8Array[] = [];
  for (const id of ids) {
    const bytes = vocab.get(id);
    if (bytes) chunks.push(bytes);
  }
  if (chunks.length === 0) return '';
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(result);
}

export { encode as encodeBPE, decode as decodeBPE };

// ─── Serialize / Deserialize ───────────────────────────────────────

export function serializeMerges(merges: Map<string, number>): string {
  const obj: Record<string, number> = {};
  merges.forEach((v, k) => {
    obj[k] = v;
  });
  return JSON.stringify(obj);
}

export function deserializeMerges(json: string): Map<string, number> {
  const obj = JSON.parse(json);
  const map = new Map<string, number>();
  for (const [k, v] of Object.entries(obj)) {
    map.set(k, v as number);
  }
  return map;
}

export function mergesToArray(merges: Map<string, number>): Array<{ pair: [number, number]; newId: number }> {
  const result: Array<{ pair: [number, number]; newId: number }> = [];
  merges.forEach((newId, key) => {
    const [a, b] = key.split(',').map(Number);
    result.push({ pair: [a, b], newId });
  });
  return result.sort((a, b) => a.newId - b.newId);
}

export function arrayToMerges(arr: Array<{ pair: [number, number]; newId: number }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const { pair, newId } of arr) {
    map.set(`${pair[0]},${pair[1]}`, newId);
  }
  return map;
}

// ─── Analysis ──────────────────────────────────────────────────────

export function getTokenFrequencies(ids: number[]): Map<number, number> {
  const freq = new Map<number, number>();
  for (const id of ids) {
    freq.set(id, (freq.get(id) || 0) + 1);
  }
  return freq;
}

export function getVocabSizeDistribution(vocab: Map<number, Uint8Array>): {
  byteTokens: number;
  mergeTokens: number;
  avgTokenLength: number;
} {
  let byteTokens = 0;
  let mergeTokens = 0;
  let totalLength = 0;
  vocab.forEach((bytes, id) => {
    if (id < 256) byteTokens++;
    else mergeTokens++;
    totalLength += bytes.length;
  });
  const avgTokenLength = vocab.size > 0 ? totalLength / vocab.size : 0;
  return { byteTokens, mergeTokens, avgTokenLength };
}

/** Canonical Living Charter text used for constitutional tokenization benchmarking */
export const OCEANIC_LIVING_CHARTER_CORE_TEXT =
  `OceanicOS Constitution: Receive. Hold. Clarify. Connect. Adapt. Nourish. Restore. Flow. Return Better.\n` +
  `A charter is not a constitution handed down. It emerges through practice.\n` +
  `Verification Ethic: Trust is verifiable, not assumed. Evolution is measurable, not hopeful. Disagreement creates knowledge, not division. Every participant can observe what matters to them.\n` +
  `Living platform-agnostic tokenization preserves raw byte fidelity and transparent merge history.`;
