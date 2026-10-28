import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { env } from "./config/env.js";
import { pool } from "./db/index.js";
import { ensureBucket } from "./services/storage.js";
import { redis } from "./services/redis.js";
import { adminRoutes } from "./routes/admin.js";
import { mediaRoutes } from "./routes/media.js";
import { otpRoutes } from "./routes/otp.js";
import { publicRoutes } from "./routes/public.js";

const app = Fastify({ logger: true, trustProxy: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await app.register(cookie, { secret: env.SESSION_SECRET });
await app.register(multipart, { limits: { fileSize: 30 * 1024 * 1024, files: 1 } });
await app.register(fastifyStatic, {
  root: path.join(root, "public"),
  prefix: "/public/",
  decorateReply: true,
});
await app.register(fastifyStatic, {
  root: path.join(root, "admin", "dist"),
  prefix: "/admin-assets/",
  decorateReply: false,
});

app.get("/health", async () => ({ ok: true, instance: env.INSTANCE_NAME }));
app.get("/admin", async (_req, reply) => {
  const html = await fs.readFile(path.join(root, "admin", "dist", "index.html"), "utf8");
  return reply.type("text/html; charset=utf-8").send(html);
});
app.get("/admin/", async (_req, reply) => reply.redirect("/admin"));

await mediaRoutes(app);
await adminRoutes(app);
await otpRoutes(app);
await publicRoutes(app);

app.addHook("onClose", async () => {
  await Promise.allSettled([pool.end(), redis.quit()]);
});

try {
  await ensureBucket();
} catch (error) {
  app.log.error({ err: error }, "MinIO bucket check failed");
}

await app.listen({ host: "0.0.0.0", port: 3000 });
