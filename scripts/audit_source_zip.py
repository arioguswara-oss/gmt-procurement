#!/usr/bin/env python3
"""Read-only gate for a GMT Procurement source ZIP.

Never extracts, executes, uploads, or prints file content. A PASS means only
that this narrow heuristic found no blocker; human review is still mandatory.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import zipfile

MAX_ZIP_BYTES = 350_000_000
MAX_ENTRIES = 60_000
MAX_CANDIDATE_BYTES = 2_000_000
ALLOWED_EXT = {".ts", ".tsx", ".js", ".jsx", ".json", ".prisma",
               ".css", ".scss", ".html", ".mjs", ".cjs", ".sql"}
ROOT_FILES = {"package.json", "package-lock.json", "pnpm-lock.yaml",
              "yarn.lock", "tsconfig.json", "tsconfig.base.json"}
APP_FILES = {"package.json", "package-lock.json", "tsconfig.json",
             "tsconfig.build.json", "nest-cli.json", "vite.config.ts",
             "index.html", "postcss.config.js", "tailwind.config.js",
             "tailwind.config.ts", "eslint.config.js", ".eslintrc.json"}
DENY_PARTS = {"node_modules", "dist", "build", "coverage", "uploads",
              "storage", ".git", "tmp", "backups", "backup", ".next",
              "__pycache__", "cache", "releases"}
DENY_SUFFIXES = {".zip", ".pem", ".key", ".p12", ".pfx", ".db", ".bak", ".dump"}
SECRETS = (
    re.compile(rb"-----BEGIN\s+(?:[A-Z]+\s+)?PRIVATE KEY-----"),
    re.compile(rb"(?<![A-Za-z0-9])(?:ghp_|gho_|ghs_|ghu_)[A-Za-z0-9]{20,}"),
    re.compile(rb"(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])"),
    re.compile(rb"(?i)\b(?:password|secret|api[_-]?key|fonnte[_-]?token)\s*[:=]\s*['\x22][^'\x22\r\n]{12,}['\x22]"),
)


def unsafe_path(name):
    if not name or name.startswith("/") or "\\" in name or "\x00" in name:
        return True
    p = PurePosixPath(name)
    return ".." in p.parts or (p.parts and ":" in p.parts[0])


def find_prefix(names):
    files = set(names)
    matches = []
    for item in files:
        if not item.endswith("package.json"):
            continue
        prefix = item[:-len("package.json")]
        if (prefix + "apps/api/package.json" in files
                and prefix + "apps/web/package.json" in files):
            matches.append(prefix)
    if len(matches) != 1:
        raise ValueError("Expected one unambiguous package root containing apps/api and apps/web")
    return matches[0]


def is_candidate(relative):
    p = PurePosixPath(relative)
    if any(part in DENY_PARTS for part in p.parts):
        return False
    if p.name == ".env" or p.name.startswith(".env."):
        return False
    if p.suffix.lower() in DENY_SUFFIXES:
        return False
    if relative in ROOT_FILES:
        return True
    for app in ("apps/api/", "apps/web/"):
        if relative.startswith(app) and relative[len(app):] in APP_FILES:
            return True
    if relative.startswith(("apps/api/src/", "apps/web/src/",
                            "apps/api/test/", "apps/web/tests/")):
        return p.suffix.lower() in ALLOWED_EXT
    if relative == "apps/api/prisma/schema.prisma":
        return True
    # Historical migration scripts and seed data require separate human review.
    return False


def inspect(path):
    result = {"status": "BLOCKED", "archive_sha256": None, "prefix": None,
              "total_entries": 0, "candidate_files": 0,
              "skipped_entries": 0, "findings": []}
    if not path.is_file() or path.stat().st_size > MAX_ZIP_BYTES:
        result["findings"].append("Archive missing or exceeds size cap")
        return result
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(block)
    result["archive_sha256"] = sha.hexdigest()

    try:
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            result["total_entries"] = len(entries)
            if len(entries) > MAX_ENTRIES:
                result["findings"].append("Archive contains too many entries")
                return result
            names = [e.filename for e in entries if not e.is_dir()]
            if any(unsafe_path(e.filename) for e in entries):
                result["findings"].append("Unsafe archive path detected")
                return result
            prefix = find_prefix(names)
            result["prefix"] = prefix
            seen = set()
            for entry in entries:
                if entry.is_dir() or not entry.filename.startswith(prefix):
                    result["skipped_entries"] += 1
                    continue
                relative = entry.filename[len(prefix):]
                if not is_candidate(relative):
                    result["skipped_entries"] += 1
                    continue
                lower = relative.casefold()
                if lower in seen:
                    result["findings"].append("Duplicate candidate path: " + relative)
                    continue
                seen.add(lower)
                if stat.S_ISLNK(entry.external_attr >> 16):
                    result["findings"].append("Symlink candidate: " + relative)
                    continue
                if entry.file_size > MAX_CANDIDATE_BYTES:
                    result["findings"].append("Oversize source candidate: " + relative)
                    continue
                try:
                    content = archive.read(entry)
                except (RuntimeError, zipfile.BadZipFile, OSError):
                    result["findings"].append("Unreadable source candidate: " + relative)
                    continue
                if b"\x00" in content:
                    result["findings"].append("Binary source candidate: " + relative)
                    continue
                if any(pattern.search(content) for pattern in SECRETS):
                    result["findings"].append("Potential credential in source: " + relative)
                    continue
                result["candidate_files"] += 1
            if not result["candidate_files"]:
                result["findings"].append("No source candidates matched allowlist")
            if result["findings"]:
                return result
            result["status"] = "REVIEW_REQUIRED"
            return result
    except (OSError, zipfile.BadZipFile, ValueError) as error:
        result["findings"].append(type(error).__name__ + " while opening or locating source")
        return result


def main():
    parser = argparse.ArgumentParser(description="Read-only source archive audit; never imports")
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    result = inspect(args.archive)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] == "REVIEW_REQUIRED" else 1


if __name__ == "__main__":
    sys.exit(main())
