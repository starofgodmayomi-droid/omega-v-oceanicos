/** The ΩVØØS output contract, as emitted by POST /v1/voos/execute. */
export type VoosStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export type VoosReceipt = {
  engine: string;
  entity: string;
  status: VoosStatus;
  game_detected: boolean;
  intervention_action: string;
  phase_t: number;
  evidence_hash: string;
  action: string;
  reason: string;
  next_delta: string;
};
