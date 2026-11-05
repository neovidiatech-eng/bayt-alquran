import jwt from "jsonwebtoken";
export const generateToken = ({ user, tokenType }) => {
  const secret = tokenType === "access"
    ? process.env.JWT_SECRET_ACCESS_ADMIN
    : process.env.JWT_SECRET_REFRESH_ADMIN;

  return jwt.sign({ id: user.id }, secret, {
    expiresIn: tokenType === "access" ? "2h" : "7d",
  });
};

export const verifyToken = ({ token, tokenType = tokenTypeEnum.access }) => {
  const secret = tokenType === "access"
    ? process.env.JWT_SECRET_ACCESS_ADMIN
    : process.env.JWT_SECRET_REFRESH_ADMIN;

  return jwt.verify(token, secret);
};

const tokenTypeEnum = {
  access: "access",
  refresh: "refresh",
};
