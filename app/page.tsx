import ClaimDemo from './components/ClaimDemo';
import Navbar from './components/Navbar';
import { FRAUD_RULE_COUNT } from '@/lib/fraud-rules';

export default function Home() {
  return (
    <>
      {/* ── NAVBAR ── */}
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="hero-eyebrow-dot" />
            PayPal Sandbox: real API calls
          </span>
        </div>
        <h1>
          Ghost Enrolments<br />
          <span className="accent">Evaporate.</span>{' '}
          <span className="accent-green">Instantly.</span>
        </h1>
        <p className="hero-sub">
          AI spend-authority for NHIA healthcare claims. Fraud is detected and frozen
          before a single PayPal payout fires — in milliseconds.
        </p>
        <div className="hero-cta">
          <a href="#demo" className="btn-primary">
            <span>⚡</span> Try Live Demo
          </a>
          <a href="#evidence" className="btn-secondary">
            <span>📊</span> View Evidence
          </a>
        </div>

        {/* Stats */}
        <div className="stats-banner">
          <div className="stat-item">
            <div className="stat-num red">23K</div>
            <div className="stat-label">Ghost Enrollees Expelled</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">28–35%</div>
            <div className="stat-label">Claims Fraudulent (E. Africa)</div>
          </div>
          <div className="stat-item">
            <div className="stat-num green">90%</div>
            <div className="stat-label">Nigerians Lack Coverage</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">&lt;6s</div>
            <div className="stat-label">Claim to PayPal payout (measured)</div>
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section className="section" id="demo">
        <div className="section-label">Live Sandbox Demo</div>
        <h2 className="section-title">Run a Claim. Watch Fraud Evaporate.</h2>
        <p className="section-sub">
          Real PayPal API calls. Every approved claim creates a live order ID and
          payout batch you can verify at developer.paypal.com.
        </p>
        <ClaimDemo />
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" id="how">
        <div className="section-label">Architecture</div>
        <h2 className="section-title">Zero-trust. Zero wasted payouts.</h2>
        <p className="section-sub">
          Three stages — every claim must pass fraud analysis before PayPal
          is ever contacted.
        </p>
        <div className="how-grid">
          <div className="how-card">
            <div className="how-icon icon-blue">📋</div>
            <div className="how-step">Step 01</div>
            <div className="how-title">Claim Submitted</div>
            <p className="how-desc">Hospital submits claim with NIN, NHIA ID, procedure code, and amount via POST /api/claim.</p>
          </div>
          <div className="how-card">
            <div className="how-icon icon-red">🔍</div>
            <div className="how-step">Step 02</div>
            <div className="how-title">Fraud Gate + AI Auditor</div>
            <p className="how-desc">{FRAUD_RULE_COUNT} deterministic fraud signals decide in under 1 ms. An LLM then explains each decision in plain English.</p>
          </div>
          <div className="how-card">
            <div className="how-icon icon-green">💸</div>
            <div className="how-step">Step 03</div>
            <div className="how-title">PayPal Dispatched or Frozen</div>
            <p className="how-desc">APPROVED claims trigger a real PayPal order + payout batch. FROZEN claims never reach PayPal — zero wasted API calls, zero leaked funds.</p>
          </div>
        </div>
      </section>

      {/* ── FRAUD RULES ── */}
      <section className="section" id="engine">
        <div className="section-label">Detection Engine</div>
        <h2 className="section-title">{FRAUD_RULE_COUNT} Fraud Signals. Deterministic. Fast.</h2>
        <div className="rules-grid">
          {[
            { flag: 'GHOST_ENROLLEE', desc: 'Patient not in active NHIA registry', sev: 'Critical' },
            { flag: 'INVALID_NIN_FORMAT', desc: 'NIN fails strict 11-digit NIMC standard', sev: 'Critical' },
            { flag: 'MISSING_NIN', desc: 'No National ID provided', sev: 'Critical' },
            { flag: 'FALSIFIED_CSECTION', desc: 'C-Section billed above $500 cap', sev: 'Critical' },
            { flag: 'UPCODING', desc: 'Normal Delivery ≥ $400', sev: 'High' },
            { flag: 'AMOUNT_EXCEEDS_TARIFF', desc: 'Billed > 1.5× NHIA tariff', sev: 'High' },
            { flag: 'INVALID_NHIA_FORMAT', desc: 'ID doesn\'t match official NHIA/HMO format', sev: 'Medium' },
            { flag: 'DUPLICATE_CLAIM', desc: 'Same claim submitted twice', sev: 'Planned' },
            { flag: 'PHANTOM_BILLING', desc: 'Service not on approved list', sev: 'Planned' },
          ].map(r => (
            <div key={r.flag} className="card rule-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 6, flexWrap: 'wrap' }}>
                <code style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>{r.flag}</code>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: r.sev === 'Critical' ? 'rgba(255,77,109,0.12)' : r.sev === 'High' ? 'rgba(255,190,11,0.12)' : r.sev === 'Planned' ? 'rgba(255,255,255,0.06)' : 'rgba(0,156,222,0.12)',
                  color: r.sev === 'Critical' ? 'var(--red)' : r.sev === 'High' ? 'var(--yellow)' : r.sev === 'Planned' ? 'var(--text-muted)' : 'var(--pp-blue)',
                }}>{r.sev}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EVIDENCE ── */}
      <section className="section" id="evidence">
        <div className="section-label">Sourced Evidence</div>
        <h2 className="section-title">The Crisis Is Real. The Data Proves It.</h2>
        <div className="evidence-grid">
          {[
            { num: '90%', title: 'Nigerians lack health insurance', src: 'Punch / HCPAN', url: 'https://punchng.com/health-insurance-over-90-of-nigerians-still-uninsured-says-hcpan/', red: false },
            { num: '10%', title: 'Covered by health insurance nationally', src: 'BusinessDay', url: 'https://businessday.ng/news/article/only-10-of-nigerians-covered-by-health-insurance-nhia-boss/', red: false },
            { num: '22M+', title: 'Nigerians now on health insurance (+35%)', src: 'Vanguard', url: 'https://www.vanguardngr.com/2026/07/nigerians-on-health-insurance-hit-22million-nhia/', red: false },
            { num: '75%', title: 'Health spending is out-of-pocket', src: 'Nairametrics', url: 'https://nairametrics.com/2024/09/03/out-of-pocket-expenses-dominate-nigerias-health-spending-at-75-report/', red: false },
            { num: 'Legal', title: 'Healthcare fraud and abuse deep-dive', src: 'BarristerNG', url: 'https://barristerng.com/health-care-fraud-and-abuse-a-growing-concern-by-ayegbusi-oluwafisayomi-evelyn/', red: true },
            { num: '23K', title: 'Ghost enrollees expelled by NHIS in 3 months', src: 'Punch', url: 'https://punchng.com/23000-ghost-subscribers-enrol-for-health-insurance-scheme/', red: true },
            { num: '28–35%', title: 'Medical claims fraudulent in East Africa', src: 'Standard Media', url: 'https://www.standardmedia.co.ke/health/health-science/article/2001498291/how-new-medical-scheme-hopes-to-evade-fraudulent-claims', red: true },
            { num: 'Tools', title: 'PayPal AI Toolkit for agentic payments', src: 'PayPal GitHub', url: 'https://github.com/paypal/ai-toolkit', red: false },
          ].map(e => (
            <div key={e.title} className="evidence-card">
              <div className={`evidence-num ${e.red ? 'red' : ''}`}>{e.num}</div>
              <div className="evidence-title">{e.title}</div>
              <a href={e.url} target="_blank" rel="noreferrer" className="evidence-source">
                📰 {e.src} ↗
              </a>
            </div>
          ))}
        </div>

        {/* Audited Benchmark Data */}
        <div style={{
          marginTop: 24,
          padding: '20px 24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📑</span> Audited Benchmark: <code>measured-live.json</code>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              3 audited live test takes recording decision, flags, millisecond latency, and live <code>paypal_debug_id</code>.
            </div>
          </div>
          <a
            href="/measured-live.json"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            <span>📥</span> Open measured-live.json ↗
          </a>
        </div>
      </section>

      {/* ── PAYPAL APIS ── */}
      <section className="section" id="apis">
        <div className="section-label">PayPal Integration</div>
        <h2 className="section-title">Built on PayPal's Full API Surface</h2>
        <div className="apis-grid">
          {[
            { name: 'Orders v2', ep: '/v2/checkout/orders', icon: '📦', href: 'https://developer.paypal.com' },
            { name: 'Payouts v1', ep: '/v1/payments/payouts', icon: '💸', href: 'https://developer.paypal.com' },
            { name: 'OAuth2 Token', ep: '/v1/oauth2/token', icon: '🔑', href: 'https://developer.paypal.com' },
            { name: 'Gemini API', ep: 'AI decision explainer', icon: '🧠', href: 'https://ai.google.dev' },
          ].map(a => (
            <a
              key={a.name}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="card api-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{a.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
              <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ep}</code>
            </a>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-brand">
          ClaimGuard Pay — PayPal AI Hackathon 2026
        </div>
        <div className="footer-links">
          <a href="https://github.com/paypal/ai-toolkit" target="_blank" rel="noreferrer">PayPal AI Toolkit</a>
          <a href="/measured-live.json" target="_blank" rel="noreferrer">measured-live.json</a>
          <a href="https://developer.paypal.com" target="_blank" rel="noreferrer">PayPal Dev</a>
          <a href="/api/claim" target="_blank" rel="noreferrer">API</a>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Built with ❤️ + PayPal
        </div>
      </footer>
    </>
  );
}
