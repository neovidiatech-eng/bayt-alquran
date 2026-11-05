/**
 * Middleware to detect the user's preferred language and attach it to the request object.
 * Priority: 
 * 1. User profile in req.user (if authenticated)
 * 2. Accept-Language header
 * 3. Fallback to "en"
 */
import { getMessage } from "../Utils/i18n.js";

export const langMiddleware = (req, res, next) => {
  // 1. Check if user profile has a language preference (populated by auth middleware)
  let lang = req.user?.language;

  // 2. Check Accept-Language header if no user preference
  if (!lang) {
    const acceptLang = req.headers["accept-language"];
    if (acceptLang) {
      // Pick the first preferred language (e.g. "ar-EG,ar;q=0.9" -> "ar")
      lang = acceptLang.split(",")[0].split("-")[0].toLowerCase();
    }
  }

  // 3. Supported languages check
  const supportedLangs = ["en", "ar"];
  if (!supportedLangs.includes(lang)) {
    lang = "en";
  }

  // Attach to request object
  req.lang = lang;
  req.t = (key, params) => getMessage(key, lang, params);
  next();
};
