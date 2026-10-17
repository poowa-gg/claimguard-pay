# ClaimGuard Pay: AI Spend Authority for Healthcare Claims

[![Live Demo](https://img.shields.io/badge/Live_Demo-claimguard--pay.vercel.app-00D084?style=for-the-badge&logo=vercel&logoColor=white)](https://claimguard-pay.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

**PayPal AI Hackathon 2026** · Repo: [github.com/poowa-gg/claimguard-pay](https://github.com/poowa-gg/claimguard-pay)

> Ghost enrolments evaporate. Fraud is stopped before PayPal is ever called.

## The problem

Nigeria's national health insurance scheme (NHIA) covers only about 10% of citizens, and fraud drains it:
ghost enrollees, inflated bills, upcoded procedures. Reported figures include 23,000 ghost enrollees expelled in
one quarter and 28–35% of medical claims judged fraudulent in East Africa (sources below).

ClaimGuard Pay is a spend-authority layer. A hospital submits a claim, the system decides whether money may
move, and only a clean claim ever reaches PayPal.

## How it works

1. **Rule engine** (deterministic, no AI): checks the claim and raises fraud flags.
2. **AI notes audit** (Gemini, optional): if the claim carries clinical notes and the rules approved it, the AI checks
   whether the notes support the billed procedure. It can only escalate a claim to REVIEW. It can never approve,
   unfreeze, or lower a risk score, so a malicious note cannot unlock a payout.
3. **PayPal sandbox**: only an APPROVED claim creates a PayPal order and a payout batch.
4. **AI explanation** (Gemini): every decision gets a plain-English explanation for the hospital finance officer.

If the AI is unavailable, the rule-engine decision stands and the UI simply omits the AI cards.

```
POST /api/claim
      │
      ▼
 fraud-rules.ts ── 7 deterministic flags → risk score → APPROVED / REVIEW / FROZEN
      │
      ├─ APPROVED + clinical notes ──► ai.ts auditNarrative (can only escalate to REVIEW)
      │
      ├─ FROZEN / REVIEW ──► no PayPal call
      │
      └─ APPROVED ──► paypal.ts
                       createOrder()        POST /v2/checkout/orders
                       createPayoutBatch()  POST /v1/payments/payouts
      │
      ▼
 ai.ts explainDecision  (plain-English explanation of the final decision)
```

## Decision logic

Risk score = 25 per flag, plus 40 if any flag is critical.
**FROZEN** if any critical flag is present or the score is 75 or more. **REVIEW** at 40 or more. Otherwise **APPROVED**.

| Flag | Trigger | Critical |
|------|---------|----------|
| `GHOST_ENROLLEE` | patient not in the registry (form checkbox in the demo) | yes |
| `MISSING_NIN` | no NIN supplied | yes |
| `INVALID_NIN_FORMAT` | NIN is not exactly 11 digits | yes |
| `FALSIFIED_CSECTION` | C-Section billed above $500 | yes |
| `UPCODING` | Normal Delivery billed at $400 or more | yes |
| `AMOUNT_EXCEEDS_TARIFF` | amount above 1.5× the tariff | no |
| `INVALID_NHIA_FORMAT` | enrollee ID does not match `NHIA-…` / `NHIS-…` syntax | no |
| `AI_NARRATIVE_MISMATCH` | raised by the AI audit, not by the rule engine | no |

`DUPLICATE_CLAIM` and `PHANTOM_BILLING` are defined in the type but not implemented yet.

A single non-critical flag scores 25, which stays APPROVED. The payout is then capped:
**payout = min(claimed amount, statutory tariff)**, so spend authority never exceeds the tariff.

## PayPal usage (sandbox only)

| API | Endpoint | Purpose |
|-----|----------|---------|
| OAuth2 | `/v1/oauth2/token` | client-credentials access token |
| Orders v2 | `/v2/checkout/orders` | creates an order for the payout amount |
| Payouts v1 | `/v1/payments/payouts` | submits a payout batch to the receiver |

What a successful call proves: the order comes back `CREATED` (it is not approved or captured by a buyer) and the
payout batch comes back `PENDING`. These are real PayPal sandbox objects with real IDs and `paypal-debug-id`
headers. If PayPal rejects the request, the API returns `502` with a `paypal_error` and the UI shows it.
No identifier in this project is ever generated locally.

## AI usage

Gemini is called through the REST API in `lib/ai.ts`. The default model is `gemini-3.5-flash-lite`, overridable with
`GEMINI_MODEL`. Patient identifiers (NIN, NHIA ID) and emails are never sent to the model. The notes audit uses
structured JSON output at temperature 0, treats the notes as untrusted data, and discards malformed replies.

## For judges: try it

1. Open the [live demo](https://claimguard-pay.vercel.app). No login is needed.
2. Click a sample record, then **Run Fraud Check + PayPal**.
   - *Abuja Hospital*: clean claim, approved, real PayPal sandbox order and payout IDs.
   - *Ibadan Clinic*: passes every rule, but the notes describe a wellness check-up billed as malaria. The AI audit escalates it to REVIEW.
   - *Lagos Maternity*, *Kano Specialist*, *Port Harcourt Clinic*: frozen by the rules, PayPal never called.
3. Check the deployment: [`/api/claim`](https://claimguard-pay.vercel.app/api/claim) reports which services are configured (booleans only, no secrets).
4. Real-run evidence: [`public/measured-live.json`](./public/measured-live.json), produced by `scripts/record-measured.mjs`.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your sandbox credentials
npm run dev
```

| Variable | Purpose |
|----------|---------|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal **sandbox** app credentials |
| `PAYPAL_ENVIRONMENT` | `sandbox` (anything other than `live` is treated as sandbox) |
| `PAYPAL_PAYEE_EMAIL`, `PAYPAL_PAYOUT_RECEIVER_EMAIL` | optional: pin the sandbox accounts used for approved claims |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini key, optional model override |

Example requests (synthetic test data):

```bash
# Approved: real PayPal sandbox order + payout
curl -X POST http://localhost:3000/api/claim -H "Content-Type: application/json" \
  -d '{"nin":"10000000001","nhiaId":"NHIA-789012","procedure":"Malaria","amount":80,"hospitalEmail":"sb-xxxx@business.example.com","patientExists":true}'

# Frozen: ghost enrollee
curl -X POST http://localhost:3000/api/claim -H "Content-Type: application/json" \
  -d '{"patientExists":false}'

# AI escalation: rules approve, notes contradict the billing
curl -X POST http://localhost:3000/api/claim -H "Content-Type: application/json" \
  -d '{"nin":"10000000001","nhiaId":"NHIA-440271","procedure":"Malaria","amount":85,"hospitalEmail":"x@y.com","patientExists":true,"clinicalNotes":"Routine wellness check-up. No fever, no symptoms."}'
```

Record fresh measurements against any deployment: `node scripts/record-measured.mjs https://your-deployment.example`

## Known limitations

- The registry check is a form checkbox and the NIN check is format-only. There is no live NIMC or NHIA lookup.
- Tariffs and caps in `lib/fraud-rules.ts` are illustrative demo values. Verify them against official NHIA schedules before any real use.
- PayPal runs in the sandbox only. Orders are created but not captured, and payouts stay `PENDING`.
- Gemini free-tier limits can make the AI cards disappear under heavy use. The rule-engine decision is unaffected.

## Sourced evidence

| # | Stat | Focus | Source |
|---|------|-------|--------|
| 1 | 90% | Nigerians lack health insurance | [Punch / HCPAN](https://punchng.com/health-insurance-over-90-of-nigerians-still-uninsured-says-hcpan/) |
| 2 | 10% | National insurance coverage rate | [BusinessDay](https://businessday.ng/news/article/only-10-of-nigerians-covered-by-health-insurance-nhia-boss/) |
| 3 | 22M+ | Nigerians on health insurance (+35%) | [Vanguard](https://www.vanguardngr.com/2026/07/nigerians-on-health-insurance-hit-22million-nhia/) |
| 4 | 75% | Out-of-pocket health expenditure | [Nairametrics](https://nairametrics.com/2024/09/03/out-of-pocket-expenses-dominate-nigerias-health-spending-at-75-report/) |
| 5 | Legal | Healthcare fraud and abuse analysis | [BarristerNG](https://barristerng.com/health-care-fraud-and-abuse-a-growing-concern-by-ayegbusi-oluwafisayomi-evelyn/) |
| 6 | 23K | Ghost enrollees expelled | [Punch](https://punchng.com/23000-ghost-subscribers-enrol-for-health-insurance-scheme/) |
| 7 | 28–35% | Medical claims fraudulent in East Africa | [Standard Media](https://www.standardmedia.co.ke/health/health-science/article/2001498291/how-new-medical-scheme-hopes-to-evade-fraudulent-claims) |

## Stack

Next.js 14 (App Router, TypeScript) · PayPal REST APIs (OAuth2, Orders v2, Payouts v1) · Gemini API · Vercel

## License

[MIT](./LICENSE)
