import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');
const workspaceYaml = read('pnpm-workspace.yaml');
const inventory = read('docs/REPO_INVENTORY.md');
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

test('inventory contract is part of both explicit root test suites', () => {
  const testPath = './tests/integration/repo-inventory-contract.integration.test.ts';
  for (const script of ['test', 'test:e2e']) {
    assert.ok(rootPackage.scripts[script]?.includes(testPath), `${script} must run ${testPath}`);
  }
});

test('repository operating contract preserves evidence and execution boundaries', () => {
  const contract = read('docs/REPOSITORY_OPERATING_CONTRACT.md');
  for (const requiredPhrase of [
    'INTENT → DISTINGUISH → MAP → EVIDENCE → VERIFY',
    'AUTHORIZE → BOUND → EXECUTE → OBSERVE',
    'RECONCILE → ATTEST → REMEMBER → NEXT FINITE Δ',
    'UNKNOWN',
    'DIVERGENT',
    'NOT_EXECUTED',
    'MODEL_ONLY',
    'CI run does not waive review',
    'exact candidate head',
    'Definition of done for one finite change',
  ]) {
    assert.ok(contract.includes(requiredPhrase), `operating contract must preserve: ${requiredPhrase}`);
  }
  assert.match(contract, /Admission is not execution/);
  assert.match(contract, /production health are not claimed without their own evidence/);
});
