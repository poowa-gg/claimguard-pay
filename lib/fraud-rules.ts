export type FraudFlag =
  | 'GHOST_ENROLLEE'
  | 'MISSING_NIN'
  | 'INVALID_NHIA_FORMAT'
  | 'AMOUNT_EXCEEDS_TARIFF'
  | 'FALSIFIED_CSECTION'
  | 'UPCODING'
  | 'DUPLICATE_CLAIM'
  | 'PHANTOM_BILLING';

export interface ClaimInput {
  nin?: string | null;
  nhiaId?: string | null;
  procedure: string;
  amount: number;
  hospitalEmail: string;
  patientExists?: boolean;
}

export interface FraudResult {
  decision: 'APPROVED' | 'FROZEN' | 'REVIEW';
  flags: FraudFlag[];
  riskScore: number;
  tariff: number;
  reason: string;
}

const NHIA_TARIFF: Record<string, number> = {
  Malaria: 9000,
  'C-Section': 45000,
  'Normal Delivery': 15000,
  Consultation: 2000,
};

export function evaluateClaim(input: ClaimInput): FraudResult {
  const flags: FraudFlag[] = [];

  if (!input.nin) flags.push('MISSING_NIN');
  if (input.patientExists === false) flags.push('GHOST_ENROLLEE');
  if (input.nhiaId && !/^NHIA-\d{3,}$/.test(input.nhiaId))
    flags.push('INVALID_NHIA_FORMAT');

  const tariff = NHIA_TARIFF[input.procedure] || 9000;
  if (input.amount > tariff * 1.5) flags.push('AMOUNT_EXCEEDS_TARIFF');
  if (input.procedure === 'C-Section' && input.amount > 50000)
    flags.push('FALSIFIED_CSECTION');
  if (input.procedure === 'Normal Delivery' && input.amount >= 40000)
    flags.push('UPCODING');

  const critical: FraudFlag[] = [
    'GHOST_ENROLLEE',
    'MISSING_NIN',
    'FALSIFIED_CSECTION',
  ];
  const hasCritical = flags.some((f) => critical.includes(f));
  const riskScore = Math.min(100, flags.length * 25 + (hasCritical ? 40 : 0));

  let decision: FraudResult['decision'] = 'APPROVED';
  if (hasCritical || riskScore >= 75) decision = 'FROZEN';
  else if (riskScore >= 40) decision = 'REVIEW';

  return {
    decision,
    flags,
    riskScore,
    tariff,
    reason: flags.length ? flags.join(', ') : 'No fraud - verified NIN/NHIA',
  };
}
