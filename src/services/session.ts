import crypto from "node:crypto";
import { env } from "../config/env.js";
import { redis, rkey } from "./redis.js";

export const ADMIN_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function createAdminSession() {
  const token = crypto.randomBytes(32).toString("hex");
  await redis.set(rkey(`admin:session:${token}`), "1", "EX", SESSION_TTL_SECONDS);
  return token;
}

export async function isAdminSession(token?: string) {
  if (!token) return false;
  return (await redis.get(rkey(`admin:session:${token}`))) === "1";
}

export async function deleteAdminSession(token?: string) {
  if (!token) return;
  await redis.del(rkey(`admin:session:${token}`));
}

export const adminCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
  maxAge: SESSION_TTL_SECONDS,
};
