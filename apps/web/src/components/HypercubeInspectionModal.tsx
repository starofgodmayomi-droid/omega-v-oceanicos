import { useEffect } from 'react';
import { TensorDavVisualizer } from './TensorDavVisualizer';
import './HypercubeInspectionModal.css';

export interface HypercubeInspectionModalProps {
  onClose: () => void;
}

export function HypercubeInspectionModal({ onClose }: HypercubeInspectionModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="hypercube-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hypercube-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="hypercube-modal-card">
        <header className="hypercube-modal-header">
          <div className="hypercube-modal-title-group">
            <h2 id="hypercube-modal-title" className="hypercube-modal-title">
              🧊 4D DAV Tensor Hypercube Inspector
            </h2>
            <span className="hypercube-modal-badge">
              T[i,j,k,l] = i+j+k+l · 2N⁴(N-1)
            </span>
          </div>
          <button
            type="button"
            className="hypercube-modal-close"
            onClick={onClose}
            aria-label="Close Hypercube Inspector"
          >
            ✕
          </button>
        </header>

        <div className="hypercube-modal-body">
          <TensorDavVisualizer />
        </div>
      </div>
    </div>
  );
}
