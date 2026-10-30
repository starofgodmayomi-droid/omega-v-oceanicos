import { theme } from './oceanicosTheme';

type MissionPanelsProps = {
  onPrepare: (intent: string) => void;
};

type Mission = {
  id: string;
  name: string;
  line: string;
  step: string;
};

const MISSIONS: Mission[] = [
  {
    id: 'truthos',
    name: 'TRUTHOS',
    line: 'Truth that cannot be faked — only shown.',
    step: 'Verify this claim against recorded evidence: ',
  },
  {
    id: 'mirrio',
    name: 'MIRRIO',
    line: 'The mirror that returns what you actually said.',
    step: 'Reconcile what was claimed with what was recorded: ',
  },
  {
    id: 'echoframe',
    name: 'ECHOFRAME',
    line: 'Keep the frame, drop the noise.',
    step: 'Compress these observations into one verifiable frame: ',
  },
];

/**
 * The three organs as bounded missions. Each proposes one finite next step and
 * prepares it in the console — nothing executes until the human runs it there.
 */
export function MissionPanels({ onPrepare }: MissionPanelsProps) {
  return (
    <section aria-label="Glober missions" style={{ maxWidth: '820px', margin: '0 auto 28px', textAlign: 'left' }}>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.28em',
          color: theme.accent,
          textTransform: 'uppercase',
          marginBottom: '10px',
          textAlign: 'center',
        }}
      >
        Glober missions · one finite step each
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 236px), 1fr))',
          gap: '12px',
        }}
      >
        {MISSIONS.map((mission) => (
          <article
            key={mission.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '16px 16px 14px',
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSmall,
              background: 'rgba(2, 6, 23, 0.55)',
            }}
          >
            <div
              style={{
                fontFamily: theme.fontMono,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: theme.accentWarm,
              }}
            >
              {mission.name}
            </div>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: theme.textDim }}>
              {mission.line}
            </p>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '6px',
                fontFamily: theme.fontMono,
                fontSize: '10px',
                lineHeight: 1.6,
                color: theme.textDim,
              }}
            >
              <span style={{ color: theme.accent }}>Next step · </span>
              {mission.step.trim()}
            </div>
            <button
              type="button"
              onClick={() => onPrepare(mission.step)}
              style={{
                marginTop: '4px',
                padding: '8px 12px',
                background: 'transparent',
                border: `1px solid ${theme.borderBright}`,
                borderRadius: theme.radiusPill,
                color: theme.accent,
                fontFamily: theme.fontMono,
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Prepare in console
            </button>
          </article>
        ))}
      </div>

      <p
        style={{
          margin: '10px 0 0',
          fontFamily: theme.fontMono,
          fontSize: '10px',
          lineHeight: 1.6,
          color: theme.textDim,
          textAlign: 'center',
        }}
      >
        Preparing only fills the console. Nothing runs, contracts or is remembered until you execute.
      </p>
    </section>
  );
}
