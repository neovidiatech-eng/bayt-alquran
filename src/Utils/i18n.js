import en from "../Locales/en.json" with { type: "json" };
import ar from "../Locales/ar.json" with { type: "json" };

const locales = { en, ar };
const supportedLangs = Object.keys(locales);

export const normalizeLang = (lang = "en") => {
  const normalized = String(lang || "en").split(";")[0].split("-")[0].toLowerCase();
  return supportedLangs.includes(normalized) ? normalized : "en";
};

export const getLangFromAcceptLanguage = (acceptLanguage) => {
  if (!acceptLanguage || typeof acceptLanguage !== "string") return "en";
  return normalizeLang(acceptLanguage.split(",")[0]);
};

/**
 * Get translated message for a given key and language
 * @param {string} key - Message key (e.g. "USER_CREATED_SUCCESS")
 * @param {string} lang - Language code ("en" or "ar")
 * @param {object} params - Dynamic parameters to replace in the string
 * @returns {string} - Translated and formatted message
 */
export const getMessage = (key, lang = "en", params = {}) => {
  // Use "en" as ultimate fallback if language is not supported
  const normalizedLang = normalizeLang(lang);
  const language = locales[normalizedLang] || locales["en"];

  // Get raw message, fallback to key if missing in file
  let message = language[key] || locales["en"][key] || key;

  // Replace parameters like {{name}}
  if (params && typeof params === "object") {
    Object.keys(params).forEach((param) => {
      message = message.replace(new RegExp(`{{${param}}}`, "g"), params[param]);
    });
  }

  return message;
};

/**
 * Check if the language is RTL
 * @param {string} lang 
 * @returns {string} "rtl" | "ltr"
 */
export const getDir = (lang) => (normalizeLang(lang) === "ar" ? "rtl" : "ltr");
