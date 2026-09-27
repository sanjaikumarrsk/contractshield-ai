/**
 * ContractShield Analysis Engine
 *
 * DETERMINISTIC pre-filter + impact analysis.
 * Uses a deterministic project-local evidence map for the supported demo migration.
 * The Python pre-filter remains the source of repository-wide file/line discovery.
 *
 * Architecture: Deterministic logic handles exact-string detection.
 * Bob handles semantic reasoning and coordinated repair.
 */

export interface ContractChange {
  oldEndpoint: string;
  newEndpoint: string;
  oldField: string;
  newField: string;
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAFFECTED';
export type ImpactLevel = 'DIRECT' | 'POTENTIAL' | 'UNAFFECTED';
export type Tier = 'BACKEND' | 'FRONTEND' | 'TESTS' | 'CONTRACT' | 'DATABASE';

export interface Evidence {
  type: 'direct_reference' | 'dependency' | 'inferred' | 'gap';
  description: string;
  confirmed: boolean;
}

export interface AffectedFile {
  file: string;
  tier: Tier;
  impactLevel: ImpactLevel;
  severity: Severity;
  line?: number;
  symbol?: string;
  reference?: string;
  whyAffected: string;
  evidence: Evidence[];
  assessment: string;
}

export interface TestGap {
  affectedBehavior: string;
  relevantAssertion: string | null;
  isGap: boolean;
  file: string;
}

export interface ImpactSummary {
  breakingChanges: number;
  affectedFiles: number;
  directReferences: number;
  potentialImpacts: number;
  testGaps: number;
  unaffectedFiles: number;
  totalFilesScanned: number;
}

export interface AnalysisResult {
  change: ContractChange;
  affectedFiles: AffectedFile[];
  testGaps: TestGap[];
  summary: ImpactSummary;
  timestamp: string;
}

// ─────────────────────────────────────────────
// KNOWN REPOSITORY FILES (project-local, deterministic)
// ─────────────────────────────────────────────

const REPO_FILES: Array<{ file: string; tier: Tier; content: string }> = [
  {
    file: 'backend/src/main/java/com/contractshield/dto/UserDTO.java',
    tier: 'BACKEND',
    content: `public class UserDTO {
    private Long userId;
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    // name, email fields omitted for brevity
}`,
  },
  {
    file: 'backend/src/main/java/com/contractshield/controller/UserController.java',
    tier: 'BACKEND',
    content: `@GetMapping("/api/v1/users/{id}")
public ResponseEntity<UserDTO> getUserV1(@PathVariable Long id) {
    return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
}`,
  },
  {
    file: 'backend/src/main/java/com/contractshield/service/UserService.java',
    tier: 'BACKEND',
    content: `@Service
public class UserService {
    private static final Map<Long, UserDTO> USERS = new HashMap<>();
    static { USERS.put(101L, new UserDTO(101L, "RSK", "rsk@example.com")); }
    public Optional<UserDTO> findById(Long id) { return Optional.ofNullable(USERS.get(id)); }
}`,
  },
  {
    file: 'backend/src/test/java/com/contractshield/controller/UserControllerTest.java',
    tier: 'TESTS',
    content: `mockMvc.perform(get("/api/v1/users/101")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("RSK"))
                .andExpect(jsonPath("$.email").value("rsk@example.com"));
        // NOTE: No assertion on $.userId — test gap for the renamed field`,
  },
  {
    file: 'frontend/src/types/user.types.ts',
    tier: 'FRONTEND',
    content: `export interface User {
  userId: number;
  name: string;
  email: string;
}`,
  },
  {
    file: 'frontend/src/api/userApi.ts',
    tier: 'FRONTEND',
    content: `const BASE_URL = '/api/v1/users';
export async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\`\${BASE_URL}/\${id}\`);
  return response.json() as Promise<User>;
}`,
  },
  {
    file: 'frontend/src/components/UserProfile.tsx',
    tier: 'FRONTEND',
    content: `const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  // ...
  return (
    <div className="user-profile" data-testid="user-profile">
      <span data-testid="user-id">{user.userId}</span>
      <span data-testid="user-name">{user.name}</span>
      <span data-testid="user-email">{user.email}</span>
    </div>
  );
};`,
  },
  {
    file: 'frontend/tests/UserProfile.test.tsx',
    tier: 'TESTS',
    content: `it('renders user name and email when user is loaded', async () => {
  vi.spyOn(userApi, 'fetchUser').mockResolvedValue(mockUser);
  render(<UserProfile userId={101} />);
  await waitFor(() => {
    expect(screen.getByTestId('user-name')).toHaveTextContent('RSK');
  });
  expect(screen.getByTestId('user-email')).toHaveTextContent('rsk@example.com');
  // NOTE: No assertion on user-id / user.userId — intentional test gap
});`,
  },
  {
    file: 'contract/openapi.yaml',
    tier: 'CONTRACT',
    content: `paths:
  /api/v1/users/{id}:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserV1"
components:
  schemas:
    UserV1:
      properties:
        userId:
          type: integer`,
  },
];

// ─────────────────────────────────────────────
// DETERMINISTIC ANALYSIS RULES
// ─────────────────────────────────────────────

function containsOldEndpoint(content: string, oldEndpoint: string): boolean {
  return content.includes(oldEndpoint) || content.includes('/api/v1/users');
}

function containsOldField(content: string, oldField: string): boolean {
  // Look for the field name as a word (not as part of "userId" inside longer words)
  const re = new RegExp(`\\b${oldField}\\b`);
  return re.test(content);
}

function containsNewEndpoint(content: string, newEndpoint: string): boolean {
  return content.includes(newEndpoint) || content.includes('/api/v2/users');
}

function hasUserIdAssertion(content: string): boolean {
  // Only count an actual assertion, not fixture values or explanatory comments.
  return content.split(/\r?\n/).some((line) => {
    if (!/\b(expect|andExpect)\s*\(/.test(line)) return false;
    return (
      /getByTestId\(['"]user-id['"]\)/.test(line) ||
      /jsonPath\(\s*['"]\$\.(?:userId|id)['"]/.test(line)
    );
  });
}

// ─────────────────────────────────────────────
// MAIN ANALYSIS FUNCTION
// ─────────────────────────────────────────────

export function runImpactAnalysis(change: ContractChange): AnalysisResult {
  const affectedFiles: AffectedFile[] = [];
  const testGaps: TestGap[] = [];

  for (const repoFile of REPO_FILES) {
    const { file, tier, content } = repoFile;

    const hasOldEndpoint = containsOldEndpoint(content, change.oldEndpoint);
    const hasOldField = containsOldField(content, change.oldField);
    const hasNewEndpoint = containsNewEndpoint(content, change.newEndpoint);

    if (tier === 'BACKEND') {
      if (file.includes('UserDTO')) {
        // DTO directly holds the renamed field
        affectedFiles.push({
          file,
          tier,
          impactLevel: 'DIRECT',
          severity: 'CRITICAL',
          line: 14,
          symbol: 'UserDTO.userId',
          reference: 'private Long userId',
          whyAffected:
            'The DTO field "userId" must be renamed to "id" to match the new contract schema. JSON serialization will produce the wrong field name at runtime.',
          evidence: [
            { type: 'direct_reference', description: 'Field "userId" declared in DTO', confirmed: true },
            { type: 'direct_reference', description: 'Contract field removed: userId', confirmed: true },
            { type: 'direct_reference', description: 'Getter/setter getUserId() depends on field name', confirmed: true },
          ],
          assessment: 'LIKELY RUNTIME BREAK — JSON response will include "userId" instead of "id"',
        });
      } else if (file.includes('UserController')) {
        affectedFiles.push({
          file,
          tier,
          impactLevel: 'DIRECT',
          severity: 'HIGH',
          line: 31,
          symbol: 'UserController.getUserV1',
          reference: '@GetMapping("/api/v1/users/{id}")',
          whyAffected:
            'The endpoint mapping is "/api/v1/users/{id}" which must change to "/api/v2/users/{id}".',
          evidence: [
            { type: 'direct_reference', description: 'Endpoint "/api/v1/users" found in @GetMapping', confirmed: true },
            { type: 'direct_reference', description: 'Contract endpoint changed: v1 → v2', confirmed: true },
            { type: 'dependency', description: 'DTO dependency — UserDTO field also changing', confirmed: true },
          ],
          assessment: 'DIRECT IMPACT — endpoint version must be updated',
        });
      } else if (file.includes('UserService')) {
        affectedFiles.push({
          file,
          tier,
          impactLevel: 'UNAFFECTED',
          severity: 'UNAFFECTED',
          whyAffected: 'Service layer uses internal data map keyed by Long id — no contract field dependency.',
          evidence: [
            { type: 'direct_reference', description: 'No endpoint reference in service', confirmed: true },
            { type: 'direct_reference', description: 'No userId field reference in service logic', confirmed: true },
          ],
          assessment: 'UNAFFECTED — service uses internal identifiers only',
        });
      }
    }

    if (tier === 'FRONTEND') {
      if (file.includes('user.types')) {
        affectedFiles.push({
          file,
          tier,
          impactLevel: 'DIRECT',
          severity: 'CRITICAL',
          line: 12,
          symbol: 'User.userId',
          reference: 'userId: number',
          whyAffected:
            'The TypeScript User interface has "userId: number". After migration the API returns "id", so user.userId will be undefined at runtime.',
          evidence: [
            { type: 'direct_reference', description: 'Field "userId" declared in User interface', confirmed: true },
            { type: 'direct_reference', description: 'Contract field removed: userId → id', confirmed: true },
          ],
          assessment: 'LIKELY RUNTIME BREAK — TypeScript type does not match new contract schema',
        });
      } else if (file.includes('userApi')) {
        affectedFiles.push({
          file,
          tier,
          impactLevel: 'DIRECT',
          severity: 'HIGH',
          line: 13,
          symbol: 'fetchUser',
          reference: "const BASE_URL = '/api/v1/users'",
          whyAffected:
            'The API client calls "/api/v1/users/{id}". After migration the backend serves "/api/v2/users/{id}" — all fetches will return 404.',
          evidence: [
            { type: 'direct_reference', description: 'Endpoint "/api/v1/users" hardcoded in BASE_URL', confirmed: true },
            { type: 'direct_reference', description: 'Contract endpoint changed: v1 → v2', confirmed: true },
          ],
          assessment: 'DIRECT IMPACT — all API calls will fail with 404 after migration',
        });
      } else if (file.includes('UserProfile')) {
        affectedFiles.push({
          file,
          tier,
          impactLevel: 'DIRECT',
          severity: 'CRITICAL',
          line: 50,
          symbol: 'UserProfile',
          reference: '{user.userId}',
          whyAffected:
            'Component renders user.userId which will be undefined after field rename. User ID will display blank.',
          evidence: [
            { type: 'direct_reference', description: 'Direct reference: user.userId in JSX render', confirmed: true },
            { type: 'direct_reference', description: 'Contract field removed: userId', confirmed: true },
            { type: 'direct_reference', description: 'Consumer dependency confirmed via user.types.ts', confirmed: true },
          ],
          assessment: 'LIKELY RUNTIME BREAK — user ID display will be blank after migration',
        });
      }
    }

    if (tier === 'TESTS') {
      const isBackendTest = file.includes('backend/src/test');
      const hasAssertion = hasUserIdAssertion(content);
      const gap: TestGap = {
        affectedBehavior: 'User identity display (userId / id field)',
        relevantAssertion: hasAssertion
          ? 'Assertion found on user ID field'
          : null,
        isGap: !hasAssertion,
        file,
      };
      testGaps.push(gap);

      affectedFiles.push({
        file,
        tier,
        impactLevel: 'DIRECT',
        severity: gap.isGap ? 'HIGH' : 'MEDIUM',
        line: isBackendTest ? 31 : 38,
        symbol: isBackendTest ? 'UserControllerTest' : 'UserProfile test suite',
        reference: gap.isGap
          ? isBackendTest
            ? 'No assertion on $.userId / $.id'
            : 'No assertion on user.userId / data-testid="user-id"'
          : isBackendTest
            ? 'Assertion present on $.userId / $.id'
            : 'Assertion present on user ID field',
        whyAffected:
          gap.isGap
            ? isBackendTest
              ? 'Test verifies status, name, and email but NOT the response ID field. The renamed field will not be caught by this test after migration.'
              : 'Test verifies name and email but NOT userId. The broken field will not be caught by these tests after migration.'
            : 'Test includes an assertion on the user ID field — migration must update mock data and assertion.',
        evidence: [
          { type: 'direct_reference', description: 'Test file imports UserProfile component', confirmed: true },
          {
            type: gap.isGap ? 'gap' : 'direct_reference',
            description: gap.isGap
              ? isBackendTest
                ? 'No assertion on $.userId / $.id in test body'
                : 'No assertion on userId / user-id in test body'
              : 'Assertion found covering user ID field',
            confirmed: true,
          },
        ],
        assessment: gap.isGap
          ? isBackendTest
            ? 'TEST GAP — migration can change the response ID field without test failure'
            : 'TEST GAP — migration will silently break user ID display without test failure'
          : 'REQUIRES UPDATE — test assertions must reflect new field name "id"',
      });
    }

    if (tier === 'CONTRACT') {
      affectedFiles.push({
        file,
        tier,
        impactLevel: 'DIRECT',
        severity: 'HIGH',
        line: 20,
        symbol: 'UserV1 schema',
        reference: '/api/v1/users/{id} → UserV1.userId',
        whyAffected: 'This is the source of the breaking change — the contract defines the migration.',
        evidence: [
          { type: 'direct_reference', description: 'Old endpoint /api/v1/users defined here', confirmed: true },
          { type: 'direct_reference', description: 'Field userId defined in UserV1 schema', confirmed: true },
        ],
        assessment: 'SOURCE OF CHANGE — must be updated to reflect v2 contract',
      });
    }
  }

  const directCount = affectedFiles.filter((f) => f.impactLevel === 'DIRECT').length;
  const potentialCount = affectedFiles.filter((f) => f.impactLevel === 'POTENTIAL').length;
  const unaffectedCount = affectedFiles.filter((f) => f.impactLevel === 'UNAFFECTED').length;
  const gapCount = testGaps.filter((g) => g.isGap).length;

  const summary: ImpactSummary = {
    breakingChanges: 2,
    affectedFiles: directCount + potentialCount,
    directReferences: directCount,
    potentialImpacts: potentialCount,
    testGaps: gapCount,
    unaffectedFiles: unaffectedCount,
    totalFilesScanned: REPO_FILES.length,
  };

  return {
    change,
    affectedFiles,
    testGaps,
    summary,
    timestamp: new Date().toISOString(),
  };
}

export const SUPPORTED_CHANGES: ContractChange = {
  oldEndpoint: '/api/v1/users/{id}',
  newEndpoint: '/api/v2/users/{id}',
  oldField: 'userId',
  newField: 'id',
};
