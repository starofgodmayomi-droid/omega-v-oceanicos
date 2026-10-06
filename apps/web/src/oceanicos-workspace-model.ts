export const WORKSPACE_PROMPTS = [
  {
    label: 'Explore a need',
    prompt: 'Help me explore one human need and what evidence would clarify it.',
  },
  {
    label: 'Trace value',
    prompt: 'Trace how value could move through the whole ecosystem body; keep earned value unknown until observed.',
  },
  {
    label: 'Map the body',
    prompt: 'Map the OCEANICOS organs needed for one bounded change.',
  },
  {
    label: 'Build one slice',
    prompt: 'Build and test one finite vertical slice, then report what was actually observed.',
  },
] as const;

export const WORKSPACE_ORGANS = [
  ['◈', 'AI SOUL'],
  ['◉', 'MIRRIO'],
  ['∞', 'KAI'],
  ['◌', 'ƆREADE'],
  ['◇', 'TRUTHOS'],
  ['✦', 'ECHOFRAME'],
  ['Ω', 'Ω∞v'],
  ['Δ', 'ΩIR'],
] as const;

export const VALUE_DOMAINS = [
  'Life',
  'Health',
  'Nature',
  'Relationships',
  'Community',
  'Time',
  'Creativity',
  'Work',
  'Business',
  'Technology',
] as const;

export const VALUE_STAGES = [
  'Need',
  'Create',
  'Deliver',
  'Observe',
  'Reconcile',
  'Earned value',
] as const;

export const PROVIDER_EXAMPLES = ['ChatGPT', 'Manus', 'Grok', 'Groq', 'Codex', 'More'] as const;
export const PROVIDER_CONNECTION_NOTE = 'Examples only · no external model provider is connected in this surface.';
export const OBSERVED_VALUE_DEFAULT = 'UNKNOWN';
export const OBSERVED_VALUE_NOTE = 'This summary does not query a sourced value or earnings observation.';
