import { OceanicosRelayEngine } from '../index';

describe('@omega-v/relay — Decentralized Cross-Domain Packet Relaying Engine', () => {
  let relay: OceanicosRelayEngine;

  beforeEach(() => {
    relay = new OceanicosRelayEngine('test-relay-secret');
  });

  it('should register relayer nodes with stake amounts', () => {
    const relayer = relay.registerRelayer({
      relayerDid: 'did:omega:relayer:node-01',
      moniker: 'Hermes Fast Relayer',
      stakeAmount: 5000,
    });

    expect(relayer.relayerDid).toBe('did:omega:relayer:node-01');
    expect(relayer.stakeAmount).toBe(5000);
    expect(relayer.status).toBe('ACTIVE');
    expect(relay.getRelayers()).toHaveLength(1);
  });

  it('should dispatch packets with monotonic sequence nonce and cryptographic witness', () => {
    const p1 = relay.dispatchPacket({
      sourceDomain: 'shard-01',
      targetDomain: 'rollup-alpha',
      senderDid: 'did:omega:agent:trader',
      recipientDid: 'did:omega:contract:dex',
      payload: { action: 'cross_swap', amount: 1000 },
    });

    const p2 = relay.dispatchPacket({
      sourceDomain: 'shard-01',
      targetDomain: 'rollup-alpha',
      senderDid: 'did:omega:agent:trader',
      recipientDid: 'did:omega:contract:dex',
      payload: { action: 'cross_swap', amount: 500 },
    });

    expect(p1.packetId).toMatch(/^pkt-/);
    expect(p1.sequenceNonce).toBe(1);
    expect(p2.sequenceNonce).toBe(2);
    expect(p1.status).toBe('DISPATCHED');
    expect(p1.packetHash).toMatch(/^0x/);
    expect(p1.proofWitness).toMatch(/^0x/);
    expect(relay.verifyPacket(p1.packetId)).toBe(true);
  });

  it('should transition packet through Relay and Delivery Acknowledgment with receipt', () => {
    relay.registerRelayer({ relayerDid: 'did:omega:relayer:fast', moniker: 'FastRelay' });

    const packet = relay.dispatchPacket({
      sourceDomain: 'shard-02',
      targetDomain: 'rollup-beta',
      senderDid: 'did:omega:agent:alice',
      recipientDid: 'did:omega:agent:bob',
      payload: { msg: 'hello' },
    });

    // 1. Relay packet
    const relayed = relay.relayPacket(packet.packetId, 'did:omega:relayer:fast');
    expect(relayed.status).toBe('RELAYED');
    expect(relayed.relayedBy).toBe('did:omega:relayer:fast');
    expect(relayed.relayedAt).toBeDefined();

    // 2. Acknowledge delivery
    const receipt = relay.acknowledgeDelivery(packet.packetId, '0xdeadbeef_destination_tx_receipt');
    expect(receipt.receiptId).toMatch(/^rcpt-/);
    expect(receipt.ackProof).toMatch(/^0x/);
    expect(receipt.targetReceiptHash).toBe('0xdeadbeef_destination_tx_receipt');

    const updated = relay.getPackets().find((p) => p.packetId === packet.packetId)!;
    expect(updated.status).toBe('ACKNOWLEDGED');
    expect(updated.targetReceiptHash).toBe('0xdeadbeef_destination_tx_receipt');
  });

  it('should reject invalid delivery acknowledgment on non-relayed packet', () => {
    const packet = relay.dispatchPacket({
      sourceDomain: 'shard-01',
      targetDomain: 'rollup-gamma',
      senderDid: 'did:omega:agent:alice',
      recipientDid: 'did:omega:agent:bob',
      payload: {},
    });

    expect(() => {
      relay.acknowledgeDelivery(packet.packetId, '0xreceipt');
    }).toThrow('must be in RELAYED status');
  });

  it('should compute comprehensive relay metrics', () => {
    relay.registerRelayer({ relayerDid: 'did:omega:relayer:r1', moniker: 'R1' });
    const p = relay.dispatchPacket({
      sourceDomain: 'shard-A',
      targetDomain: 'shard-B',
      senderDid: 'did:omega:a',
      recipientDid: 'did:omega:b',
      payload: {},
    });
    relay.relayPacket(p.packetId, 'did:omega:relayer:r1');
    relay.acknowledgeDelivery(p.packetId, '0xreceipt');

    const stats = relay.getStats();
    expect(stats.totalPackets).toBe(1);
    expect(stats.acknowledgedCount).toBe(1);
    expect(stats.activeRelayers).toBe(1);
    expect(stats.totalChannels).toBe(1);
  });
});
