export interface NormalizedInput {
  sanitizedPrompt: string;
  boundedContext: Record<string, unknown>;
  redacted: boolean;
  redactedFields: string[];
}

export const MAX_PROMPT_LENGTH = 4096;
export const MAX_CONTEXT_KEYS = 32;

const SECRET_PATTERNS: Array<{ name: string; createRegex: () => RegExp }> = [
  { name: 'PRIVATE_KEY', createRegex: () => /-----BEGIN[ A-Z0-9_-]+KEY-----[A-Za-z0-9+/=\s]+-----END[ A-Z0-9_-]+KEY-----/gi },
  { name: 'BEARER_TOKEN', createRegex: () => /bearer\s+[a-zA-Z0-9_\-\.]{16,}/gi },
  { name: 'GITHUB_TOKEN', createRegex: () => /gh[pousr]_[A-Za-z0-9_]{20,}/gi },
  { name: 'KEY_ASSIGNMENT', createRegex: () => /(api[_-]?key|secret|password|auth[_-]?token)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{8,})["']?/gi },
  { name: 'HEX_KEY_32', createRegex: () => /\b[a-fA-F0-9]{64}\b/g },
];

export class IntentNormalizer {
  public static normalize(rawPrompt: unknown, rawContext: unknown = {}): NormalizedInput {
    if (typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
      throw new Error('PROMPT_REQUIRED_AND_NON_EMPTY');
    }

    const trimmed = rawPrompt.trim();
    if (trimmed.length > MAX_PROMPT_LENGTH) {
      throw new Error(`PROMPT_EXCEEDS_MAX_LENGTH_${MAX_PROMPT_LENGTH}`);
    }

    let sanitizedPrompt = trimmed;
    let redacted = false;
    const redactedFields: string[] = [];

    for (const { name, createRegex } of SECRET_PATTERNS) {
      const reg = createRegex();
      const replaced = sanitizedPrompt.replace(reg, `[REDACTED_${name}]`);
      if (replaced !== sanitizedPrompt) {
        sanitizedPrompt = replaced;
        redacted = true;
        if (!redactedFields.includes(`prompt.${name}`)) {
          redactedFields.push(`prompt.${name}`);
        }
      }
    }

    // Bounded context inspection
    const boundedContext: Record<string, unknown> = {};
    if (rawContext && typeof rawContext === 'object' && !Array.isArray(rawContext)) {
      const keys = Object.keys(rawContext).slice(0, MAX_CONTEXT_KEYS);
      for (const k of keys) {
        const val = (rawContext as Record<string, unknown>)[k];
        if (typeof val === 'string') {
          let strVal = val;
          for (const { name, createRegex } of SECRET_PATTERNS) {
            const reg = createRegex();
            const replaced = strVal.replace(reg, `[REDACTED_${name}]`);
            if (replaced !== strVal) {
              strVal = replaced;
              redacted = true;
              redactedFields.push(`context.${k}.${name}`);
            }
          }
          boundedContext[k] = strVal.slice(0, 1024);
        } else if (typeof val === 'number' || typeof val === 'boolean' || val === null) {
          boundedContext[k] = val;
        } else {
          boundedContext[k] = '[STRUCTURED_VALUE]';
        }
      }
    }

    return {
      sanitizedPrompt,
      boundedContext,
      redacted,
      redactedFields,
    };
  }
}
