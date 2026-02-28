# T-Homes EMI Calculator

A comprehensive EMI calculator with advanced features, stress analysis, and professional PDF export functionality.

## Features

### Core Functionality
- **Real-time EMI calculations** with instant results
- **Multiple loan types**: Home, Personal, Car, Educational, Mortgage, Loan Against Property, Custom
- **Payment frequency options**: Monthly, Quarterly, Half-Yearly
- **Interactive amortization schedule** with detailed payment breakdowns
- **Advanced EMI Stress Score** analysis with color-coded risk levels
- **Professional PDF export** with branded templates

### User Experience Enhancements
- **Responsive design** optimized for mobile, tablet, and desktop
- **Service-based loan thresholds** with RBI-compliant limits
- **Auto-service type detection** (sets to "Custom" when amount entered without selection)
- **Persistent contact form state** (remembers previous submissions)
- **RBI guidelines scrolling notice** with animated display
- **Input validation** with negative value prevention and digit-only entry
- **Dynamic UI elements** with smooth animations and transitions

### Visual Features
- **Interactive charts and visualizations** using Recharts
- **3D elements** with React Three Fiber
- **Framer Motion animations** for smooth transitions
- **Professional PDF templates** with branded social media icons
- **Color-coded EMI stress levels** (Safe/Manageable/Risky)

## Recent Updates

### EMI Stress Score Feature
- **Net Monthly Income** and **Net EMI Paying** input fields
- **EMI Ratio calculation**: `(New EMI + Existing EMIs) / Monthly Income × 100`
- **Color-coded risk assessment**:
  - 🟢 **Safe** (< 30%): Excellent financial health
  - 🟡 **Manageable** (30-45%): Consider reducing loan amount
  - 🔴 **Risky** (> 45%): High debt burden - review carefully
- **Always-visible card** with conditional output display

### PDF Template Enhancements
- **Branded social media icons** with official colors:
  - YouTube (Red), Instagram (Gradient), Facebook (Blue), LinkedIn (Dark Blue)
- **Improved spacing** between text and QR scanner
- **Professional layout** with enhanced shadows and borders
- **80px spacing** between social media icons for clean appearance

### Service Type Dropdown
- **Fixed arrow rotation** logic for proper visual feedback
- **Improved event handling** with delayed blur closure
- **Smooth transitions** and better user interaction

### Loan Thresholds (RBI Compliant)
- **Home Loan**: ₹1L - ₹5Cr (7-15% interest, 5-30 years)
- **Personal Loan**: ₹10K - ₹15L (10-36% interest, 1-7 years)
- **Car Loan**: ₹50K - ₹40L (7-20% interest, 1-7 years)
- **Educational Loan**: ₹10K - ₹40L (4-15% interest, 1-15 years)
- **Mortgage Loan**: ₹1L - ₹1Cr (8-21% interest, 1-20 years)
- **Loan Against Property**: ₹1L - ₹70Cr (8-21% interest, 1-20 years)
- **Custom**: ₹1K - ₹10Cr (1-40% interest, 1-30 years)

## Tech Stack
- **Next.js 16** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **React Three Fiber** for 3D elements
- **jsPDF** for PDF generation
- **html2canvas** for PDF rendering

## Security & Performance
- **Client-side persistence** with localStorage
- **Input sanitization** and validation
- **Optimized PDF generation** with iframe isolation
- **Responsive design** with mobile-first approach

## Deployment
This project is optimized for deployment on Vercel with automatic environment variable handling.

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.local.example`)
4. Run development server: `npm run dev`
5. Build for production: `npm run build`

## Environment Variables
```env
NEXT_PUBLIC_COMPANY_NAME=T-Home Fintech
NEXT_PUBLIC_PHONE_NUMBER=+91 70321 83836
NEXT_PUBLIC_WEBSITE_URL=www.thome.co.in
NEXT_PUBLIC_COMPANY_ADDRESS=Hyderabad, Telangana
```

## Live Demo
Deployed on Vercel for testing and demonstration.

Repository: https://github.com/waseemahmed41/emi_2.0

## Key Components
- **EMI Calculator**: Main calculation engine with validation
- **Stress Score Analyzer**: Financial health assessment
- **PDF Generator**: Professional amortization schedule export
- **Contact Form**: Lead generation with persistence
- **Responsive UI**: Mobile-first design approach

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
