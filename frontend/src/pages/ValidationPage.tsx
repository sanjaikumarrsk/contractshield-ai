import React, { useState } from 'react';
import { useAppState } from '../store/appState';
import { useNavigate } from 'react-router-dom';
import { recordAuditEvent } from '../store/auditStore';
import { getAuditLog } from '../store/auditStore';
import type { ValidationResult } from '../store/appState';
import './ValidationPage.css';

export default function ValidationPage() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(false);
  const vr = state.validationResult;

  if (!state.repairResult) {
    return (
      <div className="validate validate--empty card">
        <h2>No repair completed</h2>
        <p>Complete the repair before running validation.</p>
        <button className="btn-primary" onClick={() => navigate('/repair')}>← Go to Repair</button>
      </div>
    );
  }

  /**
   * Validation logic — deterministic checks:
   *
   * 1. Backend: verifies repair steps for DTO and controller are marked complete
   * 2. Frontend: verifies repair steps for types, api, component, and tests are complete
   * 3. Contract: verifies the migration matches the supported pattern
   * 4. Approved-file boundary: verifies unrelatedFiles === 0
   *
   * External command execution is not available from this browser-only workflow.
   * Test checks are therefore reported as NOT VERIFIED rather than fabricated as
   * successful command executions.
   * The failure feedback loop is documented but not auto-triggered
   * (see spec section 31 — if Bob does not reliably support terminal
   *  output consumption, use external validation with manual feedback).
   */
  function runValidation() {
    setIsValidating(true);
    dispatch({ type: 'SET_PHASE', payload: 'VALIDATING' });
    recordAuditEvent('VALIDATION_STARTED', 'Validation started — running checks');

    const repairResult = state.repairResult!;
    const plan = state.repairPlan!;

    setTimeout(() => {
      // Check backend: DTO + controller repaired
      const backendStepsDone = plan.steps
        .filter((s) => s.file.includes('java'))
        .every((s) => s.completed);

      // Check frontend: types + api + component + test repaired
      const frontendStepsDone = plan.steps
        .filter((s) => s.file.includes('frontend'))
        .every((s) => s.completed);

      // Contract: migration is known supported pattern
      const contractOk = plan.change.oldEndpoint === '/api/v1/users/{id}'
        && plan.change.newEndpoint === '/api/v2/users/{id}'
        && plan.change.oldField === 'userId'
        && plan.change.newField === 'id';

      // Boundary: no unrelated files touched
      const boundaryOk = repairResult.unrelatedFiles === 0;

      const result: ValidationResult = {
        backend: {
          status: 'NOT_VERIFIED',
          output: backendStepsDone
            ? 'NOT VERIFIED - mvn test was not executed by this UI'
            : 'NOT VERIFIED - backend repair steps are incomplete; mvn test was not executed',
        },
        frontend: {
          status: 'NOT_VERIFIED',
          output: frontendStepsDone
            ? 'NOT VERIFIED - npm test was not executed by this UI'
            : 'NOT VERIFIED - frontend repair steps are incomplete; npm test was not executed',
        },
        contract: {
          status: contractOk ? 'PASS' : 'FAIL',
          output: contractOk
            ? 'Contract migration pattern verified: v1→v2, userId→id'
            : 'FAIL — unsupported migration pattern detected',
        },
        approvedFileBoundary: {
          status: boundaryOk ? 'PASS' : 'FAIL',
          output: boundaryOk
            ? `${repairResult.filesChanged} approved file changes recorded, 0 unrelated paths recorded`
            : `FAIL — unrelated files recorded outside approved list: ${repairResult.unrelatedFilePaths.join(', ')}`,
        },
        overall: 'REQUIRES FIX',
      };

      dispatch({ type: 'SET_VALIDATION', payload: result });
      recordAuditEvent('VALIDATION_COMPLETED', `Validation complete — ${result.overall}`, {
        backend: result.backend.status,
        frontend: result.frontend.status,
        contract: result.contract.status,
        boundary: result.approvedFileBoundary.status,
      });
      setIsValidating(false);
    }, 800);
  }

  const checks = vr ? [
    { label: 'Backend tests', key: 'backend' as const, cmd: 'mvn test' },
    { label: 'Frontend tests', key: 'frontend' as const, cmd: 'npm test' },
    { label: 'Contract consistency', key: 'contract' as const, cmd: 'contract-verify' },
    { label: 'Approved-file boundary', key: 'approvedFileBoundary' as const, cmd: 'boundary-check' },
  ] : [];

  const auditLog = getAuditLog();

  return (
    <div className="validate">
      <div className="validate__header">
        <h1 className="validate__title">VALIDATION</h1>
        <p className="validate__subtitle">Record repair and contract checks. External tests are not executed by this UI.</p>
      </div>

      {!vr && !isValidating && (
        <div className="card validate__start">
          <p>All repair steps are complete. Run validation to record what is and is not verified.</p>
          <button className="btn-success validate__run-btn" onClick={runValidation}>
            ▶ RECORD VALIDATION STATUS
          </button>
        </div>
      )}

      {isValidating && (
        <div className="card validate__running" role="status" aria-live="polite">
          <div className="validate__running-icon">⟳</div>
          <p>Running validation checks…</p>
        </div>
      )}

      {vr && (
        <>
          {/* Check results */}
          <div className="card validate__checks">
            <h2 className="validate__section-title">VALIDATION RESULTS</h2>
            {checks.map((c) => {
              const check = vr[c.key];
              return (
                <div key={c.key} className={`validate__check validate__check--${check.status.toLowerCase()}`}>
                  <span className={`validate__check-icon ${check.status === 'PASS' ? 'status-pass' : check.status === 'NOT_VERIFIED' ? 'status-warn' : 'status-fail'}`}>
                    {check.status === 'PASS' ? '✓' : check.status === 'NOT_VERIFIED' ? '?' : '✗'}
                  </span>
                  <div className="validate__check-body">
                    <div className="validate__check-label">{c.label}</div>
                    <div className="validate__check-output mono">{check.output}</div>
                    <div className="validate__check-cmd">Command: <span className="mono">{c.cmd}</span></div>
                  </div>
                  <span className={`badge ${check.status === 'PASS' ? 'badge-success' : check.status === 'NOT_VERIFIED' ? 'badge-high' : 'badge-critical'}`}>
                    {check.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Final status */}
          <div className={`validate__final ${vr.overall === 'READY FOR REVIEW' ? 'validate__final--pass' : 'validate__final--fail'}`}>
            <div className="validate__final-icon">{vr.overall === 'READY FOR REVIEW' ? '✓' : '✗'}</div>
            <div className="validate__final-status">{vr.overall}</div>
          </div>

          {/* Repair report */}
          {state.repairResult && (
            <div className="card validate__report">
              <h2 className="validate__section-title">CONTRACTSHIELD VALIDATION REPORT</h2>
              <div className="validate__report-grid">
                <div className="validate__report-row">
                  <span className="validate__report-label">Contract</span>
                  <span>User API Migration</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Changes detected</span>
                  <span>{state.analysisResult?.summary.breakingChanges ?? '—'}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Affected files</span>
                  <span>{state.analysisResult?.summary.affectedFiles ?? '—'}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Test gaps found</span>
                  <span>{state.analysisResult?.summary.testGaps ?? '—'}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Approved files recorded</span>
                  <span>{state.repairResult.filesChanged}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Planned lines</span>
                  <span>{state.repairResult.linesChanged}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Unrelated files</span>
                  <span className={state.repairResult.unrelatedFiles === 0 ? 'status-pass' : 'status-fail'}>
                    {state.repairResult.unrelatedFiles}
                  </span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Backend</span>
                  <span className={vr.backend.status === 'PASS' ? 'status-pass' : 'status-fail'}>{vr.backend.status}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Frontend</span>
                  <span className={vr.frontend.status === 'PASS' ? 'status-pass' : 'status-fail'}>{vr.frontend.status}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Contract</span>
                  <span className={vr.contract.status === 'PASS' ? 'status-pass' : 'status-fail'}>{vr.contract.status}</span>
                </div>
                <div className="validate__report-row">
                  <span className="validate__report-label">Final status</span>
                  <span className={vr.overall === 'READY FOR REVIEW' ? 'status-pass' : 'status-fail'} style={{ fontWeight: 700 }}>
                    {vr.overall}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Audit timeline */}
          <div className="card validate__audit">
            <h2 className="validate__section-title">AUDIT TRAIL</h2>
            <ol className="validate__audit-list">
              {auditLog.map((event) => (
                <li key={event.id} className="validate__audit-item">
                  <span className="validate__audit-time mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  <span className="validate__audit-type">{event.type.replace(/_/g, ' ')}</span>
                  <span className="validate__audit-summary">{event.summary}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Final demo checklist */}
          {vr.overall === 'READY FOR REVIEW' && (
            <div className="validate__checklist card">
              <h2 className="validate__section-title">DEMO SUMMARY</h2>
              <ul className="validate__checklist-list">
                <li><span className="status-pass">✓</span> Impact discovered — {state.analysisResult?.summary.affectedFiles} files across {state.analysisResult?.summary.breakingChanges} contract changes</li>
                <li><span className="status-pass">✓</span> Evidence verified — direct references, dependencies, test gaps</li>
                <li><span className="status-pass">✓</span> Human approved — repair gate enforced</li>
                <li><span className="status-pass">✓</span> Repair workflow recorded — approved scope tracked</li>
                <li><span className="status-warn">?</span> Tests require external execution — this UI does not run Maven or npm</li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
