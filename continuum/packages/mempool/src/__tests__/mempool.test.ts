import { OceanicosMempoolEngine } from '../index';

describe('@omega-v/mempool — High-Throughput Transaction Mempool Engine', () => {
  let mempool: OceanicosMempoolEngine;

  beforeEach(() => {
    mempool = new OceanicosMempoolEngine('test-mempool-secret');
  });

  it('should admit transactions with valid admission proofs and mark pending or queued by nonce', () => {
    const tx1 = mempool.submitTransaction({
      senderDid: 'did:omega:user:alice',
      nonce: 0,
      gasPriceGwei: 25,
      gasLimit: 21000,
      payload: { action: 'transfer', to: '0xBob', amount: 100 },
    });

    const tx2 = mempool.submitTransaction({
      senderDid: 'did:omega:user:alice',
      nonce: 1,
      gasPriceGwei: 30,
      gasLimit: 21000,
      payload: { action: 'transfer', to: '0xCarol', amount: 50 },
    });

    expect(tx1.txHash).toMatch(/^0x/);
    expect(tx1.admissionProof).toMatch(/^0x/);
    expect(tx1.status).toBe('PENDING'); // Nonce 0 matches current confirmed nonce (0)

    expect(tx2.status).toBe('QUEUED'); // Nonce 1 is queued until nonce 0 is included
    expect(mempool.getTransactions()).toHaveLength(2);
  });

  it('should support Replace-By-Fee (RBF) when replacing with at least 10% higher gas price', () => {
    const tx1 = mempool.submitTransaction({
      senderDid: 'did:omega:user:alice',
      nonce: 0,
      gasPriceGwei: 20,
      gasLimit: 21000,
      payload: { action: 'transfer', amount: 100 },
    });

    // Attempting replacement with insufficient gas bump should fail
    expect(() => {
      mempool.submitTransaction({
        senderDid: 'did:omega:user:alice',
        nonce: 0,
        gasPriceGwei: 21, // Only 5% increase
        gasLimit: 21000,
        payload: { action: 'transfer', amount: 120 },
      });
    }).toThrow('Replacement transaction must have at least 10% higher gas price');

    // Valid RBF replacement (+25%)
    const tx2 = mempool.submitTransaction({
      senderDid: 'did:omega:user:alice',
      nonce: 0,
      gasPriceGwei: 25,
      gasLimit: 21000,
      payload: { action: 'transfer', amount: 120 },
    });

    expect(tx2.status).toBe('PENDING');
    const oldTx = mempool.getTransactions().find((t) => t.txHash === tx1.txHash)!;
    expect(oldTx.status).toBe('REPLACED');
  });

  it('should admit and verify MEV protection bundles', () => {
    const tx1 = mempool.submitTransaction({
      senderDid: 'did:omega:trader:01',
      nonce: 0,
      gasPriceGwei: 40,
      gasLimit: 50000,
      payload: { swap: 'USDC-ETH' },
    });

    const bundle = mempool.submitBundle({
      searcherDid: 'did:omega:searcher:prime',
      txHashes: [tx1.txHash],
      bidTipGwei: 15,
      targetBlockEpoch: 100,
    });

    expect(bundle.bundleId).toMatch(/^mev-/);
    expect(bundle.status).toBe('SIMULATED');
    expect(bundle.bundleProof).toMatch(/^0x/);
    expect(mempool.getBundles()).toHaveLength(1);
  });

  it('should harvest transactions ordered by gas price and unblock queued nonce transactions', () => {
    mempool.submitTransaction({
      senderDid: 'did:omega:user:alice',
      nonce: 0,
      gasPriceGwei: 20,
      gasLimit: 21000,
      payload: { tx: 'alice-0' },
    });
    mempool.submitTransaction({
      senderDid: 'did:omega:user:alice',
      nonce: 1,
      gasPriceGwei: 50,
      gasLimit: 21000,
      payload: { tx: 'alice-1' },
    });
    mempool.submitTransaction({
      senderDid: 'did:omega:user:bob',
      nonce: 0,
      gasPriceGwei: 100,
      gasLimit: 21000,
      payload: { tx: 'bob-0' },
    });

    // First harvest should include Bob (100 Gwei) and Alice-0 (20 Gwei)
    const harvest1 = mempool.popBatch({ maxGas: 50000 });
    expect(harvest1.includedTxCount).toBe(2);
    expect(harvest1.transactions[0].senderDid).toBe('did:omega:user:bob');
    expect(harvest1.transactions[1].senderDid).toBe('did:omega:user:alice');
    expect(harvest1.harvestAttestation).toMatch(/^0x/);

    // Alice-1 should now be unblocked from QUEUED to PENDING
    const alice1 = mempool.getTransactions().find((t) => t.payload.tx === 'alice-1')!;
    expect(alice1.status).toBe('PENDING');

    // Second harvest includes Alice-1
    const harvest2 = mempool.popBatch({ maxGas: 50000 });
    expect(harvest2.includedTxCount).toBe(1);
    expect(harvest2.transactions[0].payload.tx).toBe('alice-1');
  });

  it('should compute cryptographic mempool state roots and telemetry stats', () => {
    mempool.submitTransaction({
      senderDid: 'did:omega:user:u1',
      nonce: 0,
      gasPriceGwei: 10,
      gasLimit: 21000,
      payload: {},
    });
    mempool.submitTransaction({
      senderDid: 'did:omega:user:u2',
      nonce: 0,
      gasPriceGwei: 30,
      gasLimit: 21000,
      payload: {},
    });

    const stats = mempool.getStats();
    expect(stats.pendingCount).toBe(2);
    expect(stats.medianGasPriceGwei).toBe(20);
    expect(stats.mempoolMerkleRoot).toMatch(/^0x/);
  });
});
