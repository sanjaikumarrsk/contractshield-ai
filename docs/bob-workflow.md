# IBM Bob Workflow — ContractShield AI

## Overview

IBM Bob serves as the **core remediation engine** in ContractShield.
Bob is not used for generic code generation or as a chatbot.
Bob is used for semantic reasoning, cross-tier relationship interpretation,
and coordinated multi-file repair across the application stack.

---

## Bob Tasks

### Task 01: Document Understanding

**Input:** `contract/openapi.yaml`

**Bob instruction:**
```
Read and analyze the OpenAPI contract file.
Identify:
- The API endpoint path
- The response schema field names
- The breaking changes between v1 and v2
Report: old endpoint, new endpoint, old field, new field.
```

**Evidence:** No image artifact is included in this checkout. Use only an actual Bob session summary if captured.

---

### Task 02: Cross-Tier Impact Reasoning

**Input:** deterministic pre-filter output (file list + line numbers)

**Bob instruction:**
```
Given the following affected files and the contract change:
  - old endpoint: /api/v1/users/{id}
  - new endpoint: /api/v2/users/{id}
  - old field: userId
  - new field: id

For each file in the list, explain:
1. Why it is affected
2. What will break at runtime
3. What the appropriate fix is

Do not modify any files yet. Analysis only.
```

**Evidence:** No image artifact is included in this checkout. Use only an actual Bob session summary if captured.

---

### Task 03: Controlled Multi-File Repair

**Input:**
- Repair plan (7 steps)
- Approved file list (7 application/test files)
- Old contract + new contract
- Evidence map

**Bob instruction:**
```
Apply the approved contract migration across the following files only.

Contract change:
  - Rename field: userId → id
  - Update endpoint: /api/v1/users → /api/v2/users

Approved application/test files:
  1. backend/src/main/java/com/contractshield/dto/UserDTO.java
  2. backend/src/main/java/com/contractshield/controller/UserController.java
  3. backend/src/test/java/com/contractshield/controller/UserControllerTest.java
  4. frontend/src/types/user.types.ts
  5. frontend/src/api/userApi.ts
  6. frontend/src/components/UserProfile.tsx
  7. frontend/tests/UserProfile.test.tsx

Reference input (not an approved repair target):
  - contract/openapi.yaml

Rules:
  - Rename userId → id where required
  - Update endpoint references from v1 to v2
  - Preserve all unrelated behavior
  - Update test mock data and add assertion for the renamed field
  - Do NOT modify any files outside this list
  - Do NOT perform unrelated refactoring
```

**Evidence:** No image artifact is included in this checkout. Use only an actual Bob session summary if captured.

---

### Task 04: Validation (if Bob supports terminal output)

**Bob instruction:**
```
Run backend tests: mvn test
Run frontend tests: npm test
Report the results.
If any test fails, identify the failing assertion and suggest a targeted fix.
```

**Fallback (if terminal output is not reliably supported):**
- Run tests externally
- Provide failure output to Bob as text
- Bob suggests targeted correction
- Human applies correction and re-runs tests

**Evidence:** No image artifact is included in this checkout. Use only actual external command output if captured.

---

## Failure Feedback Loop

```
Bob repair
    ↓
external test runner (mvn test / npm test)
    ↓
failure output → paste into Bob context
    ↓
Bob identifies failing assertion
    ↓
targeted correction (single file, single assertion)
    ↓
re-run tests
    ↓
PASS
```

Note: ContractShield does not claim autonomous self-healing.
The human remains in the loop for failure interpretation.
Bob assists with diagnosis and targeted correction.

---

## Bob Usage Economics

ContractShield is designed to minimize Bob token consumption:

1. Deterministic pre-filter runs first — no Bob needed for literal search
2. Bob receives only the shortlisted files (not the whole repo)
3. Analysis results are cached — no repeated analysis
4. Repair is a single targeted task — no exploratory prompting
5. Bob session evidence is captured once per task
