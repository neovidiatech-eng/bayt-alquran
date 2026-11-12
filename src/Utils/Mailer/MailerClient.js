import { BrevoClient } from "@getbrevo/brevo";

let brevoClientInstance = null;

export const getBrevoClient = () => {
  if (!process.env.BREVO_API_KEY) {
    console.error("❌ BREVO_API_KEY is missing from environment variables");
    return null;
  }
  if (!brevoClientInstance) {
    try {
      brevoClientInstance = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY,
      });
      console.log("✅ Brevo client initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Brevo client:", error.message);
      return null;
    }
  }

  return brevoClientInstance;
};



