import dotenv from 'dotenv';
dotenv.config();

import { sendRequestDecisionEmail } from '../services/emailService.js';

async function main() {
  console.log('Testing Email Service with credentials from .env:');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('CLIENT_URL:', process.env.CLIENT_URL);

  const success = await sendRequestDecisionEmail({
    recipientEmail: 'gowthamkrishna18v@gmail.com',
    studentName: 'Gowtham Krishna',
    studentRoll: '24B91A0720',
    department: 'CSIT & CSD',
    reasonLabel: 'Hackathon & Workshop Participation',
    date: '25 Aug 2026',
    periods: '1, 2, 3, 4',
    status: 'approved',
    decisionByRole: 'Faculty',
    reviewerName: 'Prof. N. Aneela',
    shareToken: 'test-pass-token-123',
    publicId: 'req-test-123',
  });

  console.log('Email test result:', success ? 'SUCCESS! Email sent.' : 'FAILED to send email.');
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error in test script:', err);
  process.exit(1);
});
