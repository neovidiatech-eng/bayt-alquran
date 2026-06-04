/**
 * Middleware to detect the user's preferred language and attach it to the request object.
 * Priority: 
 * 1. User profile in req.user (if authenticated)
 * 2. Accept-Language header
 * 3. Fallback to "en"
 */
import {
  getLangFromAcceptLanguage,
  getMessage,
  normalizeLang,
} from "../Utils/i18n.js";

export const langMiddleware = (req, res, next) => {
  // 1. Check if user profile has a language preference (populated by auth middleware)
  let lang = req.user?.language ? normalizeLang(req.user.language) : null;

  // 2. Check Accept-Language header if no user preference
  if (!lang) {
    lang = getLangFromAcceptLanguage(req.headers["accept-language"]);
  }

  // Attach to request object
  req.lang = lang;
  req.t = (key, params) => getMessage(key, lang, params);
  next();
};
