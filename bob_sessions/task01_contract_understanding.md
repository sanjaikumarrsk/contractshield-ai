# Task 01 — Contract Understanding & Change Extraction

## Objective

Analyze the old and new OpenAPI contract files for the ContractShield AI project, extract the
exact breaking changes between v1 and v2, document supporting evidence with precise file and
line references, and produce this record as the Task 1 evidence artifact.

No source files were modified or created during this task beyond this report file.

---

## Files Inspected

| File | Purpose |
|------|---------|
| `contractshield/contract/openapi.yaml` | Old contract — API v1 definition |
| `contractshield/contract/openapi-v2.yaml` | New contract — API v2 definition |
| `contractshield/README.md` | Project overview, architecture, and demo instructions |
| `contractshield/docs/bob-workflow.md` | IBM Bob task definitions and workflow description |
| `contractshield/bob_sessions/README.md` | Bob sessions directory index |

---

## Old Contract — API v1

**File:** `contractshield/contract/openapi.yaml`

| Attribute | Value | Source (file:line) |
|-----------|-------|-------------------|
| OpenAPI version | 3.0.3 | `openapi.yaml:1` |
| API title | User Management API | `openapi.yaml:3` |
| Contract version | 1.0.0 | `openapi.yaml:11` |
| Server URL | http://localhost:8080 | `openapi.yaml:16` |
| **Endpoint** | `/api/v1/users/{id}` | `openapi.yaml:20` |
| **HTTP method** | GET | `openapi.yaml:21` |
| Operation ID | `getUserV1` | `openapi.yaml:22` |
| Path parameter | `id` (integer, int64, required) | `openapi.yaml:28–35` |
| Success response | HTTP 200 | `openapi.yaml:37` |
| Response schema ref | `#/components/schemas/UserV1` | `openapi.yaml:42` |
| **Response field: identifier** | `userId` (integer, int64, required) | `openapi.yaml:54–56, 59–63` |
| Response field: name | `name` (string, required) | `openapi.yaml:64–67` |
| Response field: email | `email` (string, email format, required) | `openapi.yaml:68–72` |
| Example response | `{"userId":101,"name":"RSK","email":"rsk@example.com"}` | `openapi.yaml:44–46` |

**Schema definition extract (openapi.yaml lines 52–72):**

```yaml
UserV1:
  type: object
  required:
    - userId
    - name
    - email
  properties:
    userId:
      type: integer
      format: int64
      description: Unique user identifier (v1 field name)
      example: 101
```

---

## New Contract — API v2

**File:** `contractshield/contract/openapi-v2.yaml`

| Attribute | Value | Source (file:line) |
|-----------|-------|-------------------|
| OpenAPI version | 3.0.3 | `openapi-v2.yaml:1` |
| API title | User Management API | `openapi-v2.yaml:3` |
| Contract version | 2.0.0 | `openapi-v2.yaml:13` |
| Server URL | http://localhost:8080 | `openapi-v2.yaml:19` |
| **Endpoint** | `/api/v2/users/{id}` | `openapi-v2.yaml:22` |
| **HTTP method** | GET | `openapi-v2.yaml:23` |
| Operation ID | `getUserV2` | `openapi-v2.yaml:24` |
| Path parameter | `id` (integer, int64, required) | `openapi-v2.yaml:30–37` |
| Success response | HTTP 200 | `openapi-v2.yaml:39` |
| Response schema ref | `#/components/schemas/UserV2` | `openapi-v2.yaml:44` |
| **Response field: identifier** | `id` (integer, int64, required) | `openapi-v2.yaml:57–59, 61–65` |
| Response field: name | `name` (string, required) | `openapi-v2.yaml:66–69` |
| Response field: email | `email` (string, email format, required) | `openapi-v2.yaml:70–74` |
| Example response | `{"id":101,"name":"RSK","email":"rsk@example.com"}` | `openapi-v2.yaml:46–48` |

**Schema definition extract (openapi-v2.yaml lines 54–65):**

```yaml
UserV2:
  type: object
  required:
    - id
    - name
    - email
  properties:
    id:
      type: integer
      format: int64
      description: Unique user identifier (v2 field name — was "userId" in v1)
      example: 101
```

---

## Exact Contract Delta

| Dimension | v1 (old) | v2 (new) | Evidence |
|-----------|----------|----------|----------|
| **Endpoint path** | `/api/v1/users/{id}` | `/api/v2/users/{id}` | `openapi.yaml:20` → `openapi-v2.yaml:22` |
| **Operation ID** | `getUserV1` | `getUserV2` | `openapi.yaml:22` → `openapi-v2.yaml:24` |
| **Schema name** | `UserV1` | `UserV2` | `openapi.yaml:52` → `openapi-v2.yaml:54` |
| **Identifier field name** | `userId` | `id` | `openapi.yaml:59` → `openapi-v2.yaml:61` |
| **`required` array entry** | `userId` | `id` | `openapi.yaml:55` → `openapi-v2.yaml:57` |
| **Example response key** | `userId: 101` | `id: 101` | `openapi.yaml:44` → `openapi-v2.yaml:46` |

Both contracts are self-consistent in documenting these changes. The v2 YAML description at
line 8 (`openapi-v2.yaml`) explicitly states:
> "Breaking changes from v1: — Endpoint: /api/v1/users/{id} → /api/v2/users/{id} — Field: userId → id"

---

## Evidence / Facts

All items below are directly readable from the inspected files without inference.

1. `openapi.yaml:20` — Path key is `/api/v1/users/{id}`.
2. `openapi-v2.yaml:22` — Path key is `/api/v2/users/{id}`.
3. `openapi.yaml:59` — The response schema property for the identifier is named `userId`.
4. `openapi-v2.yaml:61` — The response schema property for the identifier is named `id`.
5. `openapi.yaml:55` and `openapi-v2.yaml:57` — The `required` arrays confirm `userId` is
   required in v1 and `id` is required in v2.
6. Both contracts declare `HTTP GET` as the only method on the endpoint.
7. `type: integer, format: int64` is identical in both versions — only the property key changed.
8. `name` and `email` fields are unchanged between v1 and v2.
9. `README.md:19–21` independently corroborates the migration pattern in prose:
   `GET /api/v1/users/{id} → GET /api/v2/users/{id}` and `userId → id`.
10. `docs/bob-workflow.md:17–26` formally states the same delta as Bob's Task 01 input.
11. `docs/bob-workflow.md:75–79` lists 7 approved application/test repair targets, none of
    which are the contract files — the contract files are read-only reference inputs.

---

## Reasoning / Interpretation

> **All items in this section are semantic interpretations, not direct file facts.**

1. **Breaking nature of the change:** Because `userId` → `id` is a rename (not an addition),
   any consumer that reads `response.userId` will receive `undefined` at runtime after the
   migration. This is a silent runtime break, not a compile-time error in most languages.

2. **Endpoint version segment change:** Changing `/v1/` to `/v2/` in the URL path means that
   any HTTP call hardcoded to `/api/v1/users/...` will receive HTTP 404 after the migration
   (assuming the v1 endpoint is retired). This affects any code that constructs or hardcodes
   the URL string.

3. **Why backend may be affected:** A Java Spring Boot controller mapped to
   `@GetMapping("/api/v1/users/{id}")` and a DTO with a `userId` field would both need
   updating to honour the new contract.

4. **Why frontend may be affected:** A TypeScript interface or React component that references
   `user.userId` would silently break. A `fetch()` call to `/api/v1/users/` would hit a dead
   endpoint.

5. **Why tests may be affected:** Unit/integration tests that assert `response.body.userId`
   or mock the old endpoint path would pass against stale fixtures while failing against
   a live v2 backend, creating a false green.

> These observations motivate — but do not constitute — the Task 2 impact analysis.

---

## Scope Boundary

This task is strictly limited to reading and interpreting the contract files.

- No backend, frontend, or test files were read for this task.
- No impact analysis was performed (that is Task 2).
- No repairs were planned or applied (that is Task 3).
- No files outside `bob_sessions/task01_contract_understanding.md` were created or modified.

---

## Confirmation: No Files Modified

> **No project source files were modified, created, or deleted during Task 1.**
>
> The only file written is this report: `bob_sessions/task01_contract_understanding.md`.
> All analysis was performed through read-only inspection of the four files listed in the
> "Files Inspected" section above.

---

## Conclusion

IBM Bob successfully read and interpreted the ContractShield AI OpenAPI contracts.

The contract delta is deterministic and fully evidenced:

| Change | v1 → v2 |
|--------|---------|
| Endpoint | `/api/v1/users/{id}` → `/api/v2/users/{id}` |
| Identifier field | `userId` → `id` |

Both changes are classified as **breaking**: the endpoint change will produce HTTP 404 for
any caller still targeting v1, and the field rename will silently return `undefined` for any
consumer still reading `userId`. Together they constitute the core ContractShield demonstration
scenario that motivates cross-tier impact analysis (Task 2) and coordinated repair (Task 3).
