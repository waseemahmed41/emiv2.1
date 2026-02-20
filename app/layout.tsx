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

  title: "T-Homes EMI Checker",

  description: "A responsive EMI checker with amortization schedule and contact form integration",

  other: {

    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",

    'X-Content-Type-Options': 'nosniff',

    'X-Frame-Options': 'DENY',

    'X-XSS-Protection': '1; mode=block',

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

