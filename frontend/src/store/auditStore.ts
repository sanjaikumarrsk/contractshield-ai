/**
 * Lightweight audit trail for ContractShield.
 * Records every significant workflow step with timestamps.
 * No external persistence — in-memory for this prototype.
 */

export type AuditEventType =
  | 'CONTRACT_ANALYZED'
  | 'IMPACT_ANALYSIS_COMPLETED'
  | 'EVIDENCE_GENERATED'
  | 'APPROVAL_GRANTED'
  | 'APPROVED_FILES_RECORDED'
  | 'REMEDIATION_STARTED'
  | 'FILES_CHANGED'
  | 'VALIDATION_STARTED'
  | 'VALIDATION_COMPLETED';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  summary: string;
  details?: Record<string, unknown>;
}

let auditLog: AuditEvent[] = [];

export function recordAuditEvent(
  type: AuditEventType,
  summary: string,
  details?: Record<string, unknown>
): AuditEvent {
  const event: AuditEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    timestamp: new Date().toISOString(),
    summary,
    details,
  };
  auditLog = [...auditLog, event];
  return event;
}

export function getAuditLog(): AuditEvent[] {
  return auditLog;
}

export function clearAuditLog(): void {
  auditLog = [];
}
