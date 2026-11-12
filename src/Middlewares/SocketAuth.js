import { verifyToken } from "../Utils/Token/token.js";
import * as db from "../database/dbService.js"


export const socketAuthentication = async (socket, next) => {
  try {

    const token = socket.handshake.auth.token;
    if (!token || typeof token !== "string") {
      return next(new Error("TOKEN_MISSED_OR_INVALID", { cause: 401 }));
    }

    const decoded = verifyToken({ token });
    if (!decoded || !decoded.id) {
      return next(new Error("TOKEN_SIGNATURE_INVALID", { cause: 401 }));
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
    
    if (!user) {
      return next(new Error("TOKEN_USER_NOT_FOUND", { cause: 401 }));
    }

    socket.user = user;
    socket.decoded = decoded;

    next();
  } catch (error) {
    next(error);
  }
};
