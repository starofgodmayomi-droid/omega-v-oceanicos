export const KAI_REFLECTION_KINDS = [
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'OBSERVATION', label: 'Observation' },
  { value: 'INTERPRETATION', label: 'Interpretation' },
  { value: 'HYPOTHESIS', label: 'Hypothesis' },
  { value: 'VALUE', label: 'Value / principle' },
  { value: 'QUESTION_OR_IDEA', label: 'Question / idea' },
] as const;

export type KaiReflectionKind = (typeof KAI_REFLECTION_KINDS)[number]['value'];

export const KAI_REFLECTION_LIMITS = {
  entry: 1200,
  field: 600,
} as const;

export interface KaiReflectionDraft {
  entryKind: KaiReflectionKind;
  entry: string;
  interpretation: string;
  whatIKnow: string;
  whatIAssume: string;
  nextAction: string;
  expectedObservation: string;
  stopCondition: string;
}

export interface KaiReflectionCard extends KaiReflectionDraft {
  sourceKind: 'USER_ENTERED';
  status: 'UNKNOWN';
  persisted: false;
  memoryIsProof: false;
}

export const EMPTY_KAI_REFLECTION_DRAFT: KaiReflectionDraft = {
  entryKind: 'EXPERIENCE',
  entry: '',
  interpretation: '',
  whatIKnow: '',
  whatIAssume: '',
  nextAction: '',
  expectedObservation: '',
  stopCondition: '',
};

const isReflectionKind = (value: string): value is KaiReflectionKind =>
  KAI_REFLECTION_KINDS.some((kind) => kind.value === value);

/** Build an in-memory reflection card; this function performs no storage or network I/O. */
export function buildKaiReflectionCard(draft: KaiReflectionDraft): KaiReflectionCard {
  if (!isReflectionKind(draft.entryKind)) {
    throw new Error('Choose one of the listed reflection types.');
  }

  const normalized: KaiReflectionDraft = {
    entryKind: draft.entryKind,
    entry: draft.entry.trim(),
    interpretation: draft.interpretation.trim(),
    whatIKnow: draft.whatIKnow.trim(),
    whatIAssume: draft.whatIAssume.trim(),
    nextAction: draft.nextAction.trim(),
    expectedObservation: draft.expectedObservation.trim(),
    stopCondition: draft.stopCondition.trim(),
  };

  if (!normalized.entry) {
    throw new Error('Add one experience, observation, question, or idea first.');
  }
  if (normalized.entry.length > KAI_REFLECTION_LIMITS.entry) {
    throw new Error(`The entry must be ${KAI_REFLECTION_LIMITS.entry} characters or fewer.`);
  }

  const optionalFields = [
    ['interpretation', normalized.interpretation],
    ['what I know', normalized.whatIKnow],
    ['what I assume', normalized.whatIAssume],
    ['next action', normalized.nextAction],
    ['expected observation', normalized.expectedObservation],
    ['stop condition', normalized.stopCondition],
  ] as const;
  const oversizedField = optionalFields.find(([, value]) => value.length > KAI_REFLECTION_LIMITS.field);
  if (oversizedField) {
    throw new Error(`${oversizedField[0]} must be ${KAI_REFLECTION_LIMITS.field} characters or fewer.`);
  }
  if (normalized.nextAction && !normalized.expectedObservation) {
    throw new Error('Add an expected observation for this action, or leave the action blank.');
  }
  if (normalized.nextAction && !normalized.stopCondition) {
    throw new Error('Add a stop condition for this action, or leave the action blank.');
  }

  return {
    ...normalized,
    sourceKind: 'USER_ENTERED',
    status: 'UNKNOWN',
    persisted: false,
    memoryIsProof: false,
  };
}
