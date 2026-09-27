#!/usr/bin/env python3
"""
ContractShield Deterministic Pre-Filter
========================================

Fast literal search across the repository to identify candidate files
before any AI/Bob analysis is invoked.

Usage:
    python3 analyzer/prefilter.py [--root <repo-root>]

Output:
    JSON object with candidate files grouped by pattern match.

This script intentionally performs ONLY deterministic checks:
  - exact string search
  - file extension filtering
  - line number reporting

It does NOT perform any AI reasoning. Pass its output to Bob for
semantic analysis of the shortlisted candidates only.
"""

import os
import json
import argparse
import re
from pathlib import Path

PATTERNS = {
    "old_endpoint": "/api/v1/users",
    "new_endpoint": "/api/v2/users",
    "old_field":    "userId",
    "new_field":    "id",
}

INCLUDE_EXTENSIONS = {".java", ".ts", ".tsx", ".yaml", ".yml", ".json"}

EXCLUDE_DIRS = {
    "node_modules", "target", ".git", "dist", ".vite", "__pycache__"
}


def scan_file(path: Path, patterns: dict) -> dict:
    """Return matched patterns and line numbers for a single file."""
    matches = {}
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        for lineno, line in enumerate(lines, start=1):
            for key, pattern in patterns.items():
                found = re.search(r"\bid\b", line) if key == "new_field" else pattern in line
                if found:
                    if key not in matches:
                        matches[key] = []
                    matches[key].append({"line": lineno, "content": line.strip()})
    except OSError:
        pass
    return matches


def scan_repo(root: Path) -> dict:
    """Walk the repository and collect all pattern matches."""
    results = {}
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune excluded directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for filename in filenames:
            filepath = Path(dirpath) / filename
            if filepath.suffix not in INCLUDE_EXTENSIONS:
                continue
            rel = filepath.relative_to(root)
            matches = scan_file(filepath, PATTERNS)
            if matches:
                results[str(rel)] = matches
    return results


def classify(results: dict) -> dict:
    """Classify files as DIRECT, POTENTIAL, or UNAFFECTED."""
    classified = {"DIRECT": [], "POTENTIAL": [], "UNAFFECTED_WITH_HITS": []}
    for file, matches in results.items():
        has_field = "old_field" in matches
        has_endpoint = "old_endpoint" in matches
        if has_field and has_endpoint:
            classified["DIRECT"].append(file)
        elif has_field or has_endpoint:
            classified["POTENTIAL"].append(file)
        else:
            classified["UNAFFECTED_WITH_HITS"].append(file)
    return classified


def main():
    parser = argparse.ArgumentParser(description="ContractShield deterministic pre-filter")
    parser.add_argument("--root", default=".", help="Repository root directory")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    results = scan_repo(root)
    classification = classify(results)

    output = {
        "scanned_root": str(root),
        "patterns": PATTERNS,
        "matches": results,
        "classification": classification,
        "summary": {
            "total_files_with_matches": len(results),
            "direct": len(classification["DIRECT"]),
            "potential": len(classification["POTENTIAL"]),
        }
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
