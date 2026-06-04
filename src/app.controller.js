import express from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";

import { globalErrorHandling } from "./Utils/Response.js";
import { langMiddleware } from "./Middlewares/i18n.js";
import { timezoneMiddleware } from "./Middlewares/Timezone.js";
import fs from "node:fs";
import {
  notificationQueue,
  redis,
  redisConnection,
} from "./Utils/Radis/Connection.js";
import rootRouter from "./index.routes.js";
import { Server } from "socket.io";
import { init_io } from "./Utils/Socket/index.js";
import { socketAuthentication } from "./Middlewares/SocketAuth.js";
import { createAdapter } from "@socket.io/redis-adapter";

const bootstrap = async () => {
  const app = express();
  const port = process.env.PORT || 3007;

  // ── ENV DEBUG DUMP (remove after confirming env vars are correct) ──

  // ─────────────────────────────────────────────────────────────────
  /*   const allJobs = await notificationQueue.getJobs([
    "waiting",
    "active",
    "delayed",
  ]);
  console.log("All jobs:", allJobs); */

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
        const error = new Error("CORS_ORIGIN_NOT_ALLOWED");
        error.messageParams = { origin };
        return callback(error);
      },
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(langMiddleware); // Detect language for all requests
  app.use(timezoneMiddleware); // Detect timezone for all requests
  await redisConnection();

  // Root Router
  app.use(rootRouter);


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
