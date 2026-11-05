import { createClient } from "redis";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = createClient({
  url: REDIS_URL,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("ready", () => console.log("🚀 Redis ready"));
redis.on("reconnecting", () => console.log("🔄 Redis reconnecting..."));
redis.on("error", (err) => console.log("❌ Redis Client Error:", err.message));

export const redisConnection = async () => {
  if (!redis.isOpen) {
    await redis.connect();
  }
};

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
export const notificationQueue = new Queue("notifications", { connection });
