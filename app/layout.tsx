import type { Metadata } from "next";



import { Geist, Geist_Mono } from "next/font/google";



import "./globals.css";

import BodyWrapper from "./components/BodyWrapper";







const geistSans = Geist({



  variable: "--font-geist-sans",



  subsets: ["latin"],



});







const geistMono = Geist_Mono({



  variable: "--font-geist-mono",



  subsets: ["latin"],



});







export const metadata: Metadata = {



  title: "T-Homes EMI Calculator",



  description: "A responsive EMI checker with amortization schedule and contact form integration",

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/thome-logo.png', type: 'image/png' }
    ],
    shortcut: '/thome-logo.png',
    apple: '/thome-logo.png',
  },

  other: {



    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';",



    'X-Content-Type-Options': 'nosniff',



    'X-Frame-Options': 'DENY',



    'X-XSS-Protection': '1; mode=block',



    'Referrer-Policy': 'strict-origin-when-cross-origin',



    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',



  },



};







export const viewport = {



  width: 'device-width',



  initialScale: 1,



};







export default function RootLayout({



  children,



}: Readonly<{



  children: React.ReactNode;



}>) {



  return (



    <html lang="en">



      <head>



        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />



      </head>



      <BodyWrapper className={`${geistSans.variable} ${geistMono.variable} antialiased`}>

        {children}

      </BodyWrapper>



    </html>



  );



}



