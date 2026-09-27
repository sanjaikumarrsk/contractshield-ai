#!/bin/bash
# ContractShield Demo Script
# Run through the full SIMULATE → IMPACT MAP → APPROVE → REPAIR → VALIDATE workflow

set -e

echo "═══════════════════════════════════════════════════════"
echo "  ContractShield AI — Demo Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

# 1. Verify backend
echo "→ Checking backend..."
if [ -f "backend/pom.xml" ]; then
    echo "  ✓ Backend found: backend/pom.xml"
else
    echo "  ✗ Backend pom.xml not found"
    exit 1
fi

# 2. Verify frontend
echo "→ Checking frontend..."
if [ -f "frontend/package.json" ]; then
    echo "  ✓ Frontend found: frontend/package.json"
else
    echo "  ✗ Frontend package.json not found"
    exit 1
fi

# 3. Verify contract
echo "→ Checking contract..."
if [ -f "contract/openapi.yaml" ]; then
    echo "  ✓ Contract found: contract/openapi.yaml"
else
    echo "  ✗ Contract not found"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Running deterministic pre-filter..."
echo "═══════════════════════════════════════════════════════"

python3 analyzer/prefilter.py --root . 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'  Files with matches: {data[\"summary\"][\"total_files_with_matches\"]}')
print(f'  Direct: {data[\"summary\"][\"direct\"]}')
print(f'  Potential: {data[\"summary\"][\"potential\"]}')
" 2>/dev/null || echo "  (Python not available — skipping pre-filter CLI)"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Starting backend..."
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Run in a separate terminal:"
echo "    cd backend && mvn spring-boot:run"
echo ""
echo "  Then test the v1 endpoint:"
echo "    curl http://localhost:8080/api/v1/users/101"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Starting frontend..."
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Run in a separate terminal:"
echo "    cd frontend && npm install && npm run dev"
echo ""
echo "  Then open: http://localhost:3000"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Demo Sequence (3 minutes)"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  1. Dashboard  — show the contract change"
echo "  2. Simulate   — RUN SIMULATION"
echo "  3. Impact Map — click UserProfile.tsx node"
echo "  4. Approve    — review and APPROVE REPAIR"
echo "  5. Repair     — watch Bob work through steps"
echo "  6. Validate   — RECORD VALIDATION STATUS → run external tests before review"
echo ""
