import event from "node:events";
import { sendEmail } from "./SendEmail.js";

const sendEmailEvent = new event.EventEmitter();

sendEmailEvent.on(
  "sendEmail",
  async ({
    email,
    otp,
    subject = "Verify your account",
    text = "Verify your account",
    lang = "en",
  }) => {
    await sendEmail({
      email,
      subject,
      text,
      otp,
      lang,
    });
  }
);

export default sendEmailEvent;
