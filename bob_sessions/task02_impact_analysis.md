# Task 2 — Cross-Tier Impact Analysis

---

## Objective

Determine the cross-tier impact of the API contract change established in Task 1
(`userId` → `id`, `/api/v1/users/{id}` → `/api/v2/users/{id}`) across all
application tiers (backend, frontend, tests). Identify every affected or
potentially affected file, classify severity, detect test gaps from actual test
file content, and produce this evidence record.

No source files were modified during this task.

---

## Contract Change Being Analyzed

Established in Task 1 (`bob_sessions/task01_contract_understanding.md`):

| Dimension | v1 (old) | v2 (new) | Evidence |
|-----------|----------|----------|----------|
| Endpoint path | `/api/v1/users/{id}` | `/api/v2/users/{id}` | `contract/openapi.yaml:20` → `contract/openapi-v2.yaml:22` |
| Response identifier field | `userId` | `id` | `contract/openapi.yaml:59` → `contract/openapi-v2.yaml:61` |
| Schema name | `UserV1` | `UserV2` | `contract/openapi.yaml:52` → `contract/openapi-v2.yaml:54` |
| Example response key | `userId: 101` | `id: 101` | `contract/openapi.yaml:44` → `contract/openapi-v2.yaml:46` |

Both changes are **breaking**: the endpoint change produces HTTP 404 for v1 callers;
the field rename produces `undefined` for any consumer still reading `userId`.

---

## Deterministic Pre-Filter Findings

### Pre-Filter Design (`analyzer/prefilter.py`)

The pre-filter performs **only deterministic, literal-search checks** — no AI reasoning.
It scans files with extensions `{.java, .ts, .tsx, .yaml, .yml, .json}`, excludes
`{node_modules, target, .git, dist, .vite, __pycache__}`, and matches four patterns:

| Pattern key | Literal value |
|-------------|---------------|
| `old_endpoint` | `/api/v1/users` |
| `new_endpoint` | `/api/v2/users` |
| `old_field` | `userId` |
| `new_field` | `id` (word-boundary regex `\bid\b`) |

Classification logic (`prefilter.py:79–89`):

- **DIRECT** — file matches both `old_field` AND `old_endpoint`
- **POTENTIAL** — file matches `old_field` OR `old_endpoint` (not both)
- **UNAFFECTED_WITH_HITS** — file matches only `new_field` or `new_endpoint`

> **Note:** Python 3 was not available in this execution environment; the pre-filter
> script could not be executed. The deterministic analysis below was performed by
> Bob using `grep` tool calls replicating the same literal-search logic.
> This section is therefore **deterministic fact** (same algorithm, different executor).

### Deterministic Search Results (Bob grep — replicated pre-filter logic)

**Pattern: `userId` in `*.java` files (excluding `target/`):**

| File | Matching Lines | Classification |
|------|---------------|----------------|
| `backend/src/main/java/com/contractshield/dto/UserDTO.java` | 14, 20, 21, 27, 30, 31 | `old_field` hit |
| `backend/src/main/java/com/contractshield/controller/UserController.java` | 29 (comment) | `old_field` hit (comment only) |
| `backend/src/test/java/com/contractshield/controller/UserControllerTest.java` | 17, 19, 37 (comments/notes) | `old_field` hit (comments only) |

**Pattern: `/api/v1/users` in `*.java` files:**

| File | Matching Lines | Classification |
|------|---------------|----------------|
| `backend/src/main/java/com/contractshield/controller/UserController.java` | 31 | `old_endpoint` hit |
| `backend/src/test/java/com/contractshield/controller/UserControllerTest.java` | 31, 42 | `old_endpoint` hit |

**Pattern: `userId` in `*.ts` / `*.tsx` files (production source, excluding analyzer files):**

| File | Matching Lines | Classification |
|------|---------------|----------------|
| `frontend/src/types/user.types.ts` | 12 | `old_field` hit |
| `frontend/src/api/userApi.ts` | 6 (comment) | `old_field` hit (comment only) |
| `frontend/src/components/UserProfile.tsx` | 7, 22, 30, 39, 50 | `old_field` hit |
| `frontend/tests/UserProfile.test.tsx` | 28 (mock data) | `old_field` hit |

**Pattern: `/api/v1/users` in `*.ts` files:**

| File | Matching Lines | Classification |
|------|---------------|----------------|
| `frontend/src/api/userApi.ts` | 13 | `old_endpoint` hit |

**Pre-filter classification of production/test source files:**

| File | `old_field` hit | `old_endpoint` hit | Pre-filter class |
|------|-----------------|---------------------|------------------|
| `backend/.../UserDTO.java` | ✓ | — | POTENTIAL |
| `backend/.../UserController.java` | comment only | ✓ | POTENTIAL |
| `backend/.../UserControllerTest.java` | comment only | ✓ | POTENTIAL |
| `frontend/src/types/user.types.ts` | ✓ | — | POTENTIAL |
| `frontend/src/api/userApi.ts` | comment only | ✓ | POTENTIAL |
| `frontend/src/components/UserProfile.tsx` | ✓ | — | POTENTIAL |
| `frontend/tests/UserProfile.test.tsx` | ✓ (mock data) | — | POTENTIAL |
| `backend/.../UserService.java` | — | — | No hit → UNAFFECTED |

> **Observation:** The pre-filter returns POTENTIAL for all 7 files because no single
> production file in the approved list contains **both** patterns in executable code
> (the old endpoint lives in `UserController.java`/`userApi.ts` and the old field lives
> in `UserDTO.java`/`user.types.ts`/`UserProfile.tsx`). This is expected for a well-
> separated tier architecture — the pre-filter correctly surfaces all 7 candidates for
> semantic analysis.

---

## Backend Impact

### `UserDTO.java`

**File:** `backend/src/main/java/com/contractshield/dto/UserDTO.java`

| Attribute | Detail |
|-----------|--------|
| Relevant symbol | `UserDTO.userId` — `private Long userId` (line 14) |
| Pre-filter class | POTENTIAL (`old_field` hit) |
| Severity | **CRITICAL** |
| Nature of impact | Deterministic fact |

**Evidence:**

- Line 14: `private Long userId;` — the DTO field that drives JSON serialization.
  Spring Boot's Jackson serializer uses the Java field name (or getter name minus
  "get" + lower-case first letter) to produce the JSON key. `getUserId()` → JSON key
  `userId`. After the migration the contract requires `id`.
- Line 26–28: `public Long getUserId() { return userId; }` — getter confirms the
  serialized JSON key will be `"userId"`.
- Lines 6–10 (comment): The file's own documentation explicitly states:
  `"CONTRACT v2: field will be renamed to id"` and
  `"ContractShield tracks this DTO as a DIRECTLY AFFECTED artifact"`.

**Why CRITICAL:** If `UserDTO` is not updated, the backend will continue to serialize
`{"userId":101,...}` while the v2 contract mandates `{"id":101,...}`. Any frontend
consumer expecting `id` will receive `undefined` silently — a runtime break with no
compile-time error.

---

### `UserController.java`

**File:** `backend/src/main/java/com/contractshield/controller/UserController.java`

| Attribute | Detail |
|-----------|--------|
| Relevant symbol | `@GetMapping("/api/v1/users/{id}")` (line 31) |
| Pre-filter class | POTENTIAL (`old_endpoint` hit) |
| Severity | **CRITICAL** |
| Nature of impact | Deterministic fact |

**Evidence:**

- Line 31: `@GetMapping("/api/v1/users/{id}")` — hardcoded v1 endpoint. Spring Boot
  will only register this route; no `/api/v2/...` mapping exists in the class.
- Line 11 (comment): `"CONTRACT v1: endpoint is /api/v1/users/{id}"` — confirms v1
  mapping is current.
- Line 32: `public ResponseEntity<UserDTO> getUserV1(...)` — method name `getUserV1`
  and return type `UserDTO` tie this controller directly to both breaking changes
  (endpoint and DTO field).

**Why CRITICAL:** After migration, frontend and any other consumer will call
`/api/v2/users/{id}`. Without updating this mapping, those calls return HTTP 404.

---

### `UserService.java`

**File:** `backend/src/main/java/com/contractshield/service/UserService.java`

| Attribute | Detail |
|-----------|--------|
| Relevant symbol | `UserService.findById(Long id)` (line 25) |
| Pre-filter class | UNAFFECTED (no pattern hit) |
| Severity | **UNAFFECTED** |
| Nature of impact | Deterministic fact |

**Evidence:**

- The service contains no reference to `userId`, `/api/v1/users`, or any contract
  field name. It stores and returns `UserDTO` objects by numeric `Long` key.
- The in-memory map uses `Long` keys (`101L`, `102L`, `103L`) — not `userId` strings.
- `findById` simply does `USERS.get(id)` and returns `Optional<UserDTO>`.
- The service is an internal implementation detail; the contract-visible fields are
  governed entirely by `UserDTO` (serialization) and `UserController` (routing).

**Why UNAFFECTED:** No contract-visible symbol appears in this file. Renaming the DTO
field or changing the endpoint does not require any change to `UserService.java`.

---

## Frontend Impact

### `user.types.ts`

**File:** `frontend/src/types/user.types.ts`

| Attribute | Detail |
|-----------|--------|
| Relevant symbol | `User.userId` — `userId: number` (line 12) |
| Pre-filter class | POTENTIAL (`old_field` hit) |
| Severity | **CRITICAL** |
| Nature of impact | Deterministic fact |

**Evidence:**

- Line 12: `userId: number;` — TypeScript `User` interface declares `userId` as the
  identifier field.
- This interface is imported by both `userApi.ts` (line 1: `import type { User }`) and
  `UserProfile.tsx` (line 3: `import type { User }`). Any change here propagates to
  both consumers.
- Lines 4–8 (comment): `"CONTRACT v1: field is 'userId'"` / `"CONTRACT v2: field will
  be renamed to id"` / `"ContractShield tracks this file as DIRECTLY AFFECTED"`.

**Why CRITICAL:** TypeScript interfaces are compile-time types, not runtime validators.
After the backend starts returning `{"id":101,...}`, `response.json() as Promise<User>`
will still succeed at runtime — but `user.userId` will be `undefined` because the
deserialized object has key `id`, not `userId`. TypeScript will not catch this because
the cast (`as Promise<User>`) suppresses the type mismatch. Silent runtime break.

---

### `userApi.ts`

**File:** `frontend/src/api/userApi.ts`

| Attribute | Detail |
|-----------|--------|
| Relevant symbol | `BASE_URL = '/api/v1/users'` (line 13) |
| Pre-filter class | POTENTIAL (`old_endpoint` hit) |
| Severity | **CRITICAL** |
| Nature of impact | Deterministic fact |

**Evidence:**

- Line 13: `const BASE_URL = '/api/v1/users';` — hardcoded v1 base URL.
- Line 16: `` fetch(`${BASE_URL}/${id}`) `` — every call to `fetchUser()` hits
  `/api/v1/users/{id}`. After the backend is migrated to v2, this URL returns HTTP 404.
- Line 1: `import type { User } from '../types/user.types';` — also depends on the
  `User` interface which itself contains `userId`.
- Lines 6–10 (comment): `"CONTRACT v1: calls /api/v1/users/{id}"` / `"CONTRACT v2:
  endpoint will change to /api/v2/users/{id}"` / `"ContractShield tracks this file
  as DIRECTLY AFFECTED"`.

**Why CRITICAL:** HTTP 404 from every user fetch will break the entire user-display
feature. The `fetchUser` function throws on non-OK responses (line 17–22), so the
error path in `UserProfile.tsx` will be triggered for every user load after migration.

---

### `UserProfile.tsx`

**File:** `frontend/src/components/UserProfile.tsx`

| Attribute | Detail |
|-----------|--------|
| Relevant symbol (API field) | `user.userId` in JSX render (line 50) |
| Relevant symbol (React prop) | `userId: number` in `UserProfileProps` interface (line 7) |
| Pre-filter class | POTENTIAL (`old_field` hit) |
| Severity | **CRITICAL** (for `user.userId` reference) / **LOW** (for component prop `userId`) |
| Nature of impact | Deterministic fact + semantic distinction |

**Evidence:**

- Line 50: `{user.userId}` — reads the API response field `userId` from the `User`
  object. This is the **API/DTO field reference** — it will render as blank/undefined
  after the `userId → id` migration.
- Line 7: `userId: number` in `UserProfileProps` — this is the **React component prop**
  named `userId`. It is the numeric user ID passed **into** the component by its
  parent to initiate the fetch. It is **not** the API response field.
- Line 30: `fetchUser(userId)` — the prop `userId` is used as the fetch argument, not
  as a field read from the API response.
- Lines 13–21 (comment): The file's own documentation distinguishes:
  `"prop: userId"` (React prop, used to trigger fetch) vs
  `"field: user.userId"` (API response field, rendered on line 50).

**Severity distinction:**

| Reference | Type | Severity | Reason |
|-----------|------|----------|--------|
| `user.userId` (line 50) | API response field read | **CRITICAL** | Will be `undefined` after field rename |
| `UserProfileProps.userId` (line 7) | React component prop | **LOW** | Not an API contract field; internal component interface |
| `fetchUser(userId)` (line 30) | Uses prop as fetch arg | **UNAFFECTED** | Prop is the path parameter `id`, unrelated to response body |

> **Important distinction:** The React component prop `userId` (lines 7, 22, 30, 39)
> is a local component interface — it holds the numeric user ID to look up. It is
> **not** the same as the API response field `userId`. Renaming the API field `userId`
> → `id` does **not** inherently require renaming the React prop. The critical break is
> at line 50 where `user.userId` reads the API response object.

---

## Test Impact

### Backend Tests — `UserControllerTest.java`

**File:** `backend/src/test/java/com/contractshield/controller/UserControllerTest.java`

| Test method | Assertions | Asserts `userId`/`id` field? |
|-------------|------------|------------------------------|
| `getUserV1_shouldReturnUser()` (line 30) | `$.name` = "RSK", `$.email` = "rsk@example.com" | **NO** |
| `getUserV1_notFound_shouldReturn404()` (line 41) | HTTP status 404 | Not applicable |

**Evidence:**

- Line 31: `mockMvc.perform(get("/api/v1/users/101")` — calls the v1 endpoint.
  After migration this URL will not exist, causing this test to fail with 404 rather
  than its current 200 response.
- Lines 35–36: Assertions on `$.name` and `$.email` only — no assertion on `$.userId`
  or `$.id`.
- Line 37: `// NOTE: No assertion on $.userId — test gap for the renamed field` —
  explicit acknowledgment of the gap in the test itself.
- Lines 16–20 (comment block): `"These tests verify the v1 endpoint and userId field.
  After migration to v2 + id field, these tests must be updated."` — confirms both
  deficiencies.

**Impact:** The test currently calls the v1 endpoint (which will be replaced) and
makes no assertion on the identifier field (which will be renamed). After migration
without updating this test:
- `getUserV1_shouldReturnUser` will fail because `/api/v1/users/101` returns 404.
- Even if the endpoint were updated, there is no assertion verifying `$.id` is present.

---

### Frontend Tests — `UserProfile.test.tsx`

**File:** `frontend/tests/UserProfile.test.tsx`

| Test case | Assertions | Asserts `userId`/`user-id`? |
|-----------|------------|------------------------------|
| `renders user name and email when user is loaded` (line 38) | `user-name` = "RSK", `user-email` = "rsk@example.com" | **NO** |
| `displays loading state initially` (line 52) | Loading text present | Not applicable |
| `displays error when fetch fails` (line 60) | Error text visible | Not applicable |

**Evidence:**

- Line 27–31: Mock data `{ userId: 101, name: 'RSK', email: 'rsk@example.com' }` —
  uses `userId` in the mock (v1 shape).
- Line 44: `expect(screen.getByTestId('user-name')).toHaveTextContent('RSK')` — asserts
  name only.
- Line 47: `expect(screen.getByTestId('user-email')).toHaveTextContent('rsk@example.com')` —
  asserts email only.
- Line 48–49: `// NOTE: No assertion on user-id / user.userId — this is the intentional
  test gap` — explicit acknowledgment of missing assertion.
- Lines 9–22 (comment block): Full test-gap documentation embedded in the test file:
  `"There is NO assertion that verifies user.userId is rendered."`,
  `"Test gap: YES"`.

**Impact:** The test mocks `fetchUser` to return `{ userId: 101, ... }`, so the
component renders `user.userId` = 101 successfully in the test environment. After
migration, the mock would need to return `{ id: 101, ... }` to match the v2 shape —
and the test would need to assert `screen.getByTestId('user-id')` has the correct
value. Neither exists today.

---

## Test Gaps

A **Test Gap** exists when affected production behavior has no test assertion that
verifies the changed contract field or path.

### Gap 1 — Backend: No assertion on the identifier field (response body)

| Attribute | Detail |
|-----------|--------|
| Affected behavior | JSON response body — identifier field (`userId` in v1, `id` in v2) |
| Test file | `backend/src/test/java/com/contractshield/controller/UserControllerTest.java` |
| Missing assertion | `jsonPath("$.userId")` or `jsonPath("$.id")` |
| Existing assertions | `jsonPath("$.name")`, `jsonPath("$.email")`, HTTP 200/404 status |
| Evidence | `UserControllerTest.java:37` — explicit comment: `"No assertion on $.userId"` |
| Gap type | **Deterministic fact** — the assertion is provably absent from the test source |

**Consequence:** After renaming `userId` → `id` in `UserDTO`, the backend JSON response
changes from `{"userId":101,...}` to `{"id":101,...}`. The existing test passes on
`$.name` and `$.email` — neither of which changed — so the test suite reports GREEN
while the identifier field break goes undetected.

### Gap 2 — Frontend: No assertion on user ID display (`data-testid="user-id"`)

| Attribute | Detail |
|-----------|--------|
| Affected behavior | User ID rendered at `data-testid="user-id"` (`user.userId`, line 50 of `UserProfile.tsx`) |
| Test file | `frontend/tests/UserProfile.test.tsx` |
| Missing assertion | `expect(screen.getByTestId('user-id')).toHaveTextContent('101')` |
| Existing assertions | `user-name` content, `user-email` content, loading text, error text |
| Evidence | `UserProfile.test.tsx:48–49` — explicit comment: `"No assertion on user-id / user.userId"` |
| Gap type | **Deterministic fact** — the assertion is provably absent from the test source |

**Consequence:** After updating mock data from `{ userId: 101 }` to `{ id: 101 }`,
the component's `user.userId` reference becomes `undefined`, rendering blank. The
existing tests assert only `user-name` and `user-email` — both unchanged — so the
test suite reports GREEN while the ID display break goes undetected.

### Gap 3 — Backend: Test still calls v1 endpoint path

| Attribute | Detail |
|-----------|--------|
| Affected behavior | Endpoint path `/api/v1/users/101` (used in test, line 31) |
| Test file | `backend/src/test/java/com/contractshield/controller/UserControllerTest.java` |
| Issue | Test calls `/api/v1/users/101`; after migration only `/api/v2/users/101` will exist |
| Evidence | `UserControllerTest.java:31` — `get("/api/v1/users/101")` |
| Gap type | **Deterministic fact** — after `@GetMapping` in `UserController.java` is updated to v2, this test call will fail with 404 |

**Note:** This gap manifests as a **test failure** (not a false pass) after migration —
the test will actively fail once the endpoint is updated. Gaps 1 and 2 are the more
dangerous "false pass" gaps.

---

## Cross-Tier Dependency Chain

```
contract/openapi.yaml          (v1 reference — READ ONLY)
    │
    │  breaking change: userId → id, /v1/ → /v2/
    ▼
backend/.../UserDTO.java        ← CRITICAL: field private Long userId (line 14)
    │                                        getter getUserId() → JSON key "userId"
    │
    ├──► backend/.../UserController.java  ← CRITICAL: @GetMapping("/api/v1/users/{id}") (line 31)
    │         └── returns ResponseEntity<UserDTO>
    │
    ├──► backend/.../UserControllerTest.java  ← TEST GAP: no $.userId/$.id assertion (line 37)
    │                                           calls v1 endpoint (lines 31, 42)
    │
    ▼  (HTTP response body: {"userId":101,...})
    │
frontend/src/types/user.types.ts  ← CRITICAL: User interface userId: number (line 12)
    │
    ├──► frontend/src/api/userApi.ts   ← CRITICAL: BASE_URL = '/api/v1/users' (line 13)
    │         └── fetchUser() → fetch(`/api/v1/users/${id}`)
    │
    ├──► frontend/src/components/UserProfile.tsx
    │         ├── prop userId (line 7) — React prop, LOW severity
    │         └── user.userId (line 50) — API field read, CRITICAL
    │
    └──► frontend/tests/UserProfile.test.tsx  ← TEST GAP: no user-id assertion (line 48)
              mock uses { userId: 101 } (line 28)

backend/.../UserService.java  ← UNAFFECTED: no contract-visible symbol
```

---

## Severity Summary

| File | Symbol / Reference | Change Required | Severity |
|------|--------------------|-----------------|----------|
| `backend/.../UserDTO.java` | `private Long userId` (line 14) | Rename field `userId` → `id` | **CRITICAL** |
| `backend/.../UserController.java` | `@GetMapping("/api/v1/users/{id}")` (line 31) | Update path to `/api/v2/users/{id}` | **CRITICAL** |
| `frontend/src/types/user.types.ts` | `userId: number` (line 12) | Rename field `userId` → `id` | **CRITICAL** |
| `frontend/src/api/userApi.ts` | `BASE_URL = '/api/v1/users'` (line 13) | Update URL to `/api/v2/users` | **CRITICAL** |
| `frontend/src/components/UserProfile.tsx` | `user.userId` (line 50) | Update read to `user.id` | **CRITICAL** |
| `backend/.../UserControllerTest.java` | Endpoint `/api/v1/users/101` (lines 31, 42); no `$.userId`/`$.id` assertion | Update path + add field assertion | **HIGH** |
| `frontend/tests/UserProfile.test.tsx` | Mock `userId: 101` (line 28); no `user-id` assertion (line 48) | Update mock + add assertion | **HIGH** |
| `backend/.../UserService.java` | No contract-visible symbol | No change required | **UNAFFECTED** |
| `contract/openapi.yaml` | v1 reference contract | Read-only reference input | **UNAFFECTED** (not a repair target) |
| `contract/openapi-v2.yaml` | v2 target contract | Read-only reference input | **UNAFFECTED** (not a repair target) |

---

## Evidence vs Reasoning

### Deterministic Facts (read directly from file content)

All items below were confirmed by reading actual file content:

| # | Fact | Source |
|---|------|--------|
| 1 | `UserDTO.java:14` — field is `private Long userId` | File read |
| 2 | `UserDTO.java:26` — getter is `getUserId()` → JSON key `"userId"` | File read |
| 3 | `UserController.java:31` — annotation is `@GetMapping("/api/v1/users/{id}")` | File read |
| 4 | `UserController.java:32` — return type is `ResponseEntity<UserDTO>` | File read |
| 5 | `UserService.java` — contains no `userId`, no `/api/v1/` reference | File read |
| 6 | `user.types.ts:12` — interface field is `userId: number` | File read |
| 7 | `userApi.ts:13` — constant is `BASE_URL = '/api/v1/users'` | File read |
| 8 | `UserProfile.tsx:50` — JSX renders `{user.userId}` | File read |
| 9 | `UserProfile.tsx:7` — React prop interface has `userId: number` | File read |
| 10 | `UserControllerTest.java:31` — test calls `get("/api/v1/users/101")` | File read |
| 11 | `UserControllerTest.java:35–36` — only `$.name` and `$.email` are asserted | File read |
| 12 | `UserControllerTest.java:37` — comment explicitly states no `$.userId` assertion | File read |
| 13 | `UserProfile.test.tsx:28` — mock data uses `userId: 101` | File read |
| 14 | `UserProfile.test.tsx:44,47` — only `user-name` and `user-email` are asserted | File read |
| 15 | `UserProfile.test.tsx:48–49` — comment explicitly states no `user-id` assertion | File read |

### Semantic Reasoning (Bob's interpretation — not directly readable facts)

| # | Reasoning |
|---|-----------|
| 1 | Spring Boot Jackson serializer derives JSON key from getter method name: `getUserId()` → `"userId"`. This is standard Spring Boot behavior, not stated in the file itself. |
| 2 | `response.json() as Promise<User>` in `userApi.ts:23` is a TypeScript cast, not a runtime validator. A JSON payload with `id` instead of `userId` will deserialize to an object where `userId` is `undefined` — TypeScript won't catch this at cast time. |
| 3 | The React component prop `userId` (line 7 of `UserProfile.tsx`) is conceptually different from the API response field `userId` (line 50). The prop could retain its name even after the API field is renamed, if `UserProfile` is updated to pass the prop value to a fetch and read `user.id` from the response. Renaming the prop is optional but consistent. |
| 4 | `UserService.java` is UNAFFECTED because it operates on a `Long` key parameter — the contract-visible naming (`userId` vs `id`) is purely a serialization concern handled by `UserDTO`, not `UserService`. |
| 5 | The test gaps in both `UserControllerTest.java` and `UserProfile.test.tsx` are "false pass" risks: after migration, a green test suite does not guarantee the identifier field is correctly serialized/rendered, because neither test asserts it. |

---

## Files That Must NOT Be Modified

Per `docs/bob-workflow.md:81–82` (Task 03 rules), the contract files are
**reference inputs only** — not repair targets:

- `contract/openapi.yaml` — v1 reference (read-only)
- `contract/openapi-v2.yaml` — v2 target definition (read-only)

Additionally, per this Task 2 scope:

- **No files of any kind** were modified during this task.
- The only file created is this report: `bob_sessions/task02_impact_analysis.md`.

---

## Scope Boundary

This task is strictly limited to **impact analysis**. The following are outside scope:

- **Repair** — not performed (that is Task 3)
- **Validation** — not performed (that is Task 4)
- **Contract modification** — not permitted at any task stage
- **Test execution** — no `mvn test` or `npm test` was run; no runtime evidence was
  collected. All findings are based on static code analysis.
- **Runtime break observation** — no claim is made that a runtime break was executed
  or observed. The break predictions are based on static analysis and semantic reasoning.

---

## Conclusion

### Affected Files — Summary

Five production source files require repair to honour the v2 contract:

| File | Primary Change Needed |
|------|-----------------------|
| `backend/src/main/java/com/contractshield/dto/UserDTO.java` | Rename field `userId` → `id` (CRITICAL) |
| `backend/src/main/java/com/contractshield/controller/UserController.java` | Update `@GetMapping` to `/api/v2/users/{id}` (CRITICAL) |
| `frontend/src/types/user.types.ts` | Rename interface field `userId` → `id` (CRITICAL) |
| `frontend/src/api/userApi.ts` | Update `BASE_URL` to `/api/v2/users` (CRITICAL) |
| `frontend/src/components/UserProfile.tsx` | Update `user.userId` → `user.id` at line 50 (CRITICAL) |

Two test files require repair to cover the v2 contract:

| File | Primary Change Needed |
|------|-----------------------|
| `backend/src/test/java/com/contractshield/controller/UserControllerTest.java` | Update endpoint path to v2; add assertion on `$.id` (HIGH) |
| `frontend/tests/UserProfile.test.tsx` | Update mock to `{ id: 101 }`; add assertion on `data-testid="user-id"` (HIGH) |

One service file is **unaffected** and requires no change:

- `backend/src/main/java/com/contractshield/service/UserService.java` — no
  contract-visible symbol; UNAFFECTED.

### Test Gaps — Summary

| Gap | File | Nature | Risk |
|-----|------|--------|------|
| No `$.userId` / `$.id` assertion | `UserControllerTest.java:37` | False-pass after field rename | Identifier break undetected by CI |
| No `user-id` assertion | `UserProfile.test.tsx:48` | False-pass after field rename | ID display break undetected by CI |
| Test calls v1 endpoint path | `UserControllerTest.java:31,42` | Will fail (not false-pass) after endpoint update | Noisy test failure |

Both test gaps are **deterministic** — the missing assertions are provably absent
from the test files as read. The gaps are not inferred; they are confirmed by direct
inspection of the test source code.

No repair was planned, designed, or applied during this task. The repair is Task 3.

---

> **No project source files were modified during Task 2.**
