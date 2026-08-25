import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'AttendEase SRKR <noreply@srkrec.ac.in>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

let transporter: Transporter | null = null;

/**
 * Initializes and returns the Nodemailer transporter.
 * Dynamically reads environment variables and strips spaces from Google App Passwords.
 */
export function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  if (user && pass) {
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass,
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
        });
        console.log(`[EmailService] SMTP Transporter initialized for ${user} via ${host}:${port}`);
      }
      return transporter;
    } catch (err) {
      console.error('[EmailService] Failed to initialize SMTP transporter:', err);
      transporter = null;
    }
  } else {
    console.log('[EmailService] No active SMTP credentials in environment. Operating in simulated preview mode.');
  }

  return transporter;
}

export interface DecisionEmailData {
  recipientEmail: string;
  studentName: string;
  studentRoll: string;
  department: string;
  reasonLabel: string;
  date: string;
  periods?: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  decisionByRole: string; // 'Faculty' | 'HOD'
  reviewerName: string;
  shareToken?: string;
  publicId?: string;
}

/**
 * Generates responsive, beautifully styled HTML email for request approval or rejection.
 */
function buildDecisionEmailHtml(data: DecisionEmailData): string {
  const isApproved = data.status === 'approved';
  const badgeColor = isApproved ? '#059669' : '#E11D48';
  const badgeBg = isApproved ? '#ECFDF5' : '#FFF1F2';
  const badgeBorder = isApproved ? '#A7F3D0' : '#FECDD3';
  const statusTitle = isApproved ? 'Permission Request Approved' : 'Permission Request Rejected';
  const logoUrl = 'https://iattendease.vercel.app/logo.png';

  const periodsArray = data.periods
    ? data.periods.split(/[, ]+/).filter(Boolean)
    : [];

  const periodsChipsHtml = periodsArray.length > 0
    ? periodsArray
        .map(
          p => `<span style="display:inline-block; width:20px; height:20px; line-height:20px; text-align:center; border-radius:50%; background:#EA580C; color:#ffffff; font-weight:700; font-size:10.5px; margin-right:3px;">${p}</span>`
        )
        .join('')
    : '<span style="color:#64748B; font-weight:600; font-size:12.5px;">All Periods</span>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusTitle}</title>
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC; padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:500px; background-color:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; box-shadow:0 2px 12px rgba(0,0,0,0.03); overflow:hidden;" cellspacing="0" cellpadding="0">
          
          <!-- Header with Logo & College Info -->
          <tr>
            <td style="padding:28px 24px 20px 24px; text-align:center; border-bottom:1px solid #F1F5F9;">
              <img src="${logoUrl}" alt="AttendEase Logo" width="52" height="52" style="display:inline-block; border-radius:10px; margin-bottom:10px;" />
              <h1 style="margin:0; font-size:16px; font-weight:800; color:#0F172A; letter-spacing:-0.2px;">S.R.K.R. Engineering College</h1>
              <p style="margin:3px 0 0 0; font-size:12px; font-weight:600; color:#EA580C; letter-spacing:0.3px;">Departments of CSIT &amp; CSD</p>
              <p style="margin:2px 0 0 0; font-size:11px; color:#94A3B8;">AttendEase Permission Portal</p>
            </td>
          </tr>

          <!-- Status & Greeting -->
          <tr>
            <td style="padding:24px 24px 16px 24px; text-align:center;">
              <div style="display:inline-block; padding:4px 14px; border-radius:20px; background-color:${badgeBg}; color:${badgeColor}; font-size:12px; font-weight:700; border:1px solid ${badgeBorder}; letter-spacing:0.3px;">
                ${isApproved ? '✓ APPROVED' : '✕ REJECTED'}
              </div>
              <h2 style="margin:12px 0 6px 0; font-size:19px; font-weight:800; color:#0F172A; letter-spacing:-0.3px;">
                ${statusTitle}
              </h2>
              <p style="margin:0; font-size:13px; color:#64748B; line-height:1.4;">
                Hello <strong style="color:#0F172A;">${data.studentName}</strong> (<span style="font-family:monospace; font-weight:600;">${data.studentRoll}</span>), your attendance permission request has been processed.
              </p>
            </td>
          </tr>

          <!-- Clean Details Table -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <table role="presentation" width="100%" style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:6px 0; font-size:12.5px; color:#64748B;">Department:</td>
                  <td style="padding:6px 0; font-size:13px; font-weight:700; color:#0F172A; text-align:right;">${data.department || 'CSIT & CSD'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:12.5px; color:#64748B;">Reason:</td>
                  <td style="padding:6px 0; font-size:13px; font-weight:700; color:#0F172A; text-align:right;">${data.reasonLabel}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:12.5px; color:#64748B;">Requested Date:</td>
                  <td style="padding:6px 0; font-size:13px; font-weight:600; color:#0F172A; text-align:right;">${data.date}</td>
                </tr>
                ${
                  isApproved
                    ? `
                <tr>
                  <td style="padding:7px 0 5px 0; font-size:12.5px; color:#64748B;">Approved Periods:</td>
                  <td style="padding:7px 0 5px 0; text-align:right;">
                    ${periodsChipsHtml}
                  </td>
                </tr>
                `
                    : ''
                }
                <tr>
                  <td style="padding:6px 0; font-size:12.5px; color:#64748B;">Reviewed By:</td>
                  <td style="padding:6px 0; font-size:13px; font-weight:700; color:#0F172A; text-align:right;">
                    ${data.reviewerName} <span style="font-size:11px; font-weight:600; color:#64748B;">(${data.decisionByRole})</span>
                  </td>
                </tr>
                ${
                  !isApproved && data.rejectionReason
                    ? `
                <tr>
                  <td colspan="2" style="padding:10px 0 2px 0; border-top:1px dashed #CBD5E1;">
                    <p style="margin:0 0 3px 0; font-size:11.5px; font-weight:700; color:#E11D48;">Rejection Remarks:</p>
                    <p style="margin:0; font-size:12.5px; color:#334155; line-height:1.4;">${data.rejectionReason}</p>
                  </td>
                </tr>
                `
                    : ''
                }
              </table>
            </td>
          </tr>

          <!-- Minimal Footer -->
          <tr>
            <td style="background-color:#FAFAFA; padding:14px 24px; text-align:center; border-top:1px solid #F1F5F9;">
              <p style="margin:0; font-size:11px; color:#94A3B8;">
                Automated notification from <strong>AttendEase</strong> · S.R.K.R. Engineering College (Autonomous)
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends request decision email (Approved / Rejected) to the student.
 * Non-blocking: logs any errors without throwing to preserve API responsiveness.
 */
export async function sendRequestDecisionEmail(data: DecisionEmailData): Promise<boolean> {
  const isApproved = data.status === 'approved';
  const subject = isApproved
    ? `[Approved] Attendance Permission for ${data.date} - ${data.studentRoll}`
    : `[Decision] Permission Request Update for ${data.date} - ${data.studentRoll}`;

  const htmlContent = buildDecisionEmailHtml(data);
  const client = getTransporter();

  if (!client) {
    console.log(`[EmailService (Simulated)] Email to ${data.recipientEmail}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Student: ${data.studentName} (${data.studentRoll})`);
    console.log(`  Status: ${data.status} by ${data.reviewerName} (${data.decisionByRole})`);
    console.log(`  Periods: ${data.periods || 'All'}`);
    return true;
  }

  try {
    const info = await client.sendMail({
      from: SMTP_FROM,
      to: data.recipientEmail,
      subject,
      html: htmlContent,
    });
    console.log(`[EmailService] Email sent successfully to ${data.recipientEmail} (MessageId: ${info.messageId})`);
    return true;
  } catch (err: any) {
    console.error(`[EmailService] Failed to send email to ${data.recipientEmail}:`, err?.message || err);
    return false;
  }
}
