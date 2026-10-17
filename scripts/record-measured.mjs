#!/usr/bin/env node
/**
 * Records real responses from a running ClaimGuard Pay deployment into public/measured-live.json.
 *
 *   node scripts/record-measured.mjs [baseUrl]
 *   PAYEE_EMAIL=sb-xxxx@business.example.com node scripts/record-measured.mjs https://claimguard-pay.vercel.app
 *
 * Nothing is invented: every value is copied from the HTTP response or measured on this machine.
 * Failures (PayPal errors, missing AI output) are recorded as they happened, not hidden.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = (process.argv[2] || 'https://claimguard-pay.vercel.app').replace(/\/$/, '');
const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'measured-live.json');

const TEST_NIN = '10000000001'; // synthetic 11-digit number, not a real person's NIN
const PAYEE_EMAIL = process.env.PAYEE_EMAIL || 'sandbox-payee@example.com'; // ignored server-side if PAYPAL_PAYEE_EMAIL is set

const scenarios = [
  {
    name: 'legit_approved',
    expect: 'APPROVED',
    payload: {
      nin: TEST_NIN,
      nhiaId: 'NHIA-789012',
      procedure: 'Malaria',
      amount: 80,
      patientExists: true,
      clinicalNotes:
        'Adult presented with 3 days of fever, chills and headache. Rapid malaria test positive. Treated as an outpatient with a standard antimalarial course.',
    },
  },
  {
    name: 'ai_notes_mismatch',
    expect: 'REVIEW (only if the AI audit flags the notes)',
    payload: {
      nin: TEST_NIN,
      nhiaId: 'NHIA-440271',
      procedure: 'Malaria',
      amount: 85,
      patientExists: true,
      clinicalNotes:
        'Routine wellness check-up. No fever and no symptoms reported. Blood pressure normal. Advised on diet and exercise.',
    },
  },
  {
    name: 'ghost_enrollee_blocked',
    expect: 'FROZEN',
    payload: { nin: '', nhiaId: 'NHIA-999888', procedure: 'Malaria', amount: 90, patientExists: false },
  },
  {
    name: 'upcoding_blocked',
    expect: 'FROZEN',
    payload: { nin: TEST_NIN, nhiaId: 'NHIA-001452', procedure: 'Normal Delivery', amount: 500, patientExists: true },
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const takes = [];

for (const [i, s] of scenarios.entries()) {
  const started = performance.now();
  let status = null;
  let body = null;
  let networkError = null;
  try {
    const res = await fetch(`${baseUrl}/api/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s.payload, hospitalEmail: PAYEE_EMAIL }),
    });
    status = res.status;
    body = await res.json().catch(() => null);
  } catch (e) {
    networkError = e instanceof Error ? e.message : String(e);
  }
  const roundtrip = Math.round(performance.now() - started);

  takes.push({
    take: i + 1,
    scenario: s.name,
    expected: s.expect,
    recorded_at: new Date().toISOString(),
    input: { ...s.payload, hospitalEmail: 'redacted' },
    http_status: status,
    client_roundtrip_ms: roundtrip,
    network_error: networkError,
    response: body && {
      decision: body.decision,
      flags: body.fraud?.flags,
      riskScore: body.fraud?.riskScore,
      fraud_decision_ms: body.fraud_decision_ms,
      execution_time_ms: body.execution_time_ms,
      ai: body.ai ?? null,
      ai_audit: body.ai_audit ?? null,
      ai_error: body.ai_error ?? null,
      paypal: body.paypal ?? null,
      paypal_error: body.paypal_error ?? null,
      error: body.error ?? null,
    },
  });
  console.log(`${i + 1}. ${s.name}: HTTP ${status ?? 'n/a'} ${body?.decision ?? ''} in ${roundtrip} ms`);
  await sleep(1000);
}

const out = {
  recorded_at: new Date().toISOString(),
  base_url: baseUrl,
  note: 'Raw results of real requests to the deployed API. Failures are recorded, not hidden.',
  takes,
};
await writeFile(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`\nWrote ${outPath}`);

const approved = takes.find((t) => t.scenario === 'legit_approved');
if (!approved?.response?.paypal?.order_id) {
  console.warn('WARNING: the approved claim has no PayPal order_id. Check paypal_error in the file before submitting.');
}
