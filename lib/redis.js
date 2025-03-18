import Redis from "ioredis";
import dotenv from "dotenv"

dotenv.config()

const redisurl = process.env.UPSTASH_REDIS_URL;

if (!redisurl) {
    throw new Error("Redis connection Error");
  }

export const redis = new Redis(redisurl);


