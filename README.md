# ClaimGuard Pay — AI Spend Authority for Healthcare Claims

**PayPal AI Hackathon 2026**

> Ghost enrolments evaporate. Built with PayPal.

## The Problem

Nigeria's NHIA covers only ~10% of citizens yet processes claims worth billions.
An estimated **23,000 ghost enrollees** were expelled in one quarter alone;
28–35% of medical claims across East Africa are fraudulent.
ClaimGuard Pay is an AI spend-authority layer that blocks fraudulent claims
**before** a single PayPal payout fires.

## Evidence — All 200 OK Verified

| # | Stat | Source |
|---|------|--------|
| 1 | 90% of Nigerians lack health coverage | https://www.premiumtimesng.com/news/top-news/779890-90-of-nigerians-still-lack-health-insurance-coverage-nhia-boss.html |
| 2 | Only 10% covered by health insurance | https://businessday.ng/health/article/only-10-of-nigerians-covered-by-health-insurance-nhia-boss/ |
| 3 | 22.03M enrollees — +35% YoY | https://www.vanguardngr.com/2026/07/nigerians-on-health-insurance-hit-22million-nhia/ |
| 4 | 75% out-of-pocket health spend | https://nairametrics.com/2024/05/12/out-of-pocket-expenses-dominate-nigerias-health-spending-at-75-report/ |
| 5 | Healthcare fraud deep-dive | https://barristerng.com/health-care-fraud-and-abuse-a-growing-concern-by-ayegbusi-oluwafisayomi-evelyn/ |
| 6 | 23k ghost enrollees expelled | https://www.premiumtimesng.com/news/headlines/194887-nhis-expels-23000-fake-enrolees-in-three-months-executive-secretary.html |
| 7 | Kenya: 28–35% claims fraudulent | https://www.eastleighvoice.co.ke/health/article/2025/5/28-35-of-medical-claims-fraudulent |
| 8 | PayPal AI Toolkit | https://github.com/paypal/ai-toolkit |
| 9 | PayPal + OpenAI ACP partnership | https://www.marketing-interactive.com/paypal-partners-openai-to-drive-agentic-commerce-in-chatgpt |

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
| MCP | `mcp.paypal.com` | Agentic tool protocol |

## Fraud Rules

| Flag | Trigger | Decision |
|------|---------|----------|
| `GHOST_ENROLLEE` | `patientExists === false` | FROZEN |
| `MISSING_NIN` | `nin` is null/empty | FROZEN |
| `INVALID_NHIA_FORMAT` | ID doesn't match `NHIA-\d{3,}` | REVIEW |
| `AMOUNT_EXCEEDS_TARIFF` | amount > tariff × 1.5 | REVIEW/FROZEN |
| `FALSIFIED_CSECTION` | C-Section > ₦50,000 | FROZEN |
| `UPCODING` | Normal Delivery ≥ ₦40,000 | FROZEN |

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
  -d '{"nin":"222233334444","nhiaId":"NHIA-789","hospitalEmail":"hospital@abuja.ng","patientExists":true,"procedure":"Malaria","amount":8000}'

# 3. Trigger upcoding block
curl -X POST http://localhost:3000/api/claim \
  -H "Content-Type: application/json" \
  -d '{"procedure":"Normal Delivery","amount":50000}'
```

## Measured Results

See [`measured-live.json`](./measured-live.json) — 3 recorded takes with `paypal_debug_id` and `execution_time_ms`.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **PayPal REST APIs** (Orders v2, Payouts v1, OAuth2)
- **PayPal MCP** — `mcp.paypal.com`
- Zero external ML dependencies — pure deterministic rule engine
