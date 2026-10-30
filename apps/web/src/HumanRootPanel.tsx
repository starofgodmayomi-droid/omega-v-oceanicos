import { theme } from './oceanicosTheme';

type HumanRootPanelProps = {
  meaning: string;
  onChange: (value: string) => void;
  onHandToConsole: () => void;
};

/**
 * Where the human's meaning is held before any system touches it. The text is
 * kept exactly as written — no translation, scoring or rewriting — and handed
 * to the console unchanged, which is the only place it can become evidence.
 */
export function HumanRootPanel({ meaning, onChange, onHandToConsole }: HumanRootPanelProps) {
  return (
    <section
      aria-label="Human Root"
      style={{
        maxWidth: '820px',
        margin: '0 auto 28px',
        padding: '20px 22px',
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radiusSmall,
        background: 'rgba(2, 6, 23, 0.55)',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.28em',
          color: theme.accentWarm,
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}
      >
        Human Root · meaning held as written
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '13px', lineHeight: 1.6, color: theme.textDim }}>
        The dream, the culture, the warmth — in your own words. Nothing here is translated,
        summarised or scored. The loop receives exactly what you write.
      </p>

      <textarea
        aria-label="Human meaning"
        value={meaning}
        onChange={(event) => onChange(event.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Say it the way you would say it to a person…"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '14px 16px',
          background: 'rgba(2, 6, 23, 0.82)',
          border: `1px solid ${theme.borderBright}`,
          borderRadius: theme.radiusSmall,
          color: theme.text,
          fontFamily: theme.fontSans,
          fontSize: '14px',
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginTop: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontFamily: theme.fontMono, fontSize: '10px', color: theme.textDim }}>
          {meaning.length}/2000 · unaltered
        </span>
        <button
          type="button"
          onClick={onHandToConsole}
          disabled={!meaning.trim()}
          style={{
            padding: '9px 16px',
            background: 'transparent',
            border: `1px solid ${theme.accent}`,
            borderRadius: theme.radiusPill,
            color: theme.accent,
            fontFamily: theme.fontMono,
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: meaning.trim() ? 'pointer' : 'not-allowed',
            opacity: meaning.trim() ? 1 : 0.45,
          }}
        >
          Hand to the console →
        </button>
      </div>

      <p
        style={{
          margin: '12px 0 0',
          fontFamily: theme.fontMono,
          fontSize: '10px',
          lineHeight: 1.6,
          color: theme.textDim,
        }}
      >
        The console is the only place this becomes evidence. What cannot be verified stays UNKNOWN.
      </p>
    </section>
  );
}
