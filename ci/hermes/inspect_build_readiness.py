#!/usr/bin/env python3
"""Static-only prebuild gate: never install dependencies or execute app scripts.

Exit 0 means only REVIEW_REQUIRED, never build/deploy approval.
Exit 2 means BLOCKED. Output intentionally excludes source content and secrets.
"""
import argparse
import json
from pathlib import Path
import re
import sys

REQUIRED = (
    "package.json", "app.js", "apps/api/package.json",
    "apps/web/package.json", "apps/api/prisma/schema.prisma",
    "apps/api/src/main.ts", "apps/web/src/main.tsx",
    "deploy/cpanel/preflight.cjs",
)
PACKAGES = ("package.json", "apps/api/package.json", "apps/web/package.json")
LIFECYCLE = frozenset({"preinstall", "install", "postinstall", "prepare"})
DANGEROUS = re.compile(
    r"\b(?:prisma\s+(?:migrate|db\s+(?:push|execute|seed))|"
    r"seed(?:\.ts)?|curl|wget|sudo|docker|scp|ssh)\b", re.I
)
COMMAND_SUBSTITUTION = re.compile(r"\$\(|`|[;|<>]|\$\{|\$[A-Za-z_]")
RUN_REFERENCE = re.compile(r"\bnpm\s+run\s+([A-Za-z0-9:_.-]+)")


def _safe_file(root, rel):
    candidate = root.joinpath(*rel.split('/'))
    if any(p.is_symlink() for p in (candidate, *candidate.parents) if p != root.parent and p != root):
        return False
    return candidate.is_file() and candidate.stat().st_size <= 250_000


def _json(root, rel):
    try:
        return json.loads((root / rel).read_text(encoding='utf-8'))
    except (OSError, UnicodeError, ValueError):
        return None


def inspect(root: Path) -> dict:
    findings = []
    summary = {"status": "BLOCKED", "findings": findings,
               "packages_checked": 0, "build_scripts_checked": 0,
               "lockfile": "NOT_VERIFIED"}
    if not root.is_dir() or root.is_symlink():
        findings.append("SOURCE_DIRECTORY_MISSING_OR_SYMLINK")
        return summary
    for rel in REQUIRED:
        if not _safe_file(root, rel):
            findings.append("MISSING_OR_UNSAFE_FILE:" + rel)
    packages = {}
    for name in PACKAGES:
        if _safe_file(root, name):
            data = _json(root, name)
            if not isinstance(data, dict) or not isinstance(data.get('scripts', {}), dict):
                findings.append('INVALID_PACKAGE_JSON:' + name)
            else:
                packages[name] = data
                summary['packages_checked'] += 1
        else:
            findings.append('PACKAGE_UNAVAILABLE:' + name)

    lock = root / 'package-lock.json'
    if not lock.exists():
        findings.append('ROOT_LOCKFILE_MISSING')
        summary['lockfile'] = 'MISSING'
    elif not _safe_file(root, 'package-lock.json'):
        findings.append('ROOT_LOCKFILE_UNSAFE_OR_OVERSIZED')
        summary['lockfile'] = 'INVALID'
    else:
        data = _json(root, 'package-lock.json')
        if (not isinstance(data, dict) or data.get('lockfileVersion') not in (2, 3) or
                not isinstance(data.get('packages'), dict) or '' not in data['packages']):
            findings.append('ROOT_LOCKFILE_INVALID')
            summary['lockfile'] = 'INVALID'
        elif packages and data.get('name') != packages.get('package.json', {}).get('name'):
            findings.append('ROOT_LOCKFILE_NAME_MISMATCH')
            summary['lockfile'] = 'INVALID'
        else:
            summary['lockfile'] = 'STRUCTURE_OK_ONLY'

    for rel, pkg in packages.items():
        scripts = pkg.get('scripts', {})
        for name in sorted(LIFECYCLE & scripts.keys()):
            findings.append('INSTALL_LIFECYCLE_REQUIRES_REVIEW:' + rel + ':' + name)
        if 'build' not in scripts:
            findings.append('BUILD_SCRIPT_MISSING:' + rel)
        for name, value in scripts.items():
            if not isinstance(value, str):
                findings.append('NON_STRING_SCRIPT:' + rel + ':' + name)

    # Only inspect build closure. Other scripts (db push/seed) remain in source,
    # but are never executed by this scanner and must be prohibited by the runner.
    for rel, pkg in packages.items():
        scripts = pkg['scripts']
        todo = ['build']
        seen = set()
        while todo:
            script_name = todo.pop()
            if script_name in seen:
                continue
            seen.add(script_name)
            value = scripts.get(script_name)
            if not isinstance(value, str):
                findings.append('BUILD_REFERENCE_MISSING:' + rel + ':' + script_name)
                continue
            summary['build_scripts_checked'] += 1
            if DANGEROUS.search(value):
                findings.append('UNSAFE_BUILD_SCRIPT:' + rel + ':' + script_name)
            if COMMAND_SUBSTITUTION.search(value):
                findings.append('SHELL_EXPANSION_IN_BUILD:' + rel + ':' + script_name)
            todo.extend(RUN_REFERENCE.findall(value))

    if not findings:
        # There is deliberately no READY_TO_BUILD status. Lockfile review,
        # dependency and sandbox verification are independent requirements.
        summary['status'] = 'REVIEW_REQUIRED'
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path,
                        help='Local checked-out source directory; must not be production')
    args = parser.parse_args()
    result = inspect(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['status'] == 'REVIEW_REQUIRED' else 2


if __name__ == '__main__':
    sys.exit(main())
