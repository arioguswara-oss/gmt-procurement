"""Synthetic tests, no package scripts executed and no network."""
import json
from pathlib import Path
import tempfile
import unittest
from inspect_build_readiness import inspect, REQUIRED


class BuildGateTests(unittest.TestCase):
    def make(self, root, *, lock=True, root_scripts=None, api_scripts=None):
        for rel in REQUIRED:
            path = root / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('x', encoding='utf-8')
        payload = {
            'package.json': {'name': 'procurement', 'scripts':
                             root_scripts or {'build': 'npm run build:api && npm run build:web',
                                              'build:api': 'echo compile', 'build:web': 'echo compile'}},
            'apps/api/package.json': {'name': '@gmt/api', 'scripts': api_scripts or {'build': 'nest build'}},
            'apps/web/package.json': {'name': '@gmt/web', 'scripts': {'build': 'tsc -b && vite build'}},
        }
        for rel, data in payload.items():
            (root / rel).write_text(json.dumps(data), encoding='utf-8')
        if lock:
            (root / 'package-lock.json').write_text(json.dumps({
                'name': 'procurement', 'lockfileVersion': 3,
                'packages': {'': {'name': 'procurement'}}}), encoding='utf-8')

    def test_valid_is_review_not_ready(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root)
            result = inspect(root)
            self.assertEqual(result['status'], 'REVIEW_REQUIRED')
            self.assertEqual(result['lockfile'], 'STRUCTURE_OK_ONLY')

    def test_missing_lock_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root, lock=False)
            result = inspect(root)
            self.assertEqual(result['status'], 'BLOCKED')
            self.assertIn('ROOT_LOCKFILE_MISSING', result['findings'])

    def test_mutating_command_in_build_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root, root_scripts={'build': 'prisma db push'})
            result = inspect(root)
            self.assertTrue(any('UNSAFE_BUILD_SCRIPT' in x for x in result['findings']))

    def test_missing_run_target_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root, root_scripts={'build': 'npm run missing'})
            result = inspect(root)
            self.assertTrue(any('BUILD_REFERENCE_MISSING' in x for x in result['findings']))

    def test_shell_substitution_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root, root_scripts={'build': 'echo $(id)'})
            result = inspect(root)
            self.assertTrue(any('SHELL_EXPANSION_IN_BUILD' in x for x in result['findings']))

    def test_install_hook_requires_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root, api_scripts={'build': 'nest build', 'postinstall': 'echo unsafe'})
            result = inspect(root)
            self.assertTrue(any('INSTALL_LIFECYCLE' in x for x in result['findings']))

    def test_missing_source_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root)
            (root / 'apps/api/prisma/schema.prisma').unlink()
            self.assertTrue(any('MISSING_OR_UNSAFE_FILE' in x for x in inspect(root)['findings']))

    def test_malformed_lock_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make(root)
            (root / 'package-lock.json').write_text('{', encoding='utf-8')
            self.assertIn('ROOT_LOCKFILE_INVALID', inspect(root)['findings'])


if __name__ == '__main__':
    unittest.main()
