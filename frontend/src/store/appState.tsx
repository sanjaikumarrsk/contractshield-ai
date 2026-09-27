/**
 * ContractShield global workflow state.
 * Simple React context — no external state library needed.
 */
import React, { createContext, useContext, useReducer } from 'react';
import type { AnalysisResult } from '../analyzer/impactAnalyzer';
import type { RepairPlan, RepairResult } from '../analyzer/repairEngine';

export type WorkflowPhase =
  | 'IDLE'
  | 'SIMULATING'
  | 'SIMULATED'
  | 'APPROVED'
  | 'REPAIRING'
  | 'REPAIRED'
  | 'VALIDATING'
  | 'VALIDATED';

export interface ValidationResult {
  backend: { status: 'PASS' | 'FAIL' | 'NOT_VERIFIED' | 'PENDING'; output: string };
  frontend: { status: 'PASS' | 'FAIL' | 'NOT_VERIFIED' | 'PENDING'; output: string };
  contract: { status: 'PASS' | 'FAIL' | 'NOT_VERIFIED' | 'PENDING'; output: string };
  approvedFileBoundary: { status: 'PASS' | 'FAIL' | 'NOT_VERIFIED' | 'PENDING'; output: string };
  overall: 'READY FOR REVIEW' | 'REQUIRES FIX' | 'PENDING';
}

export interface AppState {
  phase: WorkflowPhase;
  analysisResult: AnalysisResult | null;
  repairPlan: RepairPlan | null;
  repairResult: RepairResult | null;
  validationResult: ValidationResult | null;
  selectedFileKey: string | null;
  approvalGranted: boolean;
}

type Action =
  | { type: 'SET_PHASE'; payload: WorkflowPhase }
  | { type: 'SET_ANALYSIS'; payload: AnalysisResult }
  | { type: 'SET_REPAIR_PLAN'; payload: RepairPlan }
  | { type: 'UPDATE_REPAIR_STEPS'; payload: RepairPlan['steps'] }
  | { type: 'SET_REPAIR_RESULT'; payload: RepairResult }
  | { type: 'SET_VALIDATION'; payload: ValidationResult }
  | { type: 'GRANT_APPROVAL' }
  | { type: 'SELECT_FILE'; payload: string | null }
  | { type: 'RESET_DOWNSTREAM' }
  | { type: 'RESET' };

const initialState: AppState = {
  phase: 'IDLE',
  analysisResult: null,
  repairPlan: null,
  repairResult: null,
  validationResult: null,
  selectedFileKey: null,
  approvalGranted: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_ANALYSIS':
      return { ...state, analysisResult: action.payload, phase: 'SIMULATED' };
    case 'SET_REPAIR_PLAN':
      return { ...state, repairPlan: action.payload };
    case 'UPDATE_REPAIR_STEPS':
      return state.repairPlan
        ? { ...state, repairPlan: { ...state.repairPlan, steps: action.payload } }
        : state;
    case 'SET_REPAIR_RESULT':
      return { ...state, repairResult: action.payload, phase: 'REPAIRED' };
    case 'SET_VALIDATION':
      return { ...state, validationResult: action.payload, phase: 'VALIDATED' };
    case 'GRANT_APPROVAL':
      return { ...state, approvalGranted: true, phase: 'APPROVED' };
    case 'SELECT_FILE':
      return { ...state, selectedFileKey: action.payload };
    case 'RESET_DOWNSTREAM':
      return {
        ...state,
        repairPlan: null,
        repairResult: null,
        validationResult: null,
        selectedFileKey: null,
        approvalGranted: false,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
