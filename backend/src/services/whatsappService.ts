/**
 * WhatsApp Notification Service
 * Supports:
 *  1. Twilio WhatsApp API (Instant sandbox / No Meta verification needed)
 *  2. Green-API / UltraMsg (Scan WhatsApp QR code / 1-minute setup)
 *  3. Meta WhatsApp Cloud API (Free tier)
 *  4. Development Simulation (Console preview)
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
export function buildWhatsAppMessageText(data: WhatsAppDecisionData): string {
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
 * Dispatches via Twilio WhatsApp API or SMS fallback
 */
async function sendViaTwilio(phone: string, messageText: string): Promise<boolean> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const rawFrom = (process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886').trim();
  const fromNumber = rawFrom.startsWith('whatsapp:') ? rawFrom : `whatsapp:${rawFrom}`;
  const twilioPhone = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  // 1. Attempt WhatsApp dispatch
  try {
    const params = new URLSearchParams();
    params.append('To', `whatsapp:+${phone}`);
    params.append('From', fromNumber);
    params.append('Body', messageText);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = (await res.json()) as any;
    if (res.ok) {
      console.log(`[WhatsAppService (Twilio)] Sent WhatsApp to +${phone} (SID: ${data?.sid})`);
      return true;
    }

    console.warn(`[WhatsAppService (Twilio WhatsApp)] (${res.status}): ${data?.message || JSON.stringify(data)}`);
  } catch (err: any) {
    console.warn(`[WhatsAppService (Twilio WhatsApp)] Failed:`, err?.message || err);
  }

  // 2. Fallback to SMS if Twilio phone number is present
  if (twilioPhone) {
    try {
      console.log(`[WhatsAppService] Attempting Twilio SMS fallback from ${twilioPhone}...`);
      const smsParams = new URLSearchParams();
      smsParams.append('To', `+${phone}`);
      smsParams.append('From', twilioPhone);
      smsParams.append('Body', messageText);

      const smsRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: smsParams.toString(),
      });

      const smsData = (await smsRes.json()) as any;
      if (smsRes.ok) {
        console.log(`[WhatsAppService (Twilio SMS)] Sent SMS to +${phone} (SID: ${smsData?.sid})`);
        return true;
      }
      console.error(`[WhatsAppService (Twilio SMS)] Error (${smsRes.status}):`, smsData?.message || smsData);
    } catch (smsErr: any) {
      console.error(`[WhatsAppService (Twilio SMS)] Failed:`, smsErr?.message || smsErr);
    }
  }

  return false;
}

/**
 * Dispatches via Green-API (Instant WhatsApp instance via QR scan)
 */
async function sendViaGreenApi(phone: string, messageText: string): Promise<boolean> {
  const idInstance = (process.env.GREEN_API_INSTANCE_ID || '').trim();
  const apiTokenInstance = (process.env.GREEN_API_API_TOKEN || '').trim();

  const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        message: messageText,
      }),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      console.error(`[WhatsAppService (Green-API)] Error (${res.status}):`, data);
      return false;
    }

    console.log(`[WhatsAppService (Green-API)] Sent WhatsApp to +${phone} (idMessage: ${data?.idMessage})`);
    return true;
  } catch (err: any) {
    console.error(`[WhatsAppService (Green-API)] Failed:`, err?.message || err);
    return false;
  }
}

/**
 * Dispatches via Meta WhatsApp Cloud API
 */
async function sendViaMeta(phone: string, messageText: string): Promise<boolean> {
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

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
      console.error(`[WhatsAppService (Meta)] Error (${res.status}):`, result?.error?.message || result);
      return false;
    }

    console.log(`[WhatsAppService (Meta)] Sent WhatsApp to +${phone} (MessageId: ${result?.messages?.[0]?.id})`);
    return true;
  } catch (err: any) {
    console.error(`[WhatsAppService (Meta)] Failed:`, err?.message || err);
    return false;
  }
}

/**
 * Main function: Automatically detects configured WhatsApp provider and sends notification.
 */
export async function sendWhatsAppDecisionNotification(data: WhatsAppDecisionData): Promise<boolean> {
  const phone = normalizePhoneNumber(data.recipientPhone);
  if (!phone) {
    console.warn(`[WhatsAppService] Invalid recipient phone number: "${data.recipientPhone}". Skipping.`);
    return false;
  }

  const messageText = buildWhatsAppMessageText(data);

  // 1. Green-API (Direct QR scan instance)
  if (process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_API_TOKEN) {
    return sendViaGreenApi(phone, messageText);
  }

  // 2. Twilio (WhatsApp with SMS fallback)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return sendViaTwilio(phone, messageText);
  }

  // 3. Meta Cloud API
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    return sendViaMeta(phone, messageText);
  }

  // 4. Simulated Dev Mode
  console.log(`[WhatsAppService (Simulated Preview)] Message to +${phone}:`);
  console.log('──────────────────────────────────────────────────');
  console.log(messageText);
  console.log('──────────────────────────────────────────────────');
  return true;
}

