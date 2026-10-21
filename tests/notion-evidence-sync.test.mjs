import test from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceRecord, buildNotionBlock, appendEvidenceToNotion, findExistingRun } from "../scripts/notion-evidence-sync.mjs";

const validEnv = {
  GITHUB_REPOSITORY: "starofgodmayomi-droid/omega-v-oceanicos",
  GITHUB_SHA: "c5ef072f5f7bf3099b213538daaa84dff7cc6f7e",
  GITHUB_REF: "refs/heads/feature/evidence-sync",
  GITHUB_RUN_ID: "123456789",
  GITHUB_SERVER_URL: "https://github.com",
  GITHUB_WORKFLOW: "OceanicOS Notion Evidence Sync",
  SYNC_TIMESTAMP: "2026-10-21T13:00:00.000Z",
};
const pageId = "4003080b-dd53-8159-8220-ef09061f54b7";
const token = "test-token";
const emptyChildren = { ok: true, json: async () => ({ results: [], has_more: false, next_cursor: null }) };
const appended = { ok: true, json: async () => ({ results: [{ id: "block-1" }] }) };

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
    appendEvidenceToNotion({ token: "", pageId, block: {}, runId: "123", fetchImpl: async () => { called = true; } }),
    /NOTION_TOKEN is required/,
  );
  assert.equal(called, false);
});

test("preflight scans every Notion child page and finds a duplicate run", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (urls.length === 1) {
      return { ok: true, json: async () => ({
        results: [{ type: "paragraph", paragraph: { rich_text: [{ plain_text: "older record" }] } }],
        has_more: true,
        next_cursor: "cursor-2",
      }) };
    }
    return { ok: true, json: async () => ({
      results: [{ type: "paragraph", paragraph: { rich_text: [{ plain_text: "Run ID: 123456789" }] } }],
      has_more: false,
      next_cursor: null,
    }) };
  };
  assert.equal(await findExistingRun({ token, pageId, runId: "123456789", fetchImpl }), true);
  assert.match(urls[1], /start_cursor=cursor-2/);
});

test("skips a duplicate run without issuing an append", async () => {
  let patchCalled = false;
  const fetchImpl = async (url, options) => {
    if (options.method === "PATCH") patchCalled = true;
    return { ok: true, json: async () => ({
      results: [{ type: "paragraph", paragraph: { rich_text: [{ plain_text: "Run ID: 123456789" }] } }],
      has_more: false,
      next_cursor: null,
    }) };
  };
  const result = await appendEvidenceToNotion({ token, pageId, block: {}, runId: "123456789", fetchImpl });
  assert.deepEqual(result, { ok: true, appended_block_count: 0, skipped_duplicate: true });
  assert.equal(patchCalled, false);
});

test("appends exactly one block when the run has not been recorded", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return options.method === "GET" ? emptyChildren : appended;
  };
  const result = await appendEvidenceToNotion({
    token,
    pageId,
    block: { type: "paragraph" },
    runId: "123456789",
    fetchImpl,
  });
  assert.deepEqual(result, { ok: true, appended_block_count: 1, skipped_duplicate: false });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.method, "GET");
  assert.match(requests[0].url, /page_size=100/);
  assert.ok(requests.every((request) => request.options.signal instanceof AbortSignal));
  assert.equal(requests[1].options.method, "PATCH");
  assert.equal(requests[1].url, `https://api.notion.com/v1/blocks/${pageId}/children`);
  assert.equal(requests[1].options.headers["Notion-Version"], "2022-06-28");
  assert.equal(JSON.parse(requests[1].options.body).children.length, 1);
});

test("preflight failures fail closed and do not append", async () => {
  let patchCalled = false;
  const fetchImpl = async (_url, options) => {
    if (options.method === "PATCH") patchCalled = true;
    return { ok: false, json: async () => ({ message: "permission denied" }) };
  };
  await assert.rejects(
    appendEvidenceToNotion({ token, pageId, block: {}, runId: "123456789", fetchImpl }),
    /Notion preflight read failed: permission denied/,
  );
  assert.equal(patchCalled, false);
});

test("Notion writer rejects malformed page IDs and run IDs before making a request", async () => {
  let called = false;
  const fetchImpl = async () => { called = true; };
  await assert.rejects(appendEvidenceToNotion({ token, pageId: "not-a-uuid", block: {}, runId: "123", fetchImpl }), /NOTION_PAGE_ID must be a UUID/);
  await assert.rejects(appendEvidenceToNotion({ token, pageId, block: {}, runId: "abc", fetchImpl }), /runId must be numeric/);
  assert.equal(called, false);
});
