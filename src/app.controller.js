import swaggerUi from "swagger-ui-express";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

import rootRouter from "./index.routes.js";
import { globalErrorHandling } from "./Utils/Response.js";
import { langMiddleware } from "./Middlewares/i18n.js";
import { timezoneMiddleware } from "./Middlewares/Timezone.js";
import { globalRateLimiter } from "./Middlewares/RateLimiter.js";
import { redis, redisConnection } from "./Utils/Redis/Connection.js";
import { init_io } from "./Utils/Socket/index.js";
import { socketAuthentication } from "./Middlewares/SocketAuth.js";

const bootstrap = async () => {
  const app = express();
  app.set("trust proxy", 1);
  const port = process.env.PORT || 3009;

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://neo-vidia.vercel.app",
      ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(langMiddleware); // Detect language for all requests
  app.use(timezoneMiddleware); // Detect timezone for all requests
  app.use(globalRateLimiter); // Apply global rate limiting to all requests

  await redisConnection();

  // Root Router
  app.use(rootRouter);

  try {
    const swaggerDocument = JSON.parse(
      fs.readFileSync(path.resolve("./src/Utils/Swagger.json"), "utf8"),
    );
    app.use("/api-docs", ...swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log("Swagger UI is available at /api-docs");
  } catch (err) {
    console.error("Failed to load swagger documentation", err);
  }


  // Global Error Handling Middleware
  app.use(globalErrorHandling);

  const apphttp = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });

  // Initialize Socket.IO
  const io = new Server(apphttp, {
    cors: {
      origin: "*",
      credentials: true,
    },
    allowEIO3: true,
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthentication);

  init_io(io);
};

export default bootstrap;

