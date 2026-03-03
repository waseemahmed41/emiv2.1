import { NextRequest, NextResponse } from 'next/server';

// Validation logic moved to server-side
const loanThresholds = {
  'home loan': {
    minAmount: 100000,
    maxAmount: 50000000,
    minInterest: 7,
    maxInterest: 15,
    minTenure: 5,
    maxTenure: 30,
  },
  'personal loan': {
    minAmount: 10000,
    maxAmount: 1500000,
    minInterest: 10,
    maxInterest: 36,
    minTenure: 1,
    maxTenure: 7,
  },
  'car loan': {
    minAmount: 50000,
    maxAmount: 4000000,
    minInterest: 7,
    maxInterest: 20,
    minTenure: 1,
    maxTenure: 7,
  },
  'educational loan': {
    minAmount: 10000,
    maxAmount: 4000000,
    minInterest: 6.5,
    maxInterest: 16,
    minTenure: 1,
    maxTenure: 15,
  },
  'mortgage loan': {
    minAmount: 100000,
    maxAmount: 10000000,
    minInterest: 8,
    maxInterest: 21,
    minTenure: 1,
    maxTenure: 20,
  },
  'loan against property': {
    minAmount: 100000,
    maxAmount: 700000000,
    minInterest: 8,
    maxInterest: 21,
    minTenure: 1,
    maxTenure: 20,
  },
  'business loan': {
    minAmount: 50000,
    maxAmount: 10000000,
    minInterest: 8,
    maxInterest: 24,
    minTenure: 1,
    maxTenure: 10,
  },
  'custom': {
    minAmount: 1000,
    maxAmount: 100000000,
    minInterest: 1,
    maxInterest: 40,
    minTenure: 1,
    maxTenure: 30,
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { field, value, loanServiceType } = body;

    let error: string | undefined;

    switch (field) {
      case 'loanAmount':
        const loanAmount = Number(value);
        if (isNaN(loanAmount) || loanAmount <= 0) {
          error = 'Loan amount must be a positive number greater than 0';
        } else if (loanServiceType && loanServiceType in loanThresholds) {
          const thresholds = loanThresholds[loanServiceType as keyof typeof loanThresholds];
          if (loanAmount < thresholds.minAmount) {
            error = `Minimum loan amount for ${loanServiceType} is ₹${thresholds.minAmount.toLocaleString('en-IN')}`;
          } else if (loanAmount > thresholds.maxAmount) {
            error = `Maximum loan amount for ${loanServiceType} is ₹${thresholds.maxAmount.toLocaleString('en-IN')}`;
          }
        }
        break;

      case 'interestRate':
        const interestRate = Number(value);
        if (isNaN(interestRate) || interestRate < 0) {
          error = 'Interest rate must be a positive number';
        } else if (loanServiceType && loanServiceType in loanThresholds) {
          const thresholds = loanThresholds[loanServiceType as keyof typeof loanThresholds];
          if (interestRate < thresholds.minInterest) {
            error = `Minimum interest rate for ${loanServiceType} is ${thresholds.minInterest}%`;
          } else if (interestRate > thresholds.maxInterest) {
            error = `Maximum interest rate for ${loanServiceType} is ${thresholds.maxInterest}%`;
          }
        }
        break;

      case 'tenure':
        const tenure = Number(value);
        if (isNaN(tenure) || tenure < 0) {
          error = 'Tenure must be a positive number';
        } else if (loanServiceType && loanServiceType in loanThresholds) {
          const thresholds = loanThresholds[loanServiceType as keyof typeof loanThresholds];
          if (tenure < thresholds.minTenure) {
            error = `Minimum tenure for ${loanServiceType} is ${thresholds.minTenure} years`;
          } else if (tenure > thresholds.maxTenure) {
            error = `Maximum tenure for ${loanServiceType} is ${thresholds.maxTenure} years`;
          }
        }
        break;

      case 'additionalMonths':
        const additionalMonths = Number(value);
        if (isNaN(additionalMonths) || additionalMonths < 0 || additionalMonths > 12) {
          error = 'Additional months must be between 0 and 12';
        }
        break;

      case 'name':
        const name = String(value);
        if (!name || name.trim().length < 2) {
          error = 'Name must be at least 2 characters long';
        } else if (!/^[a-zA-Z\s.]+$/.test(name)) {
          error = 'Name can only contain letters, spaces, and dots';
        }
        break;

      case 'email':
        const email = String(value);
        if (!email || email.trim().length === 0) {
          error = 'Email is required';
        } else {
          const emailRegex = /^[^\s@]+@(gmail\.com|microsoft\.com)$/;
          if (!emailRegex.test(email.toLowerCase())) {
            error = 'Only Gmail and Microsoft email addresses are allowed';
          }
        }
        break;

      case 'phone':
        const phone = String(value);
        if (!phone || phone.trim().length === 0) {
          error = 'Phone number is required';
        } else {
          const digitsOnly = phone.replace(/\D/g, '');
          if (digitsOnly.length !== 10) {
            error = 'Phone number must be 10 digits';
          } else {
            const firstDigit = digitsOnly.charAt(0);
            if (!['6', '7', '8', '9'].includes(firstDigit)) {
              error = 'Invalid Indian mobile number. Must start with 6, 7, 8, or 9';
            }
          }
        }
        break;

      default:
        error = 'Unknown field for validation';
    }

    return NextResponse.json(
      { success: true, error: error || null },
      { status: 200 }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
