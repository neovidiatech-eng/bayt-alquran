import { transporter } from "./MailerClient.js";
import { mailTemp } from "./MailTemp.js";

export const sendEmail = async ({ email, subject, text, otp, lang = "en" }) => {
  if (!email) {
    console.error("❌ Mailer Error: No recipient email provided.");
    return { success: false, error: "No recipient email provided" };
  }
  const html = mailTemp({ otp, title: subject, text, lang });
  try {
    const info = await transporter.sendMail({
      from: `"Neovidia LMS" <${process.env.APP_EMAIL}>`,
      replyTo: process.env.APP_EMAIL,
      to: email,
      subject: subject || "Verification Code",
      text: `${text || ''}\n\nYour Verification Code is: ${otp || 'N/A'}\n\nIf you did not request this, please ignore this email.`,
      html: html,
      headers: {
        'X-Entity-Ref-ID': Date.now().toString(),
      }
    });
    console.log("📧 Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      console.error("❌ Mailer Timeout: Could not connect to SMTP server.");
    } else {
      console.error("❌ Mailer Error:", error.message);
    }
    return { success: false, error: error.message, code: error.code };
  }
};
