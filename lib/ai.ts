import type { FraudResult } from './fraud-rules';

export interface AiExplanation {
  text: string;
  model: string;
}

export interface ExplainContext {
  procedure: string;
  amount: number;
  fraud: FraudResult;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 6000;

const SYSTEM_PROMPT =
  'You explain healthcare-claim fraud decisions to a hospital finance officer in Nigeria. ' +
  'The decision was already made by a deterministic rule engine; you must never change or second-guess it. ' +
  'Write 2 to 3 plain-English sentences. Use only the facts provided. ' +
  'Do not invent laws, statistics, or identifiers. No markdown, no bullet points.';

/**
 * Asks Gemini to explain a decision the rule engine already made.
 * Returns null when the key is missing or the call fails, so the caller never shows a made-up explanation.
 * Patient identifiers (NIN, NHIA ID) and the hospital email are deliberately not sent.
 */
export async function explainDecision(ctx: ExplainContext): Promise<AiExplanation | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('[ai] GEMINI_API_KEY is not set; skipping AI explanation');
    return null;
  }

  const { fraud, procedure, amount } = ctx;
  const facts = [
    `Decision: ${fraud.decision}`,
    `Risk score: ${fraud.riskScore}/100`,
    `Procedure: ${procedure}`,
    `Claimed amount: $${amount}`,
    `NHIA statutory tariff: $${fraud.tariff}`,
    `Flags raised: ${fraud.flags.length ? fraud.flags.join(', ') : 'none'}`,
    'Rule checks:',
    ...fraud.checks.map((c) => `- ${c.name}: ${c.status} (${c.detail})`),
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: facts }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
        }),
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      console.error(`[ai] Gemini request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const parts: Array<{ text?: string }> = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? '').join('').trim();
    if (!text) {
      console.error('[ai] Gemini returned no text');
      return null;
    }
    return { text, model: data?.modelVersion || GEMINI_MODEL };
  } catch (e) {
    console.error('[ai] Gemini call error:', e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
