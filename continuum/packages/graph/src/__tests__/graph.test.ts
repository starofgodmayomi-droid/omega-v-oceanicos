import { ProvenanceGraph } from '../index';
import { EventLogEntry } from '@omega-v/types';

describe('ProvenanceGraph (Section XIV Knowledge Graph)', () => {
  let graph: ProvenanceGraph;

  beforeEach(() => {
    graph = new ProvenanceGraph();
  });

  it('should ingest events and build causal DAG nodes and edges', () => {
    const mockEvents: EventLogEntry[] = [
      {
        id: 1,
        type: 'OBSERVATION',
        recordedAt: '2026-08-10T10:00:00Z',
        hash: 'hash-1',
        previousHash: 'genesis',
        data: { claim: { statement: 'System latency is low', category: 'health' } },
      },
      {
        id: 2,
        type: 'VERIFICATION',
        recordedAt: '2026-08-10T10:00:01Z',
        hash: 'hash-2',
        previousHash: 'hash-1',
        data: { summary: { passed: true, rulesApplied: 1, rulesPassed: 1 } },
      },
      {
        id: 3,
        type: 'ATTESTATION',
        recordedAt: '2026-08-10T10:00:02Z',
        hash: 'hash-3',
        previousHash: 'hash-2',
        data: { verified: true, signature: '0xabc123', signingAlgorithm: 'HMAC-SHA256' },
      },
    ];

    graph.ingestEvents(mockEvents);
    const stats = graph.getStats();

    expect(stats.nodeCount).toBe(3);
    expect(stats.edgeCount).toBe(2);
    expect(stats.types['OBSERVATION']).toBe(1);
    expect(stats.types['VERIFICATION']).toBe(1);
    expect(stats.types['ATTESTATION']).toBe(1);
  });

  it('should support forward traversal (CAUSE → EFFECT)', () => {
    const mockEvents: EventLogEntry[] = [
      {
        id: 1,
        type: 'OBSERVATION',
        recordedAt: '2026-08-10T10:00:00Z',
        hash: 'h1',
        previousHash: '0',
        data: { claim: { statement: 'Claim 1', category: 'cat' } },
      },
      {
        id: 2,
        type: 'VERIFICATION',
        recordedAt: '2026-08-10T10:00:01Z',
        hash: 'h2',
        previousHash: 'h1',
        data: { summary: { passed: true, rulesApplied: 1, rulesPassed: 1 } },
      },
    ];

    graph.ingestEvents(mockEvents);
    const trace = graph.traverseForward('event-1');

    expect(trace.nodes).toHaveLength(2);
    expect(trace.direction).toBe('FORWARD');
    expect(trace.nodes[0].id).toBe('event-1');
    expect(trace.nodes[1].id).toBe('event-2');
  });

  it('should support backward traversal (EFFECT → CAUSE)', () => {
    const mockEvents: EventLogEntry[] = [
      {
        id: 1,
        type: 'OBSERVATION',
        recordedAt: '2026-08-10T10:00:00Z',
        hash: 'h1',
        previousHash: '0',
        data: { claim: { statement: 'Claim 1', category: 'cat' } },
      },
      {
        id: 2,
        type: 'VERIFICATION',
        recordedAt: '2026-08-10T10:00:01Z',
        hash: 'h2',
        previousHash: 'h1',
        data: { summary: { passed: true, rulesApplied: 1, rulesPassed: 1 } },
      },
    ];

    graph.ingestEvents(mockEvents);
    const trace = graph.traverseBackward('event-2');

    expect(trace.nodes).toHaveLength(2);
    expect(trace.direction).toBe('BACKWARD');
    expect(trace.nodes[0].id).toBe('event-2');
    expect(trace.nodes[1].id).toBe('event-1');
  });
});
