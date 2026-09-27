# Task 3 — Approved Coordinated Repair

## Objective

Apply the human-approved, coordinated repair across backend, frontend, and tests to migrate from:
- Endpoint: `GET /api/v1/users/{id}` → `GET /api/v2/users/{id}`
- Response field: `userId` → `id`

Changes must be consistent across all three tiers (backend, frontend, tests) and must not exceed the approved file boundary.

---

## Human Approval / Approved File Boundary

The following seven files were pre-approved for modification:

| # | File |
|---|------|
| 1 | `backend/src/main/java/com/contractshield/dto/UserDTO.java` |
| 2 | `backend/src/main/java/com/contractshield/controller/UserController.java` |
| 3 | `backend/src/test/java/com/contractshield/controller/UserControllerTest.java` |
| 4 | `frontend/src/types/user.types.ts` |
| 5 | `frontend/src/api/userApi.ts` |
| 6 | `frontend/src/components/UserProfile.tsx` |
| 7 | `frontend/tests/UserProfile.test.tsx` |

No other files were to be touched.

---

## Changes Applied

### 1. `backend/src/main/java/com/contractshield/dto/UserDTO.java`

**Change made:**
- Renamed field `private Long userId` → `private Long id`
- Renamed constructor parameter `Long userId` → `Long id`, updated `this.userId = userId` → `this.id = id`
- Renamed getter `getUserId()` → `getId()`
- Renamed setter `setUserId(Long userId)` → `setId(Long id)`
- Updated class-level comment to reflect v2 status

**Reason:** Jackson serializes Java field names as JSON keys. With field named `userId`, the JSON response contained `"userId"`. Renaming to `id` makes the serialized JSON emit `"id"`, matching the v2 contract.

**Contract dependency addressed:** Response field `userId` → `id` per `contract/openapi-v2.yaml`.

---

### 2. `backend/src/main/java/com/contractshield/controller/UserController.java`

**Change made:**
- Changed `@GetMapping("/api/v1/users/{id}")` → `@GetMapping("/api/v2/users/{id}")`
- Renamed handler method `getUserV1` → `getUserV2` (name now matches the version it serves)
- Updated class-level and method-level comments to reflect v2 status

**Reason:** The HTTP route must match the v2 path published in the OpenAPI contract. The method name is updated only because it directly referenced the version string; behavior is unchanged.

**Contract dependency addressed:** Endpoint path `/api/v1/users/{id}` → `/api/v2/users/{id}` per `contract/openapi-v2.yaml`.

---

### 3. `backend/src/test/java/com/contractshield/controller/UserControllerTest.java`

**Change made:**
- Changed test URL in both test methods: `/api/v1/users/101` → `/api/v2/users/101` and `/api/v1/users/9999` → `/api/v2/users/9999`
- Renamed test methods `getUserV1_shouldReturnUser` → `getUserV2_shouldReturnUser` and `getUserV1_notFound_shouldReturn404` → `getUserV2_notFound_shouldReturn404`
- Added `andExpect(jsonPath("$.id").value(101))` — closes the test gap that was explicitly flagged in the original file (no assertion on the identity field)
- Removed the "test gap" comment; gap is now closed
- Updated class-level comment

**Reason:** Tests must exercise the actual v2 endpoint. The added `$.id` assertion explicitly verifies the renamed contract field, closing the gap identified by ContractShield in Task 2.

**Contract dependency addressed:** Both endpoint path and response field changes are now covered by test assertions.

---

### 4. `frontend/src/types/user.types.ts`

**Change made:**
- Renamed interface property `userId: number` → `id: number` inside the `User` interface
- Updated file-level comment

**Reason:** The TypeScript `User` interface is the type contract for API response objects consumed by the frontend. It must mirror the v2 API response schema. Any component or function using `user.userId` will produce a TypeScript compile error after this change, surfacing any missed callsites.

**Contract dependency addressed:** Response field `userId` → `id`.

---

### 5. `frontend/src/api/userApi.ts`

**Change made:**
- Changed `const BASE_URL = '/api/v1/users'` → `const BASE_URL = '/api/v2/users'`
- Updated file-level comment

**Reason:** The API client must call the v2 endpoint. All HTTP fetch calls in `fetchUser()` derive from `BASE_URL`, so this single constant change updates all calls.

**Contract dependency addressed:** Endpoint path `/api/v1/users/{id}` → `/api/v2/users/{id}`.

---

### 6. `frontend/src/components/UserProfile.tsx`

**Change made:**
- Changed `{user.userId}` → `{user.id}` (line that renders the User ID value in the DOM)
- Updated component-level comment to document the API-field-vs-React-prop distinction
- Updated inline JSX comment from v1 reference to v2 reference
- **`userId` React prop on line 7 (`interface UserProfileProps { userId: number }`) was deliberately NOT renamed**

**Reason:** `user.userId` accessed a field on the API response object that no longer exists after the `User` interface was updated. `user.id` is the correct field in v2. The component prop `userId` is a separate concern — it is the prop callers pass to `<UserProfile userId={...} />` to specify which user to load; it is not an API response field.

**Contract dependency addressed:** API response field `userId` → `id`.

---

### 7. `frontend/tests/UserProfile.test.tsx`

**Change made:**
- Changed mock object field `userId: 101` → `id: 101` to match the updated `User` type
- Renamed test `'renders user name and email when user is loaded'` → `'renders user id, name and email when user is loaded'`
- Added assertion `expect(screen.getByTestId('user-id')).toHaveTextContent('101')` — closes the test gap flagged by ContractShield in Task 2
- Moved `user-name` assertion outside the `waitFor` block (still awaited via the `user-id` assertion above it)
- Updated file-level comment to document the migration and the API-field-vs-React-prop boundary
- Preserved all three existing test cases (render, loading, error)
- **`<UserProfile userId={101} />` prop name in the test was NOT changed** — it is the component interface prop, not the API field

**Reason:** The mock data must use `id` to satisfy the updated `User` type. The new `user-id` assertion closes the coverage gap that would have allowed the `userId`→`id` migration to silently break the user ID display with no test failure.

**Contract dependency addressed:** Both response field rename and display regression coverage.

---

## Cross-Tier Consistency

After the repair, all three tiers agree on both contract dimensions:

### Endpoint: `/api/v2/users/{id}`

| Tier | Location | Value |
|------|----------|-------|
| Backend (route) | `UserController.java` `@GetMapping` | `/api/v2/users/{id}` |
| Backend (test) | `UserControllerTest.java` — both test methods | `/api/v2/users/101`, `/api/v2/users/9999` |
| Frontend (client) | `userApi.ts` `BASE_URL` | `/api/v2/users` |
| Frontend (test mock) | `UserProfile.test.tsx` — unchanged, mock does not involve URL | n/a — mock bypasses HTTP |

### Response field: `id`

| Tier | Location | Value |
|------|----------|-------|
| Backend (serialization) | `UserDTO.java` — field `id`, getter `getId()` | `"id"` in JSON output |
| Backend (test assertion) | `UserControllerTest.java` | `jsonPath("$.id").value(101)` |
| Frontend (type) | `user.types.ts` `User` interface | `id: number` |
| Frontend (API client) | `userApi.ts` — no field access, passes through | inherits from `User` type |
| Frontend (render) | `UserProfile.tsx` | `{user.id}` |
| Frontend (test mock) | `UserProfile.test.tsx` `mockUser` | `id: 101` |
| Frontend (test assertion) | `UserProfile.test.tsx` | `getByTestId('user-id')` → `'101'` |

---

## API Field vs React Prop

This migration required careful distinction between two different things both named `userId`:

1. **The API contract field** (`userId` in v1, `id` in v2): This is the JSON property returned by the backend in the HTTP response body. It lives in `UserDTO.java` (Java field), `user.types.ts` (TypeScript interface), `userApi.ts` (response parsing), and `UserProfile.tsx` (JSX render expression `user.userId` / `user.id`). **This was renamed to `id`.**

2. **The React component prop** (`userId` in `UserProfileProps`): This is the prop callers pass to `<UserProfile userId={42} />` to tell the component which user to fetch. It is part of the component's public API and is not an HTTP response field. It does not appear in the network response at all. **This was deliberately NOT renamed.**

Renaming the React prop would have broken all call sites that render `<UserProfile userId={...} />` and would have been outside the contract change scope. The task instructions explicitly required this distinction to be preserved.

The same applies in `UserProfile.test.tsx`: `<UserProfile userId={101} />` in the test uses the component prop, not the API field — it was not renamed.

---

## Boundary Verification

### Approved files modified

All seven approved files were modified — verified by tool use audit:

| File | Modified |
|------|----------|
| `backend/src/main/java/com/contractshield/dto/UserDTO.java` | ✅ |
| `backend/src/main/java/com/contractshield/controller/UserController.java` | ✅ |
| `backend/src/test/java/com/contractshield/controller/UserControllerTest.java` | ✅ |
| `frontend/src/types/user.types.ts` | ✅ |
| `frontend/src/api/userApi.ts` | ✅ |
| `frontend/src/components/UserProfile.tsx` | ✅ |
| `frontend/tests/UserProfile.test.tsx` | ✅ |

### Contract files untouched

| File | Modified |
|------|----------|
| `contract/openapi.yaml` | ✅ NOT TOUCHED |
| `contract/openapi-v2.yaml` | ✅ NOT TOUCHED |

### Unrelated files untouched

| File | Modified |
|------|----------|
| `analyzer/prefilter.py` | ✅ NOT TOUCHED |
| `frontend/src/analyzer/impactAnalyzer.ts` | ✅ NOT TOUCHED |
| `frontend/src/analyzer/repairEngine.ts` | ✅ NOT TOUCHED |
| `backend/src/main/java/com/contractshield/service/UserService.java` | ✅ NOT TOUCHED |
| All other source files | ✅ NOT TOUCHED |

> Note: `UserService.java` uses the `UserDTO` constructor `new UserDTO(101L, "RSK", ...)`. The constructor parameter was renamed from `userId` to `id` inside `UserDTO.java`, but the constructor call site in `UserService.java` passes positional arguments — the call `new UserDTO(101L, "RSK", "rsk@example.com")` is unaffected by the parameter rename and remains correct. `UserService.java` was not modified and does not need to be.

---

## Validation Status

### Frontend tests (Vitest)

```
Command: npm test -- --run
Working directory: contractshield/frontend

RUN  v1.6.1

 ✓ tests/UserProfile.test.tsx (3 tests) 82ms

 Test Files  1 passed (1)
       Tests  3 passed (3)
    Start at  08:07:27
    Duration  6.62s
```

**Result: PASSED — 3/3 tests passed.**

The three test cases verified:
- `renders user id, name and email when user is loaded` — asserts `user-id` shows `101`, `user-name` shows `RSK`, `user-email` shows `rsk@example.com`
- `displays loading state initially` — asserts loading message displayed
- `displays error when fetch fails` — asserts error message displayed

### Backend tests (Maven/JUnit)

```
NOT VERIFIED — required tool unavailable
```

`mvn` is not installed on this environment. `java` is also not available. The Java source changes (endpoint path and DTO field rename) are syntactically correct and structurally consistent with the existing codebase, but runtime test execution could not be performed.

---

## Remaining Risks / Limitations

1. **Backend tests not executed**: Maven and Java are unavailable in this environment. The correctness of `UserDTO.java`, `UserController.java`, and `UserControllerTest.java` has been verified by code review but not by automated test run.

2. **No TypeScript compilation step**: A `tsc --noEmit` or Vite build was not performed against the frontend. The type changes in `user.types.ts` and all dependent files are internally consistent, but a full TypeScript compile check was not executed.

3. **UserService.java constructor call**: `UserService.java` calls `new UserDTO(101L, "RSK", "rsk@example.com")` using positional arguments. The constructor parameter rename in `UserDTO.java` does not break this call because Java constructors are resolved by signature, not parameter name. However, any caller using named parameter patterns (e.g., via a builder or reflection) would need review. No such callers exist in this codebase.

4. **Scope boundary**: This task repaired the seven approved files. Any other consumers of the v1 endpoint or the `userId` field outside this repository (e.g., external clients, API gateways, other services) are out of scope and were not addressed.

---

## Conclusion

**What was changed:**

Seven files were modified in a coordinated, cross-tier repair:

- **Backend**: `UserDTO.java` field and accessors renamed `userId` → `id`; `UserController.java` endpoint path changed from `/api/v1/users/{id}` to `/api/v2/users/{id}`; `UserControllerTest.java` updated to test the v2 endpoint and assert on `$.id`
- **Frontend**: `user.types.ts` interface property renamed `userId` → `id`; `userApi.ts` base URL updated to `/api/v2/users`; `UserProfile.tsx` render expression updated from `user.userId` to `user.id` (React component prop `userId` intentionally preserved); `UserProfile.test.tsx` mock data updated to `id: 101` and a new assertion on `user-id` added
- **No contract files were modified**
- **No files outside the approved boundary were modified**

**Validation actually executed:**

- ✅ Frontend: `npm test -- --run` → **3/3 tests PASSED**
- ❌ Backend: `NOT VERIFIED — required tool unavailable` (Maven/Java not installed)
