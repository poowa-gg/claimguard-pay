import { NextRequest, NextResponse } from 'next/server';
import { evaluateClaim } from '@/lib/fraud-rules';
import { createOrder, createPayoutBatch, PayPalError } from '@/lib/paypal';
import { explainDecision } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = await req.json();

    const hospitalEmail =
      typeof body.hospitalEmail === 'string' ? body.hospitalEmail.trim() : '';
    const procedure: string = body.procedure || 'Malaria';
    const amount = Number(body.amount) || 0;

    const fraudStart = performance.now();
    const fraudResult = evaluateClaim({
      nin: typeof body.nin === 'string' ? body.nin.trim() : body.nin,
      nhiaId: typeof body.nhiaId === 'string' ? body.nhiaId.trim() : body.nhiaId,
      procedure,
      amount,
      hospitalEmail: hospitalEmail || 'hospital@test.com',
      patientExists: body.patientExists,
    });
    const fraud_decision_ms = Number((performance.now() - fraudStart).toFixed(2));

    const aiCtx = { procedure, amount, fraud: fraudResult };

    // FROZEN and REVIEW claims never reach PayPal.
    if (fraudResult.decision !== 'APPROVED') {
      const ai = await explainDecision(aiCtx);
      return NextResponse.json({
        decision: fraudResult.decision,
        fraud: fraudResult,
        ai,
        paypal: null,
        fraud_decision_ms,
        execution_time_ms: Date.now() - start,
        message: fraudResult.scenario.summary,
      });
    }

    const [paypalResult, ai] = await Promise.all([
      Promise.all([
        createOrder(fraudResult.tariff, hospitalEmail),
        createPayoutBatch(fraudResult.tariff, hospitalEmail),
      ])
        .then(([order, payout]) => ({ ok: true as const, order, payout }))
        .catch((error: unknown) => ({ ok: false as const, error })),
      explainDecision(aiCtx),
    ]);

    if (!paypalResult.ok) {
      const err = paypalResult.error;
      return NextResponse.json(
        {
          decision: fraudResult.decision,
          fraud: fraudResult,
          ai,
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
      paypal: {
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
  return NextResponse.json({
    status: 'ClaimGuard Pay API - PayPal AI Toolkit',
  });
}
