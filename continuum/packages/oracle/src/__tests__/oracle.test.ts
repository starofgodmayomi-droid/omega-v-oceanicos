import { OceanicosOracleEngine, OracleRawReport } from '../index';

describe('@omega-v/oracle — OceanicosOracleEngine', () => {
  let oracle: OceanicosOracleEngine;

  beforeEach(() => {
    oracle = new OceanicosOracleEngine('test-oracle-key-123');
  });

  describe('Feed & Provider Registry', () => {
    it('should bootstrap canonical oracle feeds and providers', () => {
      const feeds = oracle.getFeeds();
      const providers = oracle.getProviders();

      expect(feeds.length).toBeGreaterThanOrEqual(2);
      expect(providers.length).toBeGreaterThanOrEqual(3);
      expect(feeds.some((f) => f.feedId === 'feed-eth-usd')).toBe(true);
      expect(providers.some((p) => p.providerId === 'prov-node-alpha')).toBe(true);
    });

    it('should register custom oracle feed', () => {
      const custom = oracle.registerFeed({
        feedId: 'feed-custom-latency',
        name: 'Datacenter Latency Consensus',
        description: 'Consensus latency SLA',
        aggregation: 'MEAN',
        heartbeatMs: 10000,
        maxDriftPercent: 10,
        minResponses: 2,
        providers: ['prov-node-alpha', 'prov-node-beta'],
        active: true,
      });

      expect(custom.feedId).toBe('feed-custom-latency');
      expect(oracle.getFeed('feed-custom-latency')).toBeDefined();
    });
  });

  describe('Consensus Aggregation Strategies', () => {
    it('should compute MEDIAN consensus from multiple numeric reports', () => {
      const reports: OracleRawReport[] = [
        {
          providerId: 'prov-node-alpha',
          feedId: 'feed-eth-usd',
          value: 3200,
          timestamp: new Date().toISOString(),
          signature: 'sig1',
        },
        {
          providerId: 'prov-node-beta',
          feedId: 'feed-eth-usd',
          value: 3210,
          timestamp: new Date().toISOString(),
          signature: 'sig2',
        },
        {
          providerId: 'prov-node-gamma',
          feedId: 'feed-eth-usd',
          value: 3190,
          timestamp: new Date().toISOString(),
          signature: 'sig3',
        },
      ];

      const receipt = oracle.aggregateReports('feed-eth-usd', reports);
      expect(receipt.aggregatedValue).toBe(3200); // Median of [3190, 3200, 3210]
      expect(receipt.quorumSatisfied).toBe(true);
      expect(receipt.participants).toBe(3);
      expect(receipt.oracleSignature).toMatch(/^0x/);

      // Verify signature
      expect(oracle.verifyReceipt(receipt)).toBe(true);
    });

    it('should compute MAJORITY_VOTE consensus for boolean/discrete feeds', () => {
      const reports: OracleRawReport[] = [
        {
          providerId: 'prov-node-alpha',
          feedId: 'feed-cluster-health',
          value: true,
          timestamp: new Date().toISOString(),
          signature: 'sig1',
        },
        {
          providerId: 'prov-node-beta',
          feedId: 'feed-cluster-health',
          value: true,
          timestamp: new Date().toISOString(),
          signature: 'sig2',
        },
        {
          providerId: 'prov-node-gamma',
          feedId: 'feed-cluster-health',
          value: false,
          timestamp: new Date().toISOString(),
          signature: 'sig3',
        },
      ];

      const receipt = oracle.aggregateReports('feed-cluster-health', reports);
      expect(receipt.aggregatedValue).toBe(true); // 2 vs 1
      expect(receipt.strategyUsed).toBe('MAJORITY_VOTE');
      expect(oracle.verifyReceipt(receipt)).toBe(true);
    });

    it('should fail if minimum quorum is not met', () => {
      const reports: OracleRawReport[] = [
        {
          providerId: 'prov-node-alpha',
          feedId: 'feed-eth-usd',
          value: 3200,
          timestamp: new Date().toISOString(),
          signature: 'sig1',
        },
      ];

      expect(() => {
        oracle.aggregateReports('feed-eth-usd', reports); // requires min 2
      }).toThrow(/Quorum not satisfied/);
    });
  });

  describe('Receipt Verification & Tamper Detection', () => {
    it('should detect tampered aggregated value in receipt', () => {
      const reports: OracleRawReport[] = [
        {
          providerId: 'prov-node-alpha',
          feedId: 'feed-eth-usd',
          value: 3000,
          timestamp: new Date().toISOString(),
          signature: 'sig1',
        },
        {
          providerId: 'prov-node-beta',
          feedId: 'feed-eth-usd',
          value: 3050,
          timestamp: new Date().toISOString(),
          signature: 'sig2',
        },
      ];

      const receipt = oracle.aggregateReports('feed-eth-usd', reports);
      expect(oracle.verifyReceipt(receipt)).toBe(true);

      // Tamper with value
      const tampered = { ...receipt, aggregatedValue: 9999 };
      expect(oracle.verifyReceipt(tampered)).toBe(false);
    });

    it('should track receipts and statistics', () => {
      const reports: OracleRawReport[] = [
        {
          providerId: 'prov-node-alpha',
          feedId: 'feed-eth-usd',
          value: 3000,
          timestamp: new Date().toISOString(),
          signature: 'sig1',
        },
        {
          providerId: 'prov-node-beta',
          feedId: 'feed-eth-usd',
          value: 3000,
          timestamp: new Date().toISOString(),
          signature: 'sig2',
        },
      ];
      oracle.aggregateReports('feed-eth-usd', reports);

      const receipts = oracle.getReceipts();
      expect(receipts.length).toBe(1);

      const stats = oracle.getStats();
      expect(stats.totalFeeds).toBeGreaterThanOrEqual(2);
      expect(stats.totalConsensusReceipts).toBe(1);
    });
  });
});
