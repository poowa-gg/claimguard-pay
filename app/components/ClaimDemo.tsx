'use client';

import { useState, useCallback } from 'react';
import { FRAUD_RULE_COUNT } from '@/lib/fraud-rules';

/* ── types ── */
interface ClaimPayload {
  nin: string;
  nhiaId: string;
  procedure: string;
  amount: number;
  hospitalEmail: string;
  patientExists: boolean;
  clinicalNotes: string;
}

interface AuditCheck {
  id: string;
  name: string;
  vector: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

interface ScenarioClassification {
  id: string;
  title: string;
  category: string;
  badgeType: 'APPROVED' | 'FROZEN' | 'REVIEW';
  summary: string;
  explanation: string;
}

interface ApiResult {
  decision: 'APPROVED' | 'FROZEN' | 'REVIEW';
  fraud: {
    flags: string[];
    riskScore: number;
    tariff: number;
    reason: string;
    scenario?: ScenarioClassification;
    checks?: AuditCheck[];
  };
  ai?: {
    text: string;
    model: string;
  } | null;
  ai_audit?: {
    supports_claim: boolean;
    confidence: 'high' | 'medium' | 'low';
    concerns: string[];
    model: string;
    escalated: boolean;
  } | null;
  paypal: {
    amount_usd?: number;
    order_id: string;
    order_status?: string;
    payout_batch_id: string;
    payout_status?: string;
    debug_id: string | null;
    payout_debug_id?: string | null;
  } | null;
  paypal_error?: {
    message: string;
    debug_id: string | null;
  };
  fraud_decision_ms?: number;
  execution_time_ms: number;
  message?: string;
}

/* ── sample clinical records (NO spoiler scenario labels!) ── */
const SAMPLE_RECORDS = [
  {
    id: 'sample-abuja',
    label: 'Abuja Hospital',
    subtitle: 'Malaria Treatment ($80)',
    data: {
      nin: '10000000001', // synthetic test NIN, not a real person
      nhiaId: 'NHIA-789012',
      procedure: 'Malaria',
      amount: 80,
      hospitalEmail: 'hospital@abuja.ng',
      patientExists: true,
      clinicalNotes:
        'Adult presented with 3 days of fever, chills and headache. Rapid malaria test positive. Treated as an outpatient with a standard antimalarial course.',
    },
  },
  {
    id: 'sample-lagos',
    label: 'Lagos Maternity',
    subtitle: 'Normal Delivery ($500)',
    data: {
      nin: '10000000001',
      nhiaId: 'NHIA-001452',
      procedure: 'Normal Delivery',
      amount: 500,
      hospitalEmail: 'claims@lagosmaternity.ng',
      patientExists: true,
      clinicalNotes:
        'Uncomplicated vaginal delivery at term. Mother and baby stable, discharged the same day.',
    },
  },
  {
    id: 'sample-kano',
    label: 'Kano Specialist',
    subtitle: 'C-Section ($650)',
    data: {
      nin: '23456789012',
      nhiaId: 'NHIA-555231',
      procedure: 'C-Section',
      amount: 650,
      hospitalEmail: 'finance@kanosurgical.ng',
      patientExists: true,
      clinicalNotes:
        'Emergency caesarean section for obstructed labour. Three nights of inpatient recovery.',
    },
  },
  {
    id: 'sample-ph',
    label: 'Port Harcourt Clinic',
    subtitle: 'Outpatient (Unregistered)',
    data: {
      nin: '',
      nhiaId: 'NHIA-999888',
      procedure: 'Malaria',
      amount: 90,
      hospitalEmail: 'accounts@ph-clinic.ng',
      patientExists: false,
      clinicalNotes: 'Outpatient visit for fever, treated for malaria.',
    },
  },
  {
    id: 'sample-ibadan',
    label: 'Ibadan Clinic',
    subtitle: 'Malaria Treatment ($85)',
    data: {
      nin: '52019873640',
      nhiaId: 'NHIA-440271',
      procedure: 'Malaria',
      amount: 85,
      hospitalEmail: 'billing@ibadanclinic.ng',
      patientExists: true,
      clinicalNotes:
        'Routine wellness check-up. No fever and no symptoms reported. Blood pressure normal. Advised on diet and exercise.',
    },
  },
];

const TARIFF_REFERENCE: Record<string, { base: number; cap: number; note: string }> = {
  Malaria: { base: 90, cap: 135, note: 'Outpatient malaria protocol' },
  'Normal Delivery': { base: 150, cap: 225, note: 'Standard uncomplicated delivery' },
  'C-Section': { base: 450, cap: 500, note: 'Statutory maternal surgical cap: $500' },
  Consultation: { base: 20, cap: 30, note: 'General outpatient visit' },
};

/* ── Risk Gauge SVG ── */
function RiskGauge({ score }: { score: number }) {
  const R = 70;
  const cx = 90, cy = 90;
  const circumference = 2 * Math.PI * R;
  const arc = circumference * 0.75; // 270° arc
  const offset = arc - (arc * Math.min(score, 100)) / 100;
  const color = score >= 75 ? '#ff4d6d' : score >= 40 ? '#ffbe0b' : '#00d084';

  return (
    <div className="gauge-wrap">
      <svg width="180" height="160" viewBox="0 0 180 160" className="gauge-svg">
        <circle
          className="gauge-track"
          cx={cx} cy={cy} r={R}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={0}
          transform={`rotate(135 ${cx} ${cy})`}
        />
        <circle
          className="gauge-fill"
          cx={cx} cy={cy} r={R}
          stroke={color}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={offset}
          transform={`rotate(135 ${cx} ${cy})`}
        />
        <text className="gauge-score" x={cx} y={cy - 6} fill={color}>{score}</text>
        <text className="gauge-label" x={cx} y={cy + 18} fill="#8892b0">RISK SCORE</text>
      </svg>
    </div>
  );
}

/* ── Flag chip ── */
function FlagChip({ flag }: { flag: string }) {
  const critical = ['GHOST_ENROLLEE', 'MISSING_NIN', 'INVALID_NIN_FORMAT', 'FALSIFIED_CSECTION'];
  const cls = critical.includes(flag) ? 'flag-chip flag-red' : 'flag-chip flag-yellow';
  return <span className={cls}>⚠ {flag.replace(/_/g, '_\u200B')}</span>;
}

/* ── PayPal logo inline ── */
function PPLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7.076 21.337H4.72c-.41 0-.745-.25-.825-.617l-2.85-18.1A.521.521 0 0 1 1.5 2h5.27c2.807 0 5.2 1.074 5.993 4.065.54 2.04-.147 3.98-1.71 5.218 1.218.887 1.883 2.3 1.69 3.97-.372 3.2-2.77 6.084-5.667 6.084zm.44-13.6c-.352 1.321-1.397 1.983-2.808 1.983H3.65l.81-5.14h1.058c1.41 0 2.296.635 2.296 1.904 0 .405-.075.816-.3 1.253zm.5 7.283c-.38 1.413-1.52 2.123-3.034 2.123H3.3l.875-5.566h1.683c1.514 0 2.444.68 2.444 1.99 0 .49-.1.97-.287 1.453z" fill="#009cde"/>
      <path d="M21.07 7.565c-.94 4.384-3.88 6.87-8.03 6.87h-1.61l-1.27 8.07c-.07.42-.44.73-.87.73H6.85c-.41 0-.72-.33-.67-.73l2.85-18.1c.07-.44.45-.74.88-.74h6.2c3.34 0 5.56 1.59 5.56 4.71 0 .4-.05.8-.13 1.19h-.47z" fill="#003087"/>
    </svg>
  );
}

/* ── Main Demo Component ── */
export default function ClaimDemo() {
  const [activeSample, setActiveSample] = useState<string | null>('sample-abuja');
  const [form, setForm] = useState<ClaimPayload>({
    nin: '10000000001', // synthetic test NIN
    nhiaId: 'NHIA-789012',
    procedure: 'Malaria',
    amount: 80,
    hospitalEmail: 'hospital@abuja.ng',
    patientExists: true,
    clinicalNotes: SAMPLE_RECORDS[0].data.clinicalNotes,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  // Live NIN validation check (Nigeria NIMC standard: 11 numeric digits)
  const cleanNin = form.nin.replace(/[\s-]/g, '');
  const isNinClean11 = /^\d{11}$/.test(cleanNin);
  const ninLength = cleanNin.length;

  const currentTariff = TARIFF_REFERENCE[form.procedure] || { base: 90, cap: 135, note: '' };
  const isAmountOverCap = form.amount > currentTariff.cap;

  const applySample = useCallback((sample: typeof SAMPLE_RECORDS[0]) => {
    setActiveSample(sample.id);
    setForm(sample.data);
    setResult(null);
  }, []);

  const clearForm = useCallback(() => {
    setActiveSample(null);
    setForm({
      nin: '',
      nhiaId: '',
      procedure: 'Malaria',
      amount: 90,
      hospitalEmail: '',
      patientExists: true,
      clinicalNotes: '',
    });
    setResult(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      // A 502 with paypal_error still carries a full fraud result, so only bail when it is missing.
      if (!data || !data.fraud) {
        throw new Error(data?.error || 'Failed to process claim');
      }
      setResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connection error';
      setResult({
        decision: 'FROZEN',
        fraud: {
          flags: ['API_ERROR'],
          riskScore: 100,
          tariff: 0,
          reason: msg,
          scenario: {
            id: 'SCENARIO_API_ERROR',
            title: 'Connection Error',
            category: 'REVIEW_REQUIRED',
            badgeType: 'FROZEN',
            summary: msg,
            explanation: 'Unable to contact verification service.',
          },
          checks: [],
        },
        paypal: null,
        execution_time_ms: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [form]);

  const decisionClass = result
    ? result.decision === 'APPROVED' ? 'badge-approved'
    : result.decision === 'FROZEN' ? 'badge-frozen'
    : 'badge-review'
    : '';

  const decisionIcon = result?.decision === 'APPROVED' ? '✅' : result?.decision === 'FROZEN' ? '🔴' : '🟡';

  return (
    <div className="demo-grid">
      {/* ── LEFT: CLAIM SUBMISSION FORM ── */}
      <div className="card">
        <div className="card-title">Submit &amp; Adjudicate Claim</div>
        <div className="card-sub">
          Input claim details manually or load a sample record. The engine will evaluate all fraud vectors and determine spend-authority.
        </div>

        {/* Sample Patient Records Toolbar */}
        <div className="sample-bar">
          <div className="sample-bar-header">
            <span>Quick-Load Patient Records</span>
            <span>(Input details to reveal resultant scenario)</span>
          </div>
          <div className="sample-bar-chips">
            {SAMPLE_RECORDS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`sample-chip ${activeSample === s.id ? 'active' : ''}`}
                onClick={() => applySample(s)}
                title={`${s.label}: ${s.subtitle}`}
              >
                <span>🏥 {s.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="sample-chip sample-chip-clear"
              onClick={clearForm}
              title="Clear fields and type custom claim"
            >
              <span>✍️ Custom / Clear</span>
            </button>
          </div>
        </div>

        {/* Claim Input Fields */}
        <div className="form-grid">
          {/* Patient NIN Field */}
          <div className="form-group full">
            <label className="form-label">
              Patient NIN (Nigeria National ID — NIMC)
            </label>
            <input
              className="form-input"
              placeholder="e.g. 10000000001 (11 digits)"
              value={form.nin}
              maxLength={14}
              onChange={e => {
                setActiveSample(null);
                setForm(f => ({ ...f, nin: e.target.value }));
              }}
            />
            <div className="field-hint-row">
              {isNinClean11 ? (
                <span className="hint-badge-valid">
                  ✓ Valid 11-digit NIMC standard (Nigeria)
                </span>
              ) : ninLength > 0 ? (
                <span className="hint-badge-invalid">
                  ⚠ Nigeria NIMC requires strictly 11 digits ({ninLength}/11)
                </span>
              ) : (
                <span className="hint-badge-neutral">
                  Mandatory 11-digit NIMC identification number
                </span>
              )}
            </div>
          </div>

          {/* NHIA Enrollee ID Field */}
          <div className="form-group">
            <label className="form-label">NHIA Enrollee ID</label>
            <input
              className="form-input"
              placeholder="e.g. NHIA-789012"
              value={form.nhiaId}
              onChange={e => {
                setActiveSample(null);
                setForm(f => ({ ...f, nhiaId: e.target.value }));
              }}
            />
            <div className="field-hint-row">
              <span className="hint-badge-neutral">
                Official NHIA / HMO registration syntax
              </span>
            </div>
          </div>

          {/* Medical Procedure Selection */}
          <div className="form-group">
            <label className="form-label">Medical Procedure</label>
            <select
              className="form-select"
              value={form.procedure}
              onChange={e => {
                setActiveSample(null);
                setForm(f => ({ ...f, procedure: e.target.value }));
              }}
            >
              <option value="Malaria">Malaria Treatment</option>
              <option value="Normal Delivery">Normal Delivery</option>
              <option value="C-Section">Caesarean Section (C-Section)</option>
              <option value="Consultation">General Consultation</option>
            </select>
            <div className="field-hint-row">
              <span className="hint-badge-neutral">
                Statutory Base Tariff: ${currentTariff.base.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Claimed Amount Field */}
          <div className="form-group">
            <label className="form-label">Claimed Amount ($ USD)</label>
            <input
              className="form-input"
              type="number"
              placeholder="e.g. 80"
              value={form.amount}
              onChange={e => {
                setActiveSample(null);
                setForm(f => ({ ...f, amount: Number(e.target.value) }));
              }}
            />
            <div className="field-hint-row">
              {isAmountOverCap ? (
                <span className="hint-badge-invalid">
                  ⚠ Exceeds statutory cap (${currentTariff.cap.toLocaleString()})
                </span>
              ) : (
                <span className="hint-badge-valid">
                  ✓ Within permissible 1.5× tariff limit
                </span>
              )}
            </div>
          </div>

          {/* Hospital Email Field */}
          <div className="form-group">
            <label className="form-label">Hospital PayPal / Payout Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="hospital@abuja.ng"
              value={form.hospitalEmail}
              onChange={e => {
                setActiveSample(null);
                setForm(f => ({ ...f, hospitalEmail: e.target.value }));
              }}
            />
            <div className="field-hint-row">
              <span className="hint-badge-neutral">
                Direct PayPal recipient for instant disbursement
              </span>
            </div>
          </div>

          {/* Clinical Notes (optional, audited by AI) */}
          <div className="form-group full">
            <label className="form-label">Clinical notes (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              maxLength={1500}
              placeholder="e.g. 3 days of fever and chills, rapid malaria test positive, treated as an outpatient."
              value={form.clinicalNotes}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              onChange={e => {
                setActiveSample(null);
                setForm(f => ({ ...f, clinicalNotes: e.target.value }));
              }}
            />
            <div className="field-hint-row">
              <span className="hint-badge-neutral">
                AI audit: notes that contradict an approved claim escalate it to review. The AI can never approve or unfreeze a claim.
              </span>
            </div>
          </div>

          {/* Registry Verification Toggle */}
          <div className="form-group full">
            <label className="form-check">
              <input
                type="checkbox"
                checked={form.patientExists}
                onChange={e => {
                  setActiveSample(null);
                  setForm(f => ({ ...f, patientExists: e.target.checked }));
                }}
              />
              <span>
                <strong>Patient actively confirmed in NHIA Central Registry</strong>
                <br />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  (Uncheck this to test a Ghost Enrollee scenario where the enrollee is unverified or expelled)
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner" /> Auditing Claim &amp; Evaluating Vectors...
            </>
          ) : (
            <>
              <PPLogo /> Run Fraud Check + PayPal
            </>
          )}
        </button>
      </div>

      {/* ── RIGHT: ADJUDICATION RESULTS & SCENARIO AUDIT ── */}
      <div className="card">
        {!result && !loading && (
          <div className="result-idle">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
              <path d="M20 32h24M32 20v24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
              Ready for Claim Adjudication
            </span>
            <span style={{ maxWidth: 360, fontSize: 13, color: 'var(--text-secondary)' }}>
              Enter claim figures on the left and click <strong>&quot;Run Fraud Check + PayPal&quot;</strong>.
              The engine evaluates {FRAUD_RULE_COUNT} fraud rules, diagnoses the resultant scenario, and controls PayPal spend-authority.
            </span>
          </div>
        )}

        {loading && (
          <div className="result-idle">
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
              Auditing Threat Vectors...
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Cross-referencing Nigeria NIMC NIN format, NHIA tariffs, and fraud signals in real time.
            </span>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Adjudication Decision Badge */}
            <div className={`decision-badge ${decisionClass}`}>
              {decisionIcon} {result.decision}
              {result.decision === 'FROZEN' && ' — Payment Blocked (Fraud Detected)'}
              {result.decision === 'APPROVED' && result.paypal && ' — order created, payout submitted (PayPal Sandbox)'}
              {result.decision === 'APPROVED' && !result.paypal && ' — PayPal Call Failed'}
              {result.decision === 'REVIEW' && ' — Secondary Review Required'}
            </div>

            {/* 1. Resultant Scenario Card (Revealed after running) */}
            {result.fraud.scenario && (
              <div className={`scenario-card ${result.fraud.scenario.badgeType.toLowerCase()}`}>
                <div className="scenario-header">
                  <span className="scenario-eyebrow">Resultant Scenario Identified</span>
                  <span className={`scenario-badge ${result.fraud.scenario.badgeType.toLowerCase()}`}>
                    {result.fraud.scenario.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="scenario-title">
                  {result.fraud.scenario.title}
                </div>
                <div className="scenario-summary">
                  {result.fraud.scenario.summary}
                </div>
                <div className="scenario-explanation">
                  {result.fraud.scenario.explanation}
                </div>
              </div>
            )}

            {/* 2. Multi-Vector Scenario Audit Matrix (Showing ALL Scenarios Evaluated) */}
            <div className="audit-matrix">
              <div className="audit-matrix-header">
                Multi-Vector Threat Audit Matrix (All Evaluated Scenarios)
              </div>
              {result.fraud.checks && result.fraud.checks.length > 0 ? (
                result.fraud.checks.map(check => (
                  <div key={check.id} className="audit-row">
                    <div className="audit-row-left">
                      <span className="audit-row-icon">
                        {check.id === 'check-nin' ? '🪪' :
                         check.id === 'check-enrollee' ? '👤' :
                         check.id === 'check-nhia-id' ? '🏥' :
                         check.id === 'check-upcoding' ? '📈' :
                         check.id === 'check-csection' ? '✂️' :
                         check.id === 'check-ai-narrative' ? '🧠' : '💰'}
                      </span>
                      <div className="audit-row-text">
                        <div className="audit-row-name">{check.name}</div>
                        <div className="audit-row-detail">{check.detail}</div>
                      </div>
                    </div>
                    <span className={`audit-pill ${check.status.toLowerCase()}`}>
                      {check.status === 'PASS' ? '✓ PASS' : check.status === 'FAIL' ? '✕ FLAGGED' : '⚠ WARN'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Evaluated against {FRAUD_RULE_COUNT} NHIA fraud rules.
                </div>
              )}
            </div>

            {/* 3. Risk Gauge */}
            <RiskGauge score={result.fraud.riskScore} />

            {/* 3b. AI Audit Explanation (hidden when the AI call returned nothing) */}
            {result.ai && (
              <div style={{ background: 'rgba(0,156,222,0.06)', border: '1px solid rgba(0,156,222,0.25)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--pp-blue)' }}>
                  AI Audit Explanation
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  {result.ai.text}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Model: {result.ai.model}
                </div>
              </div>
            )}

            {/* 3c. AI Clinical Notes Audit (only when notes were audited) */}
            {result.ai_audit && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  AI Clinical Notes Audit
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: result.ai_audit.supports_claim ? 'var(--green)' : result.ai_audit.escalated ? 'var(--yellow)' : 'var(--text-primary)' }}>
                  {result.ai_audit.supports_claim
                    ? 'Notes support the claim'
                    : result.ai_audit.escalated
                    ? 'Notes do not support the claim. Escalated to review.'
                    : 'Concerns noted, not enough confidence to escalate.'}
                </div>
                {result.ai_audit.concerns.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {result.ai_audit.concerns.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Confidence: {result.ai_audit.confidence} &bull; Model: {result.ai_audit.model}
                </div>
              </div>
            )}

            {/* 4. Active Fraud Signal Chips */}
            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Active Fraud Signals Triggered
            </div>
            <div className="flags-wrap">
              {result.fraud.flags.length === 0
                ? <span className="flag-chip" style={{ background: 'rgba(0,208,132,0.1)', color: 'var(--green)', border: '1px solid rgba(0,208,132,0.3)' }}>✓ CLEAN — All {FRAUD_RULE_COUNT} fraud rules passed</span>
                : result.fraud.flags.map(f => <FlagChip key={f} flag={f} />)
              }
            </div>

            {/* 5. Tariff Comparison Info */}
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              NHIA Statutory Tariff: <strong style={{ color: 'var(--text-primary)' }}>${result.fraud.tariff.toLocaleString()}</strong>
              {' '}&bull; Claimed: <strong style={{ color: form.amount > result.fraud.tariff * 1.5 ? 'var(--red)' : 'var(--text-primary)' }}>${form.amount.toLocaleString()}</strong>
            </div>

            {/* 6. PayPal Spend-Authority Payout Rail */}
            {result.paypal_error && (
              <div style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.4)', borderRadius: 12, padding: 16, marginTop: 12, fontSize: 13, color: 'var(--red)' }}>
                <strong>Approved by rules, but the PayPal sandbox call failed</strong>
                <div style={{ marginTop: 6, color: 'var(--text-primary)' }}>{result.paypal_error.message}</div>
                {result.paypal_error.debug_id && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    PayPal debug_id: {result.paypal_error.debug_id}
                  </div>
                )}
              </div>
            )}

            {result.paypal ? (
              <div className="paypal-card">
                <div className="paypal-card-header">
                  <PPLogo /> PayPal Sandbox — Order created, payout submitted
                </div>
                {typeof result.paypal.amount_usd === 'number' && (
                  <div className="pp-row">
                    <span className="pp-row-label">Sandbox amount (USD)</span>
                    <span className="pp-row-val">${result.paypal.amount_usd.toFixed(2)}</span>
                  </div>
                )}
                <div className="pp-row">
                  <span className="pp-row-label">Sandbox Order ID</span>
                  <span className="pp-row-val">{result.paypal.order_id}</span>
                </div>
                <div className="pp-row">
                  <span className="pp-row-label">Payout Batch ID</span>
                  <span className="pp-row-val">{result.paypal.payout_batch_id}</span>
                </div>
                {result.paypal.payout_status && (
                  <div className="pp-row">
                    <span className="pp-row-label">Payout status</span>
                    <span className="pp-row-val">{result.paypal.payout_status}</span>
                  </div>
                )}
                {result.paypal.debug_id && (
                  <div className="pp-row">
                    <span className="pp-row-label">PayPal Debug ID</span>
                    <span className="pp-row-val">{result.paypal.debug_id}</span>
                  </div>
                )}
              </div>
            ) : (
              result.decision === 'FROZEN' && (
                <div style={{ background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 12, padding: 16, marginTop: 12, fontSize: 13, color: 'var(--red)' }}>
                  🔒 <strong>PayPal payout suppressed</strong> — spend-authority gate intercepted payment before API execution. Fund leakage prevented.
                </div>
              )
            )}

            <div className="exec-time">
              {typeof result.fraud_decision_ms === 'number' && (
                <>
                  ⚡ Fraud decision <span>{result.fraud_decision_ms.toLocaleString()}ms</span>
                  {' '}&bull;{' '}
                </>
              )}
              End to end <span>{result.execution_time_ms.toLocaleString()}ms</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
