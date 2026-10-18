"""Fail CI when tracked source contains high-risk paths or obvious credentials.

Not a comprehensive secret scanner. Never print matching values.
"""
import pathlib
import re
import subprocess
import sys

FORBIDDEN_PARTS = {'node_modules', 'dist', 'tmp', 'uploads', '__pycache__'}
FORBIDDEN_EXT = {'.zip', '.tar', '.gz', '.log', '.pem', '.p12', '.pfx', '.db', '.sqlite', '.bak', '.dump'}
KEY_PATTERNS = (
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(rb'(?<![A-Za-z0-9])(?:ghp_|gho_|ghs_|ghu_)[A-Za-z0-9]{20,}'),
    re.compile(rb'(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])'),
    re.compile(rb'(?i)\b(?:JWT_SECRET|IMAP_PASSWORD|SMTP_PASSWORD|FONNTE_TOKEN)\s*[:=]\s*[\x27\"][A-Za-z0-9+/_=-]{20,}[\x27\"]'),
)

def path_problem(path: str) -> str | None:
    posix = pathlib.PurePosixPath(path)
    if '..' in posix.parts or path.startswith('/'):
        return 'unsafe relative path'
    if any(part in FORBIDDEN_PARTS for part in posix.parts):
        return 'runtime/build directory'
    if posix.name == '.env' or posix.name.startswith('.env.'):
        return 'environment config'
    if posix.suffix.lower() in FORBIDDEN_EXT:
        return 'binary/runtime or secret-key artifact'
    if 'storage' in posix.parts and posix.name != '.gitkeep':
        return 'runtime storage'
    return None

def content_problem(payload: bytes) -> str | None:
    for pattern in KEY_PATTERNS:
        if pattern.search(payload):
            return 'potential credential material'
    return None

def main() -> int:
    root = pathlib.Path(__file__).resolve().parent.parent
    try:
        proc = subprocess.run(['git', '-C', str(root), 'ls-files', '-z'],
                              capture_output=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        print('source_guard: requires a Git worktree', file=sys.stderr)
        return 2
    failures = []
    for raw_path in filter(None, proc.stdout.split(b'\0')):
        rel = raw_path.decode('utf-8', 'replace')
        problem = path_problem(rel)
        if problem:
            failures.append((rel, problem))
            continue
        file = root / rel
        if not file.is_file():
            continue
        if file.stat().st_size > 2_000_000:
            failures.append((rel, 'file exceeds 2MB review threshold'))
            continue
        reason = content_problem(file.read_bytes())
        if reason:
            failures.append((rel, reason))
    if failures:
        for path, reason in failures:
            print(f'BLOCKED {path}: {reason}')
        return 1
    print('source_guard: checked tracked paths (not a full security audit)')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
