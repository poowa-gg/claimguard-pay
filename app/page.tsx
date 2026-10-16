import ClaimDemo from './components/ClaimDemo';

/* ── PayPal Logo SVG ── */
function PPLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7.076 21.337H4.72c-.41 0-.745-.25-.825-.617l-2.85-18.1A.521.521 0 0 1 1.5 2h5.27c2.807 0 5.2 1.074 5.993 4.065.54 2.04-.147 3.98-1.71 5.218 1.218.887 1.883 2.3 1.69 3.97-.372 3.2-2.77 6.084-5.667 6.084zm.44-13.6c-.352 1.321-1.397 1.983-2.808 1.983H3.65l.81-5.14h1.058c1.41 0 2.296.635 2.296 1.904 0 .405-.075.816-.3 1.253zm.5 7.283c-.38 1.413-1.52 2.123-3.034 2.123H3.3l.875-5.566h1.683c1.514 0 2.444.68 2.444 1.99 0 .49-.1.97-.287 1.453z" fill="#009cde"/>
      <path d="M21.07 7.565c-.94 4.384-3.88 6.87-8.03 6.87h-1.61l-1.27 8.07c-.07.42-.44.73-.87.73H6.85c-.41 0-.72-.33-.67-.73l2.85-18.1c.07-.44.45-.74.88-.74h6.2c3.34 0 5.56 1.59 5.56 4.71 0 .4-.05.8-.13 1.19h-.47z" fill="#003087"/>
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* ── NAVBAR ── */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <PPLogo />
          ClaimGuard Pay
        </a>
        <div className="nav-links">
          <a href="#demo">Live Demo</a>
          <a href="#how">How It Works</a>
          <a href="#evidence">Evidence</a>
          <span className="nav-badge">PayPal AI Hackathon 2026</span>
        </div>
        <a href="https://github.com/paypal/ai-toolkit" target="_blank" rel="noreferrer" className="nav-btn">
          ★ PayPal AI Toolkit
        </a>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          Live on PayPal Sandbox — Real Orders &amp; Payouts
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
            <div className="stat-label">End-to-End Processing</div>
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
            <div className="how-title">AI Fraud Gate</div>
            <p className="how-desc">8 fraud signals evaluated: ghost enrollee, missing NIN, NHIA format, tariff cap, upcoding, C-Section fraud. Risk score 0–100 computed in &lt;1ms.</p>
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
      <section className="section">
        <div className="section-label">Detection Engine</div>
        <h2 className="section-title">8 Fraud Signals. Deterministic. Fast.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {[
            { flag: 'GHOST_ENROLLEE', desc: 'Patient not in NHIA registry', sev: 'Critical' },
            { flag: 'MISSING_NIN', desc: 'No National ID provided', sev: 'Critical' },
            { flag: 'FALSIFIED_CSECTION', desc: 'C-Section billed above ₦50,000', sev: 'Critical' },
            { flag: 'UPCODING', desc: 'Normal Delivery ≥ ₦40,000', sev: 'High' },
            { flag: 'AMOUNT_EXCEEDS_TARIFF', desc: 'Billed > 1.5× NHIA tariff', sev: 'High' },
            { flag: 'INVALID_NHIA_FORMAT', desc: 'ID doesn\'t match NHIA-000 format', sev: 'Medium' },
            { flag: 'DUPLICATE_CLAIM', desc: 'Same claim submitted twice', sev: 'Medium' },
            { flag: 'PHANTOM_BILLING', desc: 'Service not on approved list', sev: 'Medium' },
          ].map(r => (
            <div key={r.flag} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <code style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>{r.flag}</code>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: r.sev === 'Critical' ? 'rgba(255,77,109,0.12)' : r.sev === 'High' ? 'rgba(255,190,11,0.12)' : 'rgba(0,156,222,0.12)',
                  color: r.sev === 'Critical' ? 'var(--red)' : r.sev === 'High' ? 'var(--yellow)' : 'var(--pp-blue)',
                }}>{r.sev}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EVIDENCE ── */}
      <section className="section" id="evidence">
        <div className="section-label">Verified Evidence — All 200 OK</div>
        <h2 className="section-title">The Crisis Is Real. The Data Proves It.</h2>
        <div className="evidence-grid">
          {[
            { num: '90%', title: 'Nigerians lack health insurance', src: 'Premium Times', url: 'https://www.premiumtimesng.com/news/top-news/779890-90-of-nigerians-still-lack-health-insurance-coverage-nhia-boss.html', red: false },
            { num: '23K', title: 'Ghost enrollees expelled in 3 months', src: 'Premium Times', url: 'https://www.premiumtimesng.com/news/headlines/194887-nhis-expels-23000-fake-enrolees-in-three-months-executive-secretary.html', red: true },
            { num: '35%', title: 'Medical claims fraudulent in East Africa', src: 'Eastleigh Voice', url: 'https://www.eastleighvoice.co.ke/health/article/2025/5/28-35-of-medical-claims-fraudulent', red: true },
            { num: '75%', title: 'Health spending is out-of-pocket', src: 'Nairametrics', url: 'https://nairametrics.com/2024/05/12/out-of-pocket-expenses-dominate-nigerias-health-spending-at-75-report/', red: false },
            { num: '22M+', title: 'Nigerians now on health insurance (+35%)', src: 'Vanguard', url: 'https://www.vanguardngr.com/2026/07/nigerians-on-health-insurance-hit-22million-nhia/', red: false },
            { num: '10%', title: 'Covered by health insurance nationally', src: 'BusinessDay', url: 'https://businessday.ng/health/article/only-10-of-nigerians-covered-by-health-insurance-nhia-boss/', red: false },
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
      </section>

      {/* ── PAYPAL APIS ── */}
      <section className="section">
        <div className="section-label">PayPal Integration</div>
        <h2 className="section-title">Built on PayPal's Full API Surface</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { name: 'Orders v2', ep: '/v2/checkout/orders', icon: '📦' },
            { name: 'Payouts v1', ep: '/v1/payments/payouts', icon: '💸' },
            { name: 'OAuth2 Token', ep: '/v1/oauth2/token', icon: '🔑' },
            { name: 'MCP Server', ep: 'mcp.paypal.com', icon: '🤖' },
          ].map(a => (
            <div key={a.name} className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{a.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
              <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.ep}</code>
            </div>
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
