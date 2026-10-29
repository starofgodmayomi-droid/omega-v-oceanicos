/** One execution attempt: a completion, or a thrown reason for its absence. */
export type LlmCompletion = (input: {
  intent: string;
  constitution: string;
}) => Promise<{ text: string; provider: string }>;
