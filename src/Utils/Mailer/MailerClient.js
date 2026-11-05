import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // port 587 uses STARTTLS
  pool: true, // تفعيل التجميع لإعادة استخدام الاتصال وتجنب الـ timeout
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  // timeout كبير لتجنب disconnect
  connectionTimeout: 10000,
}); 

// فحص الاتصال عند التشغيل لضمان استجابة السيرفر
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error.message);
  } else {
    console.log("📧 SMTP Server is ready to take messages");
  }
});


