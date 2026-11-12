import en from "../Locales/en.json" with { type: "json" };
import ar from "../Locales/ar.json" with { type: "json" };

const locales = { en, ar };

/**
 * Get translated message for a given key and language
 * @param {string} key - Message key (e.g. "USER_CREATED_SUCCESS")
 * @param {string} lang - Language code ("en" or "ar")
 * @param {object} params - Dynamic parameters to replace in the string
 * @returns {string} - Translated and formatted message
 */
export const getMessage = (key, lang = "en", params = {}) => {
  // Use "en" as ultimate fallback if language is not supported
  const language = locales[lang] || locales["en"];

  // Get raw message, fallback to key if missing in file
  let message = language[key] || locales["en"][key] || key;

  // Replace parameters like {{name}}
  if (params && typeof params === "object") {
    Object.keys(params).forEach((param) => {
      message = message.replace(new RegExp(`{{${param}}}`, "g"), params[param]);
      message = message.replace(new RegExp(`{#${param}}`, "g"), params[param]);
    });
  }

  return message;
};

/**
 * Check if the language is RTL
 * @param {string} lang 
 * @returns {string} "rtl" | "ltr"
 */
export const getDir = (lang) => (lang === "ar" ? "rtl" : "ltr");
