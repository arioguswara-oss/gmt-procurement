"""Verify committed source blobs, independent of checkout newline conversion."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / "docs/SOURCE_IMPORT_MANIFEST_20261019.json").read_text())
files = manifest["files"]
assert len(files) == 126 and len({f["path"] for f in files}) == 126
for item in files:
    name = item["path"]
    assert not name.startswith("/") and ".." not in Path(name).parts
    data = subprocess.check_output(["git", "-C", str(root), "show", "HEAD:" + name])
    assert len(data) == item["size"], name + ": length mismatch"
    assert hashlib.sha256(data).hexdigest() == item["sha256"], name + ": SHA256 mismatch"
    blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    assert blob == item["git_blob_sha"], name + ": Git blob mismatch"
print("PASS: 126/126 committed source files match original ZIP manifest")
