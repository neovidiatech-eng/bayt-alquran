import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
export const hash = async ({ password, salt = process.env.SALT }) => {
  return await bcrypt.hash(password, Number(salt));
};
export const compare = async ({ password, hash }) => {
  return await bcrypt.compare(password, hash);
};

export const encryptText = ({ text }) => {
  if (text === undefined || text === null) return text;
  return CryptoJS.AES.encrypt(text, process.env.ENCRYPT_KEY).toString();
};

export const decryptText = async ({ text }) => {
  try {
    if (!text) return null;

    const bytes = CryptoJS.AES.decrypt(text, process.env.ENCRYPT_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (err) {
    console.error("Decrypt error:", err);
    return null;
  }
};

export const looksEncrypted = (value) => {
  if (typeof value !== "string") return false;

  return value.startsWith("U2FsdGVkX1") || /^[a-f0-9]{32}:[a-f0-9]+$/i.test(value);
};

export const isBcryptHash = (value) => {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
};

export const comparePassword = async ({ password, storedPassword }) => {
  if (!storedPassword) return false;

  if (isBcryptHash(storedPassword)) {
    return compare({ password, hash: storedPassword });
  }

  const decryptedPassword = await decryptText({ text: storedPassword });
  return decryptedPassword === password;
};

export const decryptPassword = async ({ password }) => {
  if (!password || isBcryptHash(password)) return null;
  return decryptText({ text: password });
};

export const normalizePhone = (phoneStr) => {
  if (!phoneStr) return "";
  const clean = phoneStr.replace(/\D/g, "");
  return clean.length >= 9 ? clean.slice(-9) : clean;
};

export const matchPhone = async (storedPhone, inputPhone) => {
  if (!storedPhone || !inputPhone) return false;
  const decrypted = looksEncrypted(storedPhone)
    ? await decryptText({ text: storedPhone })
    : storedPhone;
  return normalizePhone(decrypted) === normalizePhone(inputPhone);
};

