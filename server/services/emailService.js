/**
 * Email Service
 * Logs safely in development mode when no SMTP credentials are provided,
 * and sends real emails if SMTP environment variables are configured.
 */
async function sendEmail({ to, subject, html, text }) {
  const isConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );

  if (!isConfigured) {
    console.log(`[CareLume Email] (Demo/Dev Mode to: ${to}): ${subject}`);
    return { success: true, mode: "demo_logged" };
  }

  // If SMTP is provided, we can dynamically load nodemailer if available
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"CareLume AI Clinic" <no-reply@carelume.ai>',
      to,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`[CareLume Email Error] Could not dispatch email: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
};
