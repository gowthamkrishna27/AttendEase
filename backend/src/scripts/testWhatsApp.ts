import dotenv from 'dotenv';
dotenv.config();

import { sendWhatsAppDecisionNotification } from '../services/whatsappService.js';

async function main() {
  console.log('Testing WhatsApp Notification Service:');
  console.log('WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID || '(Not configured - running in preview simulation)');

  const success = await sendWhatsAppDecisionNotification({
    recipientPhone: '9963545352',
    studentName: 'Gowtham Krishna',
    studentRoll: '24B91A0720',
    department: 'CSIT & CSD',
    reasonLabel: 'Hackathon & Workshop Participation',
    date: '25 Aug 2026',
    periods: '1, 2, 3, 4',
    status: 'approved',
    decisionByRole: 'Faculty',
    reviewerName: 'Prof. N. Aneela',
  });

  console.log('WhatsApp Test Result:', success ? 'SUCCESS!' : 'FAILED');
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal WhatsApp error:', err);
  process.exit(1);
});
