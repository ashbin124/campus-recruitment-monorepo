import nodemailer from 'nodemailer';

let transporter;

export function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@campus.local';
  const info = await tx.sendMail({ from, to, subject, html, text });
  return info;
}

export async function sendOfferLetter(toEmail, studentName, companyName, jobTitle) {
  const subject = `Congratulations! ${companyName} accepted your application`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Congratulations, ${studentName}!</h2>
      <p>Your application for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> has been <strong>ACCEPTED</strong>.</p>
      <p>We are excited to move forward. Our team will reach out with next steps shortly.</p>
      <h3 style="margin-top:16px;">Next Steps</h3>
      <ol>
        <li>Please reply to confirm your acceptance.</li>
        <li>Share your availability for onboarding discussions.</li>
        <li>Prepare required documents (ID, transcripts, etc.).</li>
      </ol>
      <p style="color:#6b7280; font-size:12px; margin-top:16px;">Sent on: ${new Date().toLocaleString()}</p>
      <p>Best regards,<br/>${companyName} Team</p>
    </div>
  `;
  const text = `Congratulations, ${studentName}! Your application for ${jobTitle} at ${companyName} has been ACCEPTED.\n\nNext steps:\n1) Reply to confirm acceptance\n2) Share availability for onboarding discussion\n3) Prepare required documents\n\nSent on: ${new Date().toLocaleString()}`;
  return sendEmail({ to: toEmail, subject, html, text });
}

export async function sendInterviewInvite(toEmail, studentName, companyName, jobTitle, note) {
  const subject = `Interview Invitation: ${jobTitle} at ${companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Interview Invitation</h2>
      <p>Hi ${studentName},</p>
      <p>${companyName} would like to invite you to interview for the <strong>${jobTitle}</strong> role.</p>
      ${note ? `<p><strong>Interview details:</strong><br/>${escapeHtml(note).replace(/\n/g, '<br/>')}</p>` : ''}
      <div style="margin-top:12px;">
        <h3 style="margin:0 0 6px 0;">What to Expect</h3>
        <ul>
          <li><strong>Schedule:</strong> Refer to the interview details above</li>
          <li><strong>Format:</strong> Company will share location / meeting link in app or follow-up email</li>
          <li><strong>Documents:</strong> Keep your latest resume and academic records ready</li>
        </ul>
      </div>
      <p style="color:#6b7280; font-size:12px;">Sent on: ${new Date().toLocaleString()}</p>
      <p>Best regards,<br/>${companyName} Talent Team</p>
    </div>
  `;
  const text =
    `Hi ${studentName},\n${companyName} invites you to interview for ${jobTitle}.` +
    `${note ? `\nDetails: ${note}` : ''}` +
    `\n\nInterview logistics:\n- Schedule: Refer to details above\n- Format: Company will share location/link\n- Documents: Keep latest resume and academic records ready\n\nSent on: ${new Date().toLocaleString()}`;
  return sendEmail({ to: toEmail, subject, html, text });
}

export async function sendApplicationRejection(
  toEmail,
  studentName,
  companyName,
  jobTitle,
  reason = ''
) {
  const subject = `Application Update: ${jobTitle} at ${companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Application Status Update</h2>
      <p>Hi ${studentName},</p>
      <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> was not shortlisted for interview this cycle.</p>
      ${
        reason
          ? `<p><strong>Reason:</strong><br/>${escapeHtml(reason).replace(/\n/g, '<br/>')}</p>`
          : ''
      }
      <p>You can continue applying for other opportunities in the platform.</p>
      <p style="color:#6b7280; font-size:12px;">Sent on: ${new Date().toLocaleString()}</p>
      <p>Best regards,<br/>${companyName} Talent Team</p>
    </div>
  `;
  const text =
    `Hi ${studentName},\nYour application for ${jobTitle} at ${companyName} was not shortlisted for interview this cycle.` +
    `${reason ? `\nReason: ${reason}` : ''}` +
    `\n\nYou can continue applying for other opportunities in the platform.\n\nSent on: ${new Date().toLocaleString()}`;
  return sendEmail({ to: toEmail, subject, html, text });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
