import crypto from "node:crypto";
import path from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { pool } from "../db/index.js";
import { minio } from "../services/storage.js";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createAdminSession,
  deleteAdminSession,
  isAdminSession,
} from "../services/session.js";

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: unknown) {
  const s = str(value);
  return s ? s : null;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function categoryLayout(value: unknown): "stack" | "tile2" | "tile3" {
  const layout = str(value);
  return layout === "tile2" || layout === "tile3" ? layout : "stack";
}

function slugBase(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function uniqueSlug(name: string) {
  return `${slugBase(name)}-${crypto.randomBytes(3).toString("hex")}`;
}

async function requireAdmin(req: FastifyRequest) {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!(await isAdminSession(token))) {
    const error = new Error("Unauthorized") as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }
}

function mapSettings(row: any) {
  return {
    brandName: row.brand_name,
    brandNameFa: row.brand_name_fa,
    logoPath: row.logo_path,
    faviconPath: row.favicon_path,
    primaryColor: row.primary_color,
    backgroundColor: row.background_color,
    textColor: row.text_color,
    accentColor: row.accent_color,
    phones: Array.isArray(row.phones) ? row.phones : [],
    email: row.email,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    telegram: row.telegram,
    facebook: row.facebook,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    mapUrl: row.map_url,
    currency: row.currency,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    businessDescription: row.business_description,
    contactText: row.contact_text,
    pickupEnabled: row.pickup_enabled,
    dineInEnabled: row.dine_in_enabled,
    deliveryEnabled: row.delivery_enabled,
  };
}

function mapCategory(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    layoutMode: categoryLayout(row.layout_mode),
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    productCount: Number(row.product_count || 0),
  };
}

function mapProduct(row: any) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    price: String(row.price ?? "0"),
    imagePath: row.image_path,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    isAvailable: row.is_available,
    isFeatured: row.is_featured,
  };
}

async function getSettings() {
  const result = await pool.query("SELECT * FROM app_settings WHERE id = 1");
  return mapSettings(result.rows[0]);
}

async function getCategories() {
  const result = await pool.query(`
    SELECT c.*, count(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.created_at ASC
  `);
  return result.rows.map(mapCategory);
}

async function getProducts() {
  const result = await pool.query(`
    SELECT * FROM products
    ORDER BY category_id, sort_order ASC, created_at ASC
  `);
  return result.rows.map(mapProduct);
}

export async function adminRoutes(app: FastifyInstance) {
  app.post("/api/admin/login", async (req, reply) => {
    const password = String((req.body as any)?.password || "");
    const a = Buffer.from(password);
    const b = Buffer.from(env.ADMIN_PASSWORD);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) return reply.code(401).send({ error: "رمز عبور اشتباه است" });

    const token = await createAdminSession();
    reply.setCookie(ADMIN_COOKIE, token, adminCookieOptions);
    return { ok: true };
  });

  app.post("/api/admin/logout", { preHandler: requireAdmin }, async (req, reply) => {
    const token = req.cookies?.[ADMIN_COOKIE];
    await deleteAdminSession(token);
    reply.clearCookie(ADMIN_COOKIE, {
      path: adminCookieOptions.path,
      httpOnly: true,
      sameSite: adminCookieOptions.sameSite,
      secure: adminCookieOptions.secure,
    });
    return { ok: true };
  });

  app.get("/api/admin/me", async (req, reply) => {
    const ok = await isAdminSession(req.cookies?.[ADMIN_COOKIE]);
    if (!ok) return reply.code(401).send({ authenticated: false });
    return { authenticated: true };
  });

  app.get("/api/admin/bootstrap", { preHandler: requireAdmin }, async () => {
    const [settings, categories, products] = await Promise.all([
      getSettings(),
      getCategories(),
      getProducts(),
    ]);
    return { settings, categories, products };
  });

  app.put("/api/admin/settings", { preHandler: requireAdmin }, async (req) => {
    const body = (req.body || {}) as any;
    const phones = Array.isArray(body.phones)
      ? [...new Set(body.phones.map((x: unknown) => str(x)).filter(Boolean))]
      : [];

    const latitude = body.latitude === "" || body.latitude == null ? null : Number(body.latitude);
    const longitude = body.longitude === "" || body.longitude == null ? null : Number(body.longitude);

    await pool.query(
      `UPDATE app_settings SET
        brand_name=$1, brand_name_fa=$2, logo_path=$3, favicon_path=$4,
        primary_color=$5, background_color=$6, text_color=$7, accent_color=$8,
        phones=$9, phone=$10, mobile=$10, email=$11, whatsapp=$12, instagram=$13,
        telegram=$14, facebook=$15, address=$16, latitude=$17, longitude=$18,
        map_url=$19, currency=$20, seo_title=$21, seo_description=$22,
        business_description=$23, contact_text=$24, pickup_enabled=$25,
        dine_in_enabled=$26, delivery_enabled=$27, updated_at=now()
       WHERE id=1`,
      [
        str(body.brandName) || "Restaurant",
        str(body.brandNameFa) || str(body.brandName) || "رستوران",
        nullable(body.logoPath),
        nullable(body.faviconPath),
        str(body.primaryColor) || "#5b2b2f",
        str(body.backgroundColor) || "#ded7c5",
        str(body.textColor) || "#5b2b2f",
        str(body.accentColor) || "#d4a574",
        phones,
        phones[0] || null,
        nullable(body.email),
        nullable(body.whatsapp),
        nullable(body.instagram),
        nullable(body.telegram),
        nullable(body.facebook),
        nullable(body.address),
        Number.isFinite(latitude) ? latitude : null,
        Number.isFinite(longitude) ? longitude : null,
        nullable(body.mapUrl),
        str(body.currency) || "تومان",
        nullable(body.seoTitle),
        nullable(body.seoDescription),
        nullable(body.businessDescription),
        nullable(body.contactText),
        bool(body.pickupEnabled, true),
        bool(body.dineInEnabled, true),
        bool(body.deliveryEnabled, false),
      ],
    );

    return { settings: await getSettings() };
  });

  app.post("/api/admin/categories", { preHandler: requireAdmin }, async (req, reply) => {
    const body = (req.body || {}) as any;
    const name = str(body.name);
    if (!name) return reply.code(400).send({ error: "نام دسته‌بندی الزامی است" });

    const order = await pool.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories");
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, layout_mode, sort_order, is_visible)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, uniqueSlug(name), nullable(body.description), categoryLayout(body.layoutMode), Number(order.rows[0].next), bool(body.isVisible, true)],
    );
    return reply.code(201).send(mapCategory(result.rows[0]));
  });

  app.put("/api/admin/categories/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const id = String((req.params as any).id);
    const body = (req.body || {}) as any;
    const name = str(body.name);
    if (!name) return reply.code(400).send({ error: "نام دسته‌بندی الزامی است" });

    const result = await pool.query(
      `UPDATE categories SET name=$1, description=$2, layout_mode=$3, is_visible=$4, updated_at=now()
       WHERE id=$5 RETURNING *`,
      [name, nullable(body.description), categoryLayout(body.layoutMode), bool(body.isVisible, true), id],
    );
    if (!result.rowCount) return reply.code(404).send({ error: "دسته‌بندی پیدا نشد" });
    return mapCategory(result.rows[0]);
  });

  app.delete("/api/admin/categories/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const id = String((req.params as any).id);
    const result = await pool.query("DELETE FROM categories WHERE id=$1 RETURNING id", [id]);
    if (!result.rowCount) return reply.code(404).send({ error: "دسته‌بندی پیدا نشد" });
    return { ok: true };
  });

  app.post("/api/admin/categories/reorder", { preHandler: requireAdmin }, async (req, reply) => {
    const ids = (req.body as any)?.ids;
    if (!Array.isArray(ids)) return reply.code(400).send({ error: "ids must be an array" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < ids.length; i++) {
        await client.query("UPDATE categories SET sort_order=$1, updated_at=now() WHERE id=$2", [i, String(ids[i])]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { categories: await getCategories() };
  });

  app.post("/api/admin/products", { preHandler: requireAdmin }, async (req, reply) => {
    const body = (req.body || {}) as any;
    const name = str(body.name);
    const categoryId = str(body.categoryId);
    if (!name || !categoryId) return reply.code(400).send({ error: "نام و دسته‌بندی الزامی است" });

    const order = await pool.query(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM products WHERE category_id=$1",
      [categoryId],
    );
    const price = Math.max(0, Math.round(Number(body.price) || 0));
    const result = await pool.query(
      `INSERT INTO products
       (category_id,name,slug,description,price,image_path,sort_order,is_visible,is_available,is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        categoryId,
        name,
        uniqueSlug(name),
        nullable(body.description),
        price,
        nullable(body.imagePath),
        Number(order.rows[0].next),
        bool(body.isVisible, true),
        bool(body.isAvailable, true),
        bool(body.isFeatured, false),
      ],
    );
    return reply.code(201).send(mapProduct(result.rows[0]));
  });

  app.put("/api/admin/products/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const id = String((req.params as any).id);
    const body = (req.body || {}) as any;
    const name = str(body.name);
    const categoryId = str(body.categoryId);
    if (!name || !categoryId) return reply.code(400).send({ error: "نام و دسته‌بندی الزامی است" });

    const price = Math.max(0, Math.round(Number(body.price) || 0));
    const result = await pool.query(
      `UPDATE products SET category_id=$1,name=$2,description=$3,price=$4,image_path=$5,
       is_visible=$6,is_available=$7,is_featured=$8,updated_at=now()
       WHERE id=$9 RETURNING *`,
      [
        categoryId,
        name,
        nullable(body.description),
        price,
        nullable(body.imagePath),
        bool(body.isVisible, true),
        bool(body.isAvailable, true),
        bool(body.isFeatured, false),
        id,
      ],
    );
    if (!result.rowCount) return reply.code(404).send({ error: "محصول پیدا نشد" });
    return mapProduct(result.rows[0]);
  });

  app.delete("/api/admin/products/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const id = String((req.params as any).id);
    const result = await pool.query("DELETE FROM products WHERE id=$1 RETURNING id", [id]);
    if (!result.rowCount) return reply.code(404).send({ error: "محصول پیدا نشد" });
    return { ok: true };
  });

  app.post("/api/admin/products/reorder", { preHandler: requireAdmin }, async (req, reply) => {
    const ids = (req.body as any)?.ids;
    if (!Array.isArray(ids)) return reply.code(400).send({ error: "ids must be an array" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < ids.length; i++) {
        await client.query("UPDATE products SET sort_order=$1, updated_at=now() WHERE id=$2", [i, String(ids[i])]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { products: await getProducts() };
  });

  app.post("/api/admin/upload", { preHandler: requireAdmin }, async (req, reply) => {
    const kind = String((req.query as any)?.kind || "product");
    const part = await req.file();
    if (!part) return reply.code(400).send({ error: "فایل ارسال نشده است" });

    const isBranding = kind === "branding";
    const allowed = isBranding
      ? /^(image\/(png|jpeg|webp|gif|svg\+xml)|video\/(mp4|webm|ogg))$/i
      : /^image\/(png|jpeg|webp|gif)$/i;
    if (!allowed.test(part.mimetype)) return reply.code(400).send({ error: "نوع فایل پشتیبانی نمی‌شود" });

    const buffer = await part.toBuffer();
    const max = isBranding ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (buffer.length > max) return reply.code(413).send({ error: "حجم فایل بیش از حد مجاز است" });

    const ext = path.extname(part.filename || "").toLowerCase().replace(/[^.a-z0-9]/g, "") || "";
    const folder = isBranding ? "branding" : "products";
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    await minio.putObject(env.MINIO_BUCKET, key, buffer, buffer.length, { "Content-Type": part.mimetype });
    return { key, url: `/media/${key}` };
  });
}
