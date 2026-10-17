# ClaimGuard Pay — AI Spend Authority for Healthcare Claims

[![PayPal AI Toolkit](https://img.shields.io/badge/PayPal-AI_Toolkit-0070BA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/paypal/ai-toolkit)
[![Live Site](https://img.shields.io/badge/Live_Demo-claimguard--pay.vercel.app-00D084?style=for-the-badge&logo=vercel&logoColor=white)](https://claimguard-pay.vercel.app)
[![API Status](https://img.shields.io/badge/Sandbox-VERIFIED_SANDBOX-00D084?style=for-the-badge)](https://claimguard-pay.vercel.app/api/claim)

**PayPal AI Hackathon 2026** • GitHub: [`https://github.com/poowa-gg/claimguard-pay`](https://github.com/poowa-gg/claimguard-pay)

> Ghost enrolments evaporate. Built with PayPal.

## The Problem

Nigeria's NHIA covers only ~10% of citizens yet processes claims worth billions.
An estimated **23,000 ghost enrollees** were expelled in one quarter alone;
28–35% of medical claims across East Africa are fraudulent.
ClaimGuard Pay is an AI spend-authority layer that blocks fraudulent claims
**before** a single PayPal payout fires.

## Sourced Evidence

| # | Stat | Focus | Source Link |
|---|------|-------|----------------------|
| 1 | 90% | Nigerians lack health insurance | [Punch / HCPAN](https://punchng.com/health-insurance-over-90-of-nigerians-still-uninsured-says-hcpan/) |
| 2 | 10% | National insurance coverage rate | [BusinessDay](https://businessday.ng/news/article/only-10-of-nigerians-covered-by-health-insurance-nhia-boss/) |
| 3 | 22.03M | Registered NHIA enrollees (+35% YoY) | [Vanguard](https://www.vanguardngr.com/2026/07/nigerians-on-health-insurance-hit-22million-nhia/) |
| 4 | 75% | Out-of-pocket health expenditure | [Nairametrics](https://nairametrics.com/2024/09/03/out-of-pocket-expenses-dominate-nigerias-health-spending-at-75-report/) |
| 5 | Legal | Healthcare fraud & abuse legal analysis | [BarristerNG](https://barristerng.com/health-care-fraud-and-abuse-a-growing-concern-by-ayegbusi-oluwafisayomi-evelyn/) |
| 6 | 23K | Ghost enrollees expelled from scheme | [Punch](https://punchng.com/23000-ghost-subscribers-enrol-for-health-insurance-scheme/) |
| 7 | 28–35% | Medical claims fraudulent in East Africa | [Standard Media](https://www.standardmedia.co.ke/health/health-science/article/2001498291/how-new-medical-scheme-hopes-to-evade-fraudulent-claims) |
| 8 | Tools | PayPal AI Toolkit for agentic payments | [PayPal GitHub](https://github.com/paypal/ai-toolkit) |

## Architecture

```
POST /api/claim
      │
      ▼
 fraud-rules.ts        ← NIN check, NHIA ID format, GHOST_ENROLLEE,
      │                   UPCODING, FALSIFIED_CSECTION, tariff caps
      │
   FROZEN? ──YES──► Return 200 { decision: "FROZEN" }  (no PayPal call)
      │
      NO
      │
      ▼
 paypal.ts
  createOrder()        ← POST /v2/checkout/orders
  createPayoutBatch()  ← POST /v1/payments/payouts
      │
      ▼
 Return { decision, fraud, paypal: { order_id, payout_batch_id, debug_id } }
```

## PayPal APIs Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| Orders v2 | `/v2/checkout/orders` | Create verified payout order |
| Payouts v1 | `/v1/payments/payouts` | Batch disburse to hospital |
| OAuth2 | `/v1/oauth2/token` | Client-credentials token |
| Gemini API | `generativelanguage.googleapis.com` | Plain-English explanation of each decision |

## Fraud Rules

| Flag | Trigger | Decision |
|------|---------|----------|
| `GHOST_ENROLLEE` | `patientExists === false` | FROZEN |
| `MISSING_NIN` | `nin` is null/empty | FROZEN |
| `INVALID_NHIA_FORMAT` | ID doesn't match `NHIA-\d{3,}` | REVIEW |
| `AMOUNT_EXCEEDS_TARIFF` | amount > tariff × 1.5 | REVIEW/FROZEN |
| `FALSIFIED_CSECTION` | C-Section > $500 | FROZEN |
| `UPCODING` | Normal Delivery ≥ $400 | FROZEN |

## Run Locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your PayPal sandbox credentials
npm run dev
```

## Test Scenarios

```bash
# 1. Block ghost enrollee
curl -X POST http://localhost:3000/api/claim \
  -H "Content-Type: application/json" \
  -d '{"patientExists":false}'

# 2. Approve legit claim
curl -X POST http://localhost:3000/api/claim \
  -H "Content-Type: application/json" \
  -d '{"nin":"31005502980","nhiaId":"NHIA-789","hospitalEmail":"hospital@abuja.ng","patientExists":true,"procedure":"Malaria","amount":80}'

# 3. Trigger upcoding block
curl -X POST http://localhost:3000/api/claim \
  -H "Content-Type: application/json" \
  -d '{"procedure":"Normal Delivery","amount":500}'
```

## Measured Results

See [`measured-live.json`](https://claimguard-pay.vercel.app/measured-live.json) (local: [`public/measured-live.json`](./public/measured-live.json)) — 3 recorded live takes with `paypal_debug_id` and `execution_time_ms`.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **PayPal REST APIs** (Orders v2, Payouts v1, OAuth2)
- **Gemini API** — explains decisions in plain English (the decision itself is made by the deterministic rule engine)
