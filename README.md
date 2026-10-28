# Restaurant Platform

A self-hostable restaurant and café website, menu, admin, branding, OTP and future ordering platform. Each restaurant can run its own application container while using dedicated PostgreSQL data and optionally shared Redis/MinIO infrastructure.

Built and maintained by **Tooraj Valaee** · [Badje](https://badje.ir)

## Stack
- Fastify + TypeScript
- PostgreSQL + Drizzle ORM
- Redis for sessions and OTP
- MinIO for uploads
- React admin
- Server-rendered public homepage and `/menu`

## First run

1. Copy `.env.example` to `.env.production` and edit values.
2. Make sure the external Docker network exists:
   ```bash
   docker network create restaurant-services
   ```
3. Build locally:
   ```bash
   npm ci
   docker build -t restaurant-platform:0.1.0 .
   docker save restaurant-platform:0.1.0 -o restaurant-platform-0.1.0.tar
   ```
4. On the server:
   ```bash
   docker load -i restaurant-platform-0.1.0.tar
   docker compose --env-file .env.production run --rm app npm run db:migrate
   docker compose --env-file .env.production up -d
   ```
5. Open `/admin` and sign in using `ADMIN_PASSWORD`.

## Public URLs
- `/`
- `/menu`
- `/admin`

## Admin features included
- Business settings: brand, colors, logo/favicon paths, contact, address, SEO, ordering toggles
- Categories: create/edit/delete, visible toggle, drag reorder
- Products: create/edit/delete, visible/available/featured toggles, drag reorder within category
- MinIO image upload endpoint
- Secure HttpOnly Redis-backed admin sessions

## OTP scaffold
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`

The SMS.ir template parameter is controlled by `SMSIR_TEMPLATE_PARAM` and defaults to `CODE`.

## MinIO bucket behavior

The app checks `MINIO_BUCKET` at startup and creates it when missing, if the configured MinIO credentials have permission to create buckets.

Keep the bucket private. Images are served through the app at `/media/<object-key>`, so anonymous/public bucket access is not required.

## Homepage compatibility patch (0.1.1)

The `/` route now follows the original `cucinetta` static homepage layout:

- fixed desktop navigation
- full viewport centered logo
- contact section
- multiple phone numbers
- social links
- address and directions
- mobile fixed bottom actions: Call / Menu / Directions
- Morabba font

Homepage content is read from `app_settings` and managed from `/admin`.

### Morabba font

The public site, menu and admin use `Morabba-Medium.woff`.

During `npm run build`, the prebuild step checks for:

```text
public/fonts/Morabba-Medium.woff
```

If the file is not already present, it downloads the exact Morabba Medium asset from the original `ToorajValaee/menu.cucinetta.ir` repository. You can also place your local copy at that path before building; in that case it is used as-is.

### Upgrade an existing database

Version 0.1.1 includes `0002_homepage_settings.sql` and a migration runner that tracks applied migrations.
After loading the new image, run:

```bash
docker compose --env-file .env.production run --rm cafecita npm run db:migrate
```

The new homepage fields are:

- `phone2`
- `phone3`
- `telegram`
- `facebook`
- `mapUrl`
- `contactText`

The original fields such as logo, phone, mobile, WhatsApp, Instagram, address, colors, description and SEO remain supported.

## 0.1.2 admin CRUD update

- Category add/edit now uses a proper dialog form.
- Category visibility, edit, delete, product count and ordering controls are available from the list.
- Product add/edit now uses a full dialog with category, name, description, price, image upload/preview, visible, available and featured fields.
- Product list keeps quick status toggles and ordering controls for daily operations.
- Product images are selected/uploaded from inside the product dialog.

## 0.1.3 changes

- Business phone numbers are now an editable list in Admin. Existing `phone`, `phone_2`, `phone_3`, and `mobile` values are migrated automatically into the list.
- Homepage social links render as single-color inline SVG icons using the configured restaurant primary color.
- Admin logout explicitly clears the HttpOnly session cookie and immediately returns to the login screen.
- Menu mobile spacing is tighter, the sticky header is shorter, product images are more compact, and category starts no longer have large vertical gaps.
- The menu logo links back to `/`.

Upgrade an existing database with:

```bash
docker compose --env-file .env.production run --rm cafecita npm run db:migrate
```

## 0.1.4 homepage snap + animated logo

- Homepage sections use full-viewport scroll snapping. Mouse-wheel navigation advances one section at a time; touch uses native CSS scroll snap.
- The section navigation highlights/underlines the currently visible section.
- Homepage sections: brand hero, menu CTA, contact (when configured), address/directions (when configured).
- Branding logo uploads accept images/GIF plus MP4, WebM and OGG video. Video logos autoplay muted, loop and use playsinline on both home and menu pages.
- Product uploads remain image-only.
- Branding videos allow up to 25MB; images remain limited to 8MB. If Nginx proxies the app, set `client_max_body_size 30M;` or larger.

## Badje credit
Public homepage and menu include a small linked `© Badje` credit pointing to https://badje.ir.

## License

Source is publicly available under the **PolyForm Noncommercial License 1.0.0**. Noncommercial use, modification and distribution are permitted under its terms. Commercial use requires a separate license from Tooraj Valaee.

Copyright © 2026 Tooraj Valaee.


## Category descriptions

Categories support an optional `description` field. It should be editable from the category add/edit dialog and rendered under the category title on `/menu` when present. Existing categories remain valid with an empty description. Existing databases should run `0004_category_description.sql` through the normal migration command.
