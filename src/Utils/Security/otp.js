import { customAlphabet } from "nanoid";

export const generateOtp = () => {
  const nanoid = customAlphabet("123456789", 6);
  return nanoid();
};
