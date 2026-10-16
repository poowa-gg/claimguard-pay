'use client';

import { useState, useCallback } from 'react';

/* ── types ── */
interface ClaimPayload {
  nin: string;
  nhiaId: string;
  procedure: string;
  amount: number;
  hospitalEmail: string;
  patientExists: boolean;
}

interface ApiResult {
  decision: 'APPROVED' | 'FROZEN' | 'REVIEW';
  fraud: {
    flags: string[];
    riskScore: number;
    tariff: number;
    reason: string;
  };
  paypal: {
    order_id: string;
    payout_batch_id: string;
    debug_id: string;
  } | null;
  execution_time_ms: number;
  paypal_debug_id: string;
  message?: string;
}

/* ── scenario presets ── */
const PRESETS = [
  {
    label: '👻 Ghost Enrollee',
    type: 'danger',
    data: { nin: '', nhiaId: '', procedure: 'Malaria', amount: 9000, hospitalEmail: 'ghost@test.ng', patientExists: false },
  },
  {
    label: '✅ Legit Claim',
    type: 'success',
    data: { nin: '222233334444', nhiaId: 'NHIA-789', procedure: 'Malaria', amount: 8000, hospitalEmail: 'hospital@abuja.ng', patientExists: true },
  },
  {
    label: '📈 Upcoding',
    type: 'danger',
    data: { nin: '', nhiaId: 'NHIA-001', procedure: 'Normal Delivery', amount: 50000, hospitalEmail: 'fraud@test.ng', patientExists: true },
  },
  {
    label: '🏥 C-Section Fraud',
    type: 'danger',
    data: { nin: '111122223333', nhiaId: 'NHIA-555', procedure: 'C-Section', amount: 65000, hospitalEmail: 'csect@fake.ng', patientExists: true },
  },
];

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
  const critical = ['GHOST_ENROLLEE', 'MISSING_NIN', 'FALSIFIED_CSECTION'];
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
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [form, setForm] = useState<ClaimPayload>({
    nin: '', nhiaId: '', procedure: 'Malaria',
    amount: 9000, hospitalEmail: '', patientExists: true,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const applyPreset = useCallback((idx: number) => {
    setActivePreset(idx);
    setForm(PRESETS[idx].data as ClaimPayload);
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
      setResult(data);
    } catch {
      setResult({
        decision: 'FROZEN',
        fraud: { flags: ['API_ERROR'], riskScore: 0, tariff: 0, reason: 'Connection error' },
        paypal: null,
        execution_time_ms: 0,
        paypal_debug_id: 'error',
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
      {/* ── LEFT: FORM ── */}
      <div className="card">
        <div className="card-title">Submit a Claim</div>
        <div className="card-sub">Select a scenario or fill in the fields manually</div>

        {/* Presets */}
        <div className="presets">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              className={`preset-btn ${p.type} ${activePreset === i ? 'active' : ''}`}
              onClick={() => applyPreset(i)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">NIN (National ID)</label>
            <input className="form-input" placeholder="e.g. 222233334444" value={form.nin}
              onChange={e => setForm(f => ({ ...f, nin: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">NHIA ID</label>
            <input className="form-input" placeholder="e.g. NHIA-789" value={form.nhiaId}
              onChange={e => setForm(f => ({ ...f, nhiaId: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Procedure</label>
            <select className="form-select" value={form.procedure}
              onChange={e => setForm(f => ({ ...f, procedure: e.target.value }))}>
              <option>Malaria</option>
              <option>Normal Delivery</option>
              <option>C-Section</option>
              <option>Consultation</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₦)</label>
            <input className="form-input" type="number" placeholder="e.g. 9000" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
          </div>
          <div className="form-group full">
            <label className="form-label">Hospital Email</label>
            <input className="form-input" placeholder="hospital@example.ng" value={form.hospitalEmail}
              onChange={e => setForm(f => ({ ...f, hospitalEmail: e.target.value }))} />
          </div>
          <div className="form-group full">
            <div className="form-check" onClick={() => setForm(f => ({ ...f, patientExists: !f.patientExists }))}>
              <input type="checkbox" readOnly checked={form.patientExists} />
              <label>Patient exists in NHIA registry (enrollee verified)</label>
            </div>
          </div>
        </div>

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? <><div className="spinner" /> Analysing claim...</> : <><PPLogo /> Run Fraud Check + PayPal</>}
        </button>
      </div>

      {/* ── RIGHT: RESULTS ── */}
      <div className="card">
        {!result && !loading && (
          <div className="result-idle">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
              <path d="M20 32h24M32 20v24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Select a scenario and run a fraud check</span>
          </div>
        )}

        {loading && (
          <div className="result-idle">
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
            <span>Running AI fraud analysis...</span>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Decision */}
            <div className={`decision-badge ${decisionClass}`}>
              {decisionIcon} {result.decision}
              {result.decision === 'FROZEN' && ' — Payment Blocked'}
              {result.decision === 'APPROVED' && ' — PayPal Dispatched'}
              {result.decision === 'REVIEW' && ' — Manual Review'}
            </div>

            {/* Risk gauge */}
            <RiskGauge score={result.fraud.riskScore} />

            {/* Flags */}
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Fraud Signals
            </div>
            <div className="flags-wrap">
              {result.fraud.flags.length === 0
                ? <span className="flag-chip" style={{ background: 'rgba(0,208,132,0.1)', color: 'var(--green)', border: '1px solid rgba(0,208,132,0.3)' }}>✓ CLEAN — No flags detected</span>
                : result.fraud.flags.map(f => <FlagChip key={f} flag={f} />)
              }
            </div>

            {/* Tariff */}
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              NHIA Tariff: <strong style={{ color: 'var(--text-primary)' }}>₦{result.fraud.tariff.toLocaleString()}</strong>
            </div>

            {/* PayPal card */}
            {result.paypal ? (
              <div className="paypal-card">
                <div className="paypal-card-header">
                  <PPLogo /> PayPal Sandbox — Live Transaction
                </div>
                <div className="pp-row">
                  <span className="pp-row-label">Order ID</span>
                  <span className="pp-row-val">{result.paypal.order_id}</span>
                </div>
                <div className="pp-row">
                  <span className="pp-row-label">Payout Batch</span>
                  <span className="pp-row-val">{result.paypal.payout_batch_id}</span>
                </div>
                <div className="pp-row">
                  <span className="pp-row-label">Debug ID</span>
                  <span className="pp-row-val">{result.paypal.debug_id}</span>
                </div>
              </div>
            ) : (
              result.decision === 'FROZEN' && (
                <div style={{ background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 12, padding: 16, marginTop: 12, fontSize: 13, color: 'var(--red)' }}>
                  🔒 PayPal payout suppressed — fraud gate triggered before API call
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Debug ID: {result.paypal_debug_id}
                  </div>
                </div>
              )
            )}

            <div className="exec-time">
              ⚡ Processed in <span>{result.execution_time_ms.toLocaleString()}ms</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
