import React from 'react';
import { globeRealityKind, globeShellCaption } from './globe-shell';

type GlobeViewportProps = {
  active: boolean;
  realityStatus: string | null;
};

export function GlobeViewport({ active, realityStatus }: GlobeViewportProps) {
  if (!active) return null;
  const kind = globeRealityKind(realityStatus);

  return (
    <div
      aria-hidden="true"
      data-testid="globe-viewport"
      data-reality-kind={kind}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 50% 42%, rgba(140, 232, 200, 0.18), transparent 42%), #071312',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '42%',
          width: 'min(72vw, 28rem)',
          height: 'min(72vw, 28rem)',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '1px dashed rgba(140, 232, 200, 0.35)',
          boxShadow: '0 0 80px rgba(140, 232, 200, 0.18)',
          background:
            'radial-gradient(circle at 32% 28%, rgba(140, 232, 200, 0.45), transparent 32%), radial-gradient(circle at 70% 70%, #0b1d1a, #071312)',
        }}
      />
      <p
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 16,
          textAlign: 'center',
          margin: 0,
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#547b74',
        }}
      >
        {globeShellCaption(realityStatus)}
      </p>
    </div>
  );
}
