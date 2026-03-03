// Client-side API service - minimal exposure, maximum security
// All sensitive business logic is now server-side

class EMIService {
  private baseUrl = '';

  // Get public configuration (non-sensitive only)
  async getConfig() {
    try {
      const response = await fetch(`${this.baseUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Config Service Error:', error);
      throw error;
    }
  }

  // EMI calculation (server-side for security)
  async calculateEMI(params: {
    loanAmount: number;
    interestRate: number;
    tenure: number;
    additionalMonths?: number;
    paymentFrequency?: 'monthly' | 'quarterly' | 'half-yearly';
    startDate?: string;
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/api/calculate-emi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('EMI calculation failed');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('EMI Service Error:', error);
      throw error;
    }
  }

  // Risk assessment (sensitive business logic - server only)
  async assessRisk(params: {
    loanAmount: number;
    loanType: string;
    tenure: number;
    monthlyIncome: number;
    existingEMIs?: number;
    age?: number;
    employmentYears?: number;
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/api/risk-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Risk assessment failed');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Risk Assessment Error:', error);
      throw error;
    }
  }

  // Loan approval (confidential algorithm - server only)
  async getLoanApproval(params: {
    creditScore: number;
    monthlyIncome: number;
    existingEMIs?: number;
    requestedLoanAmount: number;
    employmentType: 'SALARIED' | 'SELF-EMPLOYED' | 'BUSINESS';
    employmentMonths: number;
    loanType: string;
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/api/loan-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Loan approval assessment failed');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Loan Approval Error:', error);
      throw error;
    }
  }

  // Validation (server-side rules)
  async validateField(field: string, value: any, loanServiceType?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field, value, loanServiceType }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result = await response.json();
      return result.error;
    } catch (error) {
      console.error('Validation Service Error:', error);
      return 'Validation service unavailable';
    }
  }

  // Lead submission (secure)
  async saveLead(leadData: any) {
    try {
      const response = await fetch(`${this.baseUrl}/api/save-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error('Lead submission failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Lead Service Error:', error);
      throw error;
    }
  }

  // Utility method to format currency (client-side only)
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Utility method to format percentage (client-side only)
  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }
}

export const emiService = new EMIService();
