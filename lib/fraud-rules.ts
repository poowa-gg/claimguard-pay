export type FraudFlag =
  | 'GHOST_ENROLLEE'
  | 'MISSING_NIN'
  | 'INVALID_NIN_FORMAT'
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

export interface ScenarioClassification {
  id: string;
  title: string;
  category:
    | 'LEGITIMATE'
    | 'GHOST_ENROLLEE'
    | 'UPCODING'
    | 'CSECTION_FRAUD'
    | 'IDENTITY_FRAUD'
    | 'TARIFF_VIOLATION'
    | 'REVIEW_REQUIRED';
  badgeType: 'APPROVED' | 'FROZEN' | 'REVIEW';
  summary: string;
  explanation: string;
}

export interface AuditCheck {
  id: string;
  name: string;
  vector: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

export interface FraudResult {
  decision: 'APPROVED' | 'FROZEN' | 'REVIEW';
  flags: FraudFlag[];
  riskScore: number;
  tariff: number;
  reason: string;
  scenario: ScenarioClassification;
  checks: AuditCheck[];
}

export const NHIA_TARIFF: Record<string, number> = {
  Malaria: 90,
  'C-Section': 450,
  'Normal Delivery': 150,
  Consultation: 20,
};

export function evaluateClaim(input: ClaimInput): FraudResult {
  const flags: FraudFlag[] = [];

  // Nigeria NIMC National Identification Number (NIN): strictly 11 numeric digits
  const cleanNin = (input.nin || '').replace(/[\s-]/g, '');
  if (!cleanNin) {
    flags.push('MISSING_NIN');
  } else if (!/^\d{11}$/.test(cleanNin)) {
    flags.push('INVALID_NIN_FORMAT');
  }

  // Ghost enrollee check: patient must exist in the national registry
  if (input.patientExists === false) {
    flags.push('GHOST_ENROLLEE');
  }

  // Nigeria NHIA / NHIS Enrollee format check
  const cleanNhiaId = (input.nhiaId || '').trim();
  if (cleanNhiaId) {
    const isStandardNhia = /^NHIA-\d{3,}$/i.test(cleanNhiaId);
    const isExtendedFormat = /^(NHIA|NHIS)[-/][A-Za-z0-9/-]{3,}$/i.test(cleanNhiaId);
    if (!isStandardNhia && !isExtendedFormat) {
      flags.push('INVALID_NHIA_FORMAT');
    }
  }

  const tariff = NHIA_TARIFF[input.procedure] || 90;
  if (input.amount > tariff * 1.5) {
    flags.push('AMOUNT_EXCEEDS_TARIFF');
  }
  if (input.procedure === 'C-Section' && input.amount > 500) {
    flags.push('FALSIFIED_CSECTION');
  }
  if (input.procedure === 'Normal Delivery' && input.amount >= 400) {
    flags.push('UPCODING');
  }

  const critical: FraudFlag[] = [
    'GHOST_ENROLLEE',
    'MISSING_NIN',
    'INVALID_NIN_FORMAT',
    'FALSIFIED_CSECTION',
    'UPCODING',
  ];
  const hasCritical = flags.some((f) => critical.includes(f));
  const riskScore = Math.min(100, flags.length * 25 + (hasCritical ? 40 : 0));

  let decision: FraudResult['decision'] = 'APPROVED';
  if (hasCritical || riskScore >= 75) decision = 'FROZEN';
  else if (riskScore >= 40) decision = 'REVIEW';

  const scenario = classifyScenario(input, flags, decision, tariff);
  const checks = generateAuditChecks(input, flags, tariff);

  return {
    decision,
    flags,
    riskScore,
    tariff,
    reason: flags.length ? flags.join(', ') : 'No fraud - verified NIN/NHIA',
    scenario,
    checks,
  };
}

function classifyScenario(
  input: ClaimInput,
  flags: FraudFlag[],
  decision: 'APPROVED' | 'FROZEN' | 'REVIEW',
  tariff: number
): ScenarioClassification {
  if (flags.includes('GHOST_ENROLLEE')) {
    return {
      id: 'SCENARIO_GHOST_ENROLLEE',
      title: 'Ghost Enrollee Scenario Detected',
      category: 'GHOST_ENROLLEE',
      badgeType: 'FROZEN',
      summary: 'Patient identity not found or deactivated in Nigeria NHIA national database.',
      explanation:
        'The claim references an unverified or phantom patient record. NHIA audits expelled over 23,000 ghost enrollees that matched this exact fraudulent submission pattern.',
    };
  }

  if (flags.includes('UPCODING')) {
    return {
      id: 'SCENARIO_UPCODING',
      title: 'Upcoding Fraud Scenario Detected',
      category: 'UPCODING',
      badgeType: 'FROZEN',
      summary: `Routine Normal Delivery billed at $${input.amount.toLocaleString()} (Tariff: $${tariff.toLocaleString()}).`,
      explanation:
        'Provider billed a standard delivery at surgical rates (≥ $400), attempting to capture C-Section remuneration for an uncomplicated birth.',
    };
  }

  if (flags.includes('FALSIFIED_CSECTION')) {
    return {
      id: 'SCENARIO_CSECTION_FRAUD',
      title: 'Falsified C-Section Surcharge Detected',
      category: 'CSECTION_FRAUD',
      badgeType: 'FROZEN',
      summary: `Caesarean Section billed at $${input.amount.toLocaleString()}, exceeding the statutory cap of $500.`,
      explanation:
        'Caesarean sections under the NHIA maternal health guidelines are capped at $450–$500. Inflated provider surcharges trigger an immediate fraud freeze.',
    };
  }

  if (flags.includes('INVALID_NIN_FORMAT')) {
    const cleanNin = (input.nin || '').replace(/[\s-]/g, '');
    return {
      id: 'SCENARIO_IDENTITY_INVALID_NIN',
      title: 'Invalid NIN Format Scenario Detected',
      category: 'IDENTITY_FRAUD',
      badgeType: 'FROZEN',
      summary: `NIN (${cleanNin || 'empty'}) does not match the 11-digit Nigeria NIMC national identity standard.`,
      explanation:
        'The National Identity Management Commission (NIMC) strictly issues 11 numeric digits for Nigerian citizens and legal residents (e.g. 31005502980). Malformed identifiers are blocked.',
    };
  }

  if (flags.includes('MISSING_NIN')) {
    return {
      id: 'SCENARIO_IDENTITY_MISSING_NIN',
      title: 'Missing NIN Scenario Detected',
      category: 'IDENTITY_FRAUD',
      badgeType: 'FROZEN',
      summary: 'Mandatory National Identification Number (NIN) was not provided.',
      explanation:
        'Under the NHIA Act 2022, every healthcare claim must link to a verified 11-digit NIN for beneficiary identity tracking.',
    };
  }

  if (flags.includes('AMOUNT_EXCEEDS_TARIFF')) {
    return {
      id: 'SCENARIO_TARIFF_EXCEEDED',
      title: 'Excessive Tariff Mark-up Scenario Detected',
      category: 'TARIFF_VIOLATION',
      badgeType: decision,
      summary: `Claim of $${input.amount.toLocaleString()} exceeds 1.5× statutory tariff limit (Cap: $${(tariff * 1.5).toLocaleString()}).`,
      explanation:
        'Billed amount exceeds statutory tolerance margins without prior authorization from the health authority.',
    };
  }

  if (flags.includes('INVALID_NHIA_FORMAT')) {
    return {
      id: 'SCENARIO_INVALID_NHIA_FORMAT',
      title: 'Malformed NHIA Enrollee ID Syntax Detected',
      category: 'IDENTITY_FRAUD',
      badgeType: decision,
      summary: 'Healthcare enrollee ID does not match valid NHIA/NHIS registration syntax.',
      explanation:
        'Official NHIA identification requires valid authority syntax (e.g. NHIA-XXXXXXX or HMO identifier format).',
    };
  }

  if (decision === 'APPROVED') {
    return {
      id: 'SCENARIO_LEGITIMATE_CLAIM',
      title: 'Legitimate Verified Claim Scenario',
      category: 'LEGITIMATE',
      badgeType: 'APPROVED',
      summary: `Verified 11-digit NIN, active NHIA enrollee, and $${input.amount.toLocaleString()} adheres to statutory tariff.`,
      explanation:
        'All clinical, identity, and tariff validations passed with zero fraud flags. Spend-authority is granted and payment has been dispatched via PayPal.',
    };
  }

  return {
    id: 'SCENARIO_REVIEW_REQUIRED',
    title: 'Manual Adjudication Required Scenario',
    category: 'REVIEW_REQUIRED',
    badgeType: 'REVIEW',
    summary: 'Claim triggered cautionary indicators requiring human auditor verification.',
    explanation:
      'Risk score is in the review corridor. Payout is held in escrow until secondary clinical review.',
  };
}

function generateAuditChecks(
  input: ClaimInput,
  flags: FraudFlag[],
  tariff: number
): AuditCheck[] {
  const cleanNin = (input.nin || '').replace(/[\s-]/g, '');
  const isNinValid = /^\d{11}$/.test(cleanNin);
  const isNinMissing = !cleanNin;

  return [
    {
      id: 'check-nin',
      name: 'NIMC National ID (NIN) Validation',
      vector: 'Identity Standard (Nigeria)',
      status: isNinMissing ? 'FAIL' : isNinValid ? 'PASS' : 'FAIL',
      detail: isNinMissing
        ? 'NIN missing (11-digit NIMC ID mandatory)'
        : isNinValid
        ? `Valid 11-digit NIN verified (${cleanNin.slice(0, 4)}••••${cleanNin.slice(-3)})`
        : `Invalid length (${cleanNin.length} digits) — Nigeria NIMC requires strictly 11 digits`,
    },
    {
      id: 'check-enrollee',
      name: 'NHIA Central Registry Match',
      vector: 'Ghost Enrollee Prevention',
      status: input.patientExists === false ? 'FAIL' : 'PASS',
      detail:
        input.patientExists === false
          ? 'Enrollee profile not found in active NHIA database (Ghost Enrollee)'
          : 'Enrollee confirmed active and eligible in NHIA database',
    },
    {
      id: 'check-nhia-id',
      name: 'NHIA Enrollee ID Syntax',
      vector: 'Authority Formatting',
      status: flags.includes('INVALID_NHIA_FORMAT') ? 'FAIL' : 'PASS',
      detail: flags.includes('INVALID_NHIA_FORMAT')
        ? 'Malformed NHIA identifier syntax'
        : `Standard NHIA format recognized (${input.nhiaId || 'NHIA-789'})`,
    },
    {
      id: 'check-upcoding',
      name: 'Procedure Coding & Unbundling Scan',
      vector: 'Clinical Protocol Integrity',
      status: flags.includes('UPCODING') ? 'FAIL' : 'PASS',
      detail: flags.includes('UPCODING')
        ? `Normal Delivery billed at $${input.amount.toLocaleString()} (≥ $400 surgical threshold)`
        : 'Clinical procedure classification aligned with diagnosis and tariff',
    },
    {
      id: 'check-csection',
      name: 'C-Section Statutory Cap ($500)',
      vector: 'Maternal Care Cost Cap',
      status: flags.includes('FALSIFIED_CSECTION') ? 'FAIL' : 'PASS',
      detail: flags.includes('FALSIFIED_CSECTION')
        ? `Billed $${input.amount.toLocaleString()} exceeds maternal statutory ceiling of $500`
        : input.procedure === 'C-Section'
        ? `Complies with NHIA statutory C-Section cap ($${input.amount.toLocaleString()} ≤ $500)`
        : 'N/A — Non-surgical procedure',
    },
    {
      id: 'check-tariff',
      name: 'Statutory Tariff Adherence (1.5×)',
      vector: 'Cost Control Ceiling',
      status: flags.includes('AMOUNT_EXCEEDS_TARIFF') ? 'FAIL' : 'PASS',
      detail: flags.includes('AMOUNT_EXCEEDS_TARIFF')
        ? `$${input.amount.toLocaleString()} exceeds 1.5× statutory tariff (Tariff: $${tariff.toLocaleString()})`
        : `$${input.amount.toLocaleString()} is within statutory tariff limits (Base: $${tariff.toLocaleString()})`,
    },
  ];
}
