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
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [interestRate, setInterestRate] = useState(6);
  const [tenure, setTenure] = useState(6);
  const [additionalMonths, setAdditionalMonths] = useState(0);
  const [startDate, setStartDate] = useState('2026-02-12');
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'quarterly' | 'half-yearly'>('monthly');
  const [emiData, setEMIData] = useState<EMIData | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>({ name: '', email: '', phone: '', countryCode: '+91', service: '', message: '' });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);

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
      if (loanAmount !== '' && loanAmount > 0) {
        setCurrentPage(1);
        calculateEMI();
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [loanAmount, interestRate, tenure, additionalMonths, paymentFrequency]);

  // Utility function for precise rounding
  const roundToTwo = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const calculateEMI = useCallback(() => {
    try {
      // Skip calculation if loan amount is not valid
      if (!loanAmount || (typeof loanAmount === 'string' && loanAmount === '')) {
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
  }, [loanAmount, interestRate, tenure, additionalMonths, paymentFrequency, startDate]);

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
    
    // If form has already been submitted, show schedule directly
    if (hasSubmittedForm) {
      setShowSchedule(true);
      setShowLeadForm(false);
    } else {
      // Show lead form for first time
      setShowLeadForm(true);
      setShowSchedule(false);
    }
  }, [loanAmount, calculateEMI, hasSubmittedForm]);

  const handleSliderChange = useCallback((value: number, setter: (val: number) => void) => {
    setter(value);
  }, []);

  // Validation functions
  const validateLoanAmount = useCallback((value: number): string | undefined => {
    if (isNaN(value) || value <= 0) {
      return 'Loan amount must be a positive number';
    }
    return undefined;
  }, []);

  const validateInterestRate = useCallback((value: number): string | undefined => {
    if (isNaN(value) || value < 0 || value > 20) {
      return 'Interest rate must be between 0% and 20%';
    }
    return undefined;
  }, []);

  const validateTenure = useCallback((value: number): string | undefined => {
    if (isNaN(value) || value < 0 || value > 30) {
      return 'Tenure must be between 0 and 30 years';
    }
    return undefined;
  }, []);

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
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return 'Name can only contain letters and spaces';
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
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      return 'Phone number must be 10 digits';
    }
    return undefined;
  }, []);

  // Debounced loan amount change handler
  const handleLoanAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? '' : Number(e.target.value);
    setLoanAmount(value);
    
    // Only validate if there's a value
    if (value !== '') {
      const error = validateLoanAmount(Number(value));
      setValidationErrors(prev => ({ ...prev, loanAmount: error }));
    } else {
      setValidationErrors(prev => ({ ...prev, loanAmount: undefined }));
    }
  }, [validateLoanAmount]);

  const handleInterestRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const error = validateInterestRate(value);
    setValidationErrors(prev => ({ ...prev, interestRate: error }));
    setInterestRate(value);
  }, [validateInterestRate]);

  const handleTenureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const error = validateTenure(value);
    setValidationErrors(prev => ({ ...prev, tenure: error }));
    setTenure(value);
  }, [validateTenure]);

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
    
    // If there are errors, don't submit
    if (nameError || emailError || phoneError) {
      console.log('Validation errors:', newErrors);
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
        
        // Hide form and show schedule after 3 seconds
        setTimeout(() => {
          console.log('Hiding loader and showing schedule');
          setShowLeadForm(false);
          setShowLoader(false);
          setTimeout(() => setShowSchedule(true), 300);
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

<!-- Bootstrap -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

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
    bottom: 30px;
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
.footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: #2f4e73;
    color: white;
    padding: 20px 30px 12px;
    font-size: 11px;
}

.footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
    padding: 15px 0;
}

.social-links {
    display: flex;
    gap: 30px;
    align-items: center;
}

.social-links.left {
    justify-content: flex-start;
}

.social-links.right {
    justify-content: flex-end;
}

.social-icon {
    color: white;
    font-size: 28px;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
}

.social-icon svg {
    width: 28px;
    height: 28px;
    fill: white;
}

.social-icon:hover {
    transform: scale(1.1);
    background: rgba(255, 255, 255, 0.2);
}

.social-icon:hover svg {
    fill: #c62828;
}

.qr-container {
    text-align: center;
    padding: 0 20px;
}

.qr-title {
    font-size: 12px;
    margin-bottom: 5px;
    color: #fff;
}

.qr-code {
    width: 70px;
    height: 70px;
    background: white;
    padding: 5px;
    border-radius: 5px;
    margin: 0 auto;
}

.whatsapp-number {
    font-size: 11px;
    margin-top: 5px;
    color: #fff;
}

.footer .red-corner {
    position: absolute;
    right: 0;
    top: -25px;
    width: 100px;
    height: 20px;
    background: #c62828;
    transform: skewX(-30deg);
}

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
    .social-icon {
        background: rgba(255, 255, 255, 0.1) !important;
        -webkit-print-color-adjust: exact;
    }
    .social-icon svg {
        fill: white !important;
        -webkit-print-color-adjust: exact;
    }
    .qr-code {
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
        <!-- EMI Calculator Results -->
        <h3 style="color: #2f4e73; margin-bottom: 15px; text-align: center;">EMI Amortization Schedule</h3>
        
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
        <div class="d-flex justify-content-start text-left">
            <div class="col-md-4 px-0">📞 ${phoneNumber}</div>
            <div class="col-md-4 px-0">🌐 ${websiteUrl}</div>
            <div class="col-md-4 px-0">📍 ${companyAddress}</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="footer-content">
            <div class="social-links left">
                <a href="https://www.youtube.com/@T-HomeFintech" class="social-icon" title="YouTube">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                </a>
                <a href="https://www.instagram.com/thomefintech" class="social-icon" title="Instagram">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                    </svg>
                </a>
            </div>
            
            <div class="qr-container">
                <div class="qr-title">Scan to Chat on WhatsApp</div>
                <img src="${window.location.origin}/images/T-Home what's app QR (1).png" alt="WhatsApp QR Code" class="qr-code" style="width: 80px; height: 80px;">
            </div>
            
            <div class="social-links right">
                <a href="https://www.facebook.com/people/T-Home/61571992704350/" class="social-icon" title="Facebook">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                </a>
                <a href="https://www.linkedin.com/company/thomefintech" class="social-icon" title="LinkedIn">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </a>
            </div>
        </div>
        <div class="red-corner"></div>
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
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
              </filter>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
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
                      filter: isHovered ? 'url(#glow)' : 'none',
                      cursor: 'pointer',
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'all 0.3s ease-in-out'
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
          <p className="text-black/80 text-sm">Monthly EMI</p>
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
    if (!loanAmount || loanAmount === '' || !emiData) {
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

  // Default to 50/50 split if no loan amount is entered
  const pieData = useMemo(() => {
    if (!loanAmount || loanAmount === '') {
      return [
        { name: 'Principal', value: 50, color: '#3b82f6' },
        { name: 'Interest', value: 50, color: '#f97316' }
      ];
    }
    
    return [
      { name: 'Principal', value: Number(loanAmount) || 0, color: '#3b82f6' },
      { name: 'Interest', value: emiData?.totalInterest || 0, color: '#f97316' }
    ];
  }, [emiData, loanAmount]);

  const lineData = useMemo(() => emiData ? emiData.monthlyData.map(data => ({
    month: `Month ${data.month}`,
    principal: data.principal,
    interest: data.interest,
    balance: data.balance,
    total: data.principal + data.interest
  })) : [], [emiData]);

  // Prepare yearly breakdown data for stacked bar chart
  const yearlyData = useMemo(() => emiData ? (() => {
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
  })() : [], [emiData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 relative overflow-hidden">
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

                    <nav className={`nav ${isMobileMenuOpen ? 'open' : ''}`} aria-label="Main navigation">
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
          EMI Calculator + Amortization Schedule
        </motion.h1>

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
                    alt="EMI Calculator Logo"
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
            
            {/* Loan Amount */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="loanAmount" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Loan Amount (₹)</label>
              <div className="relative">
                <input
                  id="loanAmount"
                  type="number"
                  value={loanAmount === '' ? '' : loanAmount}
                  onChange={handleLoanAmountChange}
                  min="0"
                  placeholder="Enter loan amount"
                  aria-label="Loan amount in rupees"
                  aria-describedby="loanAmount-error"
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border ${validationErrors.loanAmount ? 'border-red-400' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${validationErrors.loanAmount ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                />
                {validationErrors.loanAmount && (
                  <p id="loanAmount-error" className="text-red-400 text-xs mt-2" role="alert">{validationErrors.loanAmount}</p>
                )}
                <div className="mt-4 relative">
                  <input
                    type="range"
                    min="10000"
                    max="10000000"
                    step="1000"
                    value={loanAmount === '' ? 0 : loanAmount}
                    onChange={handleLoanAmountChange}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern loan-slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${loanAmount === '' ? 0 : (Number(loanAmount) - 10000) / (10000000 - 10000) * 100}%, #e5e7eb ${loanAmount === '' ? 0 : (Number(loanAmount) - 10000) / (10000000 - 10000) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Interest Rate */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="interestRate" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Annual Interest Rate (%)</label>
              <div className="relative">
                <input
                  id="interestRate"
                  name="interestRate"
                  type="number"
                  value={interestRate}
                  onChange={handleInterestRateChange}
                  step="0.1"
                  min="0"
                  max="20"
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border ${validationErrors.interestRate ? 'border-red-400' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${validationErrors.interestRate ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                />
                {validationErrors.interestRate && (
                  <p className="text-red-400 text-xs mt-2">{validationErrors.interestRate}</p>
                )}
                <div className="mt-4 relative">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.1"
                    value={interestRate}
                    onChange={handleInterestRateChange}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern interest-slider"
                    style={{
                      background: `linear-gradient(to right, #D2232A 0%, #D2232A ${((interestRate - 1) / (20 - 1)) * 100}%, #e5e7eb ${((interestRate - 1) / (20 - 1)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tenure */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="tenure" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Tenure (Years)</label>
              <div className="relative">
                <input
                  id="tenure"
                  name="tenure"
                  type="number"
                  value={tenure}
                  onChange={handleTenureChange}
                  min="0"
                  max="30"
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border ${validationErrors.tenure ? 'border-red-400' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${validationErrors.tenure ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                />
                {validationErrors.tenure && (
                  <p className="text-red-400 text-xs mt-2">{validationErrors.tenure}</p>
                )}
                <div className="mt-4 relative">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={tenure}
                    onChange={handleTenureChange}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern tenure-slider"
                    style={{
                      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((tenure - 1) / (30 - 1)) * 100}%, #e5e7eb ${((tenure - 1) / (30 - 1)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Additional Months */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="additionalMonths" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Additional Months</label>
              <div className="relative">
                <input
                  id="additionalMonths"
                  name="additionalMonths"
                  type="number"
                  value={additionalMonths}
                  onChange={handleAdditionalMonthsChange}
                  min="0"
                  max="12"
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border ${validationErrors.additionalMonths ? 'border-red-400' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${validationErrors.additionalMonths ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                />
                {validationErrors.additionalMonths && (
                  <p className="text-red-400 text-xs mt-2">{validationErrors.additionalMonths}</p>
                )}
                <div className="mt-4 relative">
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={additionalMonths}
                    onChange={handleAdditionalMonthsChange}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-modern months-slider"
                    style={{
                      background: `linear-gradient(to right, #1d4ed8 0%, #1d4ed8 ${(additionalMonths / 12) * 100}%, #e5e7eb ${(additionalMonths / 12) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Start Date */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="startDate" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Start Date</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              />
            </div>

            {/* Payment Frequency */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="paymentFrequency" className="block text-gray-700 mb-2 sm:mb-3 font-medium text-sm sm:text-base">Payment Frequency</label>
              <select
                id="paymentFrequency"
                name="paymentFrequency"
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value as 'monthly' | 'quarterly' | 'half-yearly')}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              >
                <option value="monthly" className="bg-white">Monthly</option>
                <option value="quarterly" className="bg-white">Quarterly</option>
                <option value="half-yearly" className="bg-white">Half-yearly</option>
              </select>
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
                {loanAmount === '' ? 'Loan Amortization (Example)' : 'Loan Amortization'}
              </h3>
              <div className="relative h-64">
                <Custom3DDonut data={loanAmount === '' ? [
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
                  {loanAmount === '' ? 'Loan Balance Over Time (Example)' : 'Loan Balance Over Time'}
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={loanAmount === '' ? Array(12).fill(0).map((_, i) => ({
                    month: i + 1,
                    principal: 0,
                    interest: 0,
                    balance: 0
                  })) : lineData}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D2232A" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.1}/>
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
                      fillOpacity={loanAmount === '' ? 0.3 : 1}
                      strokeDasharray={loanAmount === '' ? '4 2' : '0'}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="interest" 
                      stroke="#D2232A" 
                      strokeWidth={2}
                      fill="url(#interestGradient)" 
                      fillOpacity={loanAmount === '' ? 0.3 : 1}
                      strokeDasharray={loanAmount === '' ? '4 2' : '0'}
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
                  {loanAmount === '' ? 'Yearly Payment Breakdown (Example)' : 'Yearly Payment Breakdown'}
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={loanAmount === '' ? Array(12).fill(0).map((_, i) => ({
                    year: i + 1,
                    principal: 0,
                    interest: 0
                  })) : yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="principalBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7}/>
                      </linearGradient>
                      <linearGradient id="interestBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#D2232A" stopOpacity={0.7}/>
                      </linearGradient>
                      <filter id="barShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity={0.2}/>
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
                      tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
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
                      fillOpacity={loanAmount === '' ? 0.3 : 1}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="principal" 
                      stackId="a" 
                      fill="#3b82f6" 
                      fillOpacity={loanAmount === '' ? 0.3 : 1}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

          </motion.div>
        </div>

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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCalculateFullSchedule}
            className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-300 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900"
          >
            Calculate Full Schedule
          </motion.button>
        </motion.div>

        {/* Contact Form - Only shown after Calculate button */}
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
                <form onSubmit={handleLeadSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="leadName" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Name</label>
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
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border ${validationErrors.email ? 'border-red-400' : 'border-gray-300'} text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${validationErrors.email ? 'focus:ring-red-400' : 'focus:ring-blue-400'} focus:border-transparent transition-all duration-300 text-sm sm:text-base`}
                        placeholder="your@email.com"
                        required
                      />
                      {validationErrors.email && (
                        <p className="text-red-400 text-xs mt-2">{validationErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="leadPhone" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Phone</label>
                      <div className="flex gap-2">
                        <input
                          id="leadPhone"
                          name="leadPhone"
                          type="text"
                          value={leadForm.countryCode}
                          onChange={(e) => setLeadForm({ ...leadForm, countryCode: e.target.value })}
                          className="w-24 px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          placeholder="+91"
                          maxLength={5}
                          required
                        />
                        <input
                          id="leadPhoneNumber"
                          name="leadPhoneNumber"
                          type="tel"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          placeholder="12345 67890"
                          maxLength={10}
                          required
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-red-400 text-xs mt-2">{validationErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="leadService" className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Service</label>
                      <select
                        id="leadService"
                        name="leadService"
                        value={leadForm.service}
                        onChange={(e) => setLeadForm({ ...leadForm, service: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                        required
                      >
                        <option value="" className="bg-white">Select a service</option>
                        <option value="personal" className="bg-white">Personal Loan</option>
                        <option value="home" className="bg-white">Home Loan</option>
                        <option value="business" className="bg-white">Business Loan</option>
                        <option value="other" className="bg-white">Other</option>
                      </select>
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
          {showSchedule && emiData && (
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
                        className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border ${
                          currentPage === 1 
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
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium text-sm transition-all duration-200 border ${
                              currentPage === page
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
                        className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border ${
                          currentPage === totalPages 
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
          <div className="social-row" style={{marginTop: '12px'}}>
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
          <h4 style={{color: '#fff'}}>Quick links</h4>
          <ul className="footer-links">
            <li><a href="https://thome.co.in/" className="text-gray-300 hover:text-blue-500">Home</a></li>
            <li><a href="https://thome.co.in/about-us/" className="text-gray-300 hover:text-blue-500">About us</a></li>
            <li><a href="https://thome.co.in/careers/" className="text-gray-300 hover:text-blue-500">Services</a></li>
            <li><a href="https://thome.co.in/financial-tools/" className="text-gray-300 hover:text-blue-500">Financial Tools</a></li>
          </ul>
        </div>
        <div className="footer-col info-col">
          <h4 style={{color: '#fff'}}>Official Info</h4>
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
          <h4 style={{color: '#fff'}}>Subscribe</h4>
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
          width:"100%"
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
