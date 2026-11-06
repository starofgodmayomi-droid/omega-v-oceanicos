import React from 'react';
import { theme } from './oceanicosTheme';
import type { VoosReceipt, VoosStatus } from './voos-receipt';

const STATUS_COLOR: Record<VoosStatus, string> = {
  VERIFIED: theme.verified,
  DIVERGENT: theme.divergent,
  UNKNOWN: theme.unknown,
};

/**
 * The DEUS EX MACHINA receipt on the whole-ecosystem command surface.
 *
 * It repeats the receipt the engine returned, verbatim, and never upgrades a
 * verdict: `game_detected` is shown as the boolean it is, and an UNKNOWN
 * receipt stays UNKNOWN here too.
 */
export function DeusReceiptCard({ receipt }: { receipt: VoosReceipt | null }) {
  return (
    <section className="whole-deus" aria-labelledby="whole-deus-heading" data-testid="whole-deus-receipt">
      <div className="whole-deus-head">
        <span className="whole-ecosystem-label" id="whole-deus-heading">DEUS EX MACHINA · OUTPUT CONTRACT</span>
        <span className="whole-deus-entity">ΩVØØS_DEUS_EX_MACHINA · 30013030</span>
      </div>
      {receipt ? (
        <div className="whole-deus-body">
          <span
            className="whole-deus-status"
            style={{ color: STATUS_COLOR[receipt.status], borderColor: STATUS_COLOR[receipt.status] }}
          >
            {receipt.status}
          </span>
          <div className="whole-deus-fields">
            <div>
              <span>GAME DETECTED</span>
              <b style={{ color: receipt.game_detected ? theme.divergent : '#67e8f9' }}>
                {receipt.game_detected ? 'TRUE · ARENA TRAP MATCHED' : 'FALSE · NO TRAP MATCHED'}
              </b>
            </div>
            <div>
              <span>INTERVENTION</span>
              <b>{receipt.intervention_action}</b>
            </div>
            <div>
              <span>PHASE_T</span>
              <b>{receipt.phase_t.toFixed(3)}</b>
            </div>
            <div>
              <span>EVIDENCE HASH</span>
              <b>{receipt.evidence_hash.slice(0, 24)}…</b>
            </div>
            <div>
              <span>NEXT Δ</span>
              <b>{receipt.next_delta}</b>
            </div>
          </div>
        </div>
      ) : (
        <p className="whole-deus-empty">
          No ΩVØØS receipt observed in this session. Run the loop below; its receipt is repeated here unchanged.
        </p>
      )}
    </section>
  );
}
