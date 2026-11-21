import assert from 'node:assert/strict';
import test from 'node:test';
import {
  trainBPE,
  encodeBPE,
  decodeBPE,
  serializeMerges,
  deserializeMerges,
  mergesToArray,
  arrayToMerges,
  OCEANIC_LIVING_CHARTER_CORE_TEXT,
} from '../../packages/mini/src/minbpe.ts';

test('minBPE trains merges on byte sequences and computes compression ratio', () => {
  const text = 'aaabdaaabac';
  const result = trainBPE(text, 258);

  assert.equal(result.steps.length, 2);
  assert.equal(result.originalByteLength, text.length);
  assert.ok(result.compressedTokenLength < result.originalByteLength);
  assert.ok(result.compressionRatio > 1);
  assert.equal(result.vocab.size, 258);
});

test('minBPE encodes and decodes losslessly preserving constitutional byte fidelity', () => {
  const text = 'Receive. Hold. Clarify. Connect. Adapt. Nourish. Restore. Flow. Return Better.';
  const result = trainBPE(text, 266);

  const encoded = encodeBPE(text, result.merges);
  const decoded = decodeBPE(encoded, result.vocab);

  assert.equal(decoded, text);
  assert.ok(encoded.length < new TextEncoder().encode(text).length);
});

test('minBPE serializes and deserializes merge maps preserving exact pair assignments', () => {
  const text = 'Flow like water through all full stack barriers';
  const result = trainBPE(text, 260);

  const serialized = serializeMerges(result.merges);
  const deserialized = deserializeMerges(serialized);

  assert.equal(deserialized.size, result.merges.size);
  result.merges.forEach((id, key) => {
    assert.equal(deserialized.get(key), id);
  });

  const arr = mergesToArray(result.merges);
  const restored = arrayToMerges(arr);
  assert.equal(restored.size, result.merges.size);
});

test('minBPE trains on OceanicOS Living Charter text and enforces compression invariants', () => {
  const result = trainBPE(OCEANIC_LIVING_CHARTER_CORE_TEXT, 270);

  assert.ok(result.originalByteLength > 200);
  assert.ok(result.compressedTokenLength < result.originalByteLength);
  assert.ok(result.compressionRatio > 1.1);

  const encoded = encodeBPE(OCEANIC_LIVING_CHARTER_CORE_TEXT, result.merges);
  const decoded = decodeBPE(encoded, result.vocab);
  assert.equal(decoded, OCEANIC_LIVING_CHARTER_CORE_TEXT);
});
