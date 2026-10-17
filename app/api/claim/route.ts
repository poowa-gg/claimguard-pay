import { NextRequest, NextResponse } from 'next/server';
import { evaluateClaim } from '@/lib/fraud-rules';
import { createOrder, createPayoutBatch, PayPalError } from '@/lib/paypal';
import { applyNarrativeAudit, auditNarrative, explainDecision } from '@/lib/ai';
import type { NarrativeAudit } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = await req.json();

    const hospitalEmail =
      typeof body.hospitalEmail === 'string' ? body.hospitalEmail.trim() : '';
    const clinicalNotes =
      typeof body.clinicalNotes === 'string' ? body.clinicalNotes.trim() : '';
    const procedure: string = body.procedure || 'Malaria';
    const amount = Number(body.amount) || 0;

    const fraudStart = performance.now();
    const rulesResult = evaluateClaim({
      nin: typeof body.nin === 'string' ? body.nin.trim() : body.nin,
      nhiaId: typeof body.nhiaId === 'string' ? body.nhiaId.trim() : body.nhiaId,
      procedure,
      amount,
      hospitalEmail: hospitalEmail || 'hospital@test.com',
      patientExists: body.patientExists,
    });
    const fraud_decision_ms = Number((performance.now() - fraudStart).toFixed(2));

    // Optional AI audit of the clinical notes. It runs only on claims the rules approved and can only
    // escalate them to REVIEW; it never approves or unfreezes anything.
    const aiErrors: string[] = [];
    const onAiError = (reason: string) => {
      aiErrors.push(reason);
    };
    let fraudResult = rulesResult;
    let narrativeAudit: NarrativeAudit | null = null;
    if (rulesResult.decision === 'APPROVED' && clinicalNotes) {
      narrativeAudit = await auditNarrative(
        {
          notes: clinicalNotes,
          procedure,
          amount,
          tariff: rulesResult.tariff,
        },
        onAiError
      );
      if (narrativeAudit) fraudResult = applyNarrativeAudit(rulesResult, narrativeAudit);
    }
    const ai_audit = narrativeAudit
      ? {
          supports_claim: narrativeAudit.supportsClaim,
          confidence: narrativeAudit.confidence,
          concerns: narrativeAudit.concerns,
          model: narrativeAudit.model,
          escalated: fraudResult.decision !== rulesResult.decision,
        }
      : null;

    const aiCtx = { procedure, amount, fraud: fraudResult };

    // Demo hardening: the sandbox account that receives the order and the payout can be pinned
    // server-side, so a visitor typing an arbitrary email cannot make PayPal reject the call.
    const orderPayeeEmail = process.env.PAYPAL_PAYEE_EMAIL?.trim() || hospitalEmail;
    const payoutReceiverEmail = process.env.PAYPAL_PAYOUT_RECEIVER_EMAIL?.trim() || hospitalEmail;

    // FROZEN and REVIEW claims never reach PayPal.
    if (fraudResult.decision !== 'APPROVED') {
      const ai = await explainDecision(aiCtx, onAiError);
      return NextResponse.json({
        decision: fraudResult.decision,
        fraud: fraudResult,
        ai,
        ai_audit,
        ai_error: aiErrors.length ? aiErrors.join(' | ') : undefined,
        paypal: null,
        fraud_decision_ms,
        execution_time_ms: Date.now() - start,
        message: fraudResult.scenario.summary,
      });
    }

    // Spend authority never exceeds the statutory tariff, and never exceeds what was actually claimed.
    const payoutAmount = Math.min(amount, fraudResult.tariff);

    const [paypalResult, ai] = await Promise.all([
      Promise.all([
        createOrder(payoutAmount, orderPayeeEmail),
        createPayoutBatch(payoutAmount, payoutReceiverEmail),
      ])
        .then(([order, payout]) => ({ ok: true as const, order, payout }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      explainDecision(aiCtx, onAiError),
    ]);

    if (!paypalResult.ok) {
      const err = paypalResult.error;
      return NextResponse.json(
        {
          decision: fraudResult.decision,
          fraud: fraudResult,
          ai,
          ai_audit,
          ai_error: aiErrors.length ? aiErrors.join(' | ') : undefined,
          paypal: null,
          paypal_error: {
            message: err instanceof Error ? err.message : 'PayPal call failed',
            debug_id: err instanceof PayPalError ? err.debugId ?? null : null,
          },
          fraud_decision_ms,
          execution_time_ms: Date.now() - start,
        },
        { status: 502 }
      );
    }

    const { order, payout } = paypalResult;
    return NextResponse.json({
      decision: fraudResult.decision,
      fraud: fraudResult,
      ai,
      ai_audit,
      ai_error: aiErrors.length ? aiErrors.join(' | ') : undefined,
      paypal: {
        amount_usd: payoutAmount,
        order_id: order.id,
        order_status: order.status,
        payout_batch_id: payout.batch_id,
        payout_status: payout.status,
        debug_id: order.debug_id,
        payout_debug_id: payout.debug_id,
      },
      fraud_decision_ms,
      execution_time_ms: Date.now() - start,
      verification_status: 'VERIFIED_SANDBOX',
      paypal_debug_id: order.debug_id,
      message: fraudResult.scenario.summary,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  // Booleans and public build info only; no secret values are ever returned.
  return NextResponse.json({
    status: 'ClaimGuard Pay API',
    config: {
      paypal_environment: process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
      paypal_credentials_set: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      gemini_key_set: Boolean(process.env.GEMINI_API_KEY),
      payee_pinned: Boolean(process.env.PAYPAL_PAYEE_EMAIL),
      payout_receiver_pinned: Boolean(process.env.PAYPAL_PAYOUT_RECEIVER_EMAIL),
    },
    deployment: {
      vercel_env: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
  });
}
