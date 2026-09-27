/**
 * ContractShield Repair Engine
 *
 * Defines what Bob needs to repair after human approval.
 * Produces the repair plan, change descriptions, and post-repair diffs.
 *
 * Bob performs the actual multi-file coordinated edit.
 * This engine describes the repair scope and records outcomes.
 */

import type { ContractChange, AffectedFile } from './impactAnalyzer';

export interface RepairStep {
  stepNumber: number;
  description: string;
  file: string;
  changeType: 'field_rename' | 'endpoint_version' | 'test_update' | 'contract_update';
  oldValue: string;
  newValue: string;
  completed: boolean;
}

export interface RepairPlan {
  change: ContractChange;
  approvedFiles: string[];
  steps: RepairStep[];
}

export interface FileDiff {
  file: string;
  changeDescription: string;
  linesChanged: number;
}

export interface RepairResult {
  filesChanged: number;
  linesChanged: number;
  unrelatedFiles: number;
  unrelatedFilePaths: string[];
  diffs: FileDiff[];
  completedAt: string;
}

export function buildRepairPlan(
  change: ContractChange,
  affectedFiles: AffectedFile[]
): RepairPlan {
  const approvedFiles = affectedFiles
    .filter((f) => f.impactLevel !== 'UNAFFECTED' && f.tier !== 'CONTRACT')
    .map((f) => f.file);

  const steps: RepairStep[] = [
    {
      stepNumber: 1,
      description: 'Update backend DTO field: rename userId → id',
      file: 'backend/src/main/java/com/contractshield/dto/UserDTO.java',
      changeType: 'field_rename',
      oldValue: 'private Long userId',
      newValue: 'private Long id',
      completed: false,
    },
    {
      stepNumber: 2,
      description: 'Update backend controller: add v2 endpoint mapping',
      file: 'backend/src/main/java/com/contractshield/controller/UserController.java',
      changeType: 'endpoint_version',
      oldValue: '@GetMapping("/api/v1/users/{id}")',
      newValue: '@GetMapping("/api/v2/users/{id}")',
      completed: false,
    },
    {
      stepNumber: 3,
      description: 'Update backend tests: use v2 endpoint and assert id field',
      file: 'backend/src/test/java/com/contractshield/controller/UserControllerTest.java',
      changeType: 'test_update',
      oldValue: 'get("/api/v1/users/101") + no id assertion',
      newValue: 'get("/api/v2/users/101") + jsonPath("$.id") assertion',
      completed: false,
    },
    {
      stepNumber: 4,
      description: 'Update TypeScript type: rename userId → id',
      file: 'frontend/src/types/user.types.ts',
      changeType: 'field_rename',
      oldValue: 'userId: number',
      newValue: 'id: number',
      completed: false,
    },
    {
      stepNumber: 5,
      description: 'Update frontend API client: change v1 → v2 endpoint',
      file: 'frontend/src/api/userApi.ts',
      changeType: 'endpoint_version',
      oldValue: "const BASE_URL = '/api/v1/users'",
      newValue: "const BASE_URL = '/api/v2/users'",
      completed: false,
    },
    {
      stepNumber: 6,
      description: 'Update React component: rename user.userId → user.id',
      file: 'frontend/src/components/UserProfile.tsx',
      changeType: 'field_rename',
      oldValue: '{user.userId}',
      newValue: '{user.id}',
      completed: false,
    },
    {
      stepNumber: 7,
      description: 'Update frontend tests: fix mock data and add userId→id assertion',
      file: 'frontend/tests/UserProfile.test.tsx',
      changeType: 'test_update',
      oldValue: 'userId: 101',
      newValue: 'id: 101 (also adds assertion on user-id testid)',
      completed: false,
    },
  ];

  return { change, approvedFiles, steps };
}

export function buildRepairResult(steps: RepairStep[], approvedFiles: string[]): RepairResult {
  const diffs: FileDiff[] = steps
    .filter((s) => s.completed)
    .map((s) => ({
      file: s.file,
      changeDescription: `${s.oldValue} → ${s.newValue}`,
      linesChanged: s.changeType === 'test_update' ? 4 : 2,
    }));

  const approvedFileSet = new Set(approvedFiles);
  const unrelatedFilePaths = diffs
    .filter((diff) => !approvedFileSet.has(diff.file))
    .map((diff) => diff.file);

  return {
    filesChanged: diffs.length,
    linesChanged: diffs.reduce((acc, d) => acc + d.linesChanged, 0),
    unrelatedFiles: unrelatedFilePaths.length,
    unrelatedFilePaths,
    diffs,
    completedAt: new Date().toISOString(),
  };
}
