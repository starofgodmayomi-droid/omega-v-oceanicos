import test from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:5000';

test('🌐 Universal Real-World Tools & Actuation Integration Suite', async (t) => {
  await t.test('GET /v1/tools/list returns categorized real-world tools with online status', async () => {
    const res = await fetch(`${API_BASE}/v1/tools/list`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.contract, 'Ω∞v-UNIVERSAL-REAL-WORLD-TOOL-REGISTRY-V3');
    assert.ok(data.count >= 20);
    assert.ok(Array.isArray(data.tools));
    const iotTool = data.tools.find((tool: any) => tool.id === 'iot-device-status');
    assert.ok(iotTool);
    assert.equal(iotTool.category, 'physical-iot');
    assert.equal(iotTool.status, 'ONLINE');
  });

  await t.test('POST /v1/tools/execute [iot-device-status] reads real-world sensor telemetry', async () => {
    const res = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: 'iot-device-status' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.toolId, 'iot-device-status');
    assert.equal(data.output.sensorHub, 'Ω∞v-IOT-NEXUS-01');
    assert.equal(data.output.status, 'ONLINE');
    assert.ok(data.output.ambientTemperatureC > 0);
    assert.ok(Array.isArray(data.output.relays));
    assert.ok(data.evidenceHash);
    assert.ok(data.kaiRecordId);
  });

  await t.test('POST /v1/tools/execute [iot-relay-actuate] enforces fail-closed HITL guardrail', async () => {
    // 1. Without human approval -> 403 Forbidden
    const unapprovedRes = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'iot-relay-actuate',
        params: { relayId: 'relay-1', state: 'TOGGLE' },
      }),
    });
    assert.equal(unapprovedRes.status, 403);
    const unapprovedData = await unapprovedRes.json();
    assert.equal(unapprovedData.error, 'HITL_AUTHORIZATION_REQUIRED');
    assert.equal(unapprovedData.requiresConfirmation, true);

    // 2. With human approval -> 200 Success
    const approvedRes = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'iot-relay-actuate',
        params: { relayId: 'relay-1', state: 'TOGGLE', approved: true },
      }),
    });
    assert.equal(approvedRes.status, 200);
    const approvedData = await approvedRes.json();
    assert.equal(approvedData.success, true);
    assert.equal(approvedData.output.result, 'ACTUATED_SUCCESSFULLY');
    assert.ok(approvedData.output.handshakeToken);
    assert.ok(approvedData.kaiRecordId);
  });

  await t.test('POST /v1/tools/execute [crypto-transfer] distinguishes preparation from actuation', async () => {
    // Read-only preparation executes instantly
    const prepRes = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'crypto-transfer-prepare',
        params: { amountBtc: 0.05, destination: 'bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp' },
      }),
    });
    assert.equal(prepRes.status, 200);
    const prepData = await prepRes.json();
    assert.equal(prepData.success, true);
    assert.equal(prepData.output.status, 'UNLOCKED_PREPARATION_ONLY');

    // Broadcast execution without approval fails closed
    const unapprovedExec = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'crypto-transfer-execute',
        params: { amountBtc: 0.05 },
      }),
    });
    assert.equal(unapprovedExec.status, 403);

    // Broadcast execution with approval succeeds
    const approvedExec = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'crypto-transfer-execute',
        params: { amountBtc: 0.05, approved: true },
      }),
    });
    assert.equal(approvedExec.status, 200);
    const execData = await approvedExec.json();
    assert.equal(execData.success, true);
    assert.equal(execData.output.status, 'TRANSACTION_BROADCAST_AUTHORIZED');
  });

  await t.test('POST /v1/tools/execute [fs-list & fs-read] operates safely within workspace', async () => {
    // fs-list
    const listRes = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: 'fs-list', params: { path: 'packages' } }),
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.success, true);
    assert.ok(listData.output.totalEntries > 0);

    // fs-read
    const readRes = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: 'fs-read', params: { filePath: 'package.json', maxLines: 10 } }),
    });
    assert.equal(readRes.status, 200);
    const readData = await readRes.json();
    assert.equal(readData.success, true);
    assert.ok(readData.output.snippet.includes('name'));

    // Path traversal block
    const badRead = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: 'fs-read', params: { filePath: '../../../../Windows/System32' } }),
    });
    assert.equal(badRead.status, 500);
    const badData = await badRead.json();
    assert.equal(badData.success, false);
  });

  await t.test('POST /v1/tools/execute [browser-navigate] navigates real-world URLs in sandbox', async () => {
    const res = await fetch(`${API_BASE}/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'browser-navigate',
        params: { url: 'https://example.com' },
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.output.title, 'Example Domain');
    assert.equal(data.output.browserSuccess, true);
    assert.ok(data.output.evidenceHash);
  });
});
