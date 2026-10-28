import type { FastifyInstance } from "fastify";
import { pool } from "../db/index.js";
import { issueOtp, verifyOtp } from "../services/otp.js";
import { sendOtpSms } from "../services/sms.js";
import { redis, rkey } from "../services/redis.js";

const mobileRe = /^\+?[0-9]{10,15}$/;

export async function otpRoutes(app: FastifyInstance) {
  app.post("/api/auth/otp/request", async (req, reply) => {
    const mobile = String((req.body as any)?.mobile || "").replace(/[\s-]/g, "");
    if (!mobileRe.test(mobile)) return reply.code(400).send({ error: "Invalid mobile" });

    const rateKey = rkey(`otp:rate:${mobile}`);
    if (await redis.get(rateKey)) return reply.code(429).send({ error: "Please wait before requesting another code" });

    await redis.set(rateKey, "1", "EX", 60);
    const code = await issueOtp(mobile);
    await sendOtpSms(mobile, code);
    return { ok: true };
  });

  app.post("/api/auth/otp/verify", async (req, reply) => {
    const mobile = String((req.body as any)?.mobile || "").replace(/[\s-]/g, "");
    const code = String((req.body as any)?.code || "");
    if (!mobileRe.test(mobile) || !/^\d{6}$/.test(code)) return reply.code(400).send({ error: "Invalid code" });

    const ok = await verifyOtp(mobile, code);
    if (!ok) return reply.code(401).send({ error: "Invalid or expired code" });

    const result = await pool.query(
      `INSERT INTO customers (mobile) VALUES ($1)
       ON CONFLICT (mobile) DO UPDATE SET updated_at = now()
       RETURNING id, mobile, created_at, updated_at`,
      [mobile],
    );
    return { ok: true, customer: result.rows[0] };
  });
}
