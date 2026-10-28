import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { minio } from "../services/storage.js";

export async function mediaRoutes(app: FastifyInstance) {
  app.get("/media/*", async (req, reply) => {
    const key = String((req.params as Record<string, string>)["*"] || "");
    if (!key || key.includes("..")) return reply.code(400).send("Invalid object key");

    try {
      const stat = await minio.statObject(env.MINIO_BUCKET, key);
      const stream = await minio.getObject(env.MINIO_BUCKET, key);
      const meta = stat.metaData || {};
      const contentType = String(meta["content-type"] || meta["Content-Type"] || "application/octet-stream");
      reply.header("Content-Type", contentType);
      reply.header("Cache-Control", "public, max-age=31536000, immutable");
      return reply.send(stream);
    } catch (error: any) {
      if (["NoSuchKey", "NotFound"].includes(error?.code) || error?.statusCode === 404) {
        return reply.code(404).send("Not found");
      }
      req.log.error({ err: error, key }, "Failed to read MinIO object");
      return reply.code(500).send("Failed to load media");
    }
  });
}
