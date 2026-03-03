import { NextRequest, NextResponse } from 'next/server';

// Sensitive business logic - moved to backend
const BUSINESS_RULES = {
  // Risk assessment thresholds (confidential)
  RISK_THRESHOLDS: {
    HIGH_RISK_MAX_EMI_RATIO: 0.5, // 50% of monthly income
    MEDIUM_RISK_MAX_EMI_RATIO: 0.4, // 40% of monthly income
    LOW_RISK_MAX_EMI_RATIO: 0.3, // 30% of monthly income
    MIN_CREDIT_SCORE: 650,
    MAX_LOAN_AMOUNT: 50000000, // 50 Lakhs
  },
  
  // Interest rate calculation logic (confidential)
  INTEREST_RATE_FORMULA: {
    BASE_RATE: 8.5,
    RISK_PREMIUM: {
      LOW: 0.5,
      MEDIUM: 1.5,
      HIGH: 3.0
    },
    LOAN_TYPE_MULTIPLIER: {
      'home loan': 1.0,
      'personal loan': 1.8,
      'car loan': 1.3,
      'educational loan': 0.8,
      'business loan': 2.2,
      'mortgage loan': 1.1,
      'loan against property': 1.2
    }
  },
  
  // Eligibility criteria (confidential)
  ELIGIBILITY: {
    MIN_AGE: 21,
    MAX_AGE: 60,
    MIN_INCOME: 25000,
    MIN_EMPLOYMENT_YEARS: 1,
    MAX_EXISTING_EMIS: 5
  }
};

// Risk assessment logic (confidential business logic)
function calculateRiskScore(params: {
  monthlyIncome: number;
  existingEMIs: number;
  requestedEMI: number;
  loanAmount: number;
  loanType: string;
  tenure: number;
}) {
  let riskScore = 0;
  
  // EMI to income ratio calculation
  const totalEMI = (params.existingEMIs || 0) + params.requestedEMI;
  const emiRatio = totalEMI / params.monthlyIncome;
  
  if (emiRatio > BUSINESS_RULES.RISK_THRESHOLDS.HIGH_RISK_MAX_EMI_RATIO) {
    riskScore += 40;
  } else if (emiRatio > BUSINESS_RULES.RISK_THRESHOLDS.MEDIUM_RISK_MAX_EMI_RATIO) {
    riskScore += 25;
  } else if (emiRatio > BUSINESS_RULES.RISK_THRESHOLDS.LOW_RISK_MAX_EMI_RATIO) {
    riskScore += 10;
  }
  
  // Loan amount risk
  if (params.loanAmount > BUSINESS_RULES.RISK_THRESHOLDS.MAX_LOAN_AMOUNT * 0.8) {
    riskScore += 20;
  }
  
  // Loan type risk
  const loanTypeRisk = BUSINESS_RULES.INTEREST_RATE_FORMULA.LOAN_TYPE_MULTIPLIER[params.loanType as keyof typeof BUSINESS_RULES.INTEREST_RATE_FORMULA.LOAN_TYPE_MULTIPLIER] || 1.5;
  if (loanTypeRisk > 1.5) riskScore += 15;
  else if (loanTypeRisk > 1.2) riskScore += 8;
  
  // Tenure risk
  if (params.tenure > 20) riskScore += 10;
  else if (params.tenure > 15) riskScore += 5;
  
  return Math.min(riskScore, 100);
}

// Calculate interest rate based on risk (confidential formula)
function calculateInterestRate(loanType: string, riskScore: number): number {
  const baseRate = BUSINESS_RULES.INTEREST_RATE_FORMULA.BASE_RATE;
  const loanMultiplier = BUSINESS_RULES.INTEREST_RATE_FORMULA.LOAN_TYPE_MULTIPLIER[loanType as keyof typeof BUSINESS_RULES.INTEREST_RATE_FORMULA.LOAN_TYPE_MULTIPLIER] || 1.5;
  
  let riskPremium = 0;
  if (riskScore > 60) riskPremium = BUSINESS_RULES.INTEREST_RATE_FORMULA.RISK_PREMIUM.HIGH;
  else if (riskScore > 30) riskPremium = BUSINESS_RULES.INTEREST_RATE_FORMULA.RISK_PREMIUM.MEDIUM;
  else riskPremium = BUSINESS_RULES.INTEREST_RATE_FORMULA.RISK_PREMIUM.LOW;
  
  return Math.round((baseRate * loanMultiplier + riskPremium) * 100) / 100;
}

// Eligibility check (confidential business rules)
function checkEligibility(params: {
  age?: number;
  monthlyIncome: number;
  employmentYears?: number;
  existingEMIs?: number;
  loanAmount: number;
}) {
  const issues = [];
  
  if (params.monthlyIncome < BUSINESS_RULES.ELIGIBILITY.MIN_INCOME) {
    issues.push(`Minimum income requirement is ₹${BUSINESS_RULES.ELIGIBILITY.MIN_INCOME.toLocaleString()}`);
  }
  
  if (params.loanAmount > BUSINESS_RULES.RISK_THRESHOLDS.MAX_LOAN_AMOUNT) {
    issues.push(`Maximum loan amount is ₹${BUSINESS_RULES.RISK_THRESHOLDS.MAX_LOAN_AMOUNT.toLocaleString()}`);
  }
  
  if (params.age && (params.age < BUSINESS_RULES.ELIGIBILITY.MIN_AGE || params.age > BUSINESS_RULES.ELIGIBILITY.MAX_AGE)) {
    issues.push(`Age must be between ${BUSINESS_RULES.ELIGIBILITY.MIN_AGE} and ${BUSINESS_RULES.ELIGIBILITY.MAX_AGE} years`);
  }
  
  if (params.employmentYears && params.employmentYears < BUSINESS_RULES.ELIGIBILITY.MIN_EMPLOYMENT_YEARS) {
    issues.push(`Minimum employment period is ${BUSINESS_RULES.ELIGIBILITY.MIN_EMPLOYMENT_YEARS} year`);
  }
  
  return {
    eligible: issues.length === 0,
    issues,
    maxLoanAmount: Math.min(params.monthlyIncome * 60, BUSINESS_RULES.RISK_THRESHOLDS.MAX_LOAN_AMOUNT)
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      loanAmount, 
      loanType, 
      tenure, 
      monthlyIncome, 
      existingEMIs = 0,
      age,
      employmentYears 
    } = body;

    // Calculate EMI first
    const interestRate = calculateInterestRate(loanType, 50); // Default risk score
    const monthlyRate = interestRate / 12 / 100;
    const totalMonths = tenure * 12;
    const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

    // Risk assessment
    const riskScore = calculateRiskScore({
      monthlyIncome,
      existingEMIs,
      requestedEMI: emi,
      loanAmount,
      loanType,
      tenure
    });

    // Eligibility check
    const eligibility = checkEligibility({
      age,
      monthlyIncome,
      employmentYears,
      existingEMIs,
      loanAmount
    });

    // Calculate recommended interest rate based on risk
    const recommendedRate = calculateInterestRate(loanType, riskScore);

    return NextResponse.json({
      success: true,
      data: {
        riskScore,
        riskLevel: riskScore > 60 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW',
        recommendedInterestRate: recommendedRate,
        eligibility,
        emi: Math.round(emi),
        businessInsights: {
          emiToIncomeRatio: ((emi + (existingEMIs || 0)) / monthlyIncome * 100).toFixed(1) + '%',
          maxRecommendedEMI: monthlyIncome * BUSINESS_RULES.RISK_THRESHOLDS.LOW_RISK_MAX_EMI_RATIO,
          riskFactors: {
            highEMIRatio: ((emi + (existingEMIs || 0)) / monthlyIncome) > BUSINESS_RULES.RISK_THRESHOLDS.HIGH_RISK_MAX_EMI_RATIO,
            highLoanAmount: loanAmount > BUSINESS_RULES.RISK_THRESHOLDS.MAX_LOAN_AMOUNT * 0.8,
            riskyLoanType: BUSINESS_RULES.INTEREST_RATE_FORMULA.LOAN_TYPE_MULTIPLIER[loanType as keyof typeof BUSINESS_RULES.INTEREST_RATE_FORMULA.LOAN_TYPE_MULTIPLIER] > 1.5
          }
        }
      }
    });

  } catch (error) {
    console.error('Risk assessment error:', error);
    return NextResponse.json(
      { error: 'Risk assessment failed' },
      { status: 500 }
    );
  }
}
