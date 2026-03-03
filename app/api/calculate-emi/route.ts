import { NextRequest, NextResponse } from 'next/server';

// EMI calculation logic moved to server-side
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanAmount, interestRate, tenure, additionalMonths, paymentFrequency, startDate } = body;

    // Validate inputs
    if (!loanAmount || loanAmount <= 0) {
      return NextResponse.json(
        { error: 'Loan amount must be greater than 0' },
        { status: 400 }
      );
    }

    const principal = Number(loanAmount);
    const monthlyRate = interestRate / 12 / 100;
    const totalMonths = tenure * 12 + (additionalMonths || 0);

    if (principal <= 0 || monthlyRate <= 0 || totalMonths <= 0) {
      return NextResponse.json(
        { error: 'Invalid loan parameters' },
        { status: 400 }
      );
    }

    // Calculate monthly EMI
    const monthlyEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    if (!isFinite(monthlyEMI) || isNaN(monthlyEMI)) {
      return NextResponse.json(
        { error: 'Invalid EMI calculation' },
        { status: 400 }
      );
    }

    // Calculate payment amount based on frequency
    let paymentAmount: number;
    let periodsPerYear: number;
    
    switch (paymentFrequency) {
      case 'quarterly':
        paymentAmount = Math.round((monthlyEMI * 3 + Number.EPSILON) * 100) / 100;
        periodsPerYear = 4;
        break;
      case 'half-yearly':
        paymentAmount = Math.round((monthlyEMI * 6 + Number.EPSILON) * 100) / 100;
        periodsPerYear = 2;
        break;
      default: // monthly
        paymentAmount = Math.round((monthlyEMI + Number.EPSILON) * 100) / 100;
        periodsPerYear = 12;
    }

    const totalPayment = Math.round((monthlyEMI * totalMonths + Number.EPSILON) * 100) / 100;
    const totalInterest = Math.round((totalPayment - principal + Number.EPSILON) * 100) / 100;

    // Generate monthly data
    const monthlyData = [];
    let remainingBalance = principal;
    const start = new Date(startDate || new Date());

    for (let month = 1; month <= totalMonths; month++) {
      const interestPayment = Math.round((remainingBalance * monthlyRate + Number.EPSILON) * 100) / 100;
      const principalPayment = Math.round((monthlyEMI - interestPayment + Number.EPSILON) * 100) / 100;
      remainingBalance = Math.round((remainingBalance - principalPayment + Number.EPSILON) * 100) / 100;

      const currentDate = new Date(start);
      currentDate.setMonth(currentDate.getMonth() + month - 1);

      monthlyData.push({
        month,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, remainingBalance),
        date: currentDate.toISOString()
      });
    }

    // Generate frequency-specific data
    const frequencyData = [];
    remainingBalance = principal;
    const totalPeriods = Math.floor(totalMonths / (12 / periodsPerYear));
    
    for (let period = 1; period <= totalPeriods; period++) {
      let periodPrincipal = 0;
      let periodInterest = 0;
      const monthsInPeriod = 12 / periodsPerYear;
      
      for (let i = 0; i < monthsInPeriod; i++) {
        const monthIndex = (period - 1) * monthsInPeriod + i;
        if (monthIndex < monthlyData.length) {
          periodPrincipal += monthlyData[monthIndex].principal;
          periodInterest += monthlyData[monthIndex].interest;
        }
      }
      
      remainingBalance -= periodPrincipal;
      
      const currentDate = new Date(start);
      if (paymentFrequency === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + (period - 1) * 3);
      } else if (paymentFrequency === 'half-yearly') {
        currentDate.setMonth(currentDate.getMonth() + (period - 1) * 6);
      } else {
        currentDate.setMonth(currentDate.getMonth() + period - 1);
      }

      frequencyData.push({
        period,
        principal: Math.round((periodPrincipal + Number.EPSILON) * 100) / 100,
        interest: Math.round((periodInterest + Number.EPSILON) * 100) / 100,
        balance: Math.max(0, Math.round((remainingBalance + Number.EPSILON) * 100) / 100),
        date: currentDate.toISOString()
      });
    }

    const emiData = {
      emi: paymentAmount,
      totalInterest,
      totalPayment,
      paymentFrequency,
      monthlyData,
      frequencyData
    };

    return NextResponse.json(
      { success: true, data: emiData },
      { status: 200 }
    );

  } catch (error) {
    console.error('EMI calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate EMI: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
