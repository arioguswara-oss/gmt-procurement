"""Synthetic tests for local-only, selective GMT source staging."""
import hashlib
import tempfile
import unittest
from pathlib import Path
import zipfile

from stage_source_zip import stage_source


class SelectiveStageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.archive = self.root / "source.zip"
        self.destination = self.root / "review-source"

    def build_archive(self, extra=None):
        prefix = "gmt-package/"
        entries = {
            prefix + "package.json": b'{"private":true}\n',
            prefix + "apps/api/package.json": b'{"name":"api"}\n',
            prefix + "apps/web/package.json": b'{"name":"web"}\n',
            prefix + "apps/api/src/main.ts": b"export const hello = 1;\n",
            prefix + "apps/web/src/App.tsx": b"export const App = 1;\n",
            prefix + "apps/api/node_modules/unused/index.js": b"dependency",
            prefix + "apps/web/dist/unused.js": b"bundle",
            prefix + "apps/api/prisma/seed.ts": b"seed data",
        }
        entries.update(extra or {})
        with zipfile.ZipFile(self.archive, "w") as target:
            for filename, content in entries.items():
                target.writestr(filename, content)
        return hashlib.sha256(self.archive.read_bytes()).hexdigest()

    def test_stages_only_allowlisted_files_and_manifest(self):
        digest = self.build_archive()
        report = stage_source(self.archive, self.destination, digest)
        self.assertEqual(report["status"], "REVIEW_REQUIRED")
        self.assertEqual(report["candidate_files"], 5)
        self.assertTrue((self.destination / "apps/api/src/main.ts").is_file())
        self.assertTrue((self.destination / "SOURCE_REVIEW_MANIFEST.json").is_file())
        self.assertFalse((self.destination / "apps/web/dist/unused.js").exists())
        self.assertFalse((self.destination / "apps/api/prisma/seed.ts").exists())

    def test_hash_mismatch_stages_nothing(self):
        self.build_archive()
        with self.assertRaises(ValueError):
            stage_source(self.archive, self.destination, "0" * 64)
        self.assertFalse(self.destination.exists())

    def test_sensitive_source_blocks_before_writing(self):
        # Fake value in a synthetic test archive only.
        digest = self.build_archive({
            "gmt-package/apps/api/src/unsafe.ts":
                b"const password = 'not-a-real-secret-abcdef123456';\n"
        })
        with self.assertRaises(ValueError):
            stage_source(self.archive, self.destination, digest)
        self.assertFalse(self.destination.exists())

    def test_refuses_overwriting_existing_output(self):
        digest = self.build_archive()
        self.destination.mkdir()
        keep = self.destination / "keep.txt"
        keep.write_text("keep", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            stage_source(self.archive, self.destination, digest)
        self.assertEqual(keep.read_text(encoding="utf-8"), "keep")


if __name__ == "__main__":
    unittest.main()
