import { randomUUID } from 'crypto';

const PAYPAL_BASE =
  process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public debugId?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PayPalError';
  }
}

export interface PayPalOrder {
  id: string;
  status: string;
  debug_id: string | null;
}

export interface PayPalPayout {
  batch_id: string;
  status: string;
  debug_id: string | null;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new PayPalError('PayPal credentials are not configured', 500);
  }

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new PayPalError(
      `PayPal auth failed (${res.status})`,
      res.status,
      res.headers.get('paypal-debug-id') ?? undefined
    );
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };
  return tokenCache.token;
}

async function paypalPost<T>(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<{ data: T; debugId: string | null }> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const debugId = res.headers.get('paypal-debug-id');
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new PayPalError(
      data?.message || data?.name || `PayPal request failed (${res.status})`,
      res.status,
      debugId ?? undefined,
      data?.details
    );
  }
  return { data: data as T, debugId };
}

const money = (n: number) => n.toFixed(2);

export async function createOrder(
  amount: number,
  hospitalEmail: string
): Promise<PayPalOrder> {
  const { data, debugId } = await paypalPost<{ id: string; status: string }>(
    '/v2/checkout/orders',
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: money(amount) },
          payee: { email_address: hospitalEmail },
          description: 'ClaimGuard Pay verified healthcare claim',
        },
      ],
    },
    { 'PayPal-Request-Id': randomUUID() }
  );
  return { id: data.id, status: data.status, debug_id: debugId };
}

export async function createPayoutBatch(
  amount: number,
  hospitalEmail: string
): Promise<PayPalPayout> {
  const { data, debugId } = await paypalPost<{
    batch_header: { payout_batch_id: string; batch_status: string };
  }>('/v1/payments/payouts', {
    sender_batch_header: {
      sender_batch_id: randomUUID(),
      email_subject: 'ClaimGuard Pay: verified claim payout',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: { value: money(amount), currency: 'USD' },
        receiver: hospitalEmail,
        sender_item_id: randomUUID(),
      },
    ],
  });
  return {
    batch_id: data.batch_header.payout_batch_id,
    status: data.batch_header.batch_status,
    debug_id: debugId,
  };
}
