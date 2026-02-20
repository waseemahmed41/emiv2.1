// Server-side Google Sheets Service using Service Account
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Google Sheets API with environment variables
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, service, message, loanAmount, interestRate, tenure, paymentFrequency } = body;

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Add timestamp
    const timestamp = new Date().toISOString();
    
    // Prepare data for Google Sheets with proper column order
    // Columns: Name, Email, Phone, ServiceType, LoanAmount, InterestRate, Tenure, PaymentFrequency, Timestamp, Message
    const values = [
      [
        name || 'N/A',
        email || 'N/A', 
        phone || 'N/A',
        service || 'N/A',
        loanAmount ? `₹${Number(loanAmount).toLocaleString()}` : 'N/A',
        interestRate ? `${interestRate}%` : 'N/A',
        tenure ? `${tenure} years` : 'N/A',
        paymentFrequency || 'N/A',
        timestamp,
        message || 'N/A' // Message moved to the end
      ]
    ];

    console.log('Saving to Google Sheets:', values[0]);

    // Append to Google Sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || 'your_spreadsheet_id_here',
      range: 'Sheet1!A:J', // Columns A through J (Message is now in column J)
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });

    // Google Sheets response received successfully

    return NextResponse.json(
      { 
        success: true, 
        message: 'Data saved successfully',
        data: response.data
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json(
      { error: 'Failed to save data to Google Sheets: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
