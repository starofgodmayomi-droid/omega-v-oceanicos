import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/verify.yml', import.meta.url), 'utf8');

test('GHCR publication requires explicit manual authorization on main', () => {
  assert.match(workflow, /workflow_dispatch:\n\s+inputs:\n\s+publish_image:/);
  assert.match(workflow, /publish_image:\n\s+description:.*\n\s+required: true\n\s+default: false\n\s+type: boolean/);
  assert.match(
    workflow,
    /if: >-\n\s+github\.event_name == 'workflow_dispatch' &&\n\s+github\.ref == 'refs\/heads\/main' &&\n\s+inputs\.publish_image == true/,
  );
  assert.doesNotMatch(workflow, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
});
