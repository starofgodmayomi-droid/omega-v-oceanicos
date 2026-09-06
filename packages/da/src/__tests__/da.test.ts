import { OceanicosDAEngine } from '../index';

describe('OceanicosDAEngine — Data Availability Sampling & Erasure Coding', () => {
  let engine: OceanicosDAEngine;

  beforeEach(() => {
    engine = new OceanicosDAEngine('test-da-key', 64);
  });

  describe('1. Blob Submission & Erasure Encoding', () => {
    it('should submit blob, chunk it, and generate parity shards with KZG commitment', () => {
      const blob = engine.submitBlob({
        namespace: 'omega-v-rollup-01',
        submitterDid: 'did:omega:sequencer:alpha',
        rawData: 'Transaction batch data for block 42 with state transitions and execution traces',
      });

      expect(blob.blobId).toMatch(/^blob-/);
      expect(blob.namespace).toBe('omega-v-rollup-01');
      expect(blob.status).toBe('COMMITTED');
      expect(blob.chunkCount).toBeGreaterThan(0);
      expect(blob.parityChunkCount).toBe(blob.chunkCount); // 2x extension
      expect(blob.kzgCommitment).toMatch(/^0x/);
      expect(blob.rawDataHash).toMatch(/^0x/);

      // Verify erasure chunks
      const chunks = engine.getChunks(blob.blobId);
      expect(chunks.length).toBe(blob.chunkCount + blob.parityChunkCount);
      expect(chunks.filter((c) => c.isParity).length).toBe(blob.parityChunkCount);
    });
  });

  describe('2. KZG Commitment Verification', () => {
    it('should verify KZG commitment integrity against stored chunk data', () => {
      const blob = engine.submitBlob({
        namespace: 'omega-v-da-test',
        submitterDid: 'did:omega:agent:validator-01',
        rawData: 'Cryptographic proof payload for data availability attestation',
      });

      const valid = engine.verifyCommitment(blob.blobId);
      expect(valid).toBe(true);

      // Non-existent blob fails
      const invalid = engine.verifyCommitment('blob-nonexistent');
      expect(invalid).toBe(false);
    });
  });

  describe('3. Random Data Availability Sampling (DAS)', () => {
    it('should sample random chunks and compute availability confidence', () => {
      const blob = engine.submitBlob({
        namespace: 'omega-v-rollup-02',
        submitterDid: 'did:omega:sequencer:beta',
        rawData: 'A'.repeat(256), // 256 bytes → multiple chunks at 64B chunk size
      });

      const sample = engine.sampleBlob(blob.blobId, 4);
      expect(sample.sampleId).toMatch(/^sample-/);
      expect(sample.allAvailable).toBe(true);
      expect(sample.confidence).toBeGreaterThan(90);
      expect(sample.chunkIndices.length).toBeGreaterThan(0);
    });
  });

  describe('4. Namespace-Partitioned Blob Retrieval', () => {
    it('should filter blobs by namespace', () => {
      engine.submitBlob({ namespace: 'ns-alpha', submitterDid: 'did:omega:a', rawData: 'data1' });
      engine.submitBlob({ namespace: 'ns-beta', submitterDid: 'did:omega:b', rawData: 'data2' });
      engine.submitBlob({ namespace: 'ns-alpha', submitterDid: 'did:omega:c', rawData: 'data3' });

      const alphaBlobs = engine.getBlobs('ns-alpha');
      expect(alphaBlobs.length).toBe(2);
      expect(alphaBlobs.every((b) => b.namespace === 'ns-alpha')).toBe(true);

      const allBlobs = engine.getBlobs();
      expect(allBlobs.length).toBe(3);
    });
  });

  describe('5. DA Layer Statistics', () => {
    it('should aggregate data availability metrics', () => {
      engine.submitBlob({
        namespace: 'ns-stats',
        submitterDid: 'did:omega:x',
        rawData: 'Hello DA Layer',
      });
      const stats = engine.getStats();

      expect(stats.totalBlobs).toBe(1);
      expect(stats.totalBytesStored).toBeGreaterThan(0);
      expect(stats.totalChunks).toBeGreaterThan(0);
      expect(stats.totalParityChunks).toBeGreaterThan(0);
      expect(stats.namespaceCount).toBe(1);
    });
  });
});
