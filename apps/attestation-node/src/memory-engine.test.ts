import assert from "node:assert/strict";
import { test } from "node:test";
import { WholeMemoryMatrixSchema } from "../../../packages/validation-rules/src/memory-contracts.ts";
import { executeEvolutionCycle } from "./memory-engine.ts";
import { ENGINE_MODULE, historicalSnapshot, scenarioSnapshot } from "./mock-snapshot.ts";

const NOW = 1_730_000_111_000;

test("historical snapshot parses and names every memory layer used", () => {
  const matrix = WholeMemoryMatrixSchema.parse(historicalSnapshot());
  assert.equal(matrix.nodes.length, 6);
  assert.equal(matrix.nodes.filter((node) => node.epistemicStatus === "PLANNED").length, 1);
  assert.ok(matrix.nodes.some((node) => node.provenance.sourceLayer === "M8_VERIFICATION"));
});

test("clean cycle promotes the single planned node and advances the hash", () => {
  const before = historicalSnapshot();
  const report = executeEvolutionCycle(before, undefined, NOW);
  assert.equal(report.accepted, true);
  assert.equal(report.failClosedReason, null);
  assert.equal(report.promotedNodeId, "a6666666-6666-4666-8666-666666666666");
  assert.notEqual(report.nextHash, report.previousHash);
  assert.ok(report.nextMatrix);
  const promoted = report.nextMatrix.nodes.find((node) => node.nodeId === report.promotedNodeId);
  assert.equal(promoted?.epistemicStatus, "VERIFIED");
  assert.equal(promoted?.provenance.sourceLayer, "M8_VERIFICATION");
  assert.equal(report.ledger.verificationEvidence[report.promotedNodeId]?.status, "VERIFIED_BY_REA_INVARIANT_PROOFS");
  assert.equal(report.log.filter((entry) => entry.status === "pass").length, 10);
  const again = executeEvolutionCycle(report.nextMatrix, undefined, NOW + 1);
  assert.equal(again.accepted, true);
  assert.equal(again.promotedNodeId, null);
  assert.equal(again.nextHash, again.previousHash);
});

test("confidence of 0.90 is not authority", () => {
  const report = executeEvolutionCycle(scenarioSnapshot("unauthorized"), undefined, NOW);
  assert.equal(report.accepted, false);
  assert.equal(report.nextMatrix, null);
  assert.equal(report.log.find((entry) => entry.phase === "AUTHORIZE")?.status, "fail");
  assert.equal(report.log.find((entry) => entry.phase === "IMPLEMENT")?.status, "skip");
});

test("an open blocker fail-closes before implementation", () => {
  const report = executeEvolutionCycle(scenarioSnapshot("blocked"), undefined, NOW);
  assert.equal(report.accepted, false);
  assert.match(report.failClosedReason ?? "", /blocker/i);
  assert.equal(report.log.find((entry) => entry.phase === "IMPLEMENT")?.status, "skip");
});

test("REA unknowns and injection findings both refuse the block", () => {
  const drift = executeEvolutionCycle(historicalSnapshot(), () => ({
    unknowns: ["untracked shell spawn"],
    tracedSymbols: [],
    injectionFindings: [],
  }), NOW);
  assert.equal(drift.accepted, false);
  assert.match(drift.failClosedReason ?? "", /Unknowns/);
  assert.equal(drift.log.find((entry) => entry.phase === "VERIFY")?.status, "fail");
  assert.equal(drift.log.find((entry) => entry.phase === "EVOLVE")?.status, "skip");

  const injected = executeEvolutionCycle(historicalSnapshot(), () => ({
    unknowns: [],
    tracedSymbols: [],
    injectionFindings: ["unexpected dynamic import"],
  }), NOW);
  assert.equal(injected.accepted, false);
  assert.match(injected.failClosedReason ?? "", /Injection/);
});

test("a thrown bridge is not treated as proof", () => {
  const report = executeEvolutionCycle(historicalSnapshot(), () => {
    throw new Error("host shell isolated");
  }, NOW);
  assert.equal(report.accepted, false);
  assert.match(report.failClosedReason ?? "", /failed closed/);
  assert.equal(report.nextHash, null);
});

test("a malformed snapshot never leaves inspect", () => {
  const report = executeEvolutionCycle(scenarioSnapshot("malformed"), undefined, NOW);
  assert.equal(report.accepted, false);
  assert.equal(report.log.find((entry) => entry.phase === "INSPECT")?.status, "fail");
  assert.equal(report.log.find((entry) => entry.phase === "AUTHORIZE")?.status, "skip");
});

test("no planned work holds the state", () => {
  const report = executeEvolutionCycle(scenarioSnapshot("idle"), undefined, NOW);
  assert.equal(report.accepted, true);
  assert.equal(report.promotedNodeId, null);
  assert.equal(report.nextHash, report.previousHash);
});

test("an unregistered module path is an unknown, not a pass", () => {
  const snapshot = historicalSnapshot();
  snapshot.nodes = snapshot.nodes.map((node) =>
    node.epistemicStatus === "PLANNED"
      ? { ...node, targetModulePath: "worlds/world-abyss/unlisted.js" }
      : node,
  );
  const report = executeEvolutionCycle(snapshot, undefined, NOW);
  assert.equal(report.accepted, false);
  assert.match(report.failClosedReason ?? "", /unregistered module path/);
  assert.notEqual(snapshot.nodes.find((node) => node.epistemicStatus === "PLANNED")?.targetModulePath, ENGINE_MODULE);
});

test("false system invariants fail closed", () => {
  const snapshot = historicalSnapshot();
  snapshot.systemInvariantsPassed = false;
  const report = executeEvolutionCycle(snapshot, undefined, NOW);
  assert.equal(report.accepted, false);
  assert.match(report.failClosedReason ?? "", /systemInvariantsPassed/);
});
