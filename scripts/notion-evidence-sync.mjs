import { pathToFileURL } from "node:url";

const EXPECTED_REPOSITORY = "starofgodmayomi-droid/omega-v-oceanicos";
const NOTION_API_VERSION = "2022-06-28";
const NOTION_REQUEST_TIMEOUT_MS = 15_000;

function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_API_VERSION,
    "Content-Type": "application/json",
  };
}

function notionRequestOptions(token, method, body) {
  return {
    method,
    headers: notionHeaders(token),
    signal: AbortSignal.timeout(NOTION_REQUEST_TIMEOUT_MS),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export function buildEvidenceRecord(env) {
  const required = [
    "GITHUB_REPOSITORY",
    "GITHUB_SHA",
    "GITHUB_REF",
    "GITHUB_RUN_ID",
    "GITHUB_SERVER_URL",
    "GITHUB_WORKFLOW",
  ];
  for (const key of required) {
    if (!env[key] || !String(env[key]).trim()) {
      throw new Error(`Missing required GitHub context: ${key}`);
    }
  }
  if (env.GITHUB_REPOSITORY.toLowerCase() !== EXPECTED_REPOSITORY) {
    throw new Error(`Refusing to sync unexpected repository: ${env.GITHUB_REPOSITORY}`);
  }
  if (!/^[0-9a-f]{40}$/i.test(env.GITHUB_SHA)) {
    throw new Error("GITHUB_SHA must be a full 40-character commit SHA");
  }
  if (!/^\d+$/.test(String(env.GITHUB_RUN_ID))) {
    throw new Error("GITHUB_RUN_ID must be numeric");
  }

  const server = String(env.GITHUB_SERVER_URL).replace(/\/$/, "");
  const repoUrl = `${server}/${EXPECTED_REPOSITORY}`;
  const commitUrl = `${repoUrl}/commit/${env.GITHUB_SHA}`;
  const runUrl = `${repoUrl}/actions/runs/${env.GITHUB_RUN_ID}`;
  const timestamp = env.SYNC_TIMESTAMP || new Date().toISOString();

  return {
    timestamp,
    repository: EXPECTED_REPOSITORY,
    commit_sha: env.GITHUB_SHA,
    ref: env.GITHUB_REF,
    workflow: env.GITHUB_WORKFLOW,
    run_id: String(env.GITHUB_RUN_ID),
    commit_url: commitUrl,
    run_url: runUrl,
    verification: "The workflow's isolated test job passed before this sync job ran.",
    boundary: "This record proves the GitHub workflow context and test dependency only. It does not prove production health, customer value, revenue, or an always-on sync worker.",
  };
}

export function buildNotionBlock(record) {
  const content = [
    "[OceanicOS evidence sync]",
    `Observed at: ${record.timestamp}`,
    `Repository: ${record.repository}`,
    `Ref: ${record.ref}`,
    `Commit: ${record.commit_sha}`,
    `Workflow: ${record.workflow}`,
    `Run ID: ${record.run_id}`,
    `Commit evidence: ${record.commit_url}`,
    `Run evidence: ${record.run_url}`,
    `Verification: ${record.verification}`,
    `Boundary: ${record.boundary}`,
  ].join("\n");
  if (content.length > 1900) {
    throw new Error("Evidence record exceeds safe Notion text limit");
  }
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content } }],
    },
  };
}

async function readJson(response, label) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
    throw new Error(`${label}: ${message}`);
  }
  return body;
}

export async function findExistingRun({ token, pageId, runId, fetchImpl = fetch }) {
  if (!token) throw new Error("NOTION_TOKEN is required for a write");
  if (!pageId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId)) {
    throw new Error("NOTION_PAGE_ID must be a UUID");
  }
  if (!/^\d+$/.test(String(runId ?? ""))) {
    throw new Error("runId must be numeric");
  }

  let cursor = null;
  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (cursor) params.set("start_cursor", cursor);
    const response = await fetchImpl(
      `https://api.notion.com/v1/blocks/${pageId}/children?${params.toString()}`,
      notionRequestOptions(token, "GET"),
    );
    const body = await readJson(response, "Notion preflight read failed");
    for (const block of Array.isArray(body.results) ? body.results : []) {
      const blockBody = block?.[block.type];
      const richText = Array.isArray(blockBody?.rich_text) ? blockBody.rich_text : [];
      const text = richText.map((part) => part.plain_text ?? part.text?.content ?? "").join("");
      if (text.includes(`Run ID: ${runId}`)) return true;
    }
    cursor = body.has_more && body.next_cursor ? body.next_cursor : null;
  } while (cursor);

  return false;
}

export async function appendEvidenceToNotion({ token, pageId, block, runId, fetchImpl = fetch }) {
  if (!token) throw new Error("NOTION_TOKEN is required for a write");
  if (!pageId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId)) {
    throw new Error("NOTION_PAGE_ID must be a UUID");
  }
  if (!/^\d+$/.test(String(runId ?? ""))) {
    throw new Error("runId must be numeric");
  }

  const exists = await findExistingRun({ token, pageId, runId, fetchImpl });
  if (exists) {
    return { ok: true, appended_block_count: 0, skipped_duplicate: true };
  }

  // Do not automatically retry this PATCH: if the connection drops after the server
  // accepted it, the client cannot safely infer whether the append happened.
  const response = await fetchImpl(
    `https://api.notion.com/v1/blocks/${pageId}/children`,
    notionRequestOptions(token, "PATCH", { children: [block] }),
  );
  const body = await readJson(response, "Notion append failed");
  return {
    ok: true,
    appended_block_count: Array.isArray(body.results) ? body.results.length : 1,
    skipped_duplicate: false,
  };
}

async function main() {
  const record = buildEvidenceRecord(process.env);
  const block = buildNotionBlock(record);
  if (process.env.SYNC_WRITE !== "true") {
    console.log(JSON.stringify({ mode: "dry-run", record, block }, null, 2));
    return;
  }
  const result = await appendEvidenceToNotion({
    token: process.env.NOTION_TOKEN,
    pageId: process.env.NOTION_PAGE_ID,
    block,
    runId: record.run_id,
  });
  console.log(JSON.stringify({ mode: "write", result, record }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
