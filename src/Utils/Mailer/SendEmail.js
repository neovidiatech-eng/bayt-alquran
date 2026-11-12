import { getBrevoClient } from "./MailerClient.js";
import { mailTemp } from "./MailTemp.js";
import { getMessage } from "../i18n.js";

export const sendEmail = async ({
  email,
  subject,
  text,
  otp,
  username,
  lang = "en",
  variant,
  metadata,
  actionUrl,
  actionText,
}) => {
  if (!email) {
    console.error("❌ Mailer Error: No recipient email provided.");
    return { success: false, error: "No recipient email provided" };
  }

  const emailSubject = subject || getMessage("EMAIL_DEFAULT_SUB", lang);
  const emailText = text || getMessage("EMAIL_BODY_TEXT", lang, { otp: otp || "N/A" });
  const html = mailTemp({
    otp,
    title: emailSubject,
    text,
    username,
    lang,
    variant,
    metadata,
    actionUrl,
    actionText,
  });

  const senderEmail = process.env.MAIL_FROM || process.env.MAIL_USER || "noreply@waaiacademy.com";
  const senderName = process.env.SENDER_NAME || "Waai Academy";

  try {
    const brevoClient = getBrevoClient();
    if (!brevoClient) {
      throw new Error("Brevo client is not initialized. Please verify BREVO_API_KEY.");
    }

    const response = await brevoClient.transactionalEmails.sendTransacEmail({
      subject: emailSubject,
      htmlContent: html,
      textContent: emailText,
      sender: { name: senderName, email: senderEmail },
      to: [{ email, name: username || undefined }],
      replyTo: { email: senderEmail, name: senderName },
    });

    const messageId = response?.messageId || "brevo-sent";
    console.log("📧 Email sent successfully via Brevo API:", messageId);

    return { success: true, messageId };
  } catch (error) {
    console.error("❌ Brevo Mailer Error:", error?.message || error);
    return {
      success: false,
      error: error?.message || "Failed to send email via Brevo",
      code: error?.code,
    };
  }
};

