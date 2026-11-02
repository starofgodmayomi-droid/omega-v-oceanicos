import { createHash } from 'node:crypto';

/**
 * KAI × ELION × OMEGA, as the halt order in ECOSYSTEM_BODY.md.
 *
 * A caller-supplied sentence is not an independent observation and is not
 * appended. This function never writes a ledger.
 */

export const KAIXELION_OMEGA_ID = 'omega.kaixelion.cycle.v1';
export const KAIXELION_EXPECTED_STATE = 'No external effect was performed.';
export const MAX_CYCLE_INTENT = 2000;
export const MAX_CYCLE_OBSERVED = 2000;
export const MAX_CYCLE_MEMORY = 64;

const SHA256 = /^[a-f0-9]{64}$/;

const SHIELD: readonly { id: string; label: string; pattern: RegExp }[] = [
  { id: 'urgency', label: 'artificial urgency', pattern: /\burgent(ly)?\b/i },
  { id: 'act-now', label: 'artificial urgency', pattern: /\bact\s+now\b/i },
  {
    id: 'money-transfer',
    label: 'money transfer request',
    pattern:
      /\b(send|wire|transfer)\b[^.]{0,24}\b(money|funds|cash|naira|dollars?|usdt|bitcoin)\b/i,
  },
  { id: 'send-money', label: 'money transfer request', pattern: /\bsend\s+money\b/i },
  {
    id: 'guaranteed-returns',
    label: 'guaranteed returns',
    pattern: /\bguaranteed\s+(returns?|profit|income|roi|gain)\b/i,
  },
  {
    id: 'risk-free',
    label: 'risk-free profit',
    pattern: /\brisk[- ]free\s+(profit|returns?|investment|money)\b/i,
  },
  {
    id: 'doubling-scheme',
    label: 'doubling scheme',
    pattern: /\bdouble\s+(your\s+)?(money|investment|bitcoin|crypto|capital)\b/i,
  },
  { id: 'seed-phrase', label: 'seed phrase request', pattern: /\b(seed|recovery)\s+phrase\b/i },
  { id: 'private-key', label: 'private key request', pattern: /\bprivate\s+key\b/i },
  { id: 'otp', label: 'one-time password request', pattern: /\b(one[- ]time\s+password|otp)\b/i },
  { id: 'gift-card', label: 'gift card request', pattern: /\bgift\s+cards?\b/i },
  {
    id: 'bank-details',
    label: 'bank details request',
    pattern: /\bbank\s+(account\s+)?details\b/i,
  },
];

const DIRECTIVE =
  /^(?:(?:please|kindly|now|go|just)\s+)*(?:(?:can|could|would|will)\s+you\s+|i\s+(?:want|need)\s+you\s+to\s+|i\s+(?:want|need)\s+to\s+)?(?:send|transfer|wire|pay|withdraw|deploy|publish|delete|remove|install|sign|submit|launch|mint|bridge|approve|buy|sell|trade|execute)\b/i;

export type CycleAuthority = 'READ_ONLY' | 'AUTONOMOUS';
export type CycleSource = 'caller' | 'independent';
export type CycleStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export type KaixelionStep = {
  actor: 'KAI' | 'ELION' | 'OMEGA';
  phase: 'OBSERVE' | 'EXECUTE' | 'VERIFY' | 'REMEMBER';
  status: string;
  detail: string;
};

export type KaixelionInput = {
  intent: string;
  authority: CycleAuthority;
  observed: string;
  source: CycleSource;
  witness: string | null;
  memory: readonly string[];
};

export type KaixelionResult = {
  equation: typeof KAIXELION_OMEGA_ID;
  status: CycleStatus;
  halt: boolean;
  remembered: boolean;
  appended: boolean;
  ledgerMutation: false;
  independentObservation: boolean;
  memory: readonly string[];
  deltaHash: string | null;
  reason: string;
  expected: typeof KAIXELION_EXPECTED_STATE;
  composed: string | null;
  matchedLabels: readonly string[];
  steps: readonly KaixelionStep[];
};

export async function sha256Hex(text: string): Promise<string> {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function halted(
  status: CycleStatus,
  reason: string,
  memory: readonly string[],
  steps: KaixelionStep[],
  composed: string | null,
  matchedLabels: readonly string[],
  deltaHash: string | null
): KaixelionResult {
  return {
    equation: KAIXELION_OMEGA_ID,
    status,
    halt: true,
    remembered: false,
    appended: false,
    ledgerMutation: false,
    independentObservation: false,
    memory: Object.freeze([...memory]),
    deltaHash,
    reason,
    expected: KAIXELION_EXPECTED_STATE,
    composed,
    matchedLabels: Object.freeze([...matchedLabels]),
    steps: Object.freeze(steps),
  };
}

function compose(intent: string): string {
  return [
    `Intent received: ${intent}`,
    'What this function did: composed a local sentence. No external system was contacted.',
    'What remains UNKNOWN: any effect outside this process.',
    `Expected state, bound before this sentence: ${KAIXELION_EXPECTED_STATE}`,
    'This composition is not verification.',
  ].join('\n');
}

/** One finite step of the body equation. It does not start the next step. */
export async function runKaixelionOmega(input: KaixelionInput): Promise<KaixelionResult> {
  const memory = Array.isArray(input.memory) ? input.memory : [];
  const intent = typeof input.intent === 'string' ? input.intent.trim() : '';
  const observed = typeof input.observed === 'string' ? input.observed : '';
  const shapeInvalid =
    (input.authority !== 'READ_ONLY' && input.authority !== 'AUTONOMOUS') ||
    (input.source !== 'caller' && input.source !== 'independent') ||
    intent.length === 0 ||
    intent.length > MAX_CYCLE_INTENT ||
    observed.length > MAX_CYCLE_OBSERVED ||
    memory.length > MAX_CYCLE_MEMORY ||
    memory.some((entry) => typeof entry !== 'string' || !SHA256.test(entry)) ||
    (input.witness !== null && (typeof input.witness !== 'string' || !SHA256.test(input.witness)));

  if (shapeInvalid) {
    return halted(
      'UNKNOWN',
      'Input is not a bounded record. Nothing was remembered.',
      [],
      [
        {
          actor: 'KAI',
          phase: 'OBSERVE',
          status: 'UNKNOWN',
          detail: 'Evidence of a bounded record is empty.',
        },
      ],
      null,
      [],
      null
    );
  }

  const matchedLabels: string[] = [];
  for (const entry of SHIELD) {
    if (entry.pattern.test(intent) && !matchedLabels.includes(entry.label))
      matchedLabels.push(entry.label);
  }
  if (matchedLabels.length > 0) {
    return halted(
      'DIVERGENT',
      'KAI halted before execution. The intent matches a known scam pattern.',
      memory,
      [
        {
          actor: 'KAI',
          phase: 'OBSERVE',
          status: 'DIVERGENT',
          detail: `Matched ${matchedLabels.join(', ')}. ELION did not run.`,
        },
      ],
      null,
      matchedLabels,
      null
    );
  }

  const required = DIRECTIVE.test(intent) ? 'AUTONOMOUS' : 'READ_ONLY';
  if (required === 'AUTONOMOUS' && input.authority !== 'AUTONOMOUS') {
    return halted(
      'NOT_EXECUTED',
      `Authority ${input.authority} is below the required ${required}.`,
      memory,
      [
        {
          actor: 'KAI',
          phase: 'OBSERVE',
          status: 'NOT_EXECUTED',
          detail: `Granted ${input.authority} < required ${required}. ELION did not run.`,
        },
      ],
      null,
      [],
      null
    );
  }

  const steps: KaixelionStep[] = [
    {
      actor: 'KAI',
      phase: 'OBSERVE',
      status: 'OBSERVED',
      detail:
        'No known scam pattern matched, and authority is sufficient. Observation is not verification.',
    },
  ];
  const composed = compose(intent);
  steps.push({
    actor: 'ELION',
    phase: 'EXECUTE',
    status: 'COMPOSED',
    detail:
      'Local sentence composed. Composition is not verification and is not an external effect.',
  });

  const trimmedObserved = observed.trim();
  if (!trimmedObserved) {
    steps.push(
      {
        actor: 'OMEGA',
        phase: 'VERIFY',
        status: 'UNKNOWN',
        detail: 'Evidence of reality is empty. Expected was not compared.',
      },
      {
        actor: 'KAI',
        phase: 'REMEMBER',
        status: 'UNKNOWN',
        detail: 'Nothing was appended.',
      }
    );
    return halted('UNKNOWN', 'Evidence of reality is empty.', memory, steps, composed, [], null);
  }

  const matches = trimmedObserved === KAIXELION_EXPECTED_STATE;
  if (!matches) {
    steps.push(
      {
        actor: 'OMEGA',
        phase: 'VERIFY',
        status: 'DIVERGENT',
        detail: 'The supplied observation is not the expected state.',
      },
      {
        actor: 'KAI',
        phase: 'REMEMBER',
        status: 'DIVERGENT',
        detail: 'Nothing was appended.',
      }
    );
    return halted(
      'DIVERGENT',
      'Expected is not the observation.',
      memory,
      steps,
      composed,
      [],
      null
    );
  }

  if (input.source !== 'independent') {
    steps.push(
      {
        actor: 'OMEGA',
        phase: 'VERIFY',
        status: 'UNKNOWN',
        detail:
          'The caller sentence matches the expected state. A caller is not an independent observation.',
      },
      {
        actor: 'KAI',
        phase: 'REMEMBER',
        status: 'UNKNOWN',
        detail: 'Match retained as UNKNOWN. Nothing was appended.',
      }
    );
    return halted(
      'UNKNOWN',
      'Caller match is a comparison, not verification.',
      memory,
      steps,
      composed,
      [],
      null
    );
  }

  const witness = await sha256Hex(trimmedObserved);
  if (input.witness !== witness) {
    steps.push(
      {
        actor: 'OMEGA',
        phase: 'VERIFY',
        status: 'DIVERGENT',
        detail: 'The witness digest does not recompute from the observation.',
      },
      {
        actor: 'KAI',
        phase: 'REMEMBER',
        status: 'DIVERGENT',
        detail: 'Nothing was appended.',
      }
    );
    return halted(
      'DIVERGENT',
      'Independent witness does not match the observation.',
      memory,
      steps,
      composed,
      [],
      null
    );
  }

  const deltaHash = await sha256Hex(`${intent}\n${KAIXELION_EXPECTED_STATE}`);
  const appended = !memory.includes(deltaHash);
  steps.push(
    {
      actor: 'OMEGA',
      phase: 'VERIFY',
      status: 'VERIFIED',
      detail:
        'Witness recomputes and the observation is the expected state. This is one local step, not a deployment.',
    },
    {
      actor: 'KAI',
      phase: 'REMEMBER',
      status: 'VERIFIED',
      detail: appended
        ? 'Hash appended in the returned tuple only.'
        : 'Hash was already in memory. Not appended again.',
    }
  );
  return {
    equation: KAIXELION_OMEGA_ID,
    status: 'VERIFIED',
    halt: false,
    remembered: true,
    appended,
    ledgerMutation: false,
    independentObservation: true,
    memory: Object.freeze(appended ? [...memory, deltaHash] : [...memory]),
    deltaHash,
    reason: 'Expected matched the witnessed observation. The tuple is not a ledger write.',
    expected: KAIXELION_EXPECTED_STATE,
    composed,
    matchedLabels: Object.freeze([]),
    steps: Object.freeze(steps),
  };
}
