# ContractShield AI

> **See the blast radius before you ship the break.**

A hackathon prototype demonstrating how IBM Bob can reduce the manual effort, errors, and
rework involved when an API contract change affects multiple layers of an application.

---

## Problem

API contract changes silently break consumers across backend, frontend, tests, and other
application artifacts. A developer may update the backend successfully while missing a
frontend reference, a type definition, or a test dependency.

**Example breaking migration:**

```
GET /api/v1/users/{id}   →   GET /api/v2/users/{id}
     userId              →        id
```

A developer searching manually may find the obvious files but miss:
- the TypeScript type interface
- a React component prop reference
- a test that passes but no longer covers the renamed field

---

## Solution

ContractShield detects the cross-tier blast radius **before** the change is shipped.
It provides evidence for every finding, requires human approval before the repair
workflow starts, and prepares a bounded IBM Bob repair task. The browser UI records
deterministic contract and boundary checks; Maven and npm tests must be run externally.

---

## Workflow: SIMULATE → IMPACT MAP → APPROVE → REPAIR → VALIDATE

```
CONTRACT CHANGE
      ↓
CONTRACT PARSER
      ↓
DETERMINISTIC PRE-FILTER (Python / literal search)
      ↓
CROSS-TIER IMPACT ANALYSIS
   ↙    ↓    ↘
BACKEND  FRONTEND  TESTS
      ↓
EVIDENCE-BACKED IMPACT MAP
      ↓
HUMAN APPROVAL GATE  ← NO changes before this step
      ↓
IBM BOB REPAIR (coordinated multi-file)
      ↓
BUILD + TEST VALIDATION
      ↓
READY FOR REVIEW (after external validation)
```

---

## Architecture

```
contractshield/
├── backend/          Spring Boot (Java 17, Maven) — demo User API
├── frontend/         React + TypeScript + Vite — ContractShield UI + demo consumer
│   ├── src/analyzer/ Deterministic impact engine + repair engine
│   ├── src/store/    Workflow state (React context) + audit trail
│   └── src/pages/    Dashboard · Simulate · ImpactMap · Approve · Repair · Validate
├── contract/         OpenAPI 3.x YAML — User API definition
├── analyzer/         Python pre-filter utility (deterministic)
├── bob_sessions/     IBM Bob task session evidence (when captured)
└── docs/             Additional documentation
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend demo app | Java 17, Spring Boot 3.x, Maven, in-memory data |
| Frontend UI | React 18, TypeScript, Vite, React Router |
| Analysis engine | TypeScript (deterministic) + Python utility |
| Contract | OpenAPI 3.x YAML |
| Testing (backend) | JUnit 5, Spring MockMvc |
| Testing (frontend) | Vitest, React Testing Library |
| AI core | IBM Bob 2.0 |
| Version control | Git |

**No database. No Docker. No Kubernetes. No external services.**

---

## Supported Migration Patterns (v1)

| Pattern | Supported |
|---------|-----------|
| Endpoint version: `/api/v1/...` → `/api/v2/...` | ✓ |
| Response field rename: `userId` → `id` | ✓ |
| Arbitrary schema transformations | ✗ |
| Multi-repository migrations | ✗ |
| Database migrations | ✗ |
| Complex authentication changes | ✗ |

---

## IBM Bob Role

Bob is the **core remediation engine** — not a generic code generator.

| Step | Bob's role |
|------|-----------|
| Document understanding | Reads and interprets `contract/openapi.yaml` |
| Repository reasoning | Understands cross-tier relationships and impact |
| Coordinated repair | Coordinates the approved Java/TypeScript/React/test repair task |
| Repair safety | Limits changes to the approved file list only |
| Failure analysis | Interprets test output and suggests targeted corrections |

### Deterministic + AI Hybrid Design

| What | How |
|------|-----|
| Exact string references | Deterministic (Python pre-filter + TS engine) |
| File discovery, line numbers, counts | Deterministic |
| Test-gap detection | Deterministic (assertion pattern check) |
| Command exit status | External verification; not executed by the browser UI |
| Semantic relationship reasoning | IBM Bob |
| Cross-tier impact explanation | IBM Bob |
| Coordinated multi-file repair | IBM Bob |
| Failure interpretation | IBM Bob (where supported) |

---

## Setup

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+
- npm 9+
- Python 3.8+ (optional, for pre-filter CLI)

### Backend

```bash
cd contractshield/backend
mvn spring-boot:run
```

Backend starts on `http://localhost:8080`

Test the initial API:
```bash
curl http://localhost:8080/api/v1/users/101
# → {"userId":101,"name":"RSK","email":"rsk@example.com"}
```

### Frontend

```bash
cd contractshield/frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:3000`

### GitHub Pages preparation

The frontend is configured for repository-based GitHub Pages hosting without hardcoding a
repository name. At build time it uses `VITE_BASE_PATH` when provided, or derives the base
from GitHub Actions' `GITHUB_REPOSITORY` value. The build also writes `dist/404.html` so
browser refreshes on client-side routes continue to load the SPA.

From `frontend/`, use one of these before publishing `dist/`:

```powershell
# Manual build: replace with the actual repository name.
$env:VITE_BASE_PATH = '/REPOSITORY_NAME/'
npm run build
```

```bash
# GitHub Actions: GITHUB_REPOSITORY supplies the repository name automatically.
npm ci
npm run build
```

Publish the resulting `frontend/dist` directory through GitHub Pages. The browser demo uses
the deterministic in-app analyzer and does not require the Spring backend; the Vite `/api`
proxy remains local-development-only. No deployment has been started from this workspace.

---

## Running Tests

### Backend tests

```bash
cd contractshield/backend
mvn test
```

### Frontend tests

```bash
cd contractshield/frontend
npm test
```

### Pre-filter utility

```bash
cd contractshield
python3 analyzer/prefilter.py --root . --json
```

---

## Demo Instructions (3 minutes)

**0:00–0:15** — Show the contract change:
- Open Dashboard, point to `/api/v1/users/{id}` → `/api/v2/users/{id}` and `userId` → `id`
- Ask: *"What breaks if we ship this?"*

**0:15–0:50** — Navigate to Simulate → click **RUN SIMULATION**
- Show 7 approved application/test files across 3 tiers; the contract is a reference input
- Show test gap detection

**0:50–1:15** — Click `UserProfile.tsx` node
- Show: line 50, `user.userId`, evidence, assessment: LIKELY RUNTIME BREAK

**1:15–1:30** — Navigate to Impact Map
- Show clickable graph nodes with tier grouping

**1:30–1:45** — Navigate to Approve
- Show repair plan, approved file list, human approval gate

**1:45–2:10** — Click **APPROVE REPAIR** → navigate to Repair
- Watch the repair workflow record 7 approved steps
- Show the planned change summary: 7 approved files, 0 unrelated

**2:10–2:45** — Navigate to Validate → click **REVIEW VALIDATION**
- Show contract and approved-boundary checks; Maven/npm checks remain **NOT VERIFIED**
- Run `mvn test` and `npm test` externally before review

**2:45–3:00** — Show final summary checklist:
```
✓ Impact discovered
✓ Evidence verified
✓ Human approved
✓ Approved repair scope recorded
? Tests require external execution
REQUIRES FIX until external validation passes
```

---

## Measurement Methodology

ContractShield supports a manual-vs-automated comparison experiment.

**Manual baseline:** A developer manually greps the repository for `userId` and `/api/v1/users`,
opens each file, inspects tests, and modifies files one at a time. Record:
- Start time
- End time
- Files found
- Files missed

**ContractShield:** Record:
- Analysis completion status (the demo does not claim a fabricated runtime)
- Files detected
- Test gaps found
- Time to approval and repair-workflow completion

Do not fabricate numbers. Run both experiments and record actual values.

---

## Limitations

- Supports only the two documented migration patterns
- No live backend or test-command execution during the UI demo (external tests report NOT VERIFIED)
- Deterministic analysis uses known project file structure (not arbitrary repo scanning)
- Bob session interaction is manual (not programmatic API integration); the UI records the approved workflow but does not claim that Bob edited files
- No persistence — workflow state resets on page refresh

---

## Future Extensions

- OpenAPI diff parser for arbitrary schema changes
- Multi-repository impact tracking
- Live `mvn test` / `npm test` execution via backend API
- Git integration (auto-commit after repair)
- Configurable migration patterns via rule engine
- Persistent session history

---

## Why ContractShield Matters

Manual API contract migration is error-prone and slow. Developers under deadline pressure
miss dependencies, skip tests, and ship silent breaks. ContractShield makes the blast radius
visible, makes evidence explicit, keeps the human in control, and prepares a bounded IBM Bob
task for the mechanical cross-tier repair work.
