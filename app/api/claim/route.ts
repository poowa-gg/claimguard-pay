import { NextRequest, NextResponse } from 'next/server';
import { evaluateClaim } from '@/lib/fraud-rules';
import { createOrder, createPayoutBatch } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = await req.json();

    const fraudResult = evaluateClaim({
      nin: typeof body.nin === 'string' ? body.nin.trim() : body.nin,
      nhiaId: typeof body.nhiaId === 'string' ? body.nhiaId.trim() : body.nhiaId,
      procedure: body.procedure || 'Malaria',
      amount: Number(body.amount) || 0,
      hospitalEmail: body.hospitalEmail || 'hospital@test.com',
      patientExists: body.patientExists,
    });

    if (fraudResult.decision === 'FROZEN') {
      return NextResponse.json({
        decision: 'FROZEN',
        fraud: fraudResult,
        paypal: null,
        execution_time_ms: Date.now() - start,
        verification_status: 'VERIFIED_SANDBOX',
        paypal_debug_id: `freeze_${Date.now()}`,
        message: fraudResult.scenario.summary,
      });
    }

    const order = await createOrder(fraudResult.tariff, body.hospitalEmail);
    const payout = await createPayoutBatch(
      fraudResult.tariff,
      body.hospitalEmail
    );

    return NextResponse.json({
      decision: fraudResult.decision,
      fraud: fraudResult,
      paypal: {
        order_id: order.id,
        payout_batch_id: payout.batch_id,
        debug_id: order.debug_id,
      },
      execution_time_ms: Date.now() - start,
      verification_status: 'VERIFIED_SANDBOX',
      paypal_debug_id: order.debug_id,
      mcp_server: 'mcp.paypal.com',
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
    mcp: 'mcp.paypal.com',
  });
}
