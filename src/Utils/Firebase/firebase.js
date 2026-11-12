import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const FIREBASE_CREDENTIALS = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOEKN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

let firebaseInitialized = false;

if (
  FIREBASE_CREDENTIALS.project_id &&
  FIREBASE_CREDENTIALS.client_email &&
  FIREBASE_CREDENTIALS.private_key
) {
  try {
    initializeApp({
      credential: cert(FIREBASE_CREDENTIALS),
    });
    firebaseInitialized = true;
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
} else {
  console.warn(
    "Firebase environment variables are missing. Firebase notifications will not work.",
  );
}

/**
 * Send push notification to a single FCM token or an array of FCM tokens.
 * @param {string|string[]} tokens - The FCM token(s) of the target device(s).
 * @param {object} payload - The notification payload.
 * @param {string} payload.title - The title of the notification.
 * @param {string} payload.body - The body message of the notification.
 * @param {object} [payload.data] - Additional data fields (optional).
 */
export const sendPushNotification = async (
  tokens,
  { title, body, data = {} },
) => {
  if (!firebaseInitialized) {
    console.warn("Skipping sending push notification: Firebase not initialized.");
    return { success: false, error: "Firebase not initialized" };
  }

  if (!tokens || (Array.isArray(tokens) && tokens.length === 0)) {
    return { success: false, error: "No tokens provided" };
  }

  // Ensure data properties are all strings as required by FCM
  const formattedData = {};
  for (const key in data) {
    if (data[key] !== undefined && data[key] !== null) {
      formattedData[key] = String(data[key]);
    }
  }

  const payload = {
    notification: {
      title,
      body,
    },
    data: formattedData,
  };

  try {
    const messaging = getMessaging();

    if (Array.isArray(tokens)) {
      // Filter out empty tokens
      const validTokens = tokens.filter(
        (t) => t && typeof t === "string" && t.trim() !== "",
      );
      if (validTokens.length === 0) {
        return { success: false, error: "No valid tokens found in array" };
      }

      // If only one valid token remains
      if (validTokens.length === 1) {
        const response = await messaging.send({
          token: validTokens[0],
          ...payload,
        });
        return { success: true, response };
      }

      // Send multicast for multiple tokens
      const response = await messaging.sendEachForMulticast({
        tokens: validTokens,
        ...payload,
      });
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } else {
      if (typeof tokens !== "string" || tokens.trim() === "") {
        return { success: false, error: "Invalid token type" };
      }
      const response = await messaging.send({
        token: tokens,
        ...payload,
      });
      return { success: true, response };
    }
  } catch (error) {
    console.error("Error sending push notification via Firebase:", error);
    return { success: false, error: error.message };
  }
};
