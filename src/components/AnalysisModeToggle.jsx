import React from 'react';

export default function AnalysisModeToggle({ active, disabled, onChange }) {
  return (
    <button
      className={`analysis-mode-toggle${active ? ' is-active' : ''}`}
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
    >
      <span className="analysis-mode-label">深度分析</span>
      <span className="analysis-mode-switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
