import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function walkJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJsFiles(absolutePath);
    return entry.isFile() && entry.name.endsWith('.js') ? [absolutePath] : [];
  });
}

function resolveLocalRequire(fromFile, requiredPath) {
  const basePath = path.resolve(path.dirname(fromFile), requiredPath);
  const candidates = [
    basePath,
    `${basePath}.js`,
    path.join(basePath, 'index.js'),
  ];
  return candidates.find(candidate => fs.existsSync(candidate));
}

describe('API deployment contract', () => {
  test('preserves Vercel rewrites for all migrated API endpoints', () => {
    const vercelConfig = readJson('vercel.json');

    expect(vercelConfig.outputDirectory).toBe('build');
    expect(vercelConfig.rewrites).toEqual(
      expect.arrayContaining([
        { source: '/api/bootstrap', destination: '/api/bootstrap.js' },
        { source: '/api/admin/internal-users/pending', destination: '/api/admin.js?action=internal-users/pending' },
        { source: '/api/admin/operational-backup/download', destination: '/api/admin.js?action=operational-backup/download' },
        { source: '/api/admin/internal-users/approve', destination: '/api/admin.js?action=internal-users/approve' },
        { source: '/api/children/create', destination: '/api/children/create.js' },
        { source: '/api/children/update', destination: '/api/children/update.js' },
        { source: '/api/children/delete', destination: '/api/children/delete.js' },
        { source: '/api/records/upsert', destination: '/api/records/upsert.js' },
        { source: '/api/finance/create', destination: '/api/finance/[action].js?action=create' },
        { source: '/api/finance/list', destination: '/api/finance/[action].js?action=list' },
        { source: '/api/finance/upload-url', destination: '/api/finance/[action].js?action=upload-url' },
        { source: '/api/finance/file-url', destination: '/api/finance/[action].js?action=file-url' },
        { source: '/api/sync', destination: '/api/sync.js' },
        { source: '/api/intake/pre-cadastro', destination: '/api/intake/pre-cadastro.js' },
        { source: '/api/intake/triagem', destination: '/api/intake/triagem.js' },
        { source: '/api/intake/matricula', destination: '/api/intake/matricula.js' },
      ])
    );
  });

  test('copies API runtime, migrations, and operational scripts as one deployable unit', () => {
    [
      'api/bootstrap.js',
      'api/sync.js',
      'api/admin.js',
      'api/finance/[action].js',
      'api/intake/pre-cadastro.js',
      'api/intake/triagem.js',
      'api/intake/matricula.js',
      'lib/supabase.js',
      'lib/security.js',
      'lib/sync-supabase-service.js',
      'lib/finance-service.js',
      'db/migrations/0008_finance.sql',
      'scripts/export-operational-backup.js',
      'scripts/lib/operational-backup.js',
    ].forEach(relativePath => {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    });
  });

  test('all migrated API files resolve their local CommonJS dependencies', () => {
    const migratedFiles = [
      ...walkJsFiles(path.join(repoRoot, 'api')),
      ...walkJsFiles(path.join(repoRoot, 'lib')),
      ...walkJsFiles(path.join(repoRoot, 'scripts')),
    ];
    const missingRequires = [];
    const localRequirePattern = /require\(['"](\.{1,2}\/[^'"]+)['"]\)/g;

    expect(migratedFiles.map(file => path.relative(repoRoot, file))).toEqual(
      expect.arrayContaining([
        'api/bootstrap.js',
        'api/sync.js',
        'lib/security.js',
        'lib/supabase.js',
        'scripts/export-operational-backup.js',
      ])
    );

    migratedFiles.forEach(file => {
      const source = fs.readFileSync(file, 'utf8');
      let match = localRequirePattern.exec(source);

      while (match) {
        if (!resolveLocalRequire(file, match[1])) {
          missingRequires.push(`${path.relative(repoRoot, file)} -> ${match[1]}`);
        }
        match = localRequirePattern.exec(source);
      }
    });

    expect(missingRequires).toEqual([]);
  });
});
