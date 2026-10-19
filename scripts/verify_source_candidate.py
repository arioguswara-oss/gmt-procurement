#!/usr/bin/env python3
"""Fail-closed, read-only sanity gate for a previously staged source review ZIP.

This does not confer clearance for secrets, personal data, build or deployment.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import zipfile

MAX_FILES = 1000
MAX_TOTAL = 35_000_000
BANNED_PARTS = {'.git', 'node_modules', 'dist', 'build', 'storage', 'uploads', 'backup', 'backups', 'cache', '.next'}
KEY_PATTERN = re.compile(rb'-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----|(?<![A-Za-z0-9])(?:ghp_|gho_|ghs_)[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}')
REQUIRED = {'package.json', 'app.js', 'apps/api/package.json', 'apps/api/prisma/schema.prisma',
            'apps/api/src/main.ts', 'apps/web/package.json', 'apps/web/src/main.tsx',
            'deploy/cpanel/preflight.cjs'}


def check(path: Path, expected_sha: str) -> dict:
    problems = []
    result = {'status': 'BLOCKED', 'files_verified': 0, 'bytes_verified': 0, 'findings': problems}
    if not re.fullmatch('[0-9a-fA-F]{64}', expected_sha):
        return {**result, 'findings': ['Invalid expected SHA256']}
    if not path.is_file() or path.stat().st_size > MAX_TOTAL:
        return {**result, 'findings': ['Missing or oversized candidate ZIP']}
    sha = hashlib.sha256()
    with path.open('rb') as handle:
        for part in iter(lambda: handle.read(1024 * 1024), b''):
            sha.update(part)
    if sha.hexdigest() != expected_sha.lower():
        return {**result, 'findings': ['Candidate checksum mismatch']}
    try:
        with zipfile.ZipFile(path) as z:
            entries = z.infolist()
            if len(entries) > MAX_FILES:
                return {**result, 'findings': ['Too many ZIP entries']}
            seen = set()
            files = {}
            for item in entries:
                name = item.filename
                p = PurePosixPath(name)
                if (not name or name.startswith('/') or '\\' in name or '\x00' in name or
                        '..' in p.parts or ':' in p.parts[0] or any(x in BANNED_PARTS for x in p.parts)):
                    problems.append('Unsafe path')
                    continue
                folded = name.casefold()
                if folded in seen:
                    problems.append('Duplicate path')
                    continue
                seen.add(folded)
                if item.is_dir():
                    continue
                if stat.S_ISLNK(item.external_attr >> 16):
                    problems.append('Symlink entry')
                    continue
                if item.file_size > 2_000_000:
                    problems.append('Oversized member')
                    continue
                if p.name.startswith('.env') or p.suffix.lower() in {'.pem', '.p12', '.key', '.db', '.bak'}:
                    problems.append('Forbidden member')
                    continue
                data = z.read(item)
                if b'\x00' in data or KEY_PATTERN.search(data):
                    problems.append('Binary or credential-like member')
                    continue
                result['bytes_verified'] += len(data)
                if result['bytes_verified'] > MAX_TOTAL:
                    problems.append('Cumulative source bytes exceeded')
                    break
                files[name] = {'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
            try:
                manifest = json.loads(z.read('SOURCE_REVIEW_MANIFEST.json'))
            except (KeyError, ValueError):
                problems.append('Missing or malformed manifest')
                return result
            source = {name: v for name, v in files.items() if name != 'SOURCE_REVIEW_MANIFEST.json'}
            result['files_verified'] = len(source)
            if not REQUIRED.issubset(source):
                problems.append('Missing required baseline files')
            if manifest.get('files') != source:
                problems.append('Manifest not identical to ZIP contents')
            if manifest.get('candidate_files') != len(source):
                problems.append('Manifest file count differs')
            if manifest.get('candidate_bytes') != sum(f['size'] for f in source.values()):
                problems.append('Manifest bytes differ')
            if problems:
                return result
            result['status'] = 'REVIEW_REQUIRED'
            return result
    except (zipfile.BadZipFile, RuntimeError, OSError, EOFError, ValueError, KeyError):
        problems.append('Unreadable/corrupt ZIP')
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('--expected-sha256', required=True)
    args = parser.parse_args()
    result = check(args.candidate, args.expected_sha256)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result['status'] == 'REVIEW_REQUIRED' else 1


if __name__ == '__main__':
    sys.exit(main())
