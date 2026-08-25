/**
 * Meta WhatsApp Cloud API Service (1,000 Free Tier / Month)
 * Handles automated WhatsApp dispatch for AttendEase permission reviews.
 */

export interface WhatsAppDecisionData {
  recipientPhone: string;
  studentName: string;
  studentRoll: string;
  department?: string;
  reasonLabel: string;
  date: string;
  periods?: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  decisionByRole: string; // 'Faculty' | 'HOD'
  reviewerName: string;
}

/**
 * Normalizes Indian phone numbers to international E.164 format without '+' or spaces.
 * e.g., '+91 98765 43210' -> '919876543210', '9876543210' -> '919876543210'
 */
export function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  } else if (digits.length > 10) {
    return digits;
  }

  return null;
}

/**
 * Builds formatted markdown text for WhatsApp message.
 */
function buildWhatsAppMessageText(data: WhatsAppDecisionData): string {
  const isApproved = data.status === 'approved';
  const statusEmoji = isApproved ? '✅' : '❌';
  const statusText = isApproved ? '*APPROVED*' : '*REJECTED*';

  const periodsText = data.periods && data.periods.trim()
    ? `*Periods:* ${data.periods}`
    : '*Periods:* All Periods';

  let msg = `🎓 *AttendEase — S.R.K.R. Engineering College*\n`;
  msg += `*Departments of CSIT & CSD*\n\n`;
  msg += `Hello *${data.studentName}* (${data.studentRoll}),\n`;
  msg += `Your attendance permission request has been ${statusEmoji} ${statusText}.\n\n`;
  msg += `📋 *Reason:* ${data.reasonLabel}\n`;
  msg += `📅 *Date:* ${data.date}\n`;
  if (isApproved) {
    msg += `⏰ ${periodsText}\n`;
  }
  msg += `✍️ *Reviewed by:* ${data.reviewerName} (${data.decisionByRole})\n`;

  if (!isApproved && data.rejectionReason) {
    msg += `\n⚠️ *Remarks:* ${data.rejectionReason}\n`;
  }

  msg += `\n_This is an automated notification from AttendEase._`;
  return msg;
}

/**
 * Sends WhatsApp notification via Meta Cloud API or simulates in local dev mode.
 */
export async function sendWhatsAppDecisionNotification(data: WhatsAppDecisionData): Promise<boolean> {
  const phone = normalizePhoneNumber(data.recipientPhone);
  if (!phone) {
    console.warn(`[WhatsAppService] Invalid recipient phone number: "${data.recipientPhone}". Skipping.`);
    return false;
  }

  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const messageText = buildWhatsAppMessageText(data);

  // If credentials are not set, log in simulated development mode
  if (!phoneNumberId || !accessToken) {
    console.log(`[WhatsAppService (Simulated)] Message to +${phone}:`);
    console.log('──────────────────────────────────────────────────');
    console.log(messageText);
    console.log('──────────────────────────────────────────────────');
    return true;
  }

  const endpoint = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = (await res.json()) as any;

    if (!res.ok) {
      console.error(`[WhatsAppService] Meta Cloud API Error (${res.status}):`, result?.error?.message || result);
      return false;
    }

    console.log(`[WhatsAppService] WhatsApp notification sent to +${phone} (MessageId: ${result?.messages?.[0]?.id})`);
    return true;
  } catch (err: any) {
    console.error(`[WhatsAppService] Failed to send WhatsApp notification to +${phone}:`, err?.message || err);
    return false;
  }
}
