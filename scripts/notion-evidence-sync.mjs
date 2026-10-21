import { pathToFileURL } from "node:url";

const EXPECTED_REPOSITORY = "starofgodmayomi-droid/omega-v-oceanicos";
const NOTION_API_VERSION = "2022-06-28";

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

export async function appendEvidenceToNotion({ token, pageId, block, fetchImpl = fetch }) {
  if (!token) throw new Error("NOTION_TOKEN is required for a write");
  if (!pageId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId)) {
    throw new Error("NOTION_PAGE_ID must be a UUID");
  }
  const response = await fetchImpl(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ children: [block] }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
    throw new Error(`Notion append failed: ${message}`);
  }
  return { ok: true, appended_block_count: Array.isArray(body.results) ? body.results.length : 1 };
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
  });
  console.log(JSON.stringify({ mode: "write", result, record }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
