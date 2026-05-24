import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
export const hash = async ({ password, salt = process.env.SALT }) => {
  return await bcrypt.hash(password, Number(salt));
};
export const compare = async ({ password, hash }) => {
  return await bcrypt.compare(password, hash);
};

export const encryptText = ({ text }) => {
  return CryptoJS.AES.encrypt(text, process.env.ENCRYPT_KEY).toString();
};

export const decryptText = async({ text }) => {
  
  try {
    if (!text) return null;

    const bytes = CryptoJS.AES.decrypt(text, process.env.ENCRYPT_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error("Decrypt error:", err);
    return null;
  }
};




export const looksEncrypted = (value) => {
  if (typeof value !== "string") return false;


  return /^[a-f0-9]{32}:[a-f0-9]+$/i.test(value);
};