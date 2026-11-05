import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client();

export const googleVerify = async (token) => {
  console.log("[googleVerify] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ SET" : "❌ MISSING");
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    console.log(error);
    return null;
  }
};
