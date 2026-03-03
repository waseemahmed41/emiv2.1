import { NextRequest, NextResponse } from 'next/server';

// Sensitive loan approval logic - moved to backend
const APPROVAL_RULES = {
  // Credit score based approval (confidential)
  CREDIT_SCORE_THRESHOLDS: {
    EXCELLENT: 750,
    GOOD: 700,
    FAIR: 650,
    POOR: 600
  },
  
  // Debt-to-income ratios (confidential)
  DTI_LIMITS: {
    EXCELLENT_CREDIT: 0.5,  // 50%
    GOOD_CREDIT: 0.45,       // 45%
    FAIR_CREDIT: 0.4,        // 40%
    POOR_CREDIT: 0.3         // 30%
  },
  
  // Loan amount limits by credit score (confidential)
  LOAN_LIMITS: {
    EXCELLENT: 100000000,    // 1 Crore
    GOOD: 50000000,          // 50 Lakhs
    FAIR: 25000000,          // 25 Lakhs
    POOR: 10000000           // 10 Lakhs
  },
  
  // Employment stability requirements (confidential)
  EMPLOYMENT_REQUIREMENTS: {
    SALARIED: { MIN_MONTHS: 6, PREFERRED_MONTHS: 24 },
    'SELF-EMPLOYED': { MIN_MONTHS: 24, PREFERRED_MONTHS: 36 },
    BUSINESS: { MIN_MONTHS: 36, PREFERRED_MONTHS: 60 }
  }
};

// Advanced approval algorithm (confidential business logic)
function calculateApprovalScore(params: {
  creditScore: number;
  monthlyIncome: number;
  existingEMIs: number;
  requestedLoanAmount: number;
  employmentType: 'SALARIED' | 'SELF-EMPLOYED' | 'BUSINESS';
  employmentMonths: number;
  loanType: string;
}) {
  let score = 0;
  let factors = [];

  // Credit score scoring (40% weight)
  if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.EXCELLENT) {
    score += 40;
    factors.push('Excellent credit score');
  } else if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.GOOD) {
    score += 32;
    factors.push('Good credit score');
  } else if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.FAIR) {
    score += 24;
    factors.push('Fair credit score');
  } else if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.POOR) {
    score += 16;
    factors.push('Poor credit score');
  }

  // Debt-to-income ratio (30% weight)
  const totalDTI = (params.existingEMIs + (params.requestedLoanAmount * 0.01)) / params.monthlyIncome;
  let dtiLimit = 0.3; // Default poor credit limit
  
  if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.EXCELLENT) {
    dtiLimit = APPROVAL_RULES.DTI_LIMITS.EXCELLENT_CREDIT;
  } else if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.GOOD) {
    dtiLimit = APPROVAL_RULES.DTI_LIMITS.GOOD_CREDIT;
  } else if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.FAIR) {
    dtiLimit = APPROVAL_RULES.DTI_LIMITS.FAIR_CREDIT;
  }

  if (totalDTI <= dtiLimit) {
    score += 30;
    factors.push('Acceptable debt-to-income ratio');
  } else {
    const dtiScore = Math.max(0, 30 * (1 - (totalDTI - dtiLimit) / dtiLimit));
    score += dtiScore;
    factors.push(`High debt-to-income ratio: ${(totalDTI * 100).toFixed(1)}%`);
  }

  // Employment stability (20% weight)
  const req = APPROVAL_RULES.EMPLOYMENT_REQUIREMENTS[params.employmentType];
  if (params.employmentMonths >= req.PREFERRED_MONTHS) {
    score += 20;
    factors.push('Strong employment stability');
  } else if (params.employmentMonths >= req.MIN_MONTHS) {
    score += 12;
    factors.push('Adequate employment stability');
  } else {
    score += 4;
    factors.push('Limited employment history');
  }

  // Loan amount appropriateness (10% weight)
  let maxLoan = APPROVAL_RULES.LOAN_LIMITS.POOR;
  if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.EXCELLENT) {
    maxLoan = APPROVAL_RULES.LOAN_LIMITS.EXCELLENT;
  } else if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.GOOD) {
    maxLoan = APPROVAL_RULES.LOAN_LIMITS.GOOD;
  } else if (params.creditScore >= APPROVAL_RULES.CREDIT_SCORE_THRESHOLDS.FAIR) {
    maxLoan = APPROVAL_RULES.LOAN_LIMITS.FAIR;
  }

  if (params.requestedLoanAmount <= maxLoan) {
    score += 10;
    factors.push('Appropriate loan amount');
  } else {
    const amountScore = Math.max(0, 10 * (1 - (params.requestedLoanAmount - maxLoan) / maxLoan));
    score += amountScore;
    factors.push('High loan amount for credit profile');
  }

  return {
    score: Math.round(score),
    factors,
    maxLoanAmount: maxLoan,
    recommendedDTILimit: dtiLimit
  };
}

// Final approval decision logic (confidential)
function makeApprovalDecision(approvalScore: number, riskFactors: string[]) {
  if (approvalScore >= 80) {
    return {
      approved: true,
      confidence: 'HIGH',
      message: 'Loan application pre-approved',
      recommendedActions: ['Proceed with documentation', 'Fast-track processing available']
    };
  } else if (approvalScore >= 60) {
    return {
      approved: true,
      confidence: 'MEDIUM',
      message: 'Loan application conditionally approved',
      recommendedActions: ['Additional documentation required', 'Manual verification needed']
    };
  } else if (approvalScore >= 40) {
    return {
      approved: false,
      confidence: 'LOW',
      message: 'Loan application requires review',
      recommendedActions: ['Consider reducing loan amount', 'Improve credit score', 'Add co-applicant']
    };
  } else {
    return {
      approved: false,
      confidence: 'VERY_LOW',
      message: 'Loan application declined',
      recommendedActions: ['Wait 3-6 months', 'Improve credit score', 'Reduce existing debts']
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const required = ['creditScore', 'monthlyIncome', 'requestedLoanAmount', 'employmentType', 'employmentMonths', 'loanType'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const params = {
      creditScore: body.creditScore,
      monthlyIncome: body.monthlyIncome,
      existingEMIs: body.existingEMIs || 0,
      requestedLoanAmount: body.requestedLoanAmount,
      employmentType: body.employmentType,
      employmentMonths: body.employmentMonths,
      loanType: body.loanType
    };

    // Calculate approval score
    const approvalResult = calculateApprovalScore(params);
    
    // Make final decision
    const decision = makeApprovalDecision(approvalResult.score, approvalResult.factors);

    return NextResponse.json({
      success: true,
      data: {
        approvalScore: approvalResult.score,
        decision: decision,
        analysis: {
          factors: approvalResult.factors,
          maxLoanAmount: approvalResult.maxLoanAmount,
          recommendedDTILimit: approvalResult.recommendedDTILimit,
          currentDTI: ((params.existingEMIs + (params.requestedLoanAmount * 0.01)) / params.monthlyIncome * 100).toFixed(1) + '%'
        },
        nextSteps: decision.recommendedActions
      }
    });

  } catch (error) {
    console.error('Loan approval error:', error);
    return NextResponse.json(
      { error: 'Loan approval assessment failed' },
      { status: 500 }
    );
  }
}
