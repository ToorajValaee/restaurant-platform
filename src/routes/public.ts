import type { FastifyInstance } from "fastify";
import { pool } from "../db/index.js";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isVideo(url: string | null | undefined) {
  return !!url && /\.(mp4|webm|ogg)(?:$|\?)/i.test(url);
}

function mediaMarkup(url: string | null, alt: string, cls = "brand-media") {
  if (!url) return `<div class="brand-fallback">${esc(alt)}</div>`;
  if (isVideo(url)) {
    return `<video class="${cls}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(alt)}"><source src="${esc(url)}"></video>`;
  }
  return `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}">`;
}

function normalizeHref(kind: string, value: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value)) return value;
  if (kind === "instagram") return `https://instagram.com/${value.replace(/^@/, "")}`;
  if (kind === "telegram") return `https://t.me/${value.replace(/^@/, "")}`;
  if (kind === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
  if (kind === "facebook") return `https://facebook.com/${value}`;
  if (kind === "email") return `mailto:${value}`;
  return value;
}

function socialSvg(kind: string) {
  const common = `viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"`;
  const paths: Record<string, string> = {
    instagram: `<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.5 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>`,
    whatsapp: `<path d="M12 2a9.6 9.6 0 0 0-8.2 14.6L2.4 22l5.5-1.4A9.6 9.6 0 1 0 12 2Zm0 17.2c-1.3 0-2.5-.3-3.6-.9l-.5-.3-3.2.8.8-3.1-.3-.5A7.6 7.6 0 1 1 12 19.2Zm4.4-5.7c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.4-3-.3-.5.3-.5.8-1.7.1-.2 0-.4 0-.5L9.5 7c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.7.9 3.7.7.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.2-.2-.4-.3Z"/>`,
    telegram: `<path d="M21.5 3.4 18.4 20c-.2 1.2-.9 1.5-1.8.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L6.2 14 1.5 12.5c-1-.3-1-1 .2-1.5L20 3.9c.8-.3 1.6.2 1.5-.5Z"/>`,
    facebook: `<path d="M13.6 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.3H6.7V13h3.1v9h3.8Z"/>`,
    email: `<path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm9 9L3.4 6h17.2L12 13Zm-9 5h18V8.4l-8.4 6.8a1 1 0 0 1-1.2 0L3 8.4V18Z"/>`,
  };
  return `<svg ${common}>${paths[kind] || ""}</svg>`;
}

function settingsFrom(row: any) {
  const phones = Array.isArray(row.phones) && row.phones.length
    ? row.phones.filter(Boolean)
    : [row.phone, row.phone_2, row.phone_3, row.mobile].filter(Boolean);
  return { ...row, phones };
}

async function getSettings() {
  const result = await pool.query("SELECT * FROM app_settings WHERE id=1");
  return settingsFrom(result.rows[0]);
}

function mapUrl(s: any) {
  if (s.map_url) return s.map_url;
  if (s.latitude != null && s.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.latitude},${s.longitude}`)}`;
  }
  return "";
}

export async function publicRoutes(app: FastifyInstance) {
  app.get("/api/public-config", async () => {
    const s = await getSettings();
    return {
      brandName: s.brand_name,
      brandNameFa: s.brand_name_fa,
      logoUrl: s.logo_path,
      faviconUrl: s.favicon_path,
      phones: s.phones,
      email: s.email,
      whatsapp: s.whatsapp,
      instagram: s.instagram,
      telegram: s.telegram,
      facebook: s.facebook,
      address: s.address,
      mapUrl: mapUrl(s),
      businessDescription: s.business_description,
      contactText: s.contact_text,
      theme: {
        primary: s.primary_color,
        bg: s.background_color,
        text: s.text_color,
        accent: s.accent_color,
      },
    };
  });

  app.get("/", async (_req, reply) => {
    const s = await getSettings();
    const brand = s.brand_name_fa || s.brand_name || "Restaurant";
    const directions = mapUrl(s);
    const firstPhone = s.phones[0] || "";
    const socials = [
      ["instagram", s.instagram],
      ["whatsapp", s.whatsapp],
      ["telegram", s.telegram],
      ["facebook", s.facebook],
      ["email", s.email],
    ].filter(([, value]) => value);

    const contactContent = [
      s.contact_text ? `<p class="lead">${esc(s.contact_text)}</p>` : "",
      s.phones.length ? `<div class="phone-list">${s.phones.map((p: string) => `<a href="tel:${esc(p.replace(/\s/g, ""))}">${esc(p)}</a>`).join("")}</div>` : "",
      socials.length ? `<div class="socials">${socials.map(([kind, value]) => `<a href="${esc(normalizeHref(String(kind), String(value)))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(kind)}">${socialSvg(String(kind))}</a>`).join("")}</div>` : "",
    ].join("");

    const sections = [
      `<section id="home" class="snap-section hero-section" data-section="home"><div class="section-inner">${mediaMarkup(s.logo_path, brand, "hero-logo")}${s.business_description ? `<p class="hero-copy">${esc(s.business_description)}</p>` : ""}</div></section>`,
      `<section id="menu" class="snap-section menu-section" data-section="menu"><div class="section-inner"><a class="menu-cta" href="/menu">مشاهده منو</a></div></section>`,
      contactContent ? `<section id="contact" class="snap-section" data-section="contact"><div class="section-inner"><h1>تماس</h1>${contactContent}</div></section>` : "",
      s.address ? `<section id="address" class="snap-section" data-section="address"><div class="section-inner"><h1>آدرس</h1><p class="address">${esc(s.address)}</p>${directions ? `<a class="outline-cta" href="${esc(directions)}" target="_blank" rel="noopener noreferrer">مسیریابی</a>` : ""}</div></section>` : "",
    ].filter(Boolean);

    const navItems = [
      ["home", "خانه"],
      ["menu", "منو"],
      ...(contactContent ? [["contact", "تماس"]] : []),
      ...(s.address ? [["address", "آدرس"]] : []),
    ];

    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(s.seo_title || brand)}</title><meta name="description" content="${esc(s.seo_description || s.business_description || "")}">${s.favicon_path ? `<link rel="icon" href="${esc(s.favicon_path)}">` : ""}<style>
@font-face{font-family:Morabba;src:url('/public/fonts/Morabba-Medium.woff') format('woff');font-display:swap}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:Morabba,system-ui,sans-serif;background:${esc(s.background_color)};color:${esc(s.text_color)}}html{scroll-snap-type:y mandatory;scroll-behavior:smooth}body{overflow-y:auto}.topnav{position:fixed;z-index:80;top:0;left:0;right:0;height:58px;display:flex;align-items:center;justify-content:center;gap:28px;padding:0 18px;background:color-mix(in srgb,${esc(s.background_color)} 90%,transparent);backdrop-filter:blur(8px)}.topnav a{color:${esc(s.text_color)};text-decoration:none;padding:7px 2px;border-bottom:2px solid transparent}.topnav a.active{border-bottom-color:currentColor}.snap-section{height:100svh;min-height:560px;scroll-snap-align:start;scroll-snap-stop:always;display:grid;place-items:center;padding:76px 22px 100px;text-align:center}.section-inner{width:min(760px,100%);display:grid;justify-items:center;gap:20px}.hero-logo,.brand-media{width:min(520px,80vw);max-height:48svh;object-fit:contain}.brand-fallback{font-size:clamp(42px,9vw,90px);font-weight:900}.hero-copy,.lead,.address{font-size:clamp(18px,2.3vw,28px);line-height:1.9;white-space:pre-line;margin:0}.menu-cta,.outline-cta{display:inline-flex;align-items:center;justify-content:center;min-width:210px;padding:15px 26px;border-radius:999px;text-decoration:none;font-size:22px}.menu-cta{background:${esc(s.primary_color)};color:${esc(s.background_color)}}.outline-cta{border:2px solid ${esc(s.primary_color)};color:${esc(s.primary_color)}}.phone-list{display:grid;gap:10px}.phone-list a{color:${esc(s.text_color)};font-size:clamp(20px,3vw,30px);text-decoration:none;direction:ltr}.socials{display:flex;gap:18px;justify-content:center;flex-wrap:wrap}.socials a{width:38px;height:38px;color:${esc(s.primary_color)};display:grid;place-items:center}.socials svg{width:30px;height:30px}.mobile-actions{display:none}.badje-credit{position:fixed;right:12px;bottom:10px;z-index:90;font-size:10px;color:${esc(s.primary_color)};opacity:.5;text-decoration:none}@media(max-width:899px){.topnav{height:48px;gap:18px;font-size:13px}.snap-section{padding-top:60px;padding-bottom:94px}.hero-logo{width:min(78vw,420px);max-height:44svh}.mobile-actions{position:fixed;z-index:85;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:0;border:1px solid color-mix(in srgb,${esc(s.primary_color)} 30%,transparent);background:${esc(s.background_color)};border-radius:999px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.12)}.mobile-actions a{color:${esc(s.text_color)};text-decoration:none;padding:13px 18px;white-space:nowrap;font-size:13px;border-left:1px solid color-mix(in srgb,${esc(s.primary_color)} 18%,transparent)}.mobile-actions a:last-child{border-left:0}.badje-credit{bottom:74px;font-size:9px}}
</style></head><body><nav class="topnav">${navItems.map(([id,label]) => `<a href="#${id}" data-nav="${id}">${label}</a>`).join("")}</nav>${sections.join("")}<a class="badje-credit" href="https://badje.ir" target="_blank" rel="noopener noreferrer">© Badje</a><div class="mobile-actions">${firstPhone ? `<a href="tel:${esc(firstPhone.replace(/\s/g,""))}">تماس</a>` : ""}<a href="/menu">منو</a>${directions ? `<a href="${esc(directions)}" target="_blank" rel="noopener noreferrer">مسیر</a>` : ""}</div><script>
const sections=[...document.querySelectorAll('[data-section]')];const links=[...document.querySelectorAll('[data-nav]')];function setActive(id){links.forEach(a=>a.classList.toggle('active',a.dataset.nav===id))}const io=new IntersectionObserver(es=>{for(const e of es){if(e.isIntersecting&&e.intersectionRatio>.55)setActive(e.target.dataset.section)}},{threshold:[.55,.7,.9]});sections.forEach(s=>io.observe(s));setActive('home');let wheelLock=false;addEventListener('wheel',e=>{if(innerWidth<900||wheelLock)return;e.preventDefault();wheelLock=true;const current=sections.reduce((best,s)=>Math.abs(s.getBoundingClientRect().top)<Math.abs(best.getBoundingClientRect().top)?s:best,sections[0]);const i=sections.indexOf(current);const next=Math.max(0,Math.min(sections.length-1,i+(e.deltaY>0?1:-1)));sections[next].scrollIntoView({behavior:'smooth'});setActive(sections[next].dataset.section);setTimeout(()=>wheelLock=false,650)},{passive:false});
</script></body></html>`;
    return reply.type("text/html; charset=utf-8").send(html);
  });

  app.get("/menu", async (_req, reply) => {
    const s = await getSettings();
    const brand = s.brand_name_fa || s.brand_name || "Restaurant";
    const categoriesResult = await pool.query(`
      SELECT c.* FROM categories c
      WHERE c.is_visible=true
      AND EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id AND p.is_visible=true)
      ORDER BY c.sort_order ASC, c.created_at ASC
    `);
    const productsResult = await pool.query(`
      SELECT p.* FROM products p
      JOIN categories c ON c.id=p.category_id
      WHERE p.is_visible=true AND c.is_visible=true
      ORDER BY p.category_id, p.sort_order ASC, p.created_at ASC
    `);
    const productsByCategory = new Map<string, any[]>();
    for (const p of productsResult.rows) {
      const list = productsByCategory.get(p.category_id) || [];
      list.push(p);
      productsByCategory.set(p.category_id, list);
    }

    const catNav = categoriesResult.rows.map((c: any, i: number) => `${i ? `<span class="sep"> | </span>` : ""}<button class="quick-link" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join("");
    const menuHtml = categoriesResult.rows.map((c: any) => {
      const products = productsByCategory.get(c.id) || [];
      return `<section class="category-block" data-cat-section="${esc(c.id)}"><header class="category-heading" id="cat-${esc(c.id)}"><h2>${esc(c.name)}</h2>${c.description ? `<p class="category-description">${esc(c.description)}</p>` : ""}<div class="category-underline"></div></header>${products.map((p: any) => `<article class="product ${p.is_available ? "" : "unavailable"}">${p.image_path ? `<div class="product-image"><img loading="lazy" src="${esc(p.image_path)}" alt="${esc(p.name)}"></div>` : ""}<h3>${esc(p.name)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ""}<div class="product-meta"><span class="price">${Number(p.price || 0).toLocaleString("fa-IR")} ${esc(s.currency)}</span>${p.is_available ? "" : `<span class="soldout">ناموجود</span>`}</div></article>`).join("")}</section>`;
    }).join("");

    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.seo_title ? `${s.seo_title} | منو` : `${brand} | منو`)}</title>${s.favicon_path ? `<link rel="icon" href="${esc(s.favicon_path)}">` : ""}<style>
@font-face{font-family:Morabba;src:url('/public/fonts/Morabba-Medium.woff') format('woff');font-display:swap}:root{--bg:${esc(s.background_color)};--primary:${esc(s.primary_color)};--text:${esc(s.text_color)};--accent:${esc(s.accent_color)}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font-family:Morabba,system-ui,sans-serif;text-align:center}.sticky{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(8px);padding:8px 14px 7px;border-bottom:1px solid color-mix(in srgb,var(--primary) 14%,transparent)}.logo-link{display:block;width:max-content;max-width:82%;margin:0 auto 4px}.menu-logo{display:block;width:min(310px,72vw);height:70px;object-fit:contain}.quick{display:flex;align-items:center;justify-content:center;overflow-x:auto;white-space:nowrap;scrollbar-width:none;padding:3px 0}.quick::-webkit-scrollbar{display:none}.quick-link{border:0;background:none;color:var(--text);font:inherit;font-size:14px;font-weight:800;padding:6px 7px;cursor:pointer;text-underline-offset:6px}.quick-link.active{text-decoration:underline;text-decoration-thickness:2px}.sep{opacity:.45}.container{width:min(760px,100%);margin:auto;padding:4px 16px 38px}.category-block{margin:0}.category-heading{scroll-margin-top:108px;padding-top:20px;margin-bottom:10px}.category-heading h2{font-size:27px;margin:0 0 5px}.category-description{margin:0 auto 8px;max-width:620px;font-size:14px;line-height:1.8;opacity:.78;white-space:pre-line}.category-underline{height:2px;width:110px;background:color-mix(in srgb,var(--primary) 35%,transparent);margin:9px auto 12px}.product{margin:0 auto 22px;padding-bottom:20px;border-bottom:1px solid color-mix(in srgb,var(--primary) 18%,transparent)}.product-image{width:100%;max-width:520px;aspect-ratio:4/3;max-height:330px;margin:0 auto 11px;border-radius:16px;overflow:hidden;background:#ddd}.product-image img{width:100%;height:100%;object-fit:cover}.product h3{font-size:25px;margin:0 0 5px}.product p{font-size:15px;line-height:1.75;margin:0 auto 7px;max-width:600px;white-space:pre-line}.product-meta{display:flex;justify-content:center;gap:10px;align-items:center}.price{font-weight:900;color:var(--accent)}.soldout{font-size:12px;border:1px solid currentColor;border-radius:999px;padding:3px 8px}.unavailable{opacity:.5}.menu-footer{padding:16px 20px 34px;white-space:pre-line}.menu-credit{display:block;width:max-content;margin:12px auto 0;color:var(--primary);font-size:10px;text-decoration:none;opacity:.5}@media(max-width:600px){.sticky{padding:5px 10px 4px}.menu-logo{height:52px;width:min(235px,65vw)}.quick-link{font-size:12px;padding:5px 6px}.container{padding:0 12px 26px}.category-heading{scroll-margin-top:82px;padding-top:13px;margin-bottom:6px}.category-heading h2{font-size:23px}.category-description{font-size:12px;line-height:1.7;margin-bottom:5px}.category-underline{margin:7px auto 9px}.product{margin-bottom:16px;padding-bottom:15px}.product-image{max-height:235px;aspect-ratio:16/10;margin-bottom:8px;border-radius:13px}.product h3{font-size:21px}.product p{font-size:13px;line-height:1.65;margin-top:3px}.product-meta{font-size:13px}}
</style></head><body><header class="sticky"><a class="logo-link" href="/">${mediaMarkup(s.logo_path, brand, "menu-logo")}</a><nav class="quick">${catNav}</nav></header><main class="container">${menuHtml || `<p style="padding:70px 10px">منو در حال حاضر خالی است.</p>`}</main><footer class="menu-footer">${esc(s.address || "")}<a class="menu-credit" href="https://badje.ir" target="_blank" rel="noopener noreferrer">© Badje</a></footer><script>
const links=[...document.querySelectorAll('.quick-link')];const heads=[...document.querySelectorAll('[data-cat-section]')];function active(id,center=false){links.forEach(a=>a.classList.toggle('active',a.dataset.cat===id));const a=links.find(x=>x.dataset.cat===id);if(center&&a)a.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}links.forEach(a=>a.addEventListener('click',()=>{document.getElementById('cat-'+a.dataset.cat)?.scrollIntoView({behavior:'smooth'});active(a.dataset.cat,true)}));const io=new IntersectionObserver(es=>{const visible=es.filter(e=>e.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top)-Math.abs(b.boundingClientRect.top));if(visible[0])active(visible[0].target.dataset.catSection,true)},{rootMargin:'-80px 0px -65% 0px',threshold:[0,.1,.5]});heads.forEach(h=>io.observe(h));if(links[0])active(links[0].dataset.cat,false);
</script></body></html>`;
    return reply.type("text/html; charset=utf-8").send(html);
  });
}
