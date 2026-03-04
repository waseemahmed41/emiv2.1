'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, PieChart, Pie, Cell } from 'recharts';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface EMIData {
  emi: number;
  totalInterest: number;
  totalPayment: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'half-yearly';
  monthlyData: Array<{
    month: number;
    principal: number;
    interest: number;
    balance: number;
    date: Date;
  }>;
  frequencyData: Array<{
    period: number;
    principal: number;
    interest: number;
    balance: number;
    date: Date;
  }>;
}

interface LeadForm {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  service: string;
  message: string;
}

interface LeadData {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  loanAmount?: number;
  interestRate?: number;
  tenure?: number;
  paymentFrequency?: string;
}

interface ValidationErrors {
  loanAmount?: string;
  interestRate?: string;
  tenure?: string;
  additionalMonths?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export default function EMICalculator() {
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState(6);
  const [tenure, setTenure] = useState(6);
  const [additionalMonths, setAdditionalMonths] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'quarterly' | 'half-yearly'>('monthly');
  const [emiData, setEMIData] = useState<EMIData | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(true);
  const [showEMICalculator, setShowEMICalculator] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>({ name: '', email: '', phone: '', countryCode: '+91', service: '', message: '' });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isClient, setIsClient] = useState(false);

  // Fix hydration mismatch by setting isClient only on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
  const [phoneValidationError, setPhoneValidationError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loanServiceType, setLoanServiceType] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [existingEMIs, setExistingEMIs] = useState<number | null>(null);

  // Interest rate information configuration
  const interestInfo = {
    'home loan': {
      range: '7% – 15%',
      bands: [
        { color: 'green', text: '7–9% → Prime borrowers, strong CIBIL (750+), salaried profile' },
        { color: 'yellow', text: '9–12% → Standard floating rate segment' },
        { color: 'red', text: '12–15% → Higher-risk profile / self-employed' }
      ]
    },
    'personal loan': {
      range: '10% – 36%',
      bands: [
        { color: 'green', text: '10–15% → Excellent credit score, stable salaried applicant' },
        { color: 'yellow', text: '15–24% → Average credit profile' },
        { color: 'red', text: '24–36% → Low credit score / fintech NBFC segment' }
      ]
    },
    'car loan': {
      range: '7% – 20%',
      bands: [
        { color: 'green', text: '7–10% → New car, strong credit' },
        { color: 'yellow', text: '10–15% → Standard borrower' },
        { color: 'red', text: '15–20% → Used car / lower credit' }
      ]
    },
    'educational loan': {
      range: '6.5% – 16%',
      bands: [
        { color: 'green', text: '6.5–9% → Government schemes / secured education loans / premier institutions' },
        { color: 'yellow', text: '9–13% → Standard bank education loan segment' },
        { color: 'red', text: '13–16% → Private lenders / overseas unsecured education loans (Overseas and unsecured education loans generally carry higher interest rates.)' }
      ]
    },
    'business loan': {
      range: '8% – 24%',
      bands: [
        { color: 'green', text: '8–12% → Secured / strong MSME' },
        { color: 'yellow', text: '12–18% → Standard unsecured MSME' },
        { color: 'red', text: '18–24% → High-risk lending' }
      ]
    },
    'mortgage loan': {
      range: '8% – 21%',
      bands: [
        { color: 'green', text: '8–12% → Strong collateral profile' },
        { color: 'yellow', text: '12–17% → Standard secured' },
        { color: 'red', text: '17–21% → Risk-adjusted pricing' }
      ]
    },
    'loan against property': {
      range: '8% – 21%',
      bands: [
        { color: 'green', text: '8–12% → Prime borrower' },
        { color: 'yellow', text: '12–17% → Standard LTV cases' },
        { color: 'red', text: '17–21% → Higher-risk lending' }
      ]
    }
  };
  const [hasEnteredLoanDetails, setHasEnteredLoanDetails] = useState(false);

  // Check localStorage on component mount to see if user has already submitted form
  useEffect(() => {
    const hasSubmittedBefore = localStorage.getItem('thome_emi_form_submitted');
    if (hasSubmittedBefore === 'true') {
      setHasSubmittedForm(true);
      setShowLeadForm(false);
      setShowEMICalculator(true);
    }
  }, []);

  // Track when user enters loan details
  useEffect(() => {
    if (loanAmount > 0 || interestRate > 0 || tenure > 0) {
      setHasEnteredLoanDetails(true);
    }
  }, [loanAmount, interestRate, tenure]);

  // Auto-set service type to Custom if no service type selected and user enters a loan amount
  useEffect(() => {
    if (!loanServiceType && loanAmount > 0) {
      setLoanServiceType('custom');
    }
  }, [loanAmount, loanServiceType]);

  // Handle monthly income change
  const handleMonthlyIncomeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value === '' ? 0 : Number(e.target.value);
    if (value < 0) value = 0; // Handle negative values
    setMonthlyIncome(value);
  }, []);

  // Handle existing EMIs change
  const handleExistingEMIsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setExistingEMIs(value === '' ? null : Number(value));
  }, []);

  // Handle service type change with default values
  const handleServiceTypeChange = useCallback((serviceType: string) => {
    setLoanServiceType(serviceType);

    if (serviceType && serviceType in loanThresholds) {
      const thresholds = loanThresholds[serviceType as keyof typeof loanThresholds];

      // Set default values for the selected service type
      setLoanAmount(thresholds.defaults.amount);
      setInterestRate(thresholds.defaults.interest);
      setTenure(thresholds.defaults.tenure);

      // Clear any validation errors
      setValidationErrors(prev => ({
        ...prev,
        loanAmount: undefined,
        interestRate: undefined,
        tenure: undefined
      }));
    } else {
      // Reset to 0 when no service type selected
      setLoanAmount(0);
      setInterestRate(0);
      setTenure(0);
    }
  }, []);

  // Threshold configuration for different loan types
  const loanThresholds = {
    'home loan': {
      minAmount: 100000,
      maxAmount: 50000000,
      minInterest: 7,
      maxInterest: 15,
      minTenure: 5,
      maxTenure: 30,
      defaults: {
        amount: 2500000,
        interest: 9,
        tenure: 20
      }
    },
    'personal loan': {
      minAmount: 10000,
      maxAmount: 1500000,
      minInterest: 10,
      maxInterest: 36,
      minTenure: 1,
      maxTenure: 7,
      defaults: {
        amount: 200000,
        interest: 14,
        tenure: 3
      }
    },
    'car loan': {
      minAmount: 50000,
      maxAmount: 4000000,
      minInterest: 7,
      maxInterest: 20,
      minTenure: 1,
      maxTenure: 7,
      defaults: {
        amount: 800000,
        interest: 11,
        tenure: 5
      }
    },
    'educational loan': {
      minAmount: 10000,
      maxAmount: 4000000,
      minInterest: 6.5,
      maxInterest: 16,
      minTenure: 1,
      maxTenure: 15,
      defaults: {
        amount: 500000,
        interest: 9,
        tenure: 7
      }
    },
    'mortgage loan': {
      minAmount: 100000,
      maxAmount: 10000000,
      minInterest: 8,
      maxInterest: 21,
      minTenure: 1,
      maxTenure: 20,
      defaults: {
        amount: 5000000,
        interest: 12,
        tenure: 10
      }
    },
    'loan against property': {
      minAmount: 100000,
      maxAmount: 700000000,
      minInterest: 8,
      maxInterest: 21,
      minTenure: 1,
      maxTenure: 20,
      defaults: {
        amount: 3000000,
        interest: 12,
        tenure: 10
      }
    },
    'business loan': {
      minAmount: 50000,
      maxAmount: 10000000,
      minInterest: 8,
      maxInterest: 24,
      minTenure: 1,
      maxTenure: 10,
      defaults: {
        amount: 500000,
        interest: 15,
        tenure: 5
      }
    },
    'custom': {
      minAmount: 1000,
      maxAmount: 100000000,
      minInterest: 1,
      maxInterest: 40,
      minTenure: 1,
      maxTenure: 30,
      defaults: {
        amount: 100000,
        interest: 15,
        tenure: 5
      }
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Pagination functions
  const totalPages = emiData ? Math.ceil((paymentFrequency === 'monthly' ? emiData.monthlyData : emiData.frequencyData).length / itemsPerPage) : 0;

  const getCurrentPageData = () => {
    if (!emiData) return [];
    const allData = paymentFrequency === 'monthly' ? emiData.monthlyData : emiData.frequencyData;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allData.slice(startIndex, endIndex);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Recalculate EMI when inputs change with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check for any validation errors before calculating EMI
      const hasValidationErrors = validationErrors.loanAmount ||
        validationErrors.interestRate ||
        validationErrors.tenure ||
        validationErrors.additionalMonths;

      // Only calculate EMI if loan amount is valid and no validation errors exist
      if (loanAmount > 0 && !hasValidationErrors) {
        setCurrentPage(1);
        calculateEMI();
      } else if (hasValidationErrors) {
        // Clear EMI data if there are any validation errors
        setEMIData(null);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [loanAmount, interestRate, tenure, additionalMonths, paymentFrequency, validationErrors]);


  // Utility function for precise rounding
  const roundToTwo = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const calculateEMI = useCallback(() => {
    try {
      // Skip calculation if loan amount is not valid or has validation errors
      if (!loanAmount || (typeof loanAmount === 'string' && loanAmount === '')) {
        setEMIData(null);
        return;
      }

      // Check for any validation errors before calculating
      if (validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) {
        setEMIData(null);
        return;
      }

      const principal = Number(loanAmount);
      const monthlyRate = interestRate / 12 / 100; // Monthly interest rate
      const totalMonths = tenure * 12 + additionalMonths; // Total months including additional

      if (principal <= 0 || monthlyRate <= 0 || totalMonths <= 0) {
        setEMIData(null);
        return;
      }

      // Calculate monthly EMI with precision handling
      const monthlyEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

      // Validate EMI calculation
      if (!isFinite(monthlyEMI) || isNaN(monthlyEMI)) {
        console.error('Invalid EMI calculation');
        setEMIData(null);
        return;
      }

      // Calculate payment amount based on frequency
      let paymentAmount: number;
      let periodsPerYear: number;

      switch (paymentFrequency) {
        case 'quarterly':
          paymentAmount = roundToTwo(monthlyEMI * 3);
          periodsPerYear = 4;
          break;
        case 'half-yearly':
          paymentAmount = roundToTwo(monthlyEMI * 6);
          periodsPerYear = 2;
          break;
        default: // monthly
          paymentAmount = roundToTwo(monthlyEMI);
          periodsPerYear = 12;
      }

      const totalPayment = roundToTwo(monthlyEMI * totalMonths);
      const totalInterest = roundToTwo(totalPayment - principal);

      // Generate monthly data for charts
      const monthlyData = [];
      let remainingBalance = principal;
      const start = new Date(startDate);

      for (let month = 1; month <= totalMonths; month++) {
        const interestPayment = roundToTwo(remainingBalance * monthlyRate);
        const principalPayment = roundToTwo(monthlyEMI - interestPayment);
        remainingBalance = roundToTwo(remainingBalance - principalPayment);

        const currentDate = new Date(start);
        currentDate.setMonth(currentDate.getMonth() + month - 1);

        monthlyData.push({
          month,
          principal: principalPayment,
          interest: interestPayment,
          balance: Math.max(0, remainingBalance),
          date: currentDate
        });
      }

      // Generate frequency-specific data for display
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
          principal: periodPrincipal,
          interest: periodInterest,
          balance: Math.max(0, remainingBalance),
          date: currentDate
        });
      }

      setEMIData({
        emi: paymentAmount,
        totalInterest,
        totalPayment,
        paymentFrequency,
        monthlyData,
        frequencyData
      });
    } catch (error) {
      console.error('EMI calculation error:', error);
      setEMIData(null);
      // Could show user-friendly error message here
    }
  }, [loanAmount, interestRate, tenure, additionalMonths, paymentFrequency, startDate, validationErrors]);

  // Helper function to get monthly equivalent EMI for stress calculation
  const getMonthlyEquivalentEMI = useCallback(() => {
    if (!emiData) return 0;

    // Ensure EMI data matches current payment frequency
    if (emiData.paymentFrequency !== paymentFrequency) {
      return 0; // Return 0 if data is stale
    }

    switch (paymentFrequency) {
      case 'quarterly':
        return emiData.emi / 3; // Quarterly EMI divided by 3 for monthly equivalent
      case 'half-yearly':
        return emiData.emi / 6; // Half-yearly EMI divided by 6 for monthly equivalent
      default:
        return emiData.emi; // Monthly EMI stays the same
    }
  }, [emiData, paymentFrequency]);

  const handleCalculateFullSchedule = useCallback(() => {
    // Only proceed if we have a valid loan amount
    if (!loanAmount || (typeof loanAmount === 'string' && loanAmount === '')) {
      setValidationErrors(prev => ({
        ...prev,
        loanAmount: 'Please enter a valid loan amount'
      }));
      return;
    }

    // Calculate EMI first to ensure we have data
    calculateEMI();

    // Show amortization schedule directly since contact form was already submitted
    setShowSchedule(true);
  }, [loanAmount, calculateEMI, hasSubmittedForm]);

  const handleSliderChange = useCallback((value: number, setter: (val: number) => void) => {
    setter(value);
  }, []);

  // Validation functions
  const validateLoanAmount = useCallback((value: number): string | undefined => {
    if (isNaN(value) || value <= 0) {
      return 'Loan amount must be a positive number greater than 0';
    }

    // Check thresholds based on service type
    const currentServiceType = loanServiceType || 'custom'; // Default to custom if no type selected
    if (currentServiceType && currentServiceType in loanThresholds) {
      const thresholds = loanThresholds[currentServiceType as keyof typeof loanThresholds];
      if (value < thresholds.minAmount) {
        return `Minimum loan amount for ${currentServiceType} is ₹${thresholds.minAmount.toLocaleString('en-IN')}`;
      }
      if (value > thresholds.maxAmount) {
        return `Maximum loan amount for ${currentServiceType} is ₹${thresholds.maxAmount.toLocaleString('en-IN')}`;
      }
    }

    return undefined;
  }, [loanServiceType]);

  const validateInterestRate = useCallback((value: number): string | undefined => {
    if (isNaN(value) || value < 0) {
      return 'Interest rate must be a positive number';
    }

    // Check thresholds based on service type
    if (loanServiceType && loanServiceType in loanThresholds) {
      const thresholds = loanThresholds[loanServiceType as keyof typeof loanThresholds];
      if (value < thresholds.minInterest) {
        return `Minimum interest rate for ${loanServiceType} is ${thresholds.minInterest}%`;
      }
      if (value > thresholds.maxInterest) {
        return `Maximum interest rate for ${loanServiceType} is ${thresholds.maxInterest}%`;
      }
    }

    return undefined;
  }, [loanServiceType]);

  const validateTenure = useCallback((value: number): string | undefined => {
    if (isNaN(value) || value < 0) {
      return 'Tenure must be a positive number';
    }

    // Check thresholds based on service type
    if (loanServiceType && loanServiceType in loanThresholds) {
      const thresholds = loanThresholds[loanServiceType as keyof typeof loanThresholds];
      if (value < thresholds.minTenure) {
        return `Minimum tenure for ${loanServiceType} is ${thresholds.minTenure} years`;
      }
      if (value > thresholds.maxTenure) {
        return `Maximum tenure for ${loanServiceType} is ${thresholds.maxTenure} years`;
      }
    }

    return undefined;
  }, [loanServiceType]);

  // Real-time validation: validate inputs whenever values change
  useEffect(() => {
    // Validate loan amount in real-time
    if (loanAmount > 0) {
      const loanError = validateLoanAmount(loanAmount);
      setValidationErrors(prev => {
        if (prev.loanAmount !== loanError) return { ...prev, loanAmount: loanError };
        return prev;
      });
    } else {
      setValidationErrors(prev => {
        if (prev.loanAmount !== undefined) return { ...prev, loanAmount: undefined };
        return prev;
      });
    }

    // Validate interest rate in real-time
    if (interestRate > 0) {
      const interestError = validateInterestRate(interestRate);
      setValidationErrors(prev => {
        if (prev.interestRate !== interestError) return { ...prev, interestRate: interestError };
        return prev;
      });
    } else {
      setValidationErrors(prev => {
        if (prev.interestRate !== undefined) return { ...prev, interestRate: undefined };
        return prev;
      });
    }

    // Validate tenure in real-time
    if (tenure > 0) {
      const tenureError = validateTenure(tenure);
      setValidationErrors(prev => {
        if (prev.tenure !== tenureError) return { ...prev, tenure: tenureError };
        return prev;
      });
    } else {
      setValidationErrors(prev => {
        if (prev.tenure !== undefined) return { ...prev, tenure: undefined };
        return prev;
      });
    }
  }, [loanAmount, interestRate, tenure, loanServiceType, validateLoanAmount, validateInterestRate, validateTenure]);

  const validateAdditionalMonths = useCallback((value: number): string | undefined => {
    if (isNaN(value) || value < 0 || value > 12) {
      return 'Additional months must be between 0 and 12';
    }
    return undefined;
  }, []);

  const validateName = useCallback((name: string): string | undefined => {
    if (!name || name.trim().length < 2) {
      return 'Name must be at least 2 characters long';
    }
    if (!/^[a-zA-Z\s.]+$/.test(name)) {
      return 'Name can only contain letters, spaces, and dots';
    }
    return undefined;
  }, []);

  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email || email.trim().length === 0) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@(gmail\.com|microsoft\.com)$/;
    if (!emailRegex.test(email.toLowerCase())) {
      return 'Only Gmail and Microsoft email addresses are allowed';
    }
    return undefined;
  }, []);

  const validatePhone = useCallback((phone: string): string | undefined => {
    if (!phone || phone.trim().length === 0) {
      return 'Phone number is required';
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length !== 10) {
      return 'Phone number must be 10 digits';
    }

    // Check if starts with valid Indian mobile prefix (6, 7, 8, or 9)
    const firstDigit = digitsOnly.charAt(0);
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return 'Invalid Indian mobile number. Must start with 6, 7, 8, or 9';
    }

    return undefined;
  }, []);

  // Debounced loan amount change handler
  const handleLoanAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow positive numbers and empty string
    if (value === '' || /^\d+$/.test(value)) {
      const numValue = value === '' ? 0 : Number(value);

      // Auto-set service type to Custom if no service type selected and user enters amount
      if (!loanServiceType && numValue > 0) {
        setLoanServiceType('custom');
      }

      setLoanAmount(numValue);
    }
  }, [loanServiceType]);

  // Prevent minus key and other non-numeric keys
  const handleLoanAmountKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, numbers, arrow keys, home, end
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

    if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }, []);

  // Handle phone number change with validation
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');

    // Update form value using functional update to avoid stale closure
    setLeadForm(prev => ({ ...prev, phone: digitsOnly }));

    // Real-time validation
    const error = validatePhone(digitsOnly);
    setPhoneValidationError(error || '');

    // Update main validation errors
    setValidationErrors(prev => ({ ...prev, phone: error }));
  }, [validatePhone]);

  const handleInterestRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numValue = value === '' ? 0 : parseFloat(value);

      // Check if value exceeds maximum or goes below minimum limit for current loan type
      const currentServiceType = loanServiceType || 'custom';
      if (currentServiceType && currentServiceType in loanThresholds) {
        const maxRate = loanThresholds[currentServiceType as keyof typeof loanThresholds].maxInterest;
        const minRate = loanThresholds[currentServiceType as keyof typeof loanThresholds].minInterest;
        if (numValue > maxRate || numValue < minRate) {
          // Set validation error and clear EMI data even if we don't update state
          const error = numValue > maxRate
            ? `Maximum interest rate for ${currentServiceType} is ${maxRate}%`
            : `Minimum interest rate for ${currentServiceType} is ${minRate}%`;
          setValidationErrors(prev => ({ ...prev, interestRate: error }));
          setEMIData(null);
          return;
        }
      }

      // Set interest rate after validation passes
      setInterestRate(numValue);

      // Clear validation error when valid value is entered
      setValidationErrors(prev => ({ ...prev, interestRate: undefined }));

      // Only validate if there's a value
      if (numValue > 0) {
        const error = validateInterestRate(Number(numValue));
        setValidationErrors(prev => ({ ...prev, interestRate: error }));

        // If there's a validation error, clear EMI data immediately
        if (error) {
          setEMIData(null);
        }
      } else {
        setValidationErrors(prev => ({ ...prev, interestRate: undefined }));
      }
    }
  }, [validateInterestRate, loanServiceType]);

  const handleTenureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      const numValue = value === '' ? 0 : Number(value);

      // Check if value exceeds maximum or goes below minimum limit for current loan type
      const currentServiceType = loanServiceType || 'custom';
      if (currentServiceType && currentServiceType in loanThresholds) {
        const maxTenure = loanThresholds[currentServiceType as keyof typeof loanThresholds].maxTenure;
        const minTenure = loanThresholds[currentServiceType as keyof typeof loanThresholds].minTenure;
        if (numValue > maxTenure || numValue < minTenure) {
          // Set validation error and clear EMI data even if we don't update state
          const error = numValue > maxTenure
            ? `Maximum tenure for ${currentServiceType} is ${maxTenure} years`
            : `Minimum tenure for ${currentServiceType} is ${minTenure} years`;
          setValidationErrors(prev => ({ ...prev, tenure: error }));
          setEMIData(null);
          return;
        }
      }

      // Set tenure after validation passes
      setTenure(numValue);

      // Clear validation error when valid value is entered
      setValidationErrors(prev => ({ ...prev, tenure: undefined }));

      // Only validate if there's a value
      if (numValue > 0) {
        const error = validateTenure(Number(numValue));
        setValidationErrors(prev => ({ ...prev, tenure: error }));

        // If there's a validation error, clear EMI data immediately
        if (error) {
          setEMIData(null);
        }
      } else {
        setValidationErrors(prev => ({ ...prev, tenure: undefined }));
      }
    }
  }, [validateTenure, loanServiceType]);

  const handleAdditionalMonthsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const error = validateAdditionalMonths(value);
    setValidationErrors(prev => ({ ...prev, additionalMonths: error }));
    setAdditionalMonths(value);
  }, [validateAdditionalMonths]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');

    // Validate all form fields
    const nameError = validateName(leadForm.name);
    const emailError = validateEmail(leadForm.email);
    const phoneError = validatePhone(leadForm.phone);

    const newErrors = {
      name: nameError,
      email: emailError,
      phone: phoneError
    };

    setValidationErrors(newErrors);

    // If there are errors or terms not agreed, don't submit
    if (nameError || emailError || phoneError || !agreedToTerms) {
      console.log('Validation errors:', newErrors);
      if (!agreedToTerms) {
        console.log('Terms not agreed');
      }
      return;
    }

    console.log('Validation passed, showing loader');
    setIsSubmitting(true);
    setShowLoader(true);
    setLoaderMessage('Submitting your information...');
    setShowSuccess(false);

    // Force a small delay to ensure loader appears
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Prepare lead data with loan details
      const leadData = {
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone, // Store user input directly
        service: leadForm.service,
        message: leadForm.message,
        loanAmount: loanAmount,
        interestRate: interestRate,
        tenure: tenure,
        paymentFrequency: paymentFrequency
      };

      console.log('Submitting form with data:', leadData);

      // Submit to API route (server-side)
      const response = await fetch('/api/save-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      const result = await response.json();
      console.log('API response:', result);

      if (response.ok && result.success) {
        // Show success message in loader
        setLoaderMessage('Thank you for your inquiry! We will contact you soon.');
        setShowSuccess(true);
        setHasSubmittedForm(true); // Mark form as submitted

        // Save to localStorage to remember user has submitted form
        localStorage.setItem('thome_emi_form_submitted', 'true');

        // Hide form and show EMI calculator after 3 seconds
        setTimeout(() => {
          console.log('Hiding loader and showing EMI calculator');
          setShowLeadForm(false);
          setShowLoader(false);
          setShowEMICalculator(true);
          // Reset form
          setLeadForm({ name: '', email: '', phone: '', countryCode: '+91', service: '', message: '' });
          setValidationErrors({});
          setLoaderMessage('');
          setShowSuccess(false);
        }, 3000);
      } else {
        console.log('API error:', result.error);
        setLoaderMessage(result.error || 'There was an error submitting your form. Please try again.');
        setTimeout(() => {
          console.log('Hiding loader after error');
          setShowLoader(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setLoaderMessage('There was an error submitting your form. Please try again.');
      setTimeout(() => {
        console.log('Hiding loader after catch error');
        setShowLoader(false);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintToPDF = async () => {
    if (!emiData) return;

    const getPaymentFrequencyData = () => {
      return paymentFrequency === 'monthly' ? emiData.monthlyData : emiData.frequencyData;
    };

    const generatePageContent = (pageData: any[], pageNumber: number, totalPages: number) => {
      const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'T-Home Fintech';
      const phoneNumber = process.env.NEXT_PUBLIC_PHONE_NUMBER || '+91 70321 83836';
      const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'www.thome.co.in';
      const companyAddress = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Hyderabad, Telangana';

      const template = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>T-Home Template</title>


<style>
body {
    margin: 0;
    background: #f5f5f5;
    font-family: "Times New Roman", serif;
}

/* Page container */
.page {
    width: 210mm;
    height: 297mm;
    background: white;
    margin: auto;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
}

/* Top header bar */
.header-bar {
    background: #2f4e73;
    height: 40px;
    width: 100%;
    position: relative;
}

/* Red strip */
.header-bar::after {
    content: "";
    position: absolute;
    bottom: -20px;
    left: 120px;
    width: 180px;
    height: 15px;
    background: #c62828;
    transform: skewX(-30deg);
}

/* Left red strip */
.left-red-strip {
    position: absolute;
    top: 45px;
    left: 0px;
    width: 30px;
    height: 15px;
    background: #c62828;
}

/* Logo */
.logo {
    position: absolute;
    top: 10px;
    left: 30px;
    width: 90px;
    height: 90px;
    background: white;
    border-radius: 50%;
    padding: 5px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Title */
.header-text {
    position: absolute;
    top: 50px;
    right: 30px;
    text-align: center;
}

.header-text h1 {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
}

.header-text p {
    margin: 0;
    font-size: 14px;
}

/* Watermark logo */
.watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.06;
    width: 300px;
}

/* Contact info above footer */
.contact-info {
    position: absolute;
    bottom: 85px;
    width: 100%;
    font-size: 13px;
    font-weight: bold;
    color: #333;
    padding: 0 30px;
    box-sizing: border-box;
}

.contact-info .d-flex {
    width: 100%;
    justify-content: space-between;
    margin: 0;
}

.contact-info .col-md-4 {
    flex: 1;
    padding: 0 15px;
    text-align: left;
}

/* Footer */
.footer { position: absolute; bottom: 0; left: 0; right: 0; width: 100%; background: #2f4e73; color: white; padding: 10px 20px; font-size: 11px; box-sizing: border-box; }
.footer-content { display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; }
.social-links-left { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.social-row { display: flex; align-items: center; gap: 8px; }
.social-row a.icon { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; text-decoration: none; }
.social-row a.icon svg { width: 15px; height: 15px; fill: white; }
.social-row a.link-text { color: #c9d9f0; font-size: 10px; text-decoration: none; white-space: nowrap; font-family: Arial, sans-serif; }
.yt-icon { background: #FF0000; }
.ig-icon { background: linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4); }
.fb-icon { background: #1877F2; }
.li-icon { background: #0077B5; }
.footer-divider { width: 1px; height: 70px; background: rgba(255,255,255,0.2); margin: 0 20px; flex-shrink: 0; }
.qr-section { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.qr-label { font-size: 9px; color: #c9d9f0; margin-bottom: 5px; text-align: center; font-family: Arial, sans-serif; white-space: nowrap; }
.qr-code-img { width: 58px; height: 58px; background: white; padding: 5px; border-radius: 6px; }
.footer .red-corner { position: absolute; right: 0; top: -22px; width: 90px; height: 18px; background: #c62828; transform: skewX(-30deg); }

/* Content area */
.content {
    padding: 160px 40px 80px;
}

@media print {
    body {
        background: white;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .footer {
        position: fixed;
        bottom: 0;
        width: 100%;
        background: #2f4e73 !important;
        -webkit-print-color-adjust: exact;
    }
    .red-corner {
        background: #c62828 !important;
        -webkit-print-color-adjust: exact;
    }
    .social-row a.icon {
        -webkit-print-color-adjust: exact;
    }
    .social-row a.icon svg {
        fill: white !important;
        -webkit-print-color-adjust: exact;
    }
    .qr-code-img {
        border: 1px solid #ddd;
    }
}
</style>
</head>

<body>

<div class="page">

    <!-- Header -->
    <div class="header-bar"></div>
    
    <div class="left-red-strip"></div>

    <img src="${window.location.origin}/images/logo/image.png" class="logo" alt="Logo">

    <div class="header-text">
        <h1>T-Home Fintech</h1>
        <p>DPIIT Recognized & Certified By Startup India</p>
    </div>

    <!-- Watermark logo -->
    <img src="${window.location.origin}/images/logo/image.png" class="watermark" alt="Watermark">

    <!-- Main Content Area -->
    <div class="content">
        ${pageNumber === 1 ? `
        <!-- T-Home Enterprise EMI Intelligence System -->
        <h3 style="color: #2f4e73; margin-bottom: 15px; text-align: center;">T-Home Enterprise EMI Amortization Schedule</h3>
        
        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
            <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <h4 style="color: #2f4e73; margin-bottom: 10px; text-align: center;">Loan Details</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <tr>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Loan Amount:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6;">₹${loanAmount.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Annual Interest Rate:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6;">${interestRate}%</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Tenure:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6;">${tenure} years${additionalMonths > 0 ? ` + ${additionalMonths} months` : ''}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Start Date:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6;">${new Date(startDate).toLocaleDateString('en-GB')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; font-weight: bold;">Payment Frequency:</td>
                        <td style="padding: 6px;">${paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1)}</td>
                    </tr>
                </table>
            </div>
            
            <div style="flex: 1; background: #e8f4fd; padding: 15px; border-radius: 8px;">
                <h4 style="color: #2f4e73; margin-bottom: 10px; text-align: center;">EMI Details</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <tr>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Monthly EMI:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6;">₹${emiData.emi.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Total Interest:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #dee2e6;">₹${emiData.totalInterest.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; font-weight: bold;">Total Payment:</td>
                        <td style="padding: 6px;">₹${emiData.totalPayment.toFixed(2)}</td>
                    </tr>
                </table>
            </div>
        </div>

        <h4 style="color: #2f4e73; margin-bottom: 10px; text-align: center;">${paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1)} Amortization Schedule</h4>
        ` : `
        <h4 style="color: #2f4e73; margin-bottom: 10px; text-align: center;">${paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1)} Amortization Schedule</h4>
        `}

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
                <tr style="background: #2f4e73; color: white;">
                    <th style="padding: 6px; text-align: left; border: 1px solid #dee2e6;">${paymentFrequency === 'monthly' ? 'Month' : paymentFrequency === 'quarterly' ? 'Quarter' : 'Half-Year'}</th>
                    <th style="padding: 6px; text-align: left; border: 1px solid #dee2e6;">Date</th>
                    <th style="padding: 6px; text-align: right; border: 1px solid #dee2e6;">Payment</th>
                    <th style="padding: 6px; text-align: right; border: 1px solid #dee2e6;">Principal</th>
                    <th style="padding: 6px; text-align: right; border: 1px solid #dee2e6;">Interest</th>
                    <th style="padding: 6px; text-align: right; border: 1px solid #dee2e6;">Balance</th>
                </tr>
            </thead>
            <tbody>
                ${pageData.map((data, index) => {
        let globalIndex;
        if (pageNumber === 1) {
          globalIndex = index + 1; // First page: 1-12
        } else {
          globalIndex = 12 + (pageNumber - 2) * 24 + index + 1; // Subsequent pages: 13, 37, 61, etc.
        }
        return `
                    <tr>
                        <td style="padding: 4px; border: 1px solid #dee2e6;">${paymentFrequency === 'monthly' ? `Month ${globalIndex}` : paymentFrequency === 'quarterly' ? `Q${globalIndex}` : `H${globalIndex}`}</td>
                        <td style="padding: 4px; border: 1px solid #dee2e6;">${data.date.toLocaleDateString('en-GB')}</td>
                        <td style="padding: 4px; text-align: right; border: 1px solid #dee2e6;">₹${emiData.emi.toFixed(2)}</td>
                        <td style="padding: 4px; text-align: right; border: 1px solid #dee2e6;">₹${data.principal.toFixed(2)}</td>
                        <td style="padding: 4px; text-align: right; border: 1px solid #dee2e6;">₹${data.interest.toFixed(2)}</td>
                        <td style="padding: 4px; text-align: right; border: 1px solid #dee2e6;">₹${data.balance.toFixed(2)}</td>
                    </tr>
                  `;
      }).join('')}
            </tbody>
        </table>

        ${pageNumber === totalPages ? `
        <div style="margin-top: 20px; text-align: center; font-size: 14px; color: #2f4e73; font-weight: bold;">
            Thank you for choosing T-Home ❤️
        </div>
        ` : ''}

        <div style="margin-top: 15px; text-align: center; font-size: 11px; color: #666;">
            Page ${pageNumber} of ${totalPages}
        </div>
    </div>

    <!-- Contact Info -->
    <div class="contact-info">
        <div style="display:flex;width:100%;justify-content:space-between;margin:0;">
            <div style="flex:1;padding:0 15px;text-align:left;">📞 ${phoneNumber}</div>
            <div style="flex:1;padding:0 15px;text-align:left;">🌐 ${websiteUrl}</div>
            <div style="flex:1;padding:0 15px;text-align:left;">📍 ${companyAddress}</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="red-corner"></div>
      <div class="footer-content">
        <div class="social-links-left">
          <div class="social-row">
            <a href="https://www.youtube.com/@T-HomeFintech" target="_blank" class="icon yt-icon"><svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
            <a href="https://www.youtube.com/@T-HomeFintech" target="_blank" class="link-text">youtube.com/@T-HomeFintech</a>
          </div>
          <div class="social-row">
            <a href="https://www.instagram.com/thomefintech" target="_blank" class="icon ig-icon"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/></svg></a>
            <a href="https://www.instagram.com/thomefintech" target="_blank" class="link-text">instagram.com/thomefintech</a>
          </div>
          <div class="social-row">
            <a href="https://www.facebook.com/people/T-Home/61571992704350/" target="_blank" class="icon fb-icon"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
            <a href="https://www.facebook.com/people/T-Home/61571992704350/" target="_blank" class="link-text">facebook.com/T-Home</a>
          </div>
          <div class="social-row">
            <a href="https://www.linkedin.com/company/thomefintech" target="_blank" class="icon li-icon"><svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
            <a href="https://www.linkedin.com/company/thomefintech" target="_blank" class="link-text">linkedin.com/company/thomefintech</a>
          </div>
        </div>
        <div class="footer-divider"></div>
        <div class="qr-section">
          <div class="qr-label" style="margin-bottom: 12px; padding: 4px;">📱 Scan to Chat on WhatsApp</div>
          <img src="${window.location.origin}/images/T-Home what's app QR (1).png" alt="WhatsApp QR Code" class="qr-code-img" style="margin: 0 auto; padding: 3px;"/>
          <div style="font-size:9px;color:#c9d9f0;margin-top:12px;font-family:Arial,sans-serif;">WhatsApp Us</div>
        </div>
      </div>
    </div>

</div>

</body>
</html>`;

      return template;
    };

    const allData = getPaymentFrequencyData();
    const firstPageItems = 12;
    const subsequentPageItems = 24;

    let totalPages = 1;
    let remainingItems = allData.length - firstPageItems;
    if (remainingItems > 0) {
      totalPages += Math.ceil(remainingItems / subsequentPageItems);
    }

    const pdf = new jsPDF();

    for (let page = 1; page <= totalPages; page++) {
      let startIndex, endIndex;

      if (page === 1) {
        // First page: 12 items
        startIndex = 0;
        endIndex = Math.min(firstPageItems, allData.length);
      } else {
        // Subsequent pages: 24 items
        startIndex = firstPageItems + (page - 2) * subsequentPageItems;
        endIndex = Math.min(startIndex + subsequentPageItems, allData.length);
      }

      const pageData = allData.slice(startIndex, endIndex);

      const pageContent = generatePageContent(pageData, page, totalPages);

      // Create an iframe to completely isolate the PDF generation
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '794px';
      iframe.style.height = '1123px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';

      try {
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(pageContent);
          iframeDoc.close();

          const canvas = await html2canvas(iframeDoc.body, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1123,
            y: 0,
            x: 0
          });

          const imgData = canvas.toDataURL('image/png');

          if (page > 1) {
            pdf.addPage();
          }

          pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

          // Add clickable link zones for social media in footer
          pdf.link(22, 269, 60, 5, { url: 'https://www.youtube.com/@T-HomeFintech' });
          pdf.link(22, 276, 60, 5, { url: 'https://www.instagram.com/thomefintech' });
          pdf.link(22, 283, 60, 5, { url: 'https://www.facebook.com/people/T-Home/61571992704350/' });
          pdf.link(22, 290, 60, 5, { url: 'https://www.linkedin.com/company/thomefintech' });
        }

      } finally {
        // Clean up iframe
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }
    }

    pdf.save('t-home-emi-calculator-report.pdf');
  };

  // Custom 3D Donut Chart Component
  const Custom3DDonut = ({ data }: { data: any[] }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const principalPercentage = ((data[0]?.value / total) * 100).toFixed(1);

    const handleMouseEnter = (data: any, index: number, event: React.MouseEvent) => {
      setHoveredIndex(index);
      const rect = (event.target as SVGElement).getBoundingClientRect();
      setHoverPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    };

    const handleMouseLeave = () => {
      setHoveredIndex(null);
    };

    const getSliceDescription = (name: string, value: number, percentage: string) => {
      if (name === 'Principal') {
        return {
          title: 'Principal Amount',
          description: `The original loan amount of ₹${value.toLocaleString()} represents ${percentage}% of your total payment. This is the amount you borrowed that needs to be repaid.`,
          color: '#3b82f6'
        };
      } else {
        return {
          title: 'Interest Amount',
          description: `The interest cost of ₹${value.toLocaleString()} represents ${percentage}% of your total payment. This is the additional amount charged by the lender for borrowing the money.`,
          color: '#D2232A'
        };
      }
    };

    return (
      <div className="relative">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <defs>
              <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D2232A" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3" />
              </filter>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              filter="url(#shadow)"
            >
              {data.map((entry, index) => {
                const isHovered = hoveredIndex === index;
                const percentage = ((entry.value / total) * 100).toFixed(1);

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#${entry.name.toLowerCase()}Gradient)`}
                    style={{
                      filter: isHovered ? 'url(#glow) brightness(1.1)' : 'brightness(1)',
                      cursor: 'pointer',
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: isHovered ? 1 : 0.95
                    }}
                    onMouseEnter={(e: any) => handleMouseEnter(entry, index, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Hover Popup Card */}
        {hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute z-50 bg-white/95 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-gray-200 min-w-[280px] pointer-events-none"
            style={{
              left: '50%',
              top: '-120px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-start space-x-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: data[hoveredIndex].name === 'Principal' ? '#3b82f6' : '#D2232A' }}
              />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 text-sm mb-2">
                  {getSliceDescription(data[hoveredIndex].name, data[hoveredIndex].value, ((data[hoveredIndex].value / total) * 100).toFixed(1)).title}
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {getSliceDescription(data[hoveredIndex].name, data[hoveredIndex].value, ((data[hoveredIndex].value / total) * 100).toFixed(1)).description}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700">
                    ₹{data[hoveredIndex].value.toLocaleString()} ({((data[hoveredIndex].value / total) * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
            {/* Arrow pointing down */}
            <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/95"></div>
          </motion.div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-black/80 text-sm">
            {paymentFrequency === 'monthly' ? 'Monthly EMI' :
              paymentFrequency === 'quarterly' ? 'Quarterly EQI' : 'Half-yearly EHI'}
          </p>
          <p className="text-black text-2xl font-bold">₹{emiData?.emi.toFixed(0)}</p>
          <p className="text-black/70 text-xs mt-1">{principalPercentage}% Principal</p>
        </div>
      </div>
    );
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Sort payload to show principal first, then interest
      const sortedPayload = [...payload].sort((a, b) => {
        if (a.name === 'principal' && b.name === 'interest') return -1;
        if (a.name === 'interest' && b.name === 'principal') return 1;
        return 0;
      });

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-3 rounded-xl border border-gray-200 shadow-lg"
        >
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {sortedPayload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.name === 'principal' ? '#3b82f6' : '#D2232A' }}>
              {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}: ₹{entry.value.toFixed(2)}
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };
  function Coin3D() {
    return (
      <Box args={[2, 2, 0.3]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </Box>
    );
  }

  // Use default values when no loan amount is entered - memoize to prevent unnecessary recalculations
  const displayData = useMemo(() => {
    if (loanAmount <= 0 || !emiData) {
      return {
        emi: 0,
        totalInterest: 0,
        totalPayment: 0,
        monthlyData: [],
        yearlyData: []
      };
    }
    return emiData;
  }, [emiData, loanAmount]);

  // Default to 50/50 split if no loan amount is entered or there are validation errors
  const pieData = useMemo(() => {
    const hasValidationErrors = validationErrors.loanAmount ||
      validationErrors.interestRate ||
      validationErrors.tenure ||
      validationErrors.additionalMonths;

    // Reset to default if loan amount is 0, empty, or has validation errors
    if (!loanAmount || loanAmount <= 0 || hasValidationErrors) {
      return [
        { name: 'Principal', value: 50, color: '#3b82f6' },
        { name: 'Interest', value: 50, color: '#f97316' }
      ];
    }

    return [
      { name: 'Principal', value: Number(loanAmount) || 0, color: '#3b82f6' },
      { name: 'Interest', value: emiData?.totalInterest || 0, color: '#f97316' }
    ];
  }, [emiData, loanAmount, validationErrors]);

  const lineData = useMemo(() => {
    const hasValidationErrors = validationErrors.loanAmount ||
      validationErrors.interestRate ||
      validationErrors.tenure ||
      validationErrors.additionalMonths;

    if (hasValidationErrors || !emiData) {
      return Array(12).fill(0).map((_, i) => ({
        month: `Month ${i + 1}`,
        principal: 0,
        interest: 0,
        balance: 0,
        total: 0
      }));
    }

    return emiData.monthlyData.map(data => ({
      month: `Month ${data.month}`,
      principal: data.principal,
      interest: data.interest,
      balance: data.balance,
      total: data.principal + data.interest
    }));
  }, [emiData, validationErrors]);

  // Prepare yearly breakdown data for stacked bar chart
  const yearlyData = useMemo(() => {
    const hasValidationErrors = validationErrors.loanAmount ||
      validationErrors.interestRate ||
      validationErrors.tenure ||
      validationErrors.additionalMonths;

    if (hasValidationErrors || !emiData) {
      return Array(12).fill(0).map((_, i) => ({
        year: `Year ${i + 1}`,
        principal: 0,
        interest: 0,
        total: 0
      }));
    }

    const years = [];
    const totalMonths = emiData.monthlyData.length;
    const yearsCount = Math.ceil(totalMonths / 12);

    for (let year = 1; year <= yearsCount; year++) {
      const startMonth = (year - 1) * 12;
      const endMonth = Math.min(year * 12, totalMonths);

      let yearlyPrincipal = 0;
      let yearlyInterest = 0;

      for (let i = startMonth; i < endMonth; i++) {
        yearlyPrincipal += emiData.monthlyData[i].principal;
        yearlyInterest += emiData.monthlyData[i].interest;
      }

      years.push({
        year: `Year ${year}`,
        principal: yearlyPrincipal,
        interest: yearlyInterest,
        total: yearlyPrincipal + yearlyInterest
      });
    }

    return years;
  }, [emiData, validationErrors]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 relative overflow-hidden">
      {/* Custom CSS for scrolling text animation */}
      <style jsx>{`
          @keyframes scrollText {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          
          .animate-scroll-text {
            animation: scrollText 15s linear infinite;
            display: inline-block;
          }
        `}</style>

      {/* Decorative gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-blue-100/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-100/20 to-transparent"></div>

      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut" as const
        }}
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200/10 to-gray-200/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.1, 0.15]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: 2
        }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-tl from-gray-200/10 to-blue-200/10 rounded-full blur-3xl"
      />

      <div className="relative z-10">
        {/* T-Home Header */}
        <div className="topbar">
          <div className="topbar-inner">
            <div><i className="fa-solid fa-location-dot"></i> H.No: 2-88/4, Hyderabad – 500055</div>
            <div><i className="fa-solid fa-envelope"></i> info@thome.co.in</div>
          </div>
        </div>

        <header className="main-header">
          <div className="header-inner">
            <button className="nav-toggle" aria-label="Toggle navigation" onClick={toggleMobileMenu}>
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="brand">
              <img src="/images/logo/image.png" alt="T-Home" className="logo" />
            </div>

            <nav className={`nav ${isClient && isMobileMenuOpen ? 'open' : ''}`} aria-label="Main navigation">
              <a className="nav-link" href="https://thome.co.in/">Home</a>
              <a className="nav-link" href="https://thome.co.in/about-us/">About us</a>

              <div className="nav-dropdown">
                <a className="nav-link dropdown-toggle" href="https://thome.co.in/service/">Service</a>

                <div className="mega-menu" role="menu">
                  <div className="mega-col">
                    <a href="https://thome.co.in/home-loans"><i className="fa-solid fa-house"></i> Home Loans</a>
                    <a href="https://thome.co.in/loan-against-property/"><i className="fa-solid fa-hand-holding-dollar"></i> Loan Against Property</a>
                    <a href="https://thome.co.in/mortgage-loans"><i className="fa-solid fa-building-columns"></i> Mortgage Loans</a>
                  </div>
                  <div className="mega-col">
                    <a href="https://thome.co.in/personal-loans"><i className="fa-solid fa-user"></i> Personal Loans</a>
                    <a href="https://thome.co.in/pan-adhaar-linking"><i className="fa-solid fa-id-card"></i> Pan & Aadhar Linking</a>
                    <a href="https://thome.co.in/itr-filling"><i className="fa-solid fa-file-invoice"></i> ITR Tax Filling</a>
                  </div>
                  <div className="mega-col">
                    <a href="https://thome.co.in/gst-filling"><i className="fa-solid fa-file-contract"></i> GST Services</a>
                    <a href="https://thome.co.in/food-license"><i className="fa-solid fa-utensils"></i> Food License</a>
                    <a href="https://thome.co.in/company-registration"><i className="fa-solid fa-briefcase"></i> Company Registration</a>
                  </div>
                  <div className="mega-col">
                    <a href="https://thome.co.in/udyam-registration"><i className="fa-solid fa-id-badge"></i> UDYAM / MSME Registration</a>
                    <a href="https://thome.co.in/balance-transfer"><i className="fa-solid fa-arrows-rotate"></i> Balance Transfer</a>
                  </div>
                </div>
              </div>

              <a className="nav-link" href="https://thome.co.in/careers/">Careers</a>
              <a className="nav-link active" href="https://thome.co.in/financial-tools/">Financial Tools</a>
              <a className="nav-link" href="https://thome.co.in/contact-us/">Contact us</a>
            </nav>
          </div>
        </header>
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-8 sm:mb-12 text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800"
          >
            T-Home Enterprise EMI Intelligence System
          </motion.h1>

          {/* EMI Calculator Form - Only shown after contact form submission */}
          {showEMICalculator && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Column - Input Form */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-gray-200 shadow-xl"
              >
                <div className="flex justify-center mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotateY: -180 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="relative"
                  >
                    <motion.div
                      animate={{
                        rotateY: 360,
                        transition: { duration: 12, repeat: Infinity, ease: "linear" }
                      }}
                      className="w-24 h-24 sm:w-28 sm:h-28"
                    >
                      <img
                        src="/images/logo/image.png"
                        alt="T-Home Enterprise EMI Intelligence System Logo"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </motion.div>

                    {/* 3D floating elements */}
                    <motion.div
                      animate={{
                        y: [0, -3, 0],
                        transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="absolute -top-2 -right-2 w-3 h-3"
                    >
                      <div className="w-full h-full bg-blue-400 rounded-full opacity-60 blur-sm"></div>
                    </motion.div>

                    <motion.div
                      animate={{
                        x: [0, 3, 0],
                        transition: { duration: 7, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="absolute -bottom-2 -left-2 w-3 h-3"
                    >
                      <div className="w-full h-full bg-purple-400 rounded-full opacity-60 blur-sm"></div>
                    </motion.div>
                  </motion.div>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800">Loan Details</h2>

                {/* RBI Guidelines Notice */}
                {hasEnteredLoanDetails && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6 sm:mb-8 overflow-hidden"
                  >
                    <div className="whitespace-nowrap animate-scroll-text">
                      <p className="text-sm text-red-600 font-medium">
                        All loan amounts, interest rates, and tenure limits are set as per RBI guidelines and standard banking rules in India
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Service Type */}
                <div className="mb-6 sm:mb-8">
                  <label htmlFor="loanServiceType" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Service Type</label>
                  <div className="relative">
                    <select
                      id="loanServiceType"
                      value={loanServiceType}
                      onChange={(e) => {
                        handleServiceTypeChange(e.target.value);
                      }}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                    >
                      <option value="">Select Loan Type</option>
                      <option value="home loan">Home Loan</option>
                      <option value="personal loan">Personal Loan</option>
                      <option value="car loan">Car Loan</option>
                      <option value="educational loan">Educational Loan</option>
                      <option value="mortgage loan">Mortgage Loan</option>
                      <option value="loan against property">Loan Against Property</option>
                      <option value="business loan">Business Loan</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isClient && isDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Loan Amount */}
                <div className="mb-6 sm:mb-8">
                  <label htmlFor="loanAmount" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">
                    Loan Amount (₹)
                    <span className="text-xs text-gray-500 ml-2">
                      (Min: ₹{(() => {
                        const currentType = loanServiceType || 'custom';
                        return loanThresholds[currentType as keyof typeof loanThresholds]?.minAmount?.toLocaleString('en-IN') || '1,000';
                      })()} - Max: ₹{(() => {
                        const currentType = loanServiceType || 'custom';
                        return loanThresholds[currentType as keyof typeof loanThresholds]?.maxAmount?.toLocaleString('en-IN') || '10,00,00,000';
                      })()})
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="loanAmount"
                      type="number"
                      step="1000"
                      value={loanAmount || ''}
                      onChange={handleLoanAmountChange}
                      onKeyDown={handleLoanAmountKeyDown}
                      placeholder="Enter loan amount"
                      aria-label="Loan amount in rupees"
                      aria-describedby="loanAmount-error"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border-2 ${isClient && validationErrors.loanAmount ? 'border-red-500 bg-red-50/30' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${isClient && validationErrors.loanAmount ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                    />
                    {isClient && validationErrors.loanAmount && (
                      <div id="loanAmount-error" className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg" role="alert">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-red-600 text-xs font-semibold">{validationErrors.loanAmount}</p>
                          {loanServiceType && loanServiceType in loanThresholds && (
                            <p className="text-red-500 text-xs mt-0.5">
                              Allowed range: ₹{loanThresholds[loanServiceType as keyof typeof loanThresholds].minAmount.toLocaleString('en-IN')} – ₹{loanThresholds[loanServiceType as keyof typeof loanThresholds].maxAmount.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 relative">
                      <input
                        type="range"
                        min={loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].minAmount : 1}
                        max={loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].maxAmount : 10000000}
                        step="1000"
                        value={loanAmount || (loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].minAmount : 1)}
                        onChange={handleLoanAmountChange}
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern loan-slider"
                        style={{
                          background: loanServiceType && loanServiceType in loanThresholds
                            ? (() => {
                              const currentAmount = loanAmount || loanThresholds[loanServiceType as keyof typeof loanThresholds].minAmount;
                              const minAmount = loanThresholds[loanServiceType as keyof typeof loanThresholds].minAmount;
                              const maxAmount = loanThresholds[loanServiceType as keyof typeof loanThresholds].maxAmount;
                              const percentage = ((currentAmount - minAmount) / (maxAmount - minAmount)) * 100;
                              return `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
                            })()
                            : (() => {
                              const currentAmount = loanAmount || 1;
                              const percentage = ((currentAmount - 1) / (10000000 - 1)) * 100;
                              return `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
                            })()
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Interest Rate */}
                <div className="mb-6 sm:mb-8">
                  <label htmlFor="interestRate" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">
                    Annual Interest Rate (%)
                    <span className="text-xs text-gray-500 ml-2">
                      (Min: {(() => {
                        const currentType = loanServiceType || 'custom';
                        return loanThresholds[currentType as keyof typeof loanThresholds]?.minInterest || '1';
                      })()}% - Max: {(() => {
                        const currentType = loanServiceType || 'custom';
                        return loanThresholds[currentType as keyof typeof loanThresholds]?.maxInterest || '40';
                      })()}%)
                    </span>
                    <div
                      className="inline-block ml-2 relative"
                      onMouseEnter={() => setShowInterestModal(true)}
                      onMouseLeave={() => setShowInterestModal(false)}
                    >
                      <button
                        type="button"
                        className="text-gray-600 hover:text-blue-500 transition-colors duration-200 cursor-pointer"
                        aria-label="Interest rate information"
                      >
                        ⓘ
                      </button>

                      {/* Hover Tooltip Modal */}
                      {showInterestModal && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
                          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-80 max-w-sm">
                            {/* Close indicator */}
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white"></div>

                            {/* Modal Header */}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                {loanServiceType ? loanServiceType.charAt(0).toUpperCase() + loanServiceType.slice(1) : 'Select Loan Type'}
                              </h4>
                              <div className="text-xs text-gray-600">
                                Range: {loanServiceType && interestInfo[loanServiceType as keyof typeof interestInfo] ? interestInfo[loanServiceType as keyof typeof interestInfo].range : 'Select a loan type'}
                              </div>
                            </div>

                            {/* Interest Rate Bands */}
                            {loanServiceType && interestInfo[loanServiceType as keyof typeof interestInfo] && (
                              <div className="space-y-2">
                                {interestInfo[loanServiceType as keyof typeof interestInfo].bands.map((band, index) => (
                                  <div key={index} className="flex items-start space-x-2 p-2 rounded bg-gray-50">
                                    <div
                                      className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${band.color === 'green' ? 'bg-green-500' :
                                        band.color === 'yellow' ? 'bg-yellow-500' :
                                          'bg-red-500'
                                        }`}
                                    ></div>
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-700 leading-tight">
                                        {band.text}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Disclaimer */}
                            <div className="mt-3 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 text-center">
                                Actual rates depend on lender policy, RBI regulations, credit score, income profile, and market conditions.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      value={interestRate || ''}
                      onChange={(e) => {
                        const value = e.target.value;

                        // Allow free typing - no clamping while typing
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          const numValue = value === '' ? 0 : parseFloat(value);
                          setInterestRate(numValue);
                        }
                      }}
                      placeholder="Enter interest rate"
                      aria-label="Annual interest rate"
                      aria-describedby="interestRate-error"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border-2 ${isClient && validationErrors.interestRate ? 'border-red-500 bg-red-50/30' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${isClient && validationErrors.interestRate ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                    />
                    {isClient && validationErrors.interestRate && (
                      <div id="interestRate-error" className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg" role="alert">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-red-600 text-xs font-semibold">{validationErrors.interestRate}</p>
                          {loanServiceType && loanServiceType in loanThresholds && (
                            <p className="text-red-500 text-xs mt-0.5">
                              Allowed range: {loanThresholds[loanServiceType as keyof typeof loanThresholds].minInterest}% – {loanThresholds[loanServiceType as keyof typeof loanThresholds].maxInterest}%
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 relative">
                      <input
                        type="range"
                        min={loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].minInterest : 0}
                        max={loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].maxInterest : 20}
                        step="0.1"
                        value={interestRate || (loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].minInterest : 0)}
                        onChange={handleInterestRateChange}
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern interest-slider"
                        style={{
                          background: loanServiceType && loanServiceType in loanThresholds
                            ? (() => {
                              const currentRate = interestRate || loanThresholds[loanServiceType as keyof typeof loanThresholds].minInterest;
                              const minRate = loanThresholds[loanServiceType as keyof typeof loanThresholds].minInterest;
                              const maxRate = loanThresholds[loanServiceType as keyof typeof loanThresholds].maxInterest;
                              const percentage = ((currentRate - minRate) / (maxRate - minRate)) * 100;
                              return `linear-gradient(to right, #dc2626 0%, #dc2626 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
                            })()
                            : (() => {
                              const currentRate = interestRate || 0;
                              const percentage = (currentRate / 20) * 100;
                              return `linear-gradient(to right, #dc2626 0%, #dc2626 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
                            })()
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tenure */}
                <div className="mb-6 sm:mb-8">
                  <label htmlFor="tenure" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">
                    Loan Tenure (Years)
                    <span className="text-xs text-gray-500 ml-2">
                      (Min: {(() => {
                        const currentType = loanServiceType || 'custom';
                        return loanThresholds[currentType as keyof typeof loanThresholds]?.minTenure || '1';
                      })()} - Max: {(() => {
                        const currentType = loanServiceType || 'custom';
                        return loanThresholds[currentType as keyof typeof loanThresholds]?.maxTenure || '30';
                      })()} years)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="tenure"
                      type="number"
                      step="1"
                      value={tenure || ''}
                      onChange={(e) => {
                        const value = e.target.value;

                        // Allow free typing - no clamping while typing
                        if (value === '' || /^\d+$/.test(value)) {
                          const numValue = value === '' ? 0 : Number(value);
                          setTenure(numValue);
                        }
                      }}
                      placeholder="Enter tenure"
                      aria-label="Loan tenure in years"
                      aria-describedby="tenure-error"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border-2 ${isClient && validationErrors.tenure ? 'border-red-500 bg-red-50/30' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${isClient && validationErrors.tenure ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                    />
                    {isClient && validationErrors.tenure && (
                      <div id="tenure-error" className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg" role="alert">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-red-600 text-xs font-semibold">{validationErrors.tenure}</p>
                          {loanServiceType && loanServiceType in loanThresholds && (
                            <p className="text-red-500 text-xs mt-0.5">
                              Allowed range: {loanThresholds[loanServiceType as keyof typeof loanThresholds].minTenure} – {loanThresholds[loanServiceType as keyof typeof loanThresholds].maxTenure} years
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 relative">
                      <input
                        type="range"
                        min={loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].minTenure : 0}
                        max={loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].maxTenure : 30}
                        step="1"
                        value={tenure || (loanServiceType && loanServiceType in loanThresholds ? loanThresholds[loanServiceType as keyof typeof loanThresholds].minTenure : 0)}
                        onChange={handleTenureChange}
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern tenure-slider"
                        style={{
                          background: loanServiceType && loanServiceType in loanThresholds
                            ? (() => {
                              const currentTenure = tenure || loanThresholds[loanServiceType as keyof typeof loanThresholds].minTenure;
                              const minTenure = loanThresholds[loanServiceType as keyof typeof loanThresholds].minTenure;
                              const maxTenure = loanThresholds[loanServiceType as keyof typeof loanThresholds].maxTenure;
                              const percentage = ((currentTenure - minTenure) / (maxTenure - minTenure)) * 100;
                              return `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
                            })()
                            : (() => {
                              const currentTenure = tenure || 0;
                              const percentage = (currentTenure / 30) * 100;
                              return `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
                            })()
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Start Date */}
                <div className="mb-6 sm:mb-8">
                  <label htmlFor="startDate" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Start Date</label>
                  <div className="relative">
                    <input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Payment Frequency */}
                <div className="mb-6 sm:mb-8">
                  <label className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Payment Frequency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['monthly', 'quarterly', 'half-yearly'] as const).map((freq) => (
                      <motion.button
                        key={freq}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentFrequency(freq)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${paymentFrequency === freq
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1).replace('-', ' ')}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Confused to check your EMI Health</label>
                </div>

                {/* EMI Health Check */}
                <div className="mb-6 sm:mb-8 bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-center">
                      <span className="mr-2">🏥</span>
                      Check Here with us!!
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label htmlFor="monthlyIncome" className="block text-gray-700 mb-2 font-medium text-sm">Net Monthly Income (₹)</label>
                      <div className="relative">
                        <input
                          id="monthlyIncome"
                          type="number"
                          min="0"
                          value={monthlyIncome || ''}
                          onChange={handleMonthlyIncomeChange}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Enter net monthly income"
                          className={`w-full px-3 py-2 rounded-lg bg-white border text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${monthlyIncome > 0
                            ? 'border-green-400 focus:ring-green-400'
                            : 'border-gray-300 focus:ring-blue-400'
                            }`}
                        />
                        {monthlyIncome > 0 && (
                          <div className="absolute right-3 top-3">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <label htmlFor="existingEMIs" className="block text-gray-700 mb-2 font-medium text-sm">Net EMI Paying (₹)</label>
                      <div className="relative">
                        <input
                          id="existingEMIs"
                          type="number"
                          min="0"
                          max="999999999"
                          value={existingEMIs === null ? '' : existingEMIs}
                          onChange={handleExistingEMIsChange}
                          onKeyPress={(e) => {
                            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Enter existing EMI amounts"
                          className="w-full px-3 py-2 rounded-lg bg-white border text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm border-gray-300 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Visualizations */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* Results Summary */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-xl"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">
                        {paymentFrequency === 'monthly' ? 'EMI' :
                          paymentFrequency === 'quarterly' ? 'EQI' : 'EHI'}
                      </p>
                      <p className="text-lg sm:text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {displayData ? `₹${displayData.emi.toFixed(2)}` : '₹0.00'}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {paymentFrequency === 'monthly' ? 'per month' :
                          paymentFrequency === 'quarterly' ? 'per quarter' : 'per half-year'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Total Interest</p>
                      <p className="text-lg sm:text-2xl font-bold text-red-600">
                        {displayData ? `₹${displayData.totalInterest.toFixed(2)}` : '₹0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Total Payment</p>
                      <p className="text-lg sm:text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {displayData ? `₹${displayData.totalPayment.toFixed(2)}` : '₹0.00'}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* 3D Donut Chart - Hero Visual */}
                {/* This section intentionally left with the existing implementation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-xl no-border"
                  style={{ filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.2))' }}
                >
                  <h3 className="text-xl font-semibold mb-4 text-black">
                    {(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? 'Principal vs Interest (Example)' : 'Principal vs Interest'}
                  </h3>
                  <div className="relative h-64">
                    <Custom3DDonut data={!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths ? [
                      { name: 'Principal', value: 50, color: '#3b82f6' },
                      { name: 'Interest', value: 50, color: '#f97316' }
                    ] : pieData} />
                  </div>
                </motion.div>

                {/* Gradient Area Chart - Growth Visual */}
                {true && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-xl no-border"
                    style={{ filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.2))' }}
                  >
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">
                      {(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? 'Loan Balance Over Time (Example)' : 'Loan Balance Over Time'}
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? Array(12).fill(0).map((_, i) => ({
                        month: i + 1,
                        principal: 0,
                        interest: 0,
                        balance: 0
                      })) : lineData}>
                        <defs>
                          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D2232A" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                        <XAxis
                          dataKey="month"
                          stroke="rgba(0,0,0,0.5)"
                          tick={{ fill: 'rgba(0,0,0,0.7)', fontSize: 10 }}
                        />
                        <YAxis
                          stroke="rgba(0,0,0,0.5)"
                          tick={{ fill: 'rgba(0,0,0,0.7)', fontSize: 10 }}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            color: '#000000'
                          }}
                          labelStyle={{ color: '#000000', fontWeight: 'bold' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="#10b981"
                          strokeWidth={3}
                          fill="url(#balanceGradient)"
                        />
                        <Area
                          type="monotone"
                          dataKey="principal"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#principalGradient)"
                          fillOpacity={(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? 0.3 : 1}
                          strokeDasharray={(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? '4 2' : '0'}
                        />
                        <Area
                          type="monotone"
                          dataKey="interest"
                          stroke="#D2232A"
                          strokeWidth={2}
                          fill="url(#interestGradient)"
                          fillOpacity={(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? 0.3 : 1}
                          strokeDasharray={(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? '4 2' : '0'}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* Stacked Bar Chart - Yearly Breakdown */}
                {true && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200 shadow-xl"
                    style={{ filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.2))' }}
                  >
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">
                      {(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? 'Yearly Payment Breakdown (Example)' : 'Yearly Payment Breakdown'}
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={(!loanAmount || validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths) ? Array(12).fill(0).map((_, i) => ({
                        year: i + 1,
                        principal: 0,
                        interest: 0
                      })) : yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="principalBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                          </linearGradient>
                          <linearGradient id="interestBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#D2232A" stopOpacity={0.7} />
                          </linearGradient>
                          <filter id="barShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity={0.2} />
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                        <XAxis
                          dataKey="year"
                          stroke="rgba(0,0,0,0.6)"
                          tick={{ fill: 'rgba(0,0,0,0.8)', fontSize: 11, fontWeight: 500 }}
                          axisLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                        />
                        <YAxis
                          stroke="rgba(0,0,0,0.6)"
                          tick={{ fill: 'rgba(0,0,0,0.8)', fontSize: 11, fontWeight: 500 }}
                          axisLine={{ stroke: 'rgba(0,0,0,0.2)' }}
                          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            color: '#000000'
                          }}
                          labelStyle={{ color: '#000000', fontWeight: 'bold' }}
                        />
                        <Bar
                          dataKey="interest"
                          stackId="a"
                          fill="url(#interestBarGradient)"
                          fillOpacity={!loanAmount ? 0.3 : 1}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="principal"
                          stackId="a"
                          fill="#3b82f6"
                          fillOpacity={!loanAmount ? 0.3 : 1}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* EMI Stress Score Display */}
                <div className="mt-8 mb-8 sm:mt-12 sm:mb-8 bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-2xl min-h-[120px]">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                    <span className="mr-2">🧠</span>
                    Your EMI Stress Level:
                    {monthlyIncome > 0 && existingEMIs !== null && emiData && !validationErrors.loanAmount && !validationErrors.interestRate && !validationErrors.tenure && !validationErrors.additionalMonths && (
                      <span className={`ml-2 font-bold ${((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 < 30
                        ? 'text-green-600'
                        : ((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 <= 45
                          ? 'text-yellow-600'
                          : 'text-red-600'
                        }`}>
                        {((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 < 30
                          ? 'Safe 🟢'
                          : ((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 <= 45
                            ? 'Manageable 🟡'
                            : 'Risky 🔴'
                        }
                      </span>
                    )}
                  </h3>
                  {monthlyIncome > 0 && existingEMIs !== null && emiData && !validationErrors.loanAmount && !validationErrors.interestRate && !validationErrors.tenure && !validationErrors.additionalMonths && (
                    <div className="text-sm text-gray-600">
                      EMI Ratio: {(((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100).toFixed(1)}%
                      {((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 < 30 && (
                        <span className="text-green-600 ml-2">• Excellent financial health!</span>
                      )}
                      {((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 >= 30 && ((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 <= 45 && (
                        <span className="text-yellow-600 ml-2">• Consider reducing loan amount</span>
                      )}
                      {((getMonthlyEquivalentEMI() + existingEMIs!) / monthlyIncome) * 100 > 45 && (
                        <span className="text-red-600 ml-2">• High debt burden - review carefully</span>
                      )}
                    </div>
                  )}
                  {!(monthlyIncome > 0 && existingEMIs !== null) && (
                    <div className="text-sm text-gray-400 italic">
                      Enter your monthly income and existing EMIs to see your EMI stress level
                    </div>
                  )}
                </div>

              </motion.div>
            </div>
          )}

          {/* Calculate Full Schedule Button - Outside Form */}
          {showEMICalculator && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-8 mb-8"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCalculateFullSchedule}
                disabled={!!validationErrors.loanAmount || !!validationErrors.interestRate || !!validationErrors.tenure || !!validationErrors.additionalMonths}
                className={`bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-300 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 ${(validationErrors.loanAmount || validationErrors.interestRate || validationErrors.tenure || validationErrors.additionalMonths)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:from-blue-700 hover:via-blue-800 hover:to-blue-900'
                  }`}
              >
                Calculate Full Schedule
              </motion.button>
            </motion.div>
          )}

          {/* Loader Component */}
          <AnimatePresence>
            {showLoader && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4"
                >
                  <div className="text-center">
                    <img
                      src="/images/logo/image.png"
                      alt="T-Home Logo"
                      className="h-16 w-16 mx-auto mb-4 rounded-[50%]"
                    />
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">
                      {showSuccess ? '✅ Success!' : 'Processing Your Request'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {showSuccess ? 'Thank you for your patience!' : loaderMessage}
                    </p>
                    {!showSuccess && (
                      <div className="flex space-x-2 justify-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Calculate Button */}
          {/* Loader Component */}
          <AnimatePresence>
            {showLoader && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4"
                >
                  <div className="text-center">
                    <img
                      src="/images/logo/image.png"
                      alt="T-Home Logo"
                      className="h-16 w-16 mx-auto mb-4 rounded-[50%]"
                    />
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">
                      {loaderMessage}
                    </h3>
                    {showSuccess && (
                      <p className="text-green-600 mt-2">Your information has been submitted successfully!</p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contact Form - Only shown on page load and when not showing schedule */}
          <AnimatePresence>
            {showLeadForm && !showSchedule && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-white/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl max-w-4xl mx-auto"
                >
                  <h3 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8 text-gray-800 text-center">Contact Us for Your Loan Requirements</h3>

                  {/* Security Badge */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex items-center justify-center mb-6 sm:mb-8 text-gray-600 text-sm"
                  >
                    <span className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                      <span className="text-green-600">🛡️</span>
                      <span className="text-xs sm:text-sm">256-bit SSL secured • No data sharing • No spam calls • Used only for EMI calculation assistance</span>
                    </span>
                  </motion.div>

                  <form onSubmit={handleLeadSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="leadName" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Fullname</label>
                        <input
                          id="leadName"
                          name="leadName"
                          type="text"
                          value={leadForm.name}
                          onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          placeholder="Your Name"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="leadEmail" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Email</label>
                        <input
                          id="leadEmail"
                          name="leadEmail"
                          type="email"
                          value={leadForm.email}
                          onChange={(e) => {
                            setLeadForm({ ...leadForm, email: e.target.value });
                            // Real-time email validation
                            const error = validateEmail(e.target.value);
                            setValidationErrors(prev => ({ ...prev, email: error }));
                          }}
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border ${isClient && validationErrors.email ? 'border-red-400' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${isClient && validationErrors.email ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                          placeholder="your@email.com"
                          required
                        />
                        {isClient && validationErrors.email && (
                          <p className="text-red-400 text-xs mt-2">{validationErrors.email}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="leadPhone" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Phone</label>
                        <div className="flex gap-2">
                          {/* Static +91 country code */}
                          <div className="w-24 px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gray-100 border border-gray-300 text-gray-800 flex items-center justify-center font-medium text-sm sm:text-base">
                            +91
                          </div>
                          <input
                            id="leadPhoneNumber"
                            name="leadPhoneNumber"
                            type="tel"
                            value={leadForm.phone}
                            onChange={handlePhoneChange}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                            placeholder="98765 43210"
                            maxLength={10}
                            required
                          />
                        </div>
                        {(validationErrors.phone || phoneValidationError) && (
                          <p className="text-red-400 text-xs mt-2">
                            {validationErrors.phone || phoneValidationError}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="leadService" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Service</label>
                        <div className="relative">
                          <select
                            id="leadService"
                            name="leadService"
                            value={leadForm.service}
                            onChange={(e) => setLeadForm({ ...leadForm, service: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base appearance-none cursor-pointer"
                            required
                          >
                            <option value="" className="bg-white">Select a service</option>
                            <option value="home loan" className="bg-white">Home Loan</option>
                            <option value="personal loan" className="bg-white">Personal Loan</option>
                            <option value="car loan" className="bg-white">Car Loan</option>
                            <option value="educational loan" className="bg-white">Educational Loan</option>
                            <option value="business loan" className="bg-white">Business Loan</option>
                            <option value="mortgage loan" className="bg-white">Mortgage Loan</option>
                            <option value="loan against property" className="bg-white">Loan Against Property</option>
                            <option value="custom" className="bg-white">Custom</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg
                              className="w-4 h-4 text-gray-400 transition-transform duration-200"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="leadMessage" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Message</label>
                      <textarea
                        id="leadMessage"
                        name="leadMessage"
                        value={leadForm.message}
                        onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                        rows={4}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base resize-none"
                        placeholder="Tell us about your loan requirements..."
                      ></textarea>
                    </div>

                    {/* Terms and Conditions Checkbox */}
                    <div className="md:col-span-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          required
                        />
                        <span className="text-sm text-gray-700 leading-relaxed">
                          <span className="text-red-500">*</span>{' '}
                          I agree to the{' '}
                          <a
                            href="https://thome.co.in/privacy-policy/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            Privacy Policy
                          </a>
                          {' '}and{' '}
                          <a
                            href="https://thome.co.in/terms-and-conditions/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            Terms & Conditions
                          </a>
                          {' '}of T-Home Fintech.
                        </span>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white px-6 py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-300 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Contact Form'}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Amortization Schedule */}
          <AnimatePresence>
            {showSchedule && emiData && !validationErrors.loanAmount && !validationErrors.interestRate && !validationErrors.tenure && !validationErrors.additionalMonths && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 shadow-xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-800">Amortization Schedule</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {paymentFrequency === 'monthly' ? 'Monthly' : paymentFrequency === 'quarterly' ? 'Quarterly' : 'Half-Yearly'} payments
                        {paymentFrequency !== 'monthly' && ' (Monthly breakdown available in PDF)'}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handlePrintToPDF}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-300 hover:from-red-600 hover:to-red-700"
                    >
                      Print to PDF
                    </motion.button>
                  </div>

                  <div id="amortization-schedule" className="overflow-x-auto">
                    <table className="w-full text-gray-800">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 capitalize">{paymentFrequency === 'monthly' ? 'Month' : paymentFrequency === 'quarterly' ? 'Quarter' : 'Half-Year'}</th>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-right py-3 px-4">Payment</th>
                          <th className="text-right py-3 px-4">Principal</th>
                          <th className="text-right py-3 px-4">Interest</th>
                          <th className="text-right py-3 px-4">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getCurrentPageData().map((data, index) => (
                          <tr key={(currentPage - 1) * itemsPerPage + index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              {paymentFrequency === 'monthly' ?
                                `Month ${(currentPage - 1) * itemsPerPage + index + 1}` :
                                paymentFrequency === 'quarterly' ?
                                  `Q${(currentPage - 1) * itemsPerPage + index + 1}` :
                                  `H${(currentPage - 1) * itemsPerPage + index + 1}`
                              }
                            </td>
                            <td className="py-3 px-4">{data.date.toLocaleDateString('en-GB')}</td>
                            <td className="text-right py-3 px-4">₹{emiData.emi.toFixed(2)}</td>
                            <td className="text-right py-3 px-4">₹{data.principal.toFixed(2)}</td>
                            <td className="text-right py-3 px-4">₹{data.interest.toFixed(2)}</td>
                            <td className="text-right py-3 px-4">₹{data.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                      <div className="text-gray-600 text-sm order-2 sm:order-1">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, (paymentFrequency === 'monthly' ? emiData.monthlyData : emiData.frequencyData).length)} of {(paymentFrequency === 'monthly' ? emiData.monthlyData : emiData.frequencyData).length} entries
                      </div>

                      <div className="flex items-center gap-2 order-1 sm:order-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                          className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border ${currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                            : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'
                            }`}
                        >
                          ← Previous
                        </motion.button>

                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <motion.button
                              key={page}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium text-sm transition-all duration-200 border ${currentPage === page
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'
                                }`}
                            >
                              {page}
                            </motion.button>
                          ))}
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                            : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'
                            }`}
                        >
                          Next →
                        </motion.button>
                      </div>

                      {/* Mobile Page Selector */}
                      <div className="flex items-center gap-2 order-3 sm:order-3 sm:hidden">
                        <select
                          value={currentPage}
                          onChange={(e) => handlePageChange(Number(e.target.value))}
                          className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm"
                        >
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <option key={page} value={page} className="bg-gray-800">
                              Page {page}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* T-Home Footer */}
      <footer
        className="site-footer"
        style={{
          background: "linear-gradient(90deg, #081a33, #0d2a4f)",
          color: "#d6e0f0"
        }}
      >
        <div className="footer-inner">
          <div className="footer-col brand-col">
            <img src="/images/icons/image.png" alt="T-Home" className="footer-logo" />

            <p>T-HOME is dedicated to providing innovative and reliable solutions for your home. Stay connected for updates and offers.</p>
            <div className="social-row" style={{ marginTop: '12px' }}>
              <a href="#" className="social-icon">
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a href="#" className="social-icon">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="#" className="social-icon" aria-label="LinkedIn">
                <i className="fa-brands fa-linkedin-in"></i>
              </a>
            </div>
          </div>

          <div className="footer-col links-col">
            <h4 style={{ color: '#fff' }}>Quick links</h4>
            <ul className="footer-links">
              <li><a href="https://thome.co.in/" className="text-gray-300 hover:text-blue-500">Home</a></li>
              <li><a href="https://thome.co.in/about-us/" className="text-gray-300 hover:text-blue-500">About us</a></li>
              <li><a href="https://thome.co.in/careers/" className="text-gray-300 hover:text-blue-500">Services</a></li>
              <li><a href="https://thome.co.in/financial-tools/" className="text-gray-300 hover:text-blue-500">Financial Tools</a></li>
            </ul>
          </div>
          <div className="footer-col info-col">
            <h4 style={{ color: '#fff' }}>Official Info</h4>
            <div className="info-item">
              <i className="fa-solid fa-phone"></i>
              <div>
                <strong>Phone</strong>
                <div>+91 7032183836</div>
              </div>
            </div>
            <div className="info-item">
              <i className="fa-solid fa-envelope"></i>
              <div>
                <strong>Mail</strong>
                <div>info@thome.co.in</div>
              </div>
            </div>
            <div className="info-item">
              <i className="fa-solid fa-location-dot"></i>
              <div>
                <strong>Address</strong>
                <div>H.No: 2-88/4, Quthbullapur Village, Opposite to Government Veterinary Hospital, Hyderabad - 500055</div>
              </div>
            </div>
          </div>
          <div className="footer-col subscribe-col">
            <h4 style={{ color: '#fff' }}>Subscribe</h4>
            <form id="subscribeForm" className="subscribe-form">
              <input type="email" id="subscribeEmail" placeholder="you@example.com" required />
              <button className="btn small btn-primary" type="submit">Subscribe</button>
            </form>
            <p className="muted small">* We do not share your email ID</p>
          </div>



        </div>
        {/* Bottom Bar */}
        <div
          style={{
            background: "#3b5d85",
            padding: "20px 80px",
            marginTop: "50px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#fff",
            width: "100%"
          }}
        >
          <div>Copyright © 2025 T-Home. All rights reserved.</div>
          <div style={{ display: "flex", gap: "20px" }}>
            <span>Terms and Conditions</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
