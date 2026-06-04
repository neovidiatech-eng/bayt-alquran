import { verifyToken } from "../Utils/Token/token.js";
import * as db from "../database/dbService.js"
import { getLangFromAcceptLanguage, getMessage } from "../Utils/i18n.js";

const socketAuthError = (key, lang) => new Error(getMessage(key, lang), { cause: 401 });


export const socketAuthentication = async (socket, next) => {
  try {
    const lang = getLangFromAcceptLanguage(socket.handshake.headers["accept-language"]);
    socket.lang = lang;

    const token = socket.handshake.auth.token;
    if (!token || typeof token !== "string") {
      return next(socketAuthError("TOKEN_MISSING_OR_INVALID", lang));
    }

    const decoded = verifyToken({ token });
    if (!decoded || !decoded.id) {
      console.log(decoded);
      return next(socketAuthError("INVALID_TOKEN_SIGNATURE", lang));
    }

    
    const user = await db.findFirst({
      model: "user",
      where: {
        id: decoded.id,
      },
      include: {
        student: true,
        teacher: true,
        role: true,
      },
    });
    console.log(user);
    
    if (!user) {
      return next(socketAuthError("INVALID_TOKEN_DATABASE", lang));
    }

    socket.user = user;
    socket.decoded = decoded;

    next();
  } catch (error) {
    next(error);
  }
};
