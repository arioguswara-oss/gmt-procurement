#!/usr/bin/env python3
"""Stage allowlisted GMT Procurement source locally after a strict ZIP preflight.

NEVER run archived code, install packages, contact networks, or upload the ZIP.
Writes to a NEW local staging directory only, and never edits the original ZIP.
This is source FOR HUMAN REVIEW, not a complete build or release artifact.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import tempfile
import zipfile

from audit_source_zip import (
    MAX_CANDIDATE_BYTES,
    MAX_TOTAL_CANDIDATE_BYTES,
    SECRETS,
    inspect,
    is_candidate,
    unsafe_path,
)


def stage_source(archive_path, output_dir, expected_sha256):
    """Return a manifest. On failure, do not leave a partial output directory."""
    archive_path = Path(archive_path)
    output_dir = Path(output_dir)
    if not re.fullmatch(r"[a-fA-F0-9]{64}", expected_sha256):
        raise ValueError("expected_sha256 must have 64 hex digits")
    if output_dir.exists() or output_dir.is_symlink():
        raise FileExistsError("Refusing to overwrite existing output directory")
    parent = output_dir.parent
    if not parent.is_dir():
        raise FileNotFoundError("Output parent directory must already exist")
    if parent.is_symlink():
        raise ValueError("Output parent must not be a symlink")

    # The audit gate verifies source archive hash and scans all selected content.
    audit = inspect(archive_path, expected_sha256=expected_sha256.lower())
    if audit["status"] != "REVIEW_REQUIRED":
        raise ValueError("Archive blocked by source ZIP audit; no files staged")
    prefix = audit["prefix"]

    # Only use trusted, local staging. Keep data private and avoid partial outputs.
    staging = Path(tempfile.mkdtemp(prefix=".gmt-source-", dir=parent))
    os.chmod(staging, 0o700)
    try:
        manifest = {
            "status": "REVIEW_REQUIRED",
            "archive_sha256": audit["archive_sha256"],
            "candidate_files": 0,
            "total_source_bytes": 0,
            "files": [],
            "notice": "Human review and full build/test required before any Git import",
        }
        total_bytes = 0
        seen = set()
        with zipfile.ZipFile(archive_path) as archive:
            for entry in archive.infolist():
                if entry.is_dir() or not entry.filename.startswith(prefix):
                    continue
                relative = entry.filename[len(prefix):]
                if not is_candidate(relative):
                    continue
                if unsafe_path(relative) or not relative or stat.S_ISLNK(entry.external_attr >> 16):
                    raise ValueError("Unsafe source entry while staging")
                norm = relative.casefold()
                if norm in seen:
                    raise ValueError("Duplicate source entry while staging")
                seen.add(norm)
                if entry.file_size > MAX_CANDIDATE_BYTES:
                    raise ValueError("Source entry exceeds per-file limit")
                total_bytes += entry.file_size
                if total_bytes > MAX_TOTAL_CANDIDATE_BYTES:
                    raise ValueError("Source entries exceed combined size limit")
                data = archive.read(entry)
                if len(data) != entry.file_size or b"\x00" in data:
                    raise ValueError("Invalid source entry content")
                if any(pattern.search(data) for pattern in SECRETS):
                    raise ValueError("Potential credential in source; refusing to stage")
                # Never use the archive path as a filesystem destination directly.
                # Only normalized, pre-approved relative POSIX paths are accepted.
                segments = PurePosixPath(relative).parts
                if not segments or any(part in ("", ".", "..") for part in segments):
                    raise ValueError("Invalid relative source path")
                out = staging.joinpath(*segments)
                out.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                # Use exclusive create; no overwrites. The staging tree is private.
                with out.open("xb") as target:
                    os.chmod(out, 0o600)
                    target.write(data)
                manifest["files"].append({
                    "path": relative,
                    "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                })
        if len(manifest["files"]) != audit["candidate_files"]:
            raise ValueError("Candidate count changed during staging; refusing output")
        manifest["candidate_files"] = len(manifest["files"])
        manifest["total_source_bytes"] = total_bytes
        manifest["files"].sort(key=lambda x: x["path"])
        # Manifest remains alongside staged source, not posted to chat or GitHub.
        manifest_path = staging / "SOURCE_REVIEW_MANIFEST.json"
        with manifest_path.open("x", encoding="utf-8") as target:
            os.chmod(manifest_path, 0o600)
            json.dump(manifest, target, indent=2)
            target.write("\n")
        # Avoid overwriting a directory that appeared during staging.
        if output_dir.exists() or output_dir.is_symlink():
            raise FileExistsError("Output directory appeared while staging")
        staging.rename(output_dir)
        return manifest
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def main():
    parser = argparse.ArgumentParser(
        description="Stage only vetted source from a trusted ZIP; NO Git upload")
    parser.add_argument("archive", type=Path, help="Approved source ZIP")
    parser.add_argument("output_dir", type=Path, help="New local review folder")
    parser.add_argument("--expected-sha256", required=True, help="Trusted ZIP hash")
    args = parser.parse_args()
    try:
        manifest = stage_source(
            args.archive, args.output_dir, args.expected_sha256)
    except (OSError, RuntimeError, ValueError, zipfile.BadZipFile) as error:
        # Never print archive/file content; no exception strings from the ZIP.
        print("SOURCE_STAGE_BLOCKED: " + type(error).__name__, file=sys.stderr)
        return 1
    print("SOURCE_STAGE_REVIEW_REQUIRED")
    print("files=", manifest["candidate_files"])
    print("source_bytes=", manifest["total_source_bytes"])
    print("No application code was executed or uploaded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
