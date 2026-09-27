import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../store/appState';
import './DashboardPage.css';

export default function DashboardPage() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const r = state.analysisResult;
  const activeWorkflowIndex = {
    IDLE: -1,
    SIMULATING: 0,
    SIMULATED: 1,
    APPROVED: 2,
    REPAIRING: 3,
    REPAIRED: 3,
    VALIDATING: 4,
    VALIDATED: 4,
  }[state.phase];

  return (
    <div className="dashboard">
      {/* Hero */}
      <section className="dashboard__hero">
        <div className="dashboard__shield-icon" aria-hidden="true">◈</div>
        <h1 className="dashboard__title">ContractShield <span className="dashboard__ai">AI</span></h1>
        <p className="dashboard__tagline">See the blast radius before you ship the break.</p>
        <button className="btn-primary dashboard__cta" onClick={() => navigate('/simulate')}>
          ▶ SIMULATE CONTRACT CHANGE
        </button>
      </section>

      <section className="dashboard__workflow" aria-label="ContractShield workflow">
        {['SIMULATE', 'IMPACT MAP', 'APPROVE', 'REPAIR', 'VALIDATE'].map((step, index) => (
          <React.Fragment key={step}>
            <span className={`dashboard__workflow-step ${index === activeWorkflowIndex ? 'dashboard__workflow-step--active' : ''}`}>
              {step}
            </span>
            {index < 4 && <span className="dashboard__workflow-arrow" aria-hidden="true">→</span>}
          </React.Fragment>
        ))}
      </section>

      {/* Status cards */}
      <section className="dashboard__cards">
        <div className="card dashboard__stat">
          <div className="dashboard__stat-label">Contract</div>
          <div className="dashboard__stat-value">User API Migration</div>
          <div className="dashboard__stat-sub">v1 → v2 · userId → id</div>
        </div>
        <div className="card dashboard__stat">
          <div className="dashboard__stat-label">Breaking Changes</div>
          <div className="dashboard__stat-value dashboard__stat-value--critical">
            {r ? r.summary.breakingChanges : '—'}
          </div>
        </div>
        <div className="card dashboard__stat">
          <div className="dashboard__stat-label">Affected Files</div>
          <div className="dashboard__stat-value dashboard__stat-value--warn">
            {r ? r.summary.affectedFiles : '—'}
          </div>
        </div>
        <div className="card dashboard__stat">
          <div className="dashboard__stat-label">Test Gaps</div>
          <div className="dashboard__stat-value dashboard__stat-value--gap">
            {r ? r.summary.testGaps : '—'}
          </div>
        </div>
        <div className="card dashboard__stat">
          <div className="dashboard__stat-label">Unaffected</div>
          <div className="dashboard__stat-value dashboard__stat-value--muted">
            {r ? r.summary.unaffectedFiles : '—'}
          </div>
        </div>
        <div className="card dashboard__stat">
          <div className="dashboard__stat-label">Status</div>
          <div className={`dashboard__stat-value ${state.phase === 'VALIDATED' ? 'status-pass' : state.phase === 'IDLE' ? 'dashboard__stat-value--muted' : 'status-warn'}`}>
            {state.phase === 'IDLE' && 'NOT STARTED'}
            {state.phase === 'SIMULATING' && 'ANALYZING…'}
            {state.phase === 'SIMULATED' && 'AWAITING APPROVAL'}
            {state.phase === 'APPROVED' && 'APPROVED'}
            {state.phase === 'REPAIRING' && 'REPAIRING…'}
            {state.phase === 'REPAIRED' && 'REPAIRED'}
            {state.phase === 'VALIDATING' && 'VALIDATING…'}
            {state.phase === 'VALIDATED' && 'READY FOR REVIEW'}
          </div>
        </div>
      </section>

      {/* Workflow comparison */}
      <section className="dashboard__compare">
        <h2 className="dashboard__section-title">Before vs After ContractShield</h2>
        <div className="dashboard__compare-grid">
          <div className="card dashboard__compare-card dashboard__compare-card--before">
            <h3 className="dashboard__compare-heading">BEFORE</h3>
            <ol className="dashboard__compare-steps">
              <li>Receive contract change notification</li>
              <li>Manually search repository for references</li>
              <li>Open each file and inspect</li>
              <li>Search again for missed patterns</li>
              <li>Inspect test files individually</li>
              <li>Modify files manually, one at a time</li>
              <li>Run tests</li>
              <li>Discover missed dependency</li>
              <li>Repeat from step 2</li>
            </ol>
          </div>
          <div className="dashboard__compare-arrow">→</div>
          <div className="card dashboard__compare-card dashboard__compare-card--after">
            <h3 className="dashboard__compare-heading">AFTER CONTRACTSHIELD</h3>
            <ol className="dashboard__compare-steps dashboard__compare-steps--after">
              <li className="step-simulate">SIMULATE — detect all impacted files</li>
              <li className="step-impact">Impact Map — evidence for every finding</li>
              <li className="step-approve">APPROVE — human gate before any change</li>
              <li className="step-repair">BOB REPAIR — coordinated multi-file edit</li>
              <li className="step-validate">VALIDATE — record contract and boundary checks</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Supported patterns */}
      <section className="dashboard__supported">
        <h2 className="dashboard__section-title">Supported Migration Patterns (v1)</h2>
        <div className="dashboard__supported-grid">
          <div className="card dashboard__supported-item">
            <span className="status-pass">✓</span>
            <span className="mono">/api/v1/... → /api/v2/...</span>
            <span className="dashboard__supported-desc">Endpoint version migration</span>
          </div>
          <div className="card dashboard__supported-item">
            <span className="status-pass">✓</span>
            <span className="mono">userId → id</span>
            <span className="dashboard__supported-desc">Response field rename</span>
          </div>
          <div className="card dashboard__supported-item dashboard__supported-item--no">
            <span className="status-fail">✗</span>
            <span className="mono">arbitrary schema changes</span>
            <span className="dashboard__supported-desc">Not currently supported</span>
          </div>
          <div className="card dashboard__supported-item dashboard__supported-item--no">
            <span className="status-fail">✗</span>
            <span className="mono">database migrations</span>
            <span className="dashboard__supported-desc">Not currently supported</span>
          </div>
        </div>
      </section>
    </div>
  );
}
