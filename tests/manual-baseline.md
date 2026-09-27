# ContractShield Manual Baseline Experiment

## Purpose

This file defines the manual workflow baseline experiment.
Record your actual times and findings — do NOT invent numbers.

## Manual Workflow

A developer receives the contract change notification:
  - `/api/v1/users/{id}` → `/api/v2/users/{id}`
  - `userId` → `id`

They manually search the repository without ContractShield.

## Procedure

1. Note start time: ___________

2. Run: `grep -r "userId" contractshield/ --include="*.java" --include="*.ts" --include="*.tsx"`
   - Files found: ___________
   - Time: ___________

3. Run: `grep -r "/api/v1/users" contractshield/ --include="*.java" --include="*.ts" --include="*.tsx"`
   - Files found: ___________
   - Time: ___________

4. Open each file and inspect:
   - UserDTO.java — found: yes/no
   - UserController.java — found: yes/no
   - UserService.java — found: yes/no
   - user.types.ts — found: yes/no
   - userApi.ts — found: yes/no
   - UserProfile.tsx — found: yes/no
   - UserProfile.test.tsx — found: yes/no
   
5. Did you check tests for the renamed field assertion? yes/no

6. Did you notice the test gap (no assertion on user.userId)? yes/no

7. Note end time: ___________

## Results

| Metric | Manual | ContractShield |
|--------|--------|---------------|
| Total time | ___ | ___ |
| Files found | ___ | ___ |
| Files missed | ___ | ___ |
| Test gap detected | yes/no | yes/no |
| Steps required | ___ | ___ |

## Notes

Record honest results. ContractShield is only useful if the comparison is fair.
