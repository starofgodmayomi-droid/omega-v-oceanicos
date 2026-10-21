import test from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceRecord, buildNotionBlock, appendEvidenceToNotion } from "../scripts/notion-evidence-sync.mjs";

const validEnv = {
  GITHUB_REPOSITORY: "starofgodmayomi-droid/omega-v-oceanicos",
  GITHUB_SHA: "c5ef072f5f7bf3099b213538daaa84dff7cc6f7e",
  GITHUB_REF: "refs/heads/feature/evidence-sync",
  GITHUB_RUN_ID: "123456789",
  GITHUB_SERVER_URL: "https://github.com",
  GITHUB_WORKFLOW: "OceanicOS Notion Evidence Sync",
  SYNC_TIMESTAMP: "2026-10-21T13:00:00.000Z",
};

test("builds deterministic evidence links from GitHub context", () => {
  const record = buildEvidenceRecord(validEnv);
  assert.equal(record.commit_url, "https://github.com/starofgodmayomi-droid/omega-v-oceanicos/commit/c5ef072f5f7bf3099b213538daaa84dff7cc6f7e");
  assert.equal(record.run_url, "https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/runs/123456789");
  assert.equal(record.timestamp, validEnv.SYNC_TIMESTAMP);
});

test("rejects a repository outside the configured allowlist", () => {
  assert.throws(() => buildEvidenceRecord({ ...validEnv, GITHUB_REPOSITORY: "someone/other-repo" }), /unexpected repository/);
});

test("rejects missing or malformed commit/run identifiers", () => {
  assert.throws(() => buildEvidenceRecord({ ...validEnv, GITHUB_SHA: "abc" }), /40-character commit SHA/);
  assert.throws(() => buildEvidenceRecord({ ...validEnv, GITHUB_RUN_ID: "run-1" }), /must be numeric/);
  assert.throws(() => buildEvidenceRecord({ ...validEnv, GITHUB_REF: "" }), /GITHUB_REF/);
});

test("builds one bounded Notion paragraph block without secrets", () => {
  const block = buildNotionBlock(buildEvidenceRecord(validEnv));
  assert.equal(block.type, "paragraph");
  assert.equal(block.paragraph.rich_text.length, 1);
  const text = block.paragraph.rich_text[0].text.content;
  assert.match(text, /Commit evidence:/);
  assert.match(text, /Run evidence:/);
  assert.match(text, /does not prove production health/);
  assert.ok(text.length < 1900);
  assert.doesNotMatch(text, /NOTION_TOKEN/);
});

test("Notion writer rejects missing credentials before making a request", async () => {
  let called = false;
  await assert.rejects(
    appendEvidenceToNotion({ token: "", pageId: "4003080b-dd53-8159-8220-ef09061f54b7", block: {}, fetchImpl: async () => { called = true; } }),
    /NOTION_TOKEN is required/,
  );
  assert.equal(called, false);
});

test("Notion writer sends a single append and reports API failures safely", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ results: [{ id: "block-1" }] }) };
  };
  const result = await appendEvidenceToNotion({
    token: "test-token",
    pageId: "4003080b-dd53-8159-8220-ef09061f54b7",
    block: { type: "paragraph" },
    fetchImpl,
  });
  assert.equal(result.ok, true);
  assert.equal(result.appended_block_count, 1);
  assert.equal(request.options.method, "PATCH");
  assert.equal(request.url, "https://api.notion.com/v1/blocks/4003080b-dd53-8159-8220-ef09061f54b7/children");
  assert.equal(request.options.headers["Notion-Version"], "2022-06-28");
  assert.equal(JSON.parse(request.options.body).children.length, 1);
});
