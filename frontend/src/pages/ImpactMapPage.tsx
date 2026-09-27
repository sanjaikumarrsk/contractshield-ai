import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../store/appState';
import EvidencePanel from '../components/EvidencePanel';
import type { AffectedFile, Tier } from '../analyzer/impactAnalyzer';
import './ImpactMapPage.css';

type NodeState = 'DIRECT' | 'POTENTIAL' | 'UNAFFECTED' | 'ROOT';

function nodeClass(level: NodeState): string {
  switch (level) {
    case 'ROOT': return 'impact-node impact-node--root';
    case 'DIRECT': return 'impact-node impact-node--direct';
    case 'POTENTIAL': return 'impact-node impact-node--potential';
    case 'UNAFFECTED': return 'impact-node impact-node--unaffected';
  }
}

export default function ImpactMapPage() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<AffectedFile | null>(null);

  const r = state.analysisResult;

  if (!r) {
    return (
      <div className="impact-map impact-map--empty card">
        <h2>No analysis available</h2>
        <p>Run a simulation first to see the impact map.</p>
        <button className="btn-primary" onClick={() => navigate('/simulate')}>
          ← Go to Simulate
        </button>
      </div>
    );
  }

  const tierFiles = (tier: Tier) => r.affectedFiles.filter((f) => f.tier === tier);

  return (
    <div className="impact-map">
      <div className="impact-map__header">
        <h1 className="impact-map__title">IMPACT MAP</h1>
        <p className="impact-map__subtitle">Cross-tier contract impact graph — click any node to view evidence.</p>
      </div>

      {/* Legend */}
      <div className="impact-map__legend">
        <span><span className="impact-node impact-node--direct impact-node--mini">■</span> Direct Impact</span>
        <span><span className="impact-node impact-node--potential impact-node--mini">■</span> Potential Impact</span>
        <span><span className="impact-node impact-node--unaffected impact-node--mini">■</span> Unaffected</span>
      </div>

      {/* Graph */}
      <div className="impact-map__graph">
        {/* Root: contract */}
        <div className="impact-map__row impact-map__row--root">
          <div className={nodeClass('ROOT')}>
            <div className="impact-node__label">API CONTRACT</div>
            <div className="impact-node__file mono">openapi.yaml</div>
          </div>
        </div>

        {/* Change descriptors */}
        <div className="impact-map__changes">
          <div className="impact-map__change-badge">
            <span className="simulate__old">{r.change.oldEndpoint}</span>
            <span className="simulate__arrow"> → </span>
            <span className="simulate__new">{r.change.newEndpoint}</span>
          </div>
          <div className="impact-map__change-badge">
            <span className="simulate__old">{r.change.oldField}</span>
            <span className="simulate__arrow"> → </span>
            <span className="simulate__new">{r.change.newField}</span>
          </div>
        </div>

        {/* Connector line */}
        <div className="impact-map__connector" />

        {/* Tier columns */}
        <div className="impact-map__tiers">
          {(['BACKEND', 'FRONTEND', 'TESTS'] as Tier[]).map((tier) => (
            <div className="impact-map__tier-col" key={tier}>
              <div className="impact-map__tier-heading">{tier}</div>
              {tierFiles(tier).map((f) => {
                const level: NodeState = f.impactLevel === 'DIRECT' ? 'DIRECT'
                  : f.impactLevel === 'POTENTIAL' ? 'POTENTIAL' : 'UNAFFECTED';
                return (
                  <button
                    key={f.file}
                    className={`${nodeClass(level)} ${selectedFile?.file === f.file ? 'impact-node--selected' : ''}`}
                    onClick={() => setSelectedFile(selectedFile?.file === f.file ? null : f)}
                    aria-pressed={selectedFile?.file === f.file}
                    title={f.assessment}
                  >
                    <div className="impact-node__label mono">{f.file.split('/').pop()}</div>
                    <div className="impact-node__badge">
                      <span className={`badge badge-${level === 'DIRECT' ? 'critical' : level === 'POTENTIAL' ? 'high' : 'low'}`}>
                        {f.impactLevel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Evidence panel */}
      {selectedFile && (
        <EvidencePanel file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}

      <div className="impact-map__cta-row">
        <button className="btn-ghost" onClick={() => navigate('/simulate')}>← Back to Simulate</button>
        <button className="btn-success" onClick={() => navigate('/approve')}>REVIEW & APPROVE →</button>
      </div>
    </div>
  );
}
