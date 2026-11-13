#!/usr/bin/env node
/**
 * Fail closed unless a compression report is a verified fold that did not
 * execute its upgrade. This is a local observation of a JSON report, not
 * permission to merge, deploy, or change the repository.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Declared full-stack current. Kept here so CI does not trust the kernel list alone. */
export const WATER_PATHS = Object.freeze([
  'skills/oceanicos-full-stack-companion/SKILL.md',
  'skills/oceanicos-total-continuum/SKILL.md',
  'skills/oceanicos-verified-upgrade/SKILL.md',
  'skills/oceanicos-full-stack/SKILL.md',
  'skills/oceanicos-max-space-full-stack/SKILL.md',
  'skills/lucid-full-stack/SKILL.md',
  'skills/omega-global-good-fullstack/SKILL.md',
  'skills/full-stack-computer-mode/SKILL.md',
]);

const HEX = /^[0-9a-f]{64}$/;

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {unknown} report
 * @returns {string[]}
 */
export function assertWaterReport(report) {
  const failures = [];
  if (!isRecord(report)) return ['water report is not an object'];
  if (report.current !== 'FULL_STACK_WATER') failures.push(`current=${String(report.current)}`);
  if (report.status !== 'COMPRESSED') failures.push(`status=${String(report.status)}`);
  if (report.skills !== WATER_PATHS.length) failures.push(`skills=${String(report.skills)}`);
  if (report.halt !== null) failures.push('halt is set');
  if (typeof report.digest !== 'string' || !HEX.test(report.digest)) failures.push('digest is not 64 hex');
  const upgrade = isRecord(report.upgrade) ? report.upgrade : null;
  if (!upgrade || upgrade.execution !== 'NOT_EXECUTED') {
    failures.push(`upgrade.execution=${String(upgrade?.execution)}`);
  }
  if (!upgrade || upgrade.authority !== 'compression-is-not-permission') {
    failures.push('upgrade.authority is not compression-is-not-permission');
  }
  const selected = upgrade && isRecord(upgrade.selected) ? upgrade.selected : null;
  if (!selected || selected.kind !== 'review-verified-repo') failures.push('upgrade.selected.kind is not review-verified-repo');
  if (!selected || selected.evidenceHash !== report.digest) failures.push('upgrade.selected.evidenceHash is not the fold digest');
  if (!Array.isArray(report.flow) || report.flow.length !== WATER_PATHS.length) {
    failures.push('flow length is not the water current');
  } else {
    report.flow.forEach((entry, index) => {
      const path = isRecord(entry) ? entry.path : undefined;
      if (path !== WATER_PATHS[index]) failures.push(`flow[${index}]=${String(path)}`);
    });
  }
  return failures;
}

/**
 * @param {unknown} report
 * @returns {string[]}
 */
export function assertRepoReport(report) {
  const failures = [];
  if (!isRecord(report)) return ['repo report is not an object'];
  if (report.status !== 'COMPRESSED') failures.push(`status=${String(report.status)}`);
  if (report.reconciliation !== 'VERIFIED') failures.push(`reconciliation=${String(report.reconciliation)}`);
  if (typeof report.ring !== 'number' || report.remembered !== report.ring) {
    failures.push(`remembered=${String(report.remembered)}, ring=${String(report.ring)}`);
  }
  if (typeof report.ring === 'number' && report.ring < WATER_PATHS.length) {
    failures.push('ring is smaller than the water current');
  }
  if (typeof report.digest !== 'string' || !HEX.test(report.digest)) failures.push('digest is not 64 hex');
  const upgrade = isRecord(report.upgrade) ? report.upgrade : null;
  if (!upgrade || upgrade.execution !== 'NOT_EXECUTED') {
    failures.push(`upgrade.execution=${String(upgrade?.execution)}`);
  }
  if (!upgrade || upgrade.authority !== 'compression-is-not-permission') {
    failures.push('upgrade.authority is not compression-is-not-permission');
  }
  const selected = upgrade && isRecord(upgrade.selected) ? upgrade.selected : null;
  if (!selected || selected.kind !== 'review-verified-repo') failures.push('upgrade.selected.kind is not review-verified-repo');
  if (!selected || selected.evidenceHash !== report.digest) failures.push('upgrade.selected.evidenceHash is not the fold digest');
  const paths = new Set(
    Array.isArray(report.outward)
      ? report.outward.filter(isRecord).map((entry) => entry.path)
      : [],
  );
  for (const path of WATER_PATHS) {
    if (!paths.has(path)) failures.push(`outward ring is missing ${path}`);
  }
  return failures;
}

const runCli = () => {
  const [mode, file] = process.argv.slice(2);
  const check = mode === 'water' ? assertWaterReport : mode === 'repo' ? assertRepoReport : null;
  if (!check || !file) {
    process.stderr.write('usage: node scripts/assert-compression-boundary.mjs <water|repo> <report.json>\n');
    process.exit(1);
  }
  let report;
  try {
    report = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    process.stderr.write(`compression report could not be read: ${error instanceof Error ? error.message : 'unknown'}\n`);
    process.exit(1);
  }
  const failures = check(report);
  if (failures.length > 0) {
    process.stderr.write(`compression boundary failed (${mode}): ${failures.join('; ')}\n`);
    process.exit(1);
  }
  const count = mode === 'water' ? report.skills : report.remembered;
  process.stdout.write(
    `${mode} compression observed: ${count} surfaces; upgrade.execution=NOT_EXECUTED.\n`,
  );
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) runCli();
