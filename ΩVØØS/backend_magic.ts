import { pathToFileURL } from 'node:url';
export * from '../packages/ovoos/src/index.ts';
import { runEntity } from '../packages/ovoos/src/index.ts';

function isDirectRun(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectRun()) {
  const intent = process.argv[2] ?? '';
  const phaseT = Number(process.argv[3] ?? '0');
  process.stdout.write(`${JSON.stringify(runEntity({ intent, phaseT: Number.isFinite(phaseT) ? phaseT : 0 }).receipt)}\n`);
}
