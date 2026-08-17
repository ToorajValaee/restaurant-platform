import { z } from "zod";

const envBool = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value;
    const normalized = String(value).trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(normalized);
  }, z.boolean());

const schema = z.object({
  NODE_ENV: z.string().default("production"),
  INSTANCE_NAME: z.string().min(1),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  REDIS_PREFIX: z.string().default("restaurant:"),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: envBool(false),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  SESSION_SECRET: z.string().min(24),
  ADMIN_PASSWORD: z.string().min(8),
  OTP_SECRET: z.string().min(24),
  SMSIR_API_KEY: z.string().optional().default(""),
  SMSIR_TEMPLATE_ID: z.string().optional().default(""),
  SMSIR_TEMPLATE_PARAM: z.string().default("CODE"),
  COOKIE_SECURE: envBool(true)
});

export const env = schema.parse(process.env);
