export const ECHO_SOURCE_KINDS = [
  { value: 'PERSONAL_EXPERIENCE', label: 'Personal experience / reflection' },
  { value: 'SYMBOLIC_CREATION', label: 'Symbolic / creative' },
  { value: 'SPECULATIVE_IDEA', label: 'Idea / hypothesis' },
  { value: 'SOURCE_REFERENCED', label: 'Source referenced · not checked' },
] as const;

export type EchoSourceKind = (typeof ECHO_SOURCE_KINDS)[number]['value'];

export const ECHO_VOICE_NOTE_LIMITS = {
  title: 96,
  audience: 120,
  opening: 280,
  mainMessage: 1200,
  closing: 280,
  sourceReference: 320,
} as const;

export interface EchoVoiceNoteDraft {
  title: string;
  audience: string;
  opening: string;
  mainMessage: string;
  closing: string;
  sourceKind: EchoSourceKind;
  sourceReference: string;
}

export interface EchoVoiceNoteCard extends EchoVoiceNoteDraft {
  format: 'VOICE_NOTE';
  status: 'DRAFT';
  origin: 'USER_ENTERED';
  persisted: false;
  published: false;
  verified: false;
}

export const EMPTY_ECHO_VOICE_NOTE_DRAFT: EchoVoiceNoteDraft = {
  title: '',
  audience: '',
  opening: '',
  mainMessage: '',
  closing: '',
  sourceKind: 'PERSONAL_EXPERIENCE',
  sourceReference: '',
};

const isEchoSourceKind = (value: string): value is EchoSourceKind =>
  ECHO_SOURCE_KINDS.some((kind) => kind.value === value);

/** Builds a session-only draft card; it performs no generation, storage, network, or publishing. */
export function buildEchoVoiceNoteCard(draft: EchoVoiceNoteDraft): EchoVoiceNoteCard {
  if (!isEchoSourceKind(draft.sourceKind)) {
    throw new Error('Choose one of the listed source labels.');
  }

  const normalized: EchoVoiceNoteDraft = {
    title: draft.title.trim(),
    audience: draft.audience.trim(),
    opening: draft.opening.trim(),
    mainMessage: draft.mainMessage.trim(),
    closing: draft.closing.trim(),
    sourceKind: draft.sourceKind,
    sourceReference: draft.sourceReference.trim(),
  };

  if (!normalized.mainMessage) {
    throw new Error('Add the main message in your own words first.');
  }

  const boundedFields = [
    ['title', normalized.title, ECHO_VOICE_NOTE_LIMITS.title],
    ['audience', normalized.audience, ECHO_VOICE_NOTE_LIMITS.audience],
    ['opening', normalized.opening, ECHO_VOICE_NOTE_LIMITS.opening],
    ['main message', normalized.mainMessage, ECHO_VOICE_NOTE_LIMITS.mainMessage],
    ['closing', normalized.closing, ECHO_VOICE_NOTE_LIMITS.closing],
    ['source reference', normalized.sourceReference, ECHO_VOICE_NOTE_LIMITS.sourceReference],
  ] as const;
  const oversizedField = boundedFields.find(([, value, limit]) => value.length > limit);
  if (oversizedField) {
    throw new Error(`${oversizedField[0]} must be ${oversizedField[2]} characters or fewer.`);
  }
  if (normalized.sourceKind === 'SOURCE_REFERENCED' && !normalized.sourceReference) {
    throw new Error('Add the source reference, or choose another label. References are not checked here.');
  }

  return {
    ...normalized,
    format: 'VOICE_NOTE',
    status: 'DRAFT',
    origin: 'USER_ENTERED',
    persisted: false,
    published: false,
    verified: false,
  };
}
