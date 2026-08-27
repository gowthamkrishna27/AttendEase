import dotenv from 'dotenv';
dotenv.config();

import { sendWhatsAppDecisionNotification } from '../services/whatsappService.js';

async function main() {
  console.log('Testing WhatsApp Notification Service:');
  const provider =
    process.env.GREEN_API_INSTANCE_ID ? 'Green-API (Direct WhatsApp Instance)' :
    process.env.TWILIO_ACCOUNT_SID ? 'Twilio WhatsApp API' :
    process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Meta WhatsApp Cloud API' :
    'Preview Simulation (Console)';
  console.log(`Active Provider: ${provider}`);

  const recipients = [
    { phone: '9963545352', name: 'Gowtham Krishna', roll: '24B91A0720' },
  ];

  for (const r of recipients) {
    console.log(`\n--- Sending notification to ${r.name} (${r.phone}) ---`);
    const success = await sendWhatsAppDecisionNotification({
      recipientPhone: r.phone,
      studentName: r.name,
      studentRoll: r.roll,
      department: 'CSIT & CSD',
      reasonLabel: 'Hackathon & Workshop Participation',
      date: '26 Aug 2026',
      periods: '1, 2, 3, 4',
      status: 'approved',
      decisionByRole: 'Faculty',
      reviewerName: 'Prof. N. Aneela',
    });
    console.log(`Result for ${r.phone}:`, success ? 'SUCCESS!' : 'FAILED');
  }
}

main().catch(err => {
  console.error('Fatal WhatsApp error:', err);
});
