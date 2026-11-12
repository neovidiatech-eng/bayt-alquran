import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client();

export const googleVerify = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    return null;
  }
};
