import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../store/appState';
import { buildRepairPlan } from '../analyzer/repairEngine';
import { recordAuditEvent } from '../store/auditStore';
import './ApprovalPage.css';

export default function ApprovalPage() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();

  const r = state.analysisResult;

  if (!r) {
    return (
      <div className="approve card approve--empty">
        <h2>No analysis available</h2>
        <p>Run a simulation first.</p>
        <button className="btn-primary" onClick={() => navigate('/simulate')}>← Go to Simulate</button>
      </div>
    );
  }

  if (state.approvalGranted) {
    return (
      <div className="approve approve--done card">
        <div className="approve__done-icon">✓</div>
        <h2>Repair Approved</h2>
        <p>Human approval recorded. Bob is ready to perform the coordinated repair.</p>
        <button className="btn-primary" onClick={() => navigate('/repair')}>Continue to Repair →</button>
      </div>
    );
  }

  const affectedForRepair = r.affectedFiles.filter(
    (f) => f.impactLevel !== 'UNAFFECTED' && f.tier !== 'CONTRACT'
  );

  function handleApprove() {
    if (!r) return;
    const plan = buildRepairPlan(r.change, r.affectedFiles);
    dispatch({ type: 'SET_REPAIR_PLAN', payload: plan });
    recordAuditEvent('APPROVAL_GRANTED', 'Human reviewed and approved the repair plan');
    recordAuditEvent('APPROVED_FILES_RECORDED', 'Approved file list recorded', {
      files: plan.approvedFiles,
    });
    dispatch({ type: 'GRANT_APPROVAL' });
    navigate('/repair');
  }

  return (
    <div className="approve">
      <div className="approve__header">
        <h1 className="approve__title">CONTRACT IMPACT REVIEW</h1>
        <p className="approve__subtitle">Review the detected impact and proposed repair before approving.</p>
      </div>

      {/* Change summary */}
      <div className="card approve__change">
        <h2 className="approve__section-title">PROPOSED CONTRACT MIGRATION</h2>
        <div className="approve__migration-row">
          <div className="approve__migration-item">
            <span className="approve__migration-label">Endpoint</span>
            <span className="approve__migration-diff">
              <span className="approve__old">{r.change.oldEndpoint}</span>
              <span className="approve__arrow">→</span>
              <span className="approve__new">{r.change.newEndpoint}</span>
            </span>
          </div>
          <div className="approve__migration-item">
            <span className="approve__migration-label">Field</span>
            <span className="approve__migration-diff">
              <span className="approve__old">{r.change.oldField}</span>
              <span className="approve__arrow">→</span>
              <span className="approve__new">{r.change.newField}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Impact summary */}
      <div className="card approve__summary">
        <h2 className="approve__section-title">IMPACT SUMMARY</h2>
        <div className="approve__summary-grid">
          <div><span className="approve__label">Breaking changes</span><span className="approve__value approve__value--critical">{r.summary.breakingChanges}</span></div>
          <div><span className="approve__label">Direct references</span><span className="approve__value approve__value--warn">{r.summary.directReferences}</span></div>
          <div><span className="approve__label">Potential impacts</span><span className="approve__value">{r.summary.potentialImpacts}</span></div>
          <div><span className="approve__label">Test gaps</span><span className="approve__value approve__value--gap">{r.summary.testGaps}</span></div>
          <div><span className="approve__label">Unaffected files</span><span className="approve__value approve__value--muted">{r.summary.unaffectedFiles}</span></div>
        </div>
      </div>

      {/* Test gaps */}
      {r.testGaps.some((g) => g.isGap) && (
        <div className="card approve__gaps">
          <h2 className="approve__section-title">⚠ TEST GAPS DETECTED</h2>
          {r.testGaps.filter((g) => g.isGap).map((gap, i) => (
            <div key={i} className="approve__gap-item">
              <span className="badge badge-gap">TEST GAP</span>
              <span><strong>{gap.file.includes('backend') ? 'BACKEND' : 'FRONTEND'} TEST GAP</strong> · <span className="mono">{gap.file.split('/').pop()}</span></span>
              <span className="approve__label">{gap.affectedBehavior} · repair will add the missing assertion</span>
            </div>
          ))}
        </div>
      )}

      {/* Approved files */}
      <div className="card approve__files">
        <h2 className="approve__section-title">APPROVED FILES FOR REPAIR</h2>
        <p className="approve__files-note">Only these files will be modified. No other files will be touched.</p>
        <div className="approve__file-list">
          {affectedForRepair.map((f) => (
            <div key={f.file} className="approve__file-item">
              <span className="approve__check">✓</span>
              <span className="mono approve__file-name">{f.file.split('/').pop()}</span>
              <span className="approve__file-path">{f.file}</span>
              <span className={`badge badge-${f.severity === 'CRITICAL' ? 'critical' : f.severity === 'HIGH' ? 'high' : f.severity === 'MEDIUM' ? 'medium' : 'low'}`}>
                {f.severity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Repair plan */}
      <div className="card approve__plan">
        <h2 className="approve__section-title">REPAIR PLAN</h2>
        <ol className="approve__plan-steps">
          <li>Update backend DTO field: <span className="approve__old">userId</span> → <span className="approve__new">id</span></li>
          <li>Update backend controller: <span className="approve__old">/api/v1/users</span> → <span className="approve__new">/api/v2/users</span></li>
          <li>Update backend tests to use v2 and assert <span className="approve__new">$.id</span></li>
          <li>Update TypeScript type: <span className="approve__old">userId: number</span> → <span className="approve__new">id: number</span></li>
          <li>Update frontend API client: <span className="approve__old">/api/v1/users</span> → <span className="approve__new">/api/v2/users</span></li>
          <li>Update React component: <span className="approve__old">user.userId</span> → <span className="approve__new">user.id</span></li>
          <li>Update frontend tests: fix mock data and add missing user ID assertion</li>
        </ol>
      </div>

      {/* Approval gate */}
      <div className="card approve__gate">
        <div className="approve__gate-warning">
           ⚠ No repair workflow will start without your explicit approval.
           This is the human safety gate.
        </div>
        <button className="btn-success approve__approve-btn" onClick={handleApprove}>
          ✓ APPROVE REPAIR
        </button>
        <button className="btn-ghost" onClick={() => navigate('/simulate')}>
          ← Back to Simulate
        </button>
      </div>
    </div>
  );
}
