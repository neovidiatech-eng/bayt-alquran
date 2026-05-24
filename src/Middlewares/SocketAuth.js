import { verifyToken } from "../Utils/Token/token.js";
import * as db from "../database/dbService.js"


export const socketAuthentication = async (socket, next) => {
  try {

    const token = socket.handshake.auth.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Token Missed or Invalid", { cause: 401 }));
    }

    const decoded = verifyToken({ token });
    if (!decoded || !decoded.id) {
      console.log(decoded);
      return next(new Error("Token signature", { cause: 401 }));
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
      return next(new Error("Invalid Token database", { cause: 401 }));
    }

    socket.user = user;
    socket.decoded = decoded;

    next();
  } catch (error) {
    next(error);
  }
};
