"""Unit tests for the read-only source archive audit gate."""
import tempfile
import unittest
from pathlib import Path
import zipfile

from audit_source_zip import inspect, is_candidate, unsafe_path


def make_zip(path, prefix="", extra=None):
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr(prefix + "package.json", '{"name":"gmt-procurement"}')
        archive.writestr(prefix + "apps/api/package.json", '{"name":"api"}')
        archive.writestr(prefix + "apps/web/package.json", '{"name":"web"}')
        archive.writestr(prefix + "apps/api/src/main.ts", "const value = 1;\n")
        archive.writestr(prefix + "apps/web/src/App.tsx", "export const X = 1;\n")
        archive.writestr(prefix + "apps/api/node_modules/vendor/index.js", "ignored")
        for name, payload in (extra or []):
            archive.writestr(name, payload)


class SourceZipAuditTests(unittest.TestCase):
    def audit(self, prefix="", extra=None):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sample.zip"
            make_zip(path, prefix, extra)
            return inspect(path)

    def test_valid_archive_requires_review(self):
        result = self.audit(prefix="gmt-procurement/")
        self.assertEqual(result["status"], "REVIEW_REQUIRED")
        self.assertEqual(result["prefix"], "gmt-procurement/")
        self.assertEqual(result["candidate_files"], 5)
        self.assertGreaterEqual(result["skipped_entries"], 1)

    def test_unsafe_path_fails_closed(self):
        self.assertTrue(unsafe_path("../bad"))
        result = self.audit(extra=[("../bad", "x")])
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("Unsafe archive path detected", result["findings"])

    def test_sensitive_content_is_blocked_without_value(self):
        sensitive = "const config = { password: " + repr("sensitive" * 3) + " };\n"
        result = self.audit(extra=[("apps/api/src/unsafe.ts", sensitive)])
        self.assertEqual(result["status"], "BLOCKED")
        self.assertTrue(any("Potential credential" in x for x in result["findings"]))
        self.assertNotIn("sensitive" * 3, str(result))

    def test_runtime_files_never_candidates(self):
        self.assertFalse(is_candidate("apps/web/dist/index.js"))
        self.assertFalse(is_candidate("apps/api/prisma/seed.ts"))
        self.assertFalse(is_candidate("apps/api/.env.production"))
        self.assertTrue(is_candidate("apps/api/src/main.ts"))


if __name__ == "__main__":
    unittest.main()
