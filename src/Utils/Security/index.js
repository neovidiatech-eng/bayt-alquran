import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";

export const hash = async ({ password, salt = process.env.SALT }) => {
  return await bcrypt.hash(password, Number(salt));
};

export const compare = async ({ password, hash }) => {
  return await bcrypt.compare(password, hash);
};

export const encryptText = ({ text }) => {
  return CryptoJS.AES.encrypt(String(text), process.env.ENCRYPT_KEY).toString();
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

  return (
    value.startsWith("U2FsdGVkX1") ||
    /^[a-f0-9]{32}:[a-f0-9]+$/i.test(value)
  );
};

export const encryptPassword = ({ password }) => {
  return encryptText({ text: password });
};

export const decryptPassword = async ({ password }) => {
  return await decryptText({ text: password });
};

export const verifyPassword = async ({ password, storedPassword }) => {
  if (!password || !storedPassword) return false;

  if (looksEncrypted(storedPassword)) {
    const decryptedPassword = await decryptPassword({ password: storedPassword });
    return decryptedPassword === password;
  }

  return await compare({ password, hash: storedPassword });
};

export const decryptUserSensitiveFields = async (user) => {
  if (!user) return user;

  if (user.password && looksEncrypted(user.password)) {
    user.password = await decryptPassword({ password: user.password });
  }

  if (user.phone && looksEncrypted(user.phone)) {
    user.phone = await decryptText({ text: user.phone });
  }

  return user;
};

export const decryptUsersSensitiveFields = async (users = []) => {
  return await Promise.all(users.map((user) => decryptUserSensitiveFields(user)));
};
