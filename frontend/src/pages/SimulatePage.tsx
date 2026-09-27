import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../store/appState';
import { runImpactAnalysis, SUPPORTED_CHANGES } from '../analyzer/impactAnalyzer';
import { recordAuditEvent } from '../store/auditStore';
import EvidencePanel from '../components/EvidencePanel';
import './SimulatePage.css';

export default function SimulatePage() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const r = state.analysisResult;
  const change = SUPPORTED_CHANGES;

  function runSimulation() {
    setIsRunning(true);
    dispatch({ type: 'RESET_DOWNSTREAM' });
    dispatch({ type: 'SET_PHASE', payload: 'SIMULATING' });
    recordAuditEvent('CONTRACT_ANALYZED', 'OpenAPI contract loaded and migration pattern identified', {
      oldEndpoint: change.oldEndpoint,
      newEndpoint: change.newEndpoint,
      oldField: change.oldField,
      newField: change.newField,
    });

    // Deterministic analysis — runs synchronously, no fake delay needed
    const result = runImpactAnalysis(change);

    recordAuditEvent('IMPACT_ANALYSIS_COMPLETED', `Analysis completed — ${result.summary.affectedFiles} files affected`, {
      filesScanned: result.summary.totalFilesScanned,
    });
    recordAuditEvent('EVIDENCE_GENERATED', 'Evidence gathered for all affected artifacts', {
      directRefs: result.summary.directReferences,
      testGaps: result.summary.testGaps,
    });

    dispatch({ type: 'SET_ANALYSIS', payload: result });
    setIsRunning(false);
  }

  const affectedFile = r?.affectedFiles.find((f) => f.file === selectedFile);

  return (
    <div className="simulate">
      <div className="simulate__header">
        <h1 className="simulate__title">SIMULATE</h1>
        <p className="simulate__subtitle">Detect the blast radius of this contract change.</p>
      </div>

      {/* Contract change card */}
      <div className="card simulate__contract">
        <div className="simulate__contract-label">CONTRACT FILE</div>
        <div className="simulate__contract-file mono">contract/openapi.yaml</div>

        <div className="simulate__migration">
          <div className="simulate__migration-block">
            <div className="simulate__migration-title">ENDPOINT MIGRATION</div>
            <div className="simulate__migration-diff">
              <span className="simulate__old">{change.oldEndpoint}</span>
              <span className="simulate__arrow">→</span>
              <span className="simulate__new">{change.newEndpoint}</span>
            </div>
          </div>
          <div className="simulate__migration-block">
            <div className="simulate__migration-title">FIELD MIGRATION</div>
            <div className="simulate__migration-diff">
              <span className="simulate__old">{change.oldField}</span>
              <span className="simulate__arrow">→</span>
              <span className="simulate__new">{change.newField}</span>
            </div>
          </div>
        </div>

        {!r && (
          <button
            className="btn-primary simulate__run"
            onClick={runSimulation}
            disabled={isRunning}
          >
            {isRunning ? '⟳ ANALYZING…' : '▶ RUN SIMULATION'}
          </button>
        )}

        {r && (
          <div className="simulate__re-run-row">
            <span className="badge badge-success">✓ DETERMINISTIC ANALYSIS COMPLETE</span>
            <button className="btn-ghost" onClick={runSimulation}>↺ Re-run</button>
          </div>
        )}
      </div>

      {r && (
        <>
          {/* Breaking change banner */}
          <div className="simulate__breaking-banner">
            ⚠ BREAKING CONTRACT CHANGE DETECTED — {r.summary.breakingChanges} breaking changes across {r.summary.totalFilesScanned} files
          </div>

          {/* Summary row */}
          <div className="simulate__summary-row">
            {[
              { label: 'Breaking Changes', value: r.summary.breakingChanges, cls: 'critical' },
              { label: 'Affected Files', value: r.summary.affectedFiles, cls: 'high' },
              { label: 'Test Gaps', value: r.summary.testGaps, cls: 'gap' },
              { label: 'Unaffected', value: r.summary.unaffectedFiles, cls: 'low' },
            ].map((s) => (
              <div className={`card simulate__summary-stat simulate__summary-stat--${s.cls}`} key={s.label}>
                <div className="simulate__summary-num">{s.value}</div>
                <div className="simulate__summary-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* File list */}
          <div className="simulate__files">
            <h2 className="simulate__section-title">CROSS-TIER IMPACT ANALYSIS</h2>
            <div className="simulate__tier-groups">
              {(['BACKEND', 'FRONTEND', 'TESTS', 'CONTRACT'] as const).map((tier) => {
                const files = r.affectedFiles.filter((f) => f.tier === tier);
                return (
                  <div className="simulate__tier" key={tier}>
                    <div className="simulate__tier-label">{tier}</div>
                    {files.map((f) => (
                      <button
                        key={f.file}
                        className={`simulate__file-row ${selectedFile === f.file ? 'simulate__file-row--selected' : ''}`}
                        onClick={() => setSelectedFile(selectedFile === f.file ? null : f.file)}
                        aria-expanded={selectedFile === f.file}
                      >
                        <span className={`badge badge-${f.severity === 'CRITICAL' ? 'critical' : f.severity === 'HIGH' ? 'high' : f.severity === 'MEDIUM' ? 'medium' : f.severity === 'UNAFFECTED' ? 'low' : 'gap'}`}>
                          {f.impactLevel}
                        </span>
                        <span className="simulate__file-name mono">{f.file.split('/').pop()}</span>
                        <span className="simulate__file-path">{f.file}</span>
                        <span className="simulate__file-arrow">{selectedFile === f.file ? '▲' : '▼'}</span>
                      </button>
                    ))}
                  </div>
                );
              })}

              {/* DATABASE */}
              <div className="simulate__tier">
                <div className="simulate__tier-label">DATABASE</div>
                <div className="simulate__db-na">
                  <span className="badge badge-low">N/A</span>
                  <span className="simulate__file-path">This prototype intentionally uses in-memory data — no database dependency.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence panel */}
          {affectedFile && (
            <EvidencePanel file={affectedFile} onClose={() => setSelectedFile(null)} />
          )}

          {/* Test gaps */}
          <div className="simulate__test-gaps card">
            <h2 className="simulate__section-title">TEST COVERAGE ANALYSIS</h2>
            {r.testGaps.map((gap, i) => (
              <div key={i} className="simulate__gap-row">
                <div className="simulate__gap-field">
                  <span className="simulate__gap-label">Affected behavior</span>
                  <span>{gap.affectedBehavior}</span>
                </div>
                <div className="simulate__gap-field">
                  <span className="simulate__gap-label">Relevant assertion</span>
                  <span className={gap.relevantAssertion ? 'status-pass' : 'status-fail'}>
                    {gap.relevantAssertion ?? 'NOT FOUND'}
                  </span>
                </div>
                <div className="simulate__gap-field">
                  <span className="simulate__gap-label">Test gap</span>
                  <span className={`badge ${gap.isGap ? 'badge-gap' : 'badge-success'}`}>
                    {gap.isGap ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="simulate__gap-field">
                  <span className="simulate__gap-label">File</span>
                  <span className="mono">{gap.file.split('/').pop()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="simulate__cta-row">
            <button className="btn-primary" onClick={() => navigate('/impact-map')}>
              View Impact Map →
            </button>
            <button className="btn-success" onClick={() => navigate('/approve')}>
              REVIEW & APPROVE →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
