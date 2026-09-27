import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../store/appState';
import { buildRepairResult } from '../analyzer/repairEngine';
import { recordAuditEvent } from '../store/auditStore';
import './RepairPage.css';

export default function RepairPage() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const repairTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairDone, setRepairDone] = useState(state.repairResult !== null);

  const plan = state.repairPlan;

  useEffect(() => () => {
    if (repairTimer.current) {
      clearInterval(repairTimer.current);
    }
  }, []);

  if (!state.approvalGranted || !plan) {
    return (
      <div className="repair repair--empty card">
        <h2>REPAIR NOT APPROVED</h2>
        <p>Human approval is required before Bob can make changes.</p>
        <button className="btn-primary" onClick={() => navigate('/approve')}>← Go to Approve</button>
      </div>
    );
  }

  const approvedPlan = plan;

  /**
   * Records the approved coordinated multi-file repair workflow.
   *
   * In the real IBM Bob workflow:
   *   1. Bob reads the approved files and the repair plan
   *   2. Bob applies each targeted change
   *   3. This UI records the step state for the approved workflow
   *
   * Note: The actual file edits on disk are done via Bob's agent mode.
   * This UI tracks workflow state; it does not edit files on disk.
   */
  function startRepair() {
    setIsRepairing(true);
    dispatch({ type: 'SET_PHASE', payload: 'REPAIRING' });
    recordAuditEvent('REMEDIATION_STARTED', 'Approved repair workflow started — Bob task context recorded');

    // Step through the repair plan with small delays to visualize Bob working
    let stepIndex = 0;
    repairTimer.current = setInterval(() => {
      const updated = approvedPlan.steps.map((step, index) => (
        index <= stepIndex ? { ...step, completed: true } : step
      ));
      dispatch({ type: 'UPDATE_REPAIR_STEPS', payload: updated });
      stepIndex++;

      if (stepIndex >= updated.length) {
        if (repairTimer.current) {
          clearInterval(repairTimer.current);
          repairTimer.current = null;
        }
        const result = buildRepairResult(updated, approvedPlan.approvedFiles);
        recordAuditEvent('FILES_CHANGED', `Repair workflow completed — ${result.filesChanged} approved files recorded`, {
          filesChanged: result.filesChanged,
          linesChanged: result.linesChanged,
          unrelatedFiles: result.unrelatedFiles,
        });
        dispatch({ type: 'SET_REPAIR_RESULT', payload: result });
        setRepairDone(true);
        setIsRepairing(false);
      }
    }, 600);
  }

  const steps = plan?.steps ?? [];
  const result = state.repairResult;

  return (
    <div className="repair">
      <div className="repair__header">
        <h1 className="repair__title">CONTRACTSHIELD REPAIR</h1>
        <p className="repair__subtitle">Track the approved IBM Bob repair workflow and its file boundary.</p>
      </div>

      {/* Bob context description */}
      <div className="card repair__bob-context">
        <h2 className="repair__section-title">BOB REPAIR CONTEXT</h2>
        <div className="repair__bob-info">
          <div className="repair__bob-row">
            <span className="repair__bob-label">Contract change</span>
            <span className="mono">{plan.change.oldEndpoint} → {plan.change.newEndpoint}</span>
          </div>
          <div className="repair__bob-row">
            <span className="repair__bob-label">Field rename</span>
            <span className="mono">{plan.change.oldField} → {plan.change.newField}</span>
          </div>
          <div className="repair__bob-row">
            <span className="repair__bob-label">Approved files</span>
            <span>{plan.approvedFiles.length} files</span>
          </div>
          <div className="repair__bob-row">
            <span className="repair__bob-label">Instruction</span>
            <span className="repair__bob-instruction">
              Apply the approved contract migration consistently across all approved files.
              Rename userId → id where required. Update endpoint references from v1 to v2.
              Preserve unrelated behavior. Do not modify files outside the approved list.
            </span>
          </div>
        </div>
      </div>

      {/* Repair steps */}
      <div className="card repair__steps">
        <h2 className="repair__section-title">REPAIR STEPS</h2>
        <ol className="repair__step-list">
          {steps.map((step, idx) => {
            const firstPending = steps.findIndex((s) => !s.completed);
            const isRunning = isRepairing && !step.completed && firstPending === idx;
            return (
              <li key={step.stepNumber} className={`repair__step ${step.completed ? 'repair__step--done' : isRunning ? 'repair__step--running' : ''}`}>
                <span className="repair__step-icon">
                  {step.completed ? '✓' : isRunning ? '⟳' : '○'}
                </span>
                <div className="repair__step-body">
                  <div className="repair__step-desc">{step.description}</div>
                  <div className="repair__step-diff mono">{step.oldValue} → {step.newValue}</div>
                </div>
              </li>
            );
          })}
        </ol>

        {!isRepairing && !repairDone && (
          <button className="btn-success repair__start-btn" onClick={startRepair}>
            ◆ START REPAIR WORKFLOW
          </button>
        )}
        {isRepairing && (
          <div className="repair__running">⟳ Recording approved repair steps…</div>
        )}
      </div>

      {/* Diff summary */}
      {result && (
        <div className="card repair__diff">
          <h2 className="repair__section-title">CHANGE SUMMARY</h2>
          <div className="repair__diff-stats">
            <div className="repair__diff-stat">
              <div className="repair__diff-num">{result.filesChanged}</div>
              <div className="repair__diff-lbl">APPROVED FILES RECORDED</div>
            </div>
            <div className="repair__diff-stat">
              <div className="repair__diff-num">{result.linesChanged}</div>
              <div className="repair__diff-lbl">PLANNED LINES</div>
            </div>
            <div className="repair__diff-stat">
              <div className="repair__diff-num repair__diff-num--zero">{result.unrelatedFiles}</div>
              <div className="repair__diff-lbl">UNRELATED FILES</div>
            </div>
          </div>
          <div className="repair__diff-list">
            {result.diffs.map((d, i) => (
              <div key={i} className="repair__diff-item">
                <span className="mono repair__diff-file">{d.file.split('/').pop()}</span>
                <span className="repair__diff-change">{d.changeDescription}</span>
                <span className="repair__diff-lines">+{d.linesChanged} lines</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {repairDone && (
        <div className="repair__cta-row">
          <div className="badge badge-success">✓ Repair workflow complete — approved changes recorded in UI</div>
            <button className="btn-success" onClick={() => navigate('/validate')}>
             REVIEW VALIDATION →
          </button>
        </div>
      )}
    </div>
  );
}
