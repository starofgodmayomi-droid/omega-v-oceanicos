export const WATER_BEHAVIORS = [
  "FLOW",
  "CONFLUENCE",
  "DEPTH",
  "TRANSPARENCY",
  "TIDES",
  "RIPPLES",
  "CURRENTS",
  "STILL",
  "TURBULENCE",
  "FILTRATION",
  "CONTAINMENT",
  "REFLECTION",
] as const;

export type WaterBehavior = (typeof WATER_BEHAVIORS)[number];

export type EvidenceStatus = "VERIFIED" | "DIVERGENT" | "UNKNOWN" | "NOT_EXECUTED";

export interface WaterIntelligenceInput {
  intent: string;
  route: string | null;
  sources: number;
  depthOpen: boolean;
  sourceShown: boolean;
  tide: number;
  events: number;
  current: string | null;
  filter: string;
  reportedStatus: string | null;
  expected: string | null;
  actual: string | null;
  verified: boolean;
  conflict: string | null;
}

export interface WaterReading {
  behavior: WaterBehavior;
  meaning: string;
  active: boolean;
  status: EvidenceStatus;
  evidence: string;
}

export interface WaterIntelligenceView {
  readings: WaterReading[];
  /** Skin status. Never promoted from a single claim. */
  core: EvidenceStatus;
  /** The one evidence claim this surface is willing to compare. */
  claim: EvidenceStatus;
  law: string;
}

export const WATER_LAW =
  "A visual state is not an execution. The ocean skin does not mint verification. A claim is VERIFIED only when an authorized verifier set that flag and the expected field matches the actual field.";

const MEANING: Record<WaterBehavior, string> = {
  FLOW: "Routes a request through the surface.",
  CONFLUENCE: "Combines results from more than one observed source.",
  DEPTH: "Reveals another layer of context.",
  TRANSPARENCY: "Exposes the source that was actually read.",
  TIDES: "Changes light and pace. Not a workload proof.",
  RIPPLES: "Marks an event that happened in this surface.",
  CURRENTS: "Shows the selected dependency or stage.",
  STILL: "Idle. No event has been observed here.",
  TURBULENCE: "Holds a conflict, a mismatch, or an uncertainty that must stay visible.",
  FILTRATION: "Narrows the view. Does not delete evidence.",
  CONTAINMENT: "Keeps permissions closed. This surface grants nothing.",
  REFLECTION: "Compares the expected field with the actual field.",
};

export function emptyWaterInput(): WaterIntelligenceInput {
  return {
    intent: "",
    route: null,
    sources: 0,
    depthOpen: false,
    sourceShown: false,
    tide: 0,
    events: 0,
    current: null,
    filter: "",
    reportedStatus: null,
    expected: null,
    actual: null,
    verified: false,
    conflict: null,
  };
}

function clean(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readWaterIntelligence(input: WaterIntelligenceInput): WaterIntelligenceView {
  const intent = input.intent.trim();
  const route = clean(input.route);
  const current = clean(input.current);
  const filter = input.filter.trim();
  const expected = clean(input.expected);
  const actual = clean(input.actual);
  const conflict = clean(input.conflict);
  const reported = clean(input.reportedStatus);
  const sources = Number.isFinite(input.sources) ? Math.max(0, input.sources) : 0;
  const events = Number.isFinite(input.events) ? Math.max(0, input.events) : 0;

  const fieldsPresent = expected !== null && actual !== null;
  const fieldsMatch = fieldsPresent && expected === actual;
  const claimVerified = input.verified === true && fieldsMatch && conflict === null && actual !== null;

  let claim: EvidenceStatus = "NOT_EXECUTED";
  if (conflict || (fieldsPresent && !fieldsMatch)) claim = "DIVERGENT";
  else if (claimVerified) claim = "VERIFIED";
  else if (fieldsPresent || expected || actual || reported) claim = "UNKNOWN";

  const core: EvidenceStatus = claim === "DIVERGENT" ? "DIVERGENT" : claim === "NOT_EXECUTED" ? "NOT_EXECUTED" : "UNKNOWN";

  const reflectionEvidence = conflict
    ? conflict
    : !expected && !actual
      ? "No expected or actual field has been supplied."
      : !fieldsPresent
        ? "One side of the comparison is missing."
        : !fieldsMatch
          ? "Expected and actual fields diverged."
          : claimVerified
            ? "An authorized verifier marked this field match. The ocean skin did not."
            : "The fields match. Verification was not run, so the claim stays UNKNOWN.";

  const readings: WaterReading[] = [
    {
      behavior: "FLOW",
      meaning: MEANING.FLOW,
      active: intent.length > 0 && route !== null,
      status: "NOT_EXECUTED",
      evidence: route
        ? `Intent is named and route ${route} is selected. No worker was admitted.`
        : "No route is selected. Flow has not started.",
    },
    {
      behavior: "CONFLUENCE",
      meaning: MEANING.CONFLUENCE,
      active: sources >= 2,
      status: "NOT_EXECUTED",
      evidence:
        sources >= 2
          ? `${sources} sources are in view. Combining them is not a verification.`
          : `${sources} source in view. Confluence needs two observed sources.`,
    },
    {
      behavior: "DEPTH",
      meaning: MEANING.DEPTH,
      active: input.depthOpen,
      status: input.depthOpen ? "UNKNOWN" : "NOT_EXECUTED",
      evidence: input.depthOpen
        ? "A deeper layer is open. Open context is not proof."
        : "No deeper layer is open.",
    },
    {
      behavior: "TRANSPARENCY",
      meaning: MEANING.TRANSPARENCY,
      active: input.sourceShown || reported !== null,
      status: "UNKNOWN",
      evidence: reported
        ? `A runtime reported ${reported}. This skin did not re-verify that report.`
        : input.sourceShown
          ? "A source is visible. Visibility is not verification."
          : "No source is on the surface yet.",
    },
    {
      behavior: "TIDES",
      meaning: MEANING.TIDES,
      active: true,
      status: "NOT_EXECUTED",
      evidence: `Tide level ${input.tide} changes presentation only.`,
    },
    {
      behavior: "RIPPLES",
      meaning: MEANING.RIPPLES,
      active: events > 0,
      status: events > 0 ? "UNKNOWN" : "NOT_EXECUTED",
      evidence:
        events > 0
          ? `${events} surface event${events === 1 ? "" : "s"} observed. An event is not a downstream effect.`
          : "No surface event yet.",
    },
    {
      behavior: "CURRENTS",
      meaning: MEANING.CURRENTS,
      active: current !== null,
      status: "NOT_EXECUTED",
      evidence: current ? `Current ${current} is shown as a dependency label, not as progress proof.` : "No current is selected.",
    },
    {
      behavior: "STILL",
      meaning: MEANING.STILL,
      active: events === 0 && route === null && intent.length === 0,
      status: "NOT_EXECUTED",
      evidence: "Still water means this surface has not moved. It does not mean the system is healthy.",
    },
    {
      behavior: "TURBULENCE",
      meaning: MEANING.TURBULENCE,
      active: claim === "DIVERGENT",
      status: claim === "DIVERGENT" ? "DIVERGENT" : "NOT_EXECUTED",
      evidence:
        claim === "DIVERGENT"
          ? (conflict ?? "Expected and actual fields do not match.")
          : "No conflict is on the record. Turbulence stays off.",
    },
    {
      behavior: "FILTRATION",
      meaning: MEANING.FILTRATION,
      active: filter.length > 0,
      status: "NOT_EXECUTED",
      evidence: filter.length > 0 ? `Filter “${filter}” narrows the view and keeps the hidden rows.` : "No filter is applied.",
    },
    {
      behavior: "CONTAINMENT",
      meaning: MEANING.CONTAINMENT,
      active: true,
      status: "NOT_EXECUTED",
      evidence: "Containment is a closed gate. Mood, glow, and motion cannot open it.",
    },
    {
      behavior: "REFLECTION",
      meaning: MEANING.REFLECTION,
      active: expected !== null || actual !== null || conflict !== null,
      status: claim,
      evidence: reflectionEvidence,
    },
  ];

  return { readings, core, claim, law: WATER_LAW };
}
