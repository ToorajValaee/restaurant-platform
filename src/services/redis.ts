import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
});

export const rkey = (key: string) => `${env.REDIS_PREFIX}${key}`;
