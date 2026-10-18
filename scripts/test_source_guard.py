import unittest
from source_guard import path_problem, content_problem


class GuardTests(unittest.TestCase):
    def test_forbidden_artifacts(self):
        for path in ('.env', 'apps/api/.env.production', 'node_modules/a.js',
                     'apps/web/dist/index.js', 'storage/quote.pdf', 'backup.zip'):
            self.assertIsNotNone(path_problem(path), path)

    def test_expected_sources(self):
        for path in ('README.md', 'apps/api/src/main.ts', 'apps/api/prisma/schema.prisma',
                     'storage/.gitkeep', '.github/workflows/source-guard.yml'):
            self.assertIsNone(path_problem(path), path)

    def test_sensitive_content(self):
        self.assertEqual(content_problem(b'-----BEGIN PRIVATE KEY-----'),
                         'potential credential material')
        self.assertIsNone(content_problem(b'const token = process.env.FONNTE_TOKEN'))


if __name__ == '__main__':
    unittest.main()
