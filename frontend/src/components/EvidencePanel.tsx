import React from 'react';
import type { AffectedFile } from '../analyzer/impactAnalyzer';
import './EvidencePanel.css';

interface EvidencePanelProps {
  file: AffectedFile;
  onClose: () => void;
}

export default function EvidencePanel({ file, onClose }: EvidencePanelProps) {
  return (
    <div className="evidence-panel card">
      <div className="evidence-panel__header">
        <div>
          <div className="evidence-panel__tier">{file.tier}</div>
          <div className="evidence-panel__file mono">{file.file}</div>
        </div>
        <button className="evidence-panel__close btn-ghost" onClick={onClose}>✕ Close</button>
      </div>

      <div className="evidence-panel__grid">
        <div className="evidence-panel__section">
          <div className="evidence-panel__label">LINE</div>
          <div className="mono">{file.line ?? '—'}</div>
        </div>
        <div className="evidence-panel__section">
          <div className="evidence-panel__label">SYMBOL</div>
          <div className="mono">{file.symbol ?? '—'}</div>
        </div>
        <div className="evidence-panel__section">
          <div className="evidence-panel__label">REFERENCE</div>
          <div className="mono">{file.reference ?? '—'}</div>
        </div>
        <div className="evidence-panel__section">
          <div className="evidence-panel__label">SEVERITY</div>
          <span className={`badge badge-${file.severity === 'CRITICAL' ? 'critical' : file.severity === 'HIGH' ? 'high' : file.severity === 'MEDIUM' ? 'medium' : 'low'}`}>
            {file.severity}
          </span>
        </div>
      </div>

      <div className="evidence-panel__section">
        <div className="evidence-panel__label">WHY AFFECTED</div>
        <div className="evidence-panel__body">{file.whyAffected}</div>
      </div>

      <div className="evidence-panel__section">
        <div className="evidence-panel__label">EVIDENCE</div>
        <ul className="evidence-panel__evidence-list">
          {file.evidence.map((e, i) => (
            <li key={i} className={`evidence-panel__evidence-item ${e.confirmed ? 'evidence-panel__evidence-item--confirmed' : 'evidence-panel__evidence-item--inferred'}`}>
              <span>{e.confirmed ? '✓' : '⚠'}</span>
              <span>{e.description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="evidence-panel__section">
        <div className="evidence-panel__label">ASSESSMENT</div>
        <div className={`evidence-panel__assessment ${file.severity === 'CRITICAL' || file.severity === 'HIGH' ? 'evidence-panel__assessment--critical' : 'evidence-panel__assessment--low'}`}>
          {file.assessment}
        </div>
      </div>
    </div>
  );
}
