import {
  EventLogEntry,
  ProvenanceGraphNode,
  ProvenanceGraphEdge,
  GraphTraversalResult,
} from '@omega-v/types';

/**
 * ProvenanceGraph: Knowledge Graph & Lineage Traversal Engine (Section XIV)
 *
 * Connects system entities through causal provenance edges:
 *   OBSERVATION → VERIFICATION → ATTESTATION → ACTION → OUTCOME → LEARNING
 *
 * Supports bidirectional traversal:
 *   CAUSE → EFFECT  (Forward traversal: what resulted from this observation?)
 *   EFFECT → CAUSE  (Backward traversal: what evidence produced this outcome?)
 */
export class ProvenanceGraph {
  private nodes: Map<string, ProvenanceGraphNode> = new Map();
  private edges: Map<string, ProvenanceGraphEdge> = new Map();
  private adjacencyForward: Map<string, Set<string>> = new Map();
  private adjacencyBackward: Map<string, Set<string>> = new Map();

  /** Add or update a node in the graph */
  public addNode(node: ProvenanceGraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyForward.has(node.id)) this.adjacencyForward.set(node.id, new Set());
    if (!this.adjacencyBackward.has(node.id)) this.adjacencyBackward.set(node.id, new Set());
  }

  /** Add a directed edge in the graph */
  public addEdge(edge: ProvenanceGraphEdge): void {
    this.edges.set(edge.id, edge);
    if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) return;

    this.adjacencyForward.get(edge.sourceId)?.add(edge.targetId);
    this.adjacencyBackward.get(edge.targetId)?.add(edge.sourceId);
  }

  /** Ingest event log entries from ProvenanceStore and construct the graph */
  public ingestEvents(events: EventLogEntry[]): void {
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const nodeId = `event-${e.id}`;
      const dataAny = e.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const label =
        e.type === 'OBSERVATION'
          ? (dataAny.claim?.statement ?? 'Observation')
          : e.type === 'VERIFICATION'
            ? `Verified (${dataAny.summary?.passed ? 'PASSED' : 'FAILED'})`
            : e.type === 'MEMORY'
              ? `Remembered (${dataAny.verified ? 'VERIFIED' : 'UNVERIFIED'})`
              : `Signed Attestation (${dataAny.signature?.slice(0, 10)}…)`;

      this.addNode({
        id: nodeId,
        type: e.type,
        label,
        hash: e.hash,
        recordedAt: e.recordedAt,
        metadata: dataAny as Record<string, unknown>,
      });

      // Chain edge from previous event in hash-chain
      if (i > 0) {
        const prevNodeId = `event-${events[i - 1].id}`;
        const relation =
          e.type === 'VERIFICATION'
            ? 'VERIFIED_BY'
            : e.type === 'ATTESTATION'
              ? 'ATTESTED_BY'
              : 'PRODUCED';

        this.addEdge({
          id: `edge-${prevNodeId}-${nodeId}`,
          sourceId: prevNodeId,
          targetId: nodeId,
          relation,
          timestamp: e.recordedAt,
        });
      }
    }
  }

  /** Traverse graph forward (CAUSE → EFFECT) */
  public traverseForward(startId: string, maxDepth = 10): GraphTraversalResult {
    return this.bfs(startId, 'FORWARD', maxDepth);
  }

  /** Traverse graph backward (EFFECT → CAUSE) */
  public traverseBackward(startId: string, maxDepth = 10): GraphTraversalResult {
    return this.bfs(startId, 'BACKWARD', maxDepth);
  }

  /** General BFS traversal */
  private bfs(
    startId: string,
    direction: 'FORWARD' | 'BACKWARD',
    maxDepth: number
  ): GraphTraversalResult {
    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
    visitedNodes.add(startId);

    let maxVisitedDepth = 0;

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth > maxVisitedDepth) maxVisitedDepth = depth;

      if (depth >= maxDepth) continue;

      const neighbors =
        direction === 'FORWARD' ? this.adjacencyForward.get(id) : this.adjacencyBackward.get(id);

      if (!neighbors) continue;

      for (const nextId of neighbors) {
        // Find corresponding edge
        for (const edge of this.edges.values()) {
          const isMatch =
            direction === 'FORWARD'
              ? edge.sourceId === id && edge.targetId === nextId
              : edge.sourceId === nextId && edge.targetId === id;
          if (isMatch) visitedEdges.add(edge.id);
        }

        if (!visitedNodes.has(nextId)) {
          visitedNodes.add(nextId);
          queue.push({ id: nextId, depth: depth + 1 });
        }
      }
    }

    const resultNodes = Array.from(visitedNodes)
      .map((id) => this.nodes.get(id))
      .filter((n): n is ProvenanceGraphNode => Boolean(n));

    const resultEdges = Array.from(visitedEdges)
      .map((id) => this.edges.get(id))
      .filter((e): e is ProvenanceGraphEdge => Boolean(e));

    return {
      rootId: startId,
      direction,
      nodes: resultNodes,
      edges: resultEdges,
      depth: maxVisitedDepth,
    };
  }

  /** Export graph summary metrics */
  public getStats(): { nodeCount: number; edgeCount: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      types[node.type] = (types[node.type] || 0) + 1;
    }
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      types,
    };
  }
}

export default ProvenanceGraph;
