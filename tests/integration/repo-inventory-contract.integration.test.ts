import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');
const workspaceYaml = read('pnpm-workspace.yaml');
const inventory = read('docs/REPO_INVENTORY.md');
const dependencyMap = read('docs/DEPENDENCY_MAP.md');
const packageReadme = read('packages/README.md');
const rootPackage = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>;
};
const apiPackage = JSON.parse(read('apps/api/package.json')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const workspacePaths = Array.from(
  workspaceYaml.matchAll(/^\s*-\s*['"]?([^'"\s]+)['"]?\s*$/gm),
  (match) => match[1]
);
const packagePaths = workspacePaths.filter((path) => path.startsWith('packages/'));
const appPaths = workspacePaths.filter((path) => path.startsWith('apps/'));
const packageRows = packagePaths.map((path) => {
  const manifest = JSON.parse(read(join(path, 'package.json'))) as { name: string };
  return { path: path.slice('packages/'.length), name: manifest.name };
});
const packagePathByName = new Map(packageRows.map((row) => [row.name, `packages/${row.path}`]));
const apiWorkspaceNames = new Set(
  Object.entries({ ...apiPackage.dependencies, ...apiPackage.devDependencies })
    .filter(([, version]) => version.startsWith('workspace:'))
    .map(([name]) => name)
);
const apiDeclaredRows = packageRows.filter((row) => apiWorkspaceNames.has(row.name));
const workspaceOnlyRows = packageRows.filter((row) => !apiWorkspaceNames.has(row.name));

const section = (heading: string): string => {
  const start = inventory.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `inventory section must exist: ${heading}`);
  const end = inventory.indexOf('\n## ', start + 1);
  return inventory.slice(start, end === -1 ? undefined : end);
};

const tableRows = (text: string): string[] =>
  Array.from(text.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm), (match) =>
    `${match[1]}\t${match[2]}`
  ).sort();

const packageRowsAsStrings = (rows: Array<{ path: string; name: string }>): string[] =>
  rows.map((row) => `${row.path}\t${row.name}`).sort();

test('inventory API-declared and workspace-only tables match current manifests', () => {
  const workspaceNames = new Set(packageRows.map((row) => row.name));
  assert.deepEqual([...apiWorkspaceNames].filter((name) => !workspaceNames.has(name)), []);
  assert.deepEqual(
    tableRows(section('API-DECLARED — workspace + direct API dependency')),
    packageRowsAsStrings(apiDeclaredRows)
  );
  assert.deepEqual(
    tableRows(section('WORKSPACE-ONLY — workspace member, no direct API dependency')),
    packageRowsAsStrings(workspaceOnlyRows)
  );
  assert.deepEqual(
    [...apiDeclaredRows, ...workspaceOnlyRows].map((row) => `${row.path}\t${row.name}`).sort(),
    packageRowsAsStrings(packageRows)
  );
});

test('inventory summary counts and app membership match workspace declarations', () => {
  const workspaceMemberCount = packagePaths.length + appPaths.length;
  assert.ok(
    inventory.includes(
      `| Workspace members | ${workspaceMemberCount} (${packagePaths.length} packages + ${appPaths.length} apps) |`
    )
  );
  assert.ok(inventory.includes(`| API-declared | ${apiDeclaredRows.length} packages |`));
  assert.ok(inventory.includes(`| Workspace-only | ${workspaceOnlyRows.length} packages |`));
  assert.deepEqual(appPaths.sort(), ['apps/api', 'apps/web']);
  assert.match(inventory, /The workspace also includes the `apps\/api` and `apps\/web` applications\./);
});

test('source-only examples do not misclassify current workspace packages', () => {
  const sourceOnlyExamples =
    section('SOURCE-ONLY / STUB — on disk, off workspace').split('\n\n')[1] ?? '';
  assert.match(sourceOnlyExamples, /examples, not an exhaustive package list/);
  for (const row of packageRows) {
    assert.ok(
      !sourceOnlyExamples.includes(`\`${row.path}\``),
      `workspace package ${row.path} must not appear in source-only examples`
    );
  }
});

test('packages README registry matches current workspace package manifests', () => {
  const heading = '## Workspace package registry';
  const start = packageReadme.indexOf(heading);
  assert.notEqual(start, -1, 'packages README registry section must exist');
  const end = packageReadme.indexOf('\n## ', start + heading.length);
  const registry = packageReadme.slice(start, end === -1 ? undefined : end);
  const registryRows = tableRows(registry).map((row) => {
    const [path, name] = row.split('\t');
    return `${path.slice('packages/'.length)}\t${name}`;
  });
  assert.deepEqual(registryRows, packageRowsAsStrings(packageRows));
});

test('dependency map graph matches current workspace manifests', () => {
  const manifests = workspacePaths.map((path) => ({
    path,
    manifest: JSON.parse(read(join(path, 'package.json'))) as {
      name: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    },
  }));
  const expectedRows = manifests
    .map(({ path, manifest }) => {
      const dependencies = Object.entries({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.optionalDependencies,
      })
        .filter(([, version]) => version.startsWith('workspace:'))
        .map(([name]) => packagePathByName.get(name) ?? `UNMAPPED:${name}`)
        .sort();
      const dependencyCell = dependencies.length
        ? dependencies.map((dependency) => `\`${dependency}\``).join(', ')
        : '—';
      return `${path}\t${manifest.name}\t${dependencyCell}`;
    })
    .sort();

  const heading = '## Manifest-declared workspace graph';
  const start = dependencyMap.indexOf(heading);
  assert.notEqual(start, -1, 'dependency map graph section must exist');
  const end = dependencyMap.indexOf('\n## ', start + heading.length);
  const graph = dependencyMap.slice(start, end === -1 ? undefined : end);
  const actualRows = Array.from(
    graph.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|$/gm),
    (match) => `${match[1]}\t${match[2]}\t${match[3]}`
  ).sort();
  assert.deepEqual(actualRows, expectedRows);
});

test('inventory contract is part of both explicit root test suites', () => {
  const testPath = './tests/integration/repo-inventory-contract.integration.test.ts';
  for (const script of ['test', 'test:e2e']) {
    assert.ok(rootPackage.scripts[script]?.includes(testPath), `${script} must run ${testPath}`);
  }
});
