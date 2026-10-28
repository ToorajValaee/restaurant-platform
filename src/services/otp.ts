import crypto from "node:crypto";
import { env } from "../config/env.js";
import { redis, rkey } from "./redis.js";

const OTP_TTL = 180;

function hash(mobile: string, code: string) {
  return crypto.createHmac("sha256", env.OTP_SECRET).update(`${mobile}:${code}`).digest("hex");
}

export async function issueOtp(mobile: string) {
  const code = String(crypto.randomInt(100000, 1000000));
  await redis.set(rkey(`otp:${mobile}`), hash(mobile, code), "EX", OTP_TTL);
  return code;
}

export async function verifyOtp(mobile: string, code: string) {
  const key = rkey(`otp:${mobile}`);
  const expected = await redis.get(key);
  if (!expected) return false;
  const actual = hash(mobile, code);
  const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
  if (ok) await redis.del(key);
  return ok;
}
