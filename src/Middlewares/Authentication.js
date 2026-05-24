import { asyncHandler } from "../Utils/Response.js";
import { verifyToken } from "../Utils/Token/token.js";
import * as db from "../database/dbService.js";
import { redis } from "../Utils/Radis/Connection.js";

export const authentication = () => {
  return asyncHandler(async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
      return next(new Error("UNAUTHORIZED", { cause: 401 }));
    }
    const [bearer, token] = authorization.split(" ");
    if (!token || !bearer || bearer !== "Bearer") {
      return next(new Error("UNAUTHORIZED", { cause: 401 }));
    }

    const decoded = verifyToken({ token });
    if (!decoded || !decoded.id) {
      return next(new Error("INVALID_TOKEN", { cause: 401 }));
    }

    const cacheKey = `user:${decoded.id}`;
    let user;

    // Try to get user from cache
    try {
      const cachedUser = await redis.get(cacheKey);
      if (cachedUser) {
        user = JSON.parse(cachedUser);
      }
    } catch (cacheError) {
      console.error("Redis Cache Error:", cacheError.message);
    }

    if (!user) {
      user = await db.findFirst({
        model: "user",
        where: {
          id: decoded.id,
          confirmAt: { not: null },
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          student: true,
          teacher: true,
        },
      });

      if (user) {
        // Cache for 5 minutes (300 seconds)
        try {
          await redis.set(cacheKey, JSON.stringify(user), { EX: 300 });
        } catch (cacheError) {
          console.error("Redis Cache Set Error:", cacheError.message);
        }
      }
    }

    if (!user) {
      return next(
        new Error("USER_UNAUTHORIZED_OR_UNCONFIRMED", { cause: 401 }),
      );
    }

    req.user = user;
    next();
  });
};
