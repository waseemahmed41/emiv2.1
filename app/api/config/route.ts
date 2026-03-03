import { NextRequest, NextResponse } from 'next/server';

// Secure configuration - all sensitive data moved to backend
const SECURE_CONFIG = {
  // API configurations (hidden from client)
  EXTERNAL_APIS: {
    CREDIT_BUREAU: {
      URL: process.env.CREDIT_BUREAU_API_URL,
      KEY: process.env.CREDIT_BUREAU_API_KEY,
      TIMEOUT: 30000
    },
    BANK_VERIFICATION: {
      URL: process.env.BANK_VERIFICATION_URL,
      KEY: process.env.BANK_VERIFICATION_KEY,
      TIMEOUT: 15000
    },
    SMS_GATEWAY: {
      URL: process.env.SMS_GATEWAY_URL,
      KEY: process.env.SMS_GATEWAY_KEY,
      SENDER: process.env.SMS_SENDER_ID
    }
  },
  
  // Database configurations (hidden from client)
  DATABASE: {
    ENCRYPTION_KEY: process.env.DB_ENCRYPTION_KEY,
    SALT: process.env.DB_SALT,
    CONNECTION_STRING: process.env.DATABASE_URL,
    POOL_SIZE: 10
  },
  
  // Business constants (hidden from client)
  BUSINESS_CONSTANTS: {
    MAX_APPLICATIONS_PER_DAY: 5,
    MIN_CREDIT_SCORE_AUTO_APPROVAL: 750,
    MAX_LOAN_AMOUNT_AUTO_APPROVAL: 25000000,
    INTEREST_RATE_FLOOR: 6.5,
    INTEREST_RATE_CEILING: 24.0,
    PROCESSING_FEE_RATE: 0.02,
    LATE_PAYMENT_PENALTY_RATE: 0.02
  },
  
  // Security settings (hidden from client)
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: '24h',
    SESSION_TIMEOUT: 1800000, // 30 minutes
    MAX_LOGIN_ATTEMPTS: 3,
    LOCKOUT_DURATION: 900000 // 15 minutes
  }
};

// Secure API key validation
function validateAPIKey(request: NextRequest, requiredAPI: string): boolean {
  const providedKey = request.headers.get('x-api-key');
  const expectedKey = SECURE_CONFIG.EXTERNAL_APIS[requiredAPI as keyof typeof SECURE_CONFIG.EXTERNAL_APIS]?.KEY;
  
  return providedKey === expectedKey;
}

// Encrypt sensitive data before processing
function encryptSensitiveData(data: any): string {
  // In production, use proper encryption like AES-256
  // This is just a placeholder for demonstration
  const jsonString = JSON.stringify(data);
  return Buffer.from(jsonString).toString('base64');
}

// Decrypt sensitive data
function decryptSensitiveData(encryptedData: string): any {
  // In production, use proper decryption
  // This is just a placeholder for demonstration
  const jsonString = Buffer.from(encryptedData, 'base64').toString();
  return JSON.parse(jsonString);
}

// Rate limiting configuration
const RATE_LIMITS = {
  '/api/risk-assessment': { max: 10, window: 60000 }, // 10 requests per minute
  '/api/loan-approval': { max: 5, window: 300000 },   // 5 requests per 5 minutes
  '/api/calculate-emi': { max: 100, window: 60000 },  // 100 requests per minute
  '/api/save-lead': { max: 3, window: 300000 }        // 3 requests per 5 minutes
};

// Rate limiting middleware logic
const requestCounts = new Map();

function checkRateLimit(path: string, ip: string): boolean {
  const key = `${path}:${ip}`;
  const now = Date.now();
  const limit = RATE_LIMITS[path as keyof typeof RATE_LIMITS];
  
  if (!limit) return true;
  
  const requests = requestCounts.get(key) || [];
  const validRequests = requests.filter((timestamp: number) => now - timestamp < limit.window);
  
  if (validRequests.length >= limit.max) {
    return false;
  }
  
  validRequests.push(now);
  requestCounts.set(key, validRequests);
  
  // Clean up old entries
  setTimeout(() => {
    const oldRequests = requestCounts.get(key) || [];
    const stillValid = oldRequests.filter((timestamp: number) => Date.now() - timestamp < limit.window);
    if (stillValid.length === 0) {
      requestCounts.delete(key);
    }
  }, limit.window);
  
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const path = '/api/config';
    
    // Check rate limit
    if (!checkRateLimit(path, ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Return only non-sensitive configuration to client
    const publicConfig = {
      features: {
        maxLoanAmount: 50000000,
        minLoanAmount: 10000,
        supportedLoanTypes: ['home loan', 'personal loan', 'car loan', 'educational loan', 'business loan', 'mortgage loan', 'loan against property'],
        maxTenure: 30,
        minTenure: 1
      },
      ui: {
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'en-IN'
      },
      apiEndpoints: {
        calculateEMI: '/api/calculate-emi',
        riskAssessment: '/api/risk-assessment',
        loanApproval: '/api/loan-approval',
        saveLead: '/api/save-lead',
        validate: '/api/validate'
      }
    };

    return NextResponse.json({
      success: true,
      data: publicConfig
    });

  } catch (error) {
    console.error('Config error:', error);
    return NextResponse.json(
      { error: 'Configuration fetch failed' },
      { status: 500 }
    );
  }
}

export { validateAPIKey, encryptSensitiveData, decryptSensitiveData, SECURE_CONFIG };
