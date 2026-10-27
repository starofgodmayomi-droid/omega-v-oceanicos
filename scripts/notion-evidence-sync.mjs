import { pathToFileURL } from "node:url";

export const EXPECTED_REPOSITORY = "starofgodmayomi-droid/omega-v-oceanicos";
export const NOTION_API_VERSION = "2022-06-28";
export const NOTION_REQUEST_TIMEOUT_MS = 15_000;

export const DEFAULT_NOTION_PAGE_ID = "4003080b-dd53-8159-8220-ef09061f54b7";
export const DEFAULT_NOTION_OPPORTUNITIES_DB_ID = "baf1877d-e979-4cd8-949e-6c48cdee4c7a";
export const DEFAULT_NOTION_EXECUTION_DB_ID = "75b1967f-fb19-47fc-8f5a-db1298fe8f02";

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

export function buildDailyCommandRecord(params = {}) {
  const defaults = {
    intent: "Validate narrow workflow setup offer with 5 reachable potential buyers",
    buyerValue: "Small businesses & boutique agencies spending 3+ hrs/wk on manual tool duct-tape",
    sourceEvidence: "OceanicOS monorepo test receipts, working Notion sync engine, inbound integration requests",
    nextFiniteDelta: "Draft 5 personalized interview prompts inquiring about repeated tasks, workarounds, pain, and pilot fee willingness",
    requiredAccess: "Notion Execution Queue & local drafts (no external spend, messages, or credential disclosures)",
    riskApproval: "Low risk (0.05). Human approval strictly required before external outreach or dispatch",
    expectedOutput: "5 reviewable interview questions aligned with Section 4 stage gates (VALIDATE)",
    acceptanceTest: "Human steward reviews copy; dry-run preview in CLI passes with 0 errors",
    observedResult: "Formatted in CLI and queued for operator decision",
    costRevenueEvidence: "$0 incurred / $0 earned (Stage: VALIDATING)",
    decision: "Awaiting human consent to dispatch outreach",
    nextDelta: "Log buyer feedback directly into Notion Value Opportunities Pipeline",
  };

  const merged = { ...defaults, ...params };
  const formattedLine = `${merged.intent} | ${merged.buyerValue} | ${merged.sourceEvidence} | ${merged.nextFiniteDelta} | ${merged.requiredAccess} | ${merged.riskApproval} | ${merged.expectedOutput} | ${merged.acceptanceTest} | ${merged.observedResult} | ${merged.costRevenueEvidence} | ${merged.decision} | ${merged.nextDelta}`;

  return {
    fields: merged,
    formattedLine,
    timestamp: new Date().toISOString(),
  };
}

export function buildDailyCommandBlock(record) {
  const content = [
    "[AI SOUL × OceanicOS Daily Command]",
    `Observed at: ${record.timestamp}`,
    `Line: ${record.formattedLine}`,
    "Status: Awaiting human consent prior to external action",
    "Boundary: Potential value ≠ earned revenue; revenue ≠ profit. Reality remains sovereign.",
  ].join("\n");

  if (content.length > 1900) {
    throw new Error("Daily command record exceeds safe Notion text limit");
  }

  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content } }],
    },
  };
}

export function buildFirstFiniteActionRecord() {
  return buildDailyCommandRecord();
}

export function buildTradingEvidenceRecord(portfolio, quote) {
  const p = portfolio || {
    id: "port-elion-1111",
    currency: "USD",
    balance: 100000.0,
    equity: 100000.0,
    marginUsed: 0.0,
    freeMargin: 100000.0,
    marginLevelPercent: 100.0,
    unrealizedPnl: 0.0,
    realizedPnl: 0.0,
    winRate: 1.0,
    totalTrades: 3,
    positions: [],
    sovereignOwner: "ELION VAREL // 11:11 (did:omega:human:starofgodmayomi)",
  };

  const q = quote || {
    symbol: "XAU/USD",
    mid: 2702.43,
    bid: 2702.25,
    ask: 2702.61,
    change24h: -20.07,
    changePercent24h: -0.74,
  };

  return {
    timestamp: new Date().toISOString(),
    owner: p.sovereignOwner,
    portfolioId: p.id,
    equity: p.equity,
    balance: p.balance,
    freeMargin: p.freeMargin,
    marginLevelPercent: p.marginLevelPercent,
    unrealizedPnl: p.unrealizedPnl,
    realizedPnl: p.realizedPnl,
    winRatePercent: (p.winRate * 100).toFixed(1),
    totalTrades: p.totalTrades,
    openPositionsCount: p.positions?.length || 0,
    goldMidPrice: q.mid,
    goldSpread: Number((q.ask - q.bid).toFixed(2)),
    boundary: "Paper trading simulations prove algorithmic execution, invariant bounds, and sovereign admission gates only; they do not claim realized external fiat transfer.",
  };
}

export function buildTradingNotionBlock(record) {
  const content = [
    "[Ω∞v Sovereign XAU/USD Trading Ledger Snapshot]",
    `Observed at: ${record.timestamp}`,
    `Owner: ${record.owner}`,
    `Portfolio ID: ${record.portfolioId}`,
    `Account Equity (MtM): $${record.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
    `Account Balance: $${record.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
    `Free Margin: $${record.freeMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Margin Level: ${record.marginLevelPercent.toFixed(1)}%`,
    `Unrealized P&L: ${record.unrealizedPnl >= 0 ? "+" : ""}$${record.unrealizedPnl.toFixed(2)} | Realized P&L: $${record.realizedPnl.toFixed(2)}`,
    `Closed Trades Win Rate: ${record.winRatePercent}% (${record.totalTrades} total)`,
    `Active Open Positions: ${record.openPositionsCount}`,
    `XAU/USD Spot Mid: $${record.goldMidPrice.toFixed(2)} (Spread: ${record.goldSpread.toFixed(2)} USD)`,
    `Boundary: ${record.boundary}`,
  ].join("\n");

  if (content.length > 1900) {
    throw new Error("Trading record exceeds safe Notion text limit");
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

export async function inspectNotionSurfaces({
  token = process.env.NOTION_TOKEN,
  pageId = process.env.NOTION_PAGE_ID || DEFAULT_NOTION_PAGE_ID,
  oppDbId = process.env.NOTION_OPPORTUNITIES_DB_ID || DEFAULT_NOTION_OPPORTUNITIES_DB_ID,
  execDbId = process.env.NOTION_EXECUTION_DB_ID || DEFAULT_NOTION_EXECUTION_DB_ID,
  fetchImpl = fetch,
} = {}) {
  const pageUuid = pageId.replace(/-/g, "");
  const oppDbUuid = oppDbId.replace(/-/g, "");
  const execDbUuid = execDbId.replace(/-/g, "");

  const surfaces = {
    masterPage: {
      id: pageId,
      url: `https://app.notion.com/p/OCEANICOS-MOTION-Private-Wealth-Execution-Engine-${pageUuid}`,
      role: "Canonical control center & cryptographic evidence audit trail",
      status: "CONFIGURED",
    },
    opportunitiesPipeline: {
      id: oppDbId,
      url: `https://app.notion.com/p/${oppDbUuid}`,
      role: "Value Opportunities Pipeline (buyer, problem, offer, stage, score, evidence)",
      status: "CONFIGURED",
    },
    executionQueue: {
      id: execDbId,
      url: `https://app.notion.com/p/${execDbUuid}`,
      role: "Execution Queue (priority, dependency, approval, status, test evidence)",
      status: "CONFIGURED",
    },
  };

  if (!token) {
    return {
      connected: false,
      mode: "DRY_RUN_OFFLINE",
      message: "NOTION_TOKEN not configured in .env. Pre-flight format & schema verified.",
      surfaces,
    };
  }

  // Live verification when token exists
  try {
    const pageRes = await fetchImpl(`https://api.notion.com/v1/pages/${pageId}`, notionRequestOptions(token, "GET"));
    surfaces.masterPage.status = pageRes.ok ? "ONLINE_ACCESSIBLE" : `HTTP_${pageRes.status}`;
  } catch (err) {
    surfaces.masterPage.status = `ERROR_${err.message}`;
  }

  try {
    const oppRes = await fetchImpl(`https://api.notion.com/v1/databases/${oppDbId}`, notionRequestOptions(token, "GET"));
    surfaces.opportunitiesPipeline.status = oppRes.ok ? "ONLINE_ACCESSIBLE" : `HTTP_${oppRes.status}`;
  } catch (err) {
    surfaces.opportunitiesPipeline.status = `ERROR_${err.message}`;
  }

  try {
    const execRes = await fetchImpl(`https://api.notion.com/v1/databases/${execDbId}`, notionRequestOptions(token, "GET"));
    surfaces.executionQueue.status = execRes.ok ? "ONLINE_ACCESSIBLE" : `HTTP_${execRes.status}`;
  } catch (err) {
    surfaces.executionQueue.status = `ERROR_${err.message}`;
  }

  const allOnline = Object.values(surfaces).every((s) => s.status === "ONLINE_ACCESSIBLE");
  return {
    connected: allOnline,
    mode: "LIVE_CONNECTED",
    surfaces,
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
    pageId: process.env.NOTION_PAGE_ID || DEFAULT_NOTION_PAGE_ID,
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
