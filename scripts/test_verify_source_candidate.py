"""Synthetic isolated tests for verify_procurement_candidate; no source code executed."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from verify_source_candidate import REQUIRED, check


def archive(path, content=None, extra=None):
    items = {n: b'placeholder' for n in REQUIRED}
    items.update(content or {})
    manifest = {'files': {k: {'size': len(v), 'sha256': hashlib.sha256(v).hexdigest()}
                          for k, v in items.items()},
                'candidate_files': len(items), 'candidate_bytes': sum(map(len, items.values()))}
    with zipfile.ZipFile(path, 'w') as z:
        for n, value in items.items():
            z.writestr(n, value)
        z.writestr('SOURCE_REVIEW_MANIFEST.json', json.dumps(manifest))
        for n, v in extra or []:
            z.writestr(n, v)
    return hashlib.sha256(path.read_bytes()).hexdigest()


class CandidateTests(unittest.TestCase):
    def run_case(self, change=None, extra=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sample.zip'
            sha = archive(path, change, extra)
            return check(path, sha)

    def test_valid_manifest(self):
        result = self.run_case()
        self.assertEqual(result['status'], 'REVIEW_REQUIRED')
        self.assertEqual(result['files_verified'], len(REQUIRED))

    def test_mismatched_sha(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'a.zip'
            archive(path)
            self.assertEqual(check(path, '0' * 64)['status'], 'BLOCKED')

    def test_bad_manifest_extra_file(self):
        result = self.run_case(extra=[('other.js', 'code')])
        self.assertEqual(result['status'], 'BLOCKED')
        self.assertIn('Manifest not identical to ZIP contents', result['findings'])

    def test_path_traversal(self):
        result = self.run_case(extra=[('../escape.txt', 'no')])
        self.assertIn('Unsafe path', result['findings'])

    def test_credential_detected(self):
        result = self.run_case(change={'apps/api/src/main.ts': b'ghp_' + b'A' * 32})
        self.assertIn('Binary or credential-like member', result['findings'])
        self.assertNotIn('ghp_', json.dumps(result))

    def test_forbidden_runtime(self):
        result = self.run_case(extra=[('node_modules/unsafe.js', 'x')])
        self.assertIn('Unsafe path', result['findings'])


if __name__ == '__main__':
    unittest.main()
