import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type Settings = {
  brandName: string;
  brandNameFa: string;
  logoPath: string | null;
  faviconPath: string | null;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  phones: string[];
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  telegram: string | null;
  facebook: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
  currency: string;
  seoTitle: string | null;
  seoDescription: string | null;
  businessDescription: string | null;
  contactText: string | null;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  deliveryEnabled: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isVisible: boolean;
  productCount: number;
};

type Product = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  imagePath: string | null;
  sortOrder: number;
  isVisible: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
};

type Tab = "settings" | "categories" | "products";

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
  return data as T;
}

function isVideo(url?: string | null) {
  return !!url && /\.(mp4|webm|ogg)(?:$|\?)/i.test(url);
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="colorField">
      <span className="colorFieldLabel">{label}</span>
      <span className="colorControl">
        <span className="colorSwatch" style={{ background: value }} />
        <span className="colorHex">{value.toUpperCase()}</span>
        <span className="colorHint">انتخاب رنگ</span>
        <input className="colorNativeInput" type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span /></label>;
}

function CategoryDialog({ category, onClose, onSave }: {
  category: Category | null | undefined;
  onClose: () => void;
  onSave: (value: { name: string; description: string; isVisible: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [isVisible, setVisible] = useState(category?.isVisible ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("نام دسته‌بندی الزامی است");
    setBusy(true); setError("");
    try { await onSave({ name: name.trim(), description: description.trim(), isVisible }); }
    catch (e) { setError(e instanceof Error ? e.message : "خطا"); setBusy(false); }
  }

  return <div className="modalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modalCard" role="dialog" aria-modal="true">
      <div className="modalHeader"><h2>{category ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی"}</h2><button className="iconButton" type="button" onClick={onClose}>×</button></div>
      <form className="modalForm" onSubmit={submit}>
        {error && <div className="errorMsg">{error}</div>}
        <label>نام دسته‌بندی<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً نوشیدنی گرم" /></label>
        <label>توضیحات<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح کوتاه اختیاری برای نمایش زیر عنوان دسته‌بندی" rows={4} /></label>
        <label className="switchLine"><div><span>نمایش در منو</span><small>اگر خاموش باشد، دسته‌بندی و محصولاتش در منوی عمومی دیده نمی‌شوند.</small></div><Switch checked={isVisible} onChange={setVisible} /></label>
        <div className="modalActions"><button type="button" className="secondary" onClick={onClose}>انصراف</button><button disabled={busy}>{busy ? "در حال ذخیره..." : "ذخیره"}</button></div>
      </form>
    </div>
  </div>;
}

function ProductDialog({ product, categories, onClose, onSave, onUpload }: {
  product: Product | null | undefined;
  categories: Category[];
  onClose: () => void;
  onSave: (value: Omit<Product, "id" | "slug" | "sortOrder">) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
}) {
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || "");
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price || "0");
  const [imagePath, setImagePath] = useState<string | null>(product?.imagePath || null);
  const [isVisible, setVisible] = useState(product?.isVisible ?? true);
  const [isAvailable, setAvailable] = useState(product?.isAvailable ?? true);
  const [isFeatured, setFeatured] = useState(product?.isFeatured ?? false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setError("");
    try { setImagePath(await onUpload(file)); }
    catch (e) { setError(e instanceof Error ? e.message : "خطا در آپلود"); }
    finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) return setError("نام و دسته‌بندی الزامی است");
    setBusy(true); setError("");
    try {
      await onSave({ categoryId, name: name.trim(), description: description.trim(), price, imagePath, isVisible, isAvailable, isFeatured });
    } catch (e) { setError(e instanceof Error ? e.message : "خطا"); setBusy(false); }
  }

  return <div className="modalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modalCard wideModal" role="dialog" aria-modal="true">
      <div className="modalHeader"><h2>{product ? "ویرایش محصول" : "افزودن محصول"}</h2><button className="iconButton" type="button" onClick={onClose}>×</button></div>
      <form className="modalForm" onSubmit={submit}>
        {error && <div className="errorMsg">{error}</div>}
        <div className="formGrid">
          <label>دسته‌بندی<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>نام محصول<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="full">توضیحات<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></label>
          <label>قیمت<input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <div className="imageField full"><span className="fieldLabel">تصویر محصول</span><div className="imageEditor"><div className="imagePreviewLarge">{imagePath ? <img src={imagePath} alt="" /> : "بدون تصویر"}</div><div className="imageControls"><label className="fileButton">{uploading ? "در حال آپلود..." : "انتخاب تصویر"}<input type="file" accept="image/*" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} /></label>{imagePath && <button className="secondary" type="button" onClick={() => setImagePath(null)}>حذف تصویر</button>}</div></div></div>
        </div>
        <div className="statusGrid">
          <label className="switchLine"><div><span>نمایش</span><small>در منو دیده شود</small></div><Switch checked={isVisible} onChange={setVisible} /></label>
          <label className="switchLine"><div><span>موجود</span><small>امکان سفارش/نمایش موجودی</small></div><Switch checked={isAvailable} onChange={setAvailable} /></label>
          <label className="switchLine"><div><span>ویژه</span><small>برای استفاده در بخش‌های ویژه</small></div><Switch checked={isFeatured} onChange={setFeatured} /></label>
        </div>
        <div className="modalActions"><button type="button" className="secondary" onClick={onClose}>انصراف</button><button disabled={busy || uploading}>{busy ? "در حال ذخیره..." : "ذخیره"}</button></div>
      </form>
    </div>
  </div>;
}

function App() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("settings");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryDialog, setCategoryDialog] = useState<Category | null | undefined>(undefined);
  const [productDialog, setProductDialog] = useState<Product | null | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api<{ settings: Settings; categories: Category[]; products: Product[] }>("/api/admin/bootstrap");
    setSettings(data.settings); setCategories(data.categories); setProducts(data.products);
  }

  useEffect(() => { (async () => {
    try { await api("/api/admin/me"); setAuth(true); await load(); }
    catch { setAuth(false); }
  })(); }, []);

  function notice(text: string) { setMessage(text); setError(""); setTimeout(() => setMessage(""), 2500); }
  function fail(e: unknown) { setError(e instanceof Error ? e.message : "خطایی رخ داد"); setMessage(""); }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try { await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) }); setAuth(true); setPassword(""); await load(); }
    catch (e) { fail(e); }
  }

  async function logout() {
    try { await api("/api/admin/logout", { method: "POST" }); }
    finally { setAuth(false); setSettings(null); setCategories([]); setProducts([]); }
  }

  async function upload(file: File, kind: "branding" | "product") {
    const fd = new FormData(); fd.append("file", file);
    const data = await api<{ url: string }>(`/api/admin/upload?kind=${kind}`, { method: "POST", body: fd });
    return data.url;
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); if (!settings) return; setSaving(true); setError("");
    try { const data = await api<{ settings: Settings }>("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) }); setSettings(data.settings); notice("تنظیمات ذخیره شد"); }
    catch (e) { fail(e); } finally { setSaving(false); }
  }

  async function saveCategory(value: { name: string; description: string; isVisible: boolean }) {
    if (categoryDialog) await api(`/api/admin/categories/${categoryDialog.id}`, { method: "PUT", body: JSON.stringify(value) });
    else await api("/api/admin/categories", { method: "POST", body: JSON.stringify(value) });
    setCategoryDialog(undefined); await load(); notice("دسته‌بندی ذخیره شد");
  }

  async function removeCategory(c: Category) {
    if (!confirm(`دسته‌بندی «${c.name}» و ${c.productCount} محصول آن حذف شود؟`)) return;
    try { await api(`/api/admin/categories/${c.id}`, { method: "DELETE" }); await load(); notice("دسته‌بندی حذف شد"); } catch (e) { fail(e); }
  }

  async function quickCategory(c: Category, patch: Partial<Category>) {
    try { await api(`/api/admin/categories/${c.id}`, { method: "PUT", body: JSON.stringify({ name: c.name, description: c.description, isVisible: patch.isVisible ?? c.isVisible }) }); await load(); } catch (e) { fail(e); }
  }

  async function reorderCategories(id: string, dir: -1 | 1) {
    const i = categories.findIndex((c) => c.id === id), j = i + dir; if (i < 0 || j < 0 || j >= categories.length) return;
    const copy = [...categories]; [copy[i], copy[j]] = [copy[j], copy[i]];
    setCategories(copy);
    try { const r = await api<{ categories: Category[] }>("/api/admin/categories/reorder", { method: "POST", body: JSON.stringify({ ids: copy.map((c) => c.id) }) }); setCategories(r.categories); } catch (e) { fail(e); await load(); }
  }

  async function saveProduct(value: Omit<Product, "id" | "slug" | "sortOrder">) {
    if (productDialog) await api(`/api/admin/products/${productDialog.id}`, { method: "PUT", body: JSON.stringify(value) });
    else await api("/api/admin/products", { method: "POST", body: JSON.stringify(value) });
    setProductDialog(undefined); await load(); notice("محصول ذخیره شد");
  }

  async function removeProduct(p: Product) {
    if (!confirm(`محصول «${p.name}» حذف شود؟`)) return;
    try { await api(`/api/admin/products/${p.id}`, { method: "DELETE" }); await load(); notice("محصول حذف شد"); } catch (e) { fail(e); }
  }

  async function quickProduct(p: Product, patch: Partial<Product>) {
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PUT", body: JSON.stringify({ ...p, ...patch }) });
      await load();
    } catch (e) { fail(e); }
  }

  async function reorderProduct(p: Product, dir: -1 | 1) {
    const group = products.filter((x) => x.categoryId === p.categoryId);
    const i = group.findIndex((x) => x.id === p.id), j = i + dir; if (i < 0 || j < 0 || j >= group.length) return;
    [group[i], group[j]] = [group[j], group[i]];
    try { await api("/api/admin/products/reorder", { method: "POST", body: JSON.stringify({ ids: group.map((x) => x.id) }) }); await load(); } catch (e) { fail(e); }
  }

  if (auth === null) return <div className="login card"><p>در حال بارگذاری...</p></div>;
  if (!auth) return <div className="login card"><h1>ورود مدیریت</h1>{error && <div className="errorMsg">{error}</div>}<form onSubmit={login}><input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور" /><button>ورود</button></form></div>;
  if (!settings) return <div className="login card"><p>در حال بارگذاری...</p></div>;

  return <div className="app">
    <aside><h2>مدیریت</h2><button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>تنظیمات</button><button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>دسته‌بندی‌ها</button><button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>محصولات</button><button onClick={logout}>خروج</button></aside>
    <main className="content">
      {message && <div className="successMsg">{message}</div>}{error && <div className="errorMsg">{error}</div>}
      {tab === "settings" && <><div className="top"><div><h1>تنظیمات رستوران</h1><p className="muted">برند، تماس، شبکه‌های اجتماعی، رنگ‌ها و SEO</p></div></div><form className="settingsCard grid" onSubmit={saveSettings}>
        <label>نام برند<input value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} /></label>
        <label>نام فارسی<input value={settings.brandNameFa} onChange={(e) => setSettings({ ...settings, brandNameFa: e.target.value })} /></label>
        <label className="wide">توضیح کسب‌وکار<textarea value={settings.businessDescription || ""} onChange={(e) => setSettings({ ...settings, businessDescription: e.target.value })} /></label>
        <div className="settingsGroup wide"><div className="settingsGroupHeader"><div><strong>شماره‌های تماس</strong><small>به تعداد دلخواه شماره اضافه کنید. شماره اول برای دکمه تماس موبایل استفاده می‌شود.</small></div><button type="button" onClick={() => setSettings({ ...settings, phones: [...settings.phones, ""] })}>+ افزودن شماره</button></div><div className="repeatList">{settings.phones.map((phone, i) => <div className="repeatRow" key={i}><span>{i + 1}</span><input value={phone} onChange={(e) => { const phones = [...settings.phones]; phones[i] = e.target.value; setSettings({ ...settings, phones }); }} placeholder="+98..." /><button type="button" className="danger" onClick={() => setSettings({ ...settings, phones: settings.phones.filter((_, x) => x !== i) })}>حذف</button></div>)}</div></div>
        <label>ایمیل<input value={settings.email || ""} onChange={(e) => setSettings({ ...settings, email: e.target.value })} /></label><label>اینستاگرام<input value={settings.instagram || ""} onChange={(e) => setSettings({ ...settings, instagram: e.target.value })} /></label><label>واتساپ<input value={settings.whatsapp || ""} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} /></label><label>تلگرام<input value={settings.telegram || ""} onChange={(e) => setSettings({ ...settings, telegram: e.target.value })} /></label><label>فیسبوک<input value={settings.facebook || ""} onChange={(e) => setSettings({ ...settings, facebook: e.target.value })} /></label>
        <label className="wide">متن تماس<textarea value={settings.contactText || ""} onChange={(e) => setSettings({ ...settings, contactText: e.target.value })} /></label><label className="wide">آدرس<textarea value={settings.address || ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label><label className="wide">لینک مسیریابی<input value={settings.mapUrl || ""} onChange={(e) => setSettings({ ...settings, mapUrl: e.target.value })} placeholder="https://maps.google.com/..." /></label>
        <ColorField label="رنگ اصلی" value={settings.primaryColor} onChange={(v) => setSettings({ ...settings, primaryColor: v })} /><ColorField label="رنگ پس‌زمینه" value={settings.backgroundColor} onChange={(v) => setSettings({ ...settings, backgroundColor: v })} /><ColorField label="رنگ متن" value={settings.textColor} onChange={(v) => setSettings({ ...settings, textColor: v })} /><ColorField label="رنگ مکمل" value={settings.accentColor} onChange={(v) => setSettings({ ...settings, accentColor: v })} />
        <div className="brandMediaPreview wide"><strong>لوگو (تصویر، GIF یا ویدیو)</strong>{settings.logoPath ? (isVideo(settings.logoPath) ? <video src={settings.logoPath} autoPlay muted loop playsInline /> : <img src={settings.logoPath} alt="logo" />) : <span className="muted">لوگویی آپلود نشده است</span>}<div className="actions"><label className="fileButton">آپلود لوگو<input type="file" accept="image/*,video/mp4,video/webm,video/ogg" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await upload(f, "branding"); setSettings({ ...settings, logoPath: url }); } catch (e) { fail(e); } }} /></label>{settings.logoPath && <button type="button" className="secondary" onClick={() => setSettings({ ...settings, logoPath: null })}>حذف لوگو</button>}</div></div>
        <label>عنوان SEO<input value={settings.seoTitle || ""} onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })} /></label><label>واحد پول<input value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} /></label><label className="wide">توضیح SEO<textarea value={settings.seoDescription || ""} onChange={(e) => setSettings({ ...settings, seoDescription: e.target.value })} /></label>
        <label className="switchLine"><div><span>تحویل حضوری</span></div><Switch checked={settings.pickupEnabled} onChange={(v) => setSettings({ ...settings, pickupEnabled: v })} /></label><label className="switchLine"><div><span>سرو داخل</span></div><Switch checked={settings.dineInEnabled} onChange={(v) => setSettings({ ...settings, dineInEnabled: v })} /></label><label className="switchLine"><div><span>ارسال</span></div><Switch checked={settings.deliveryEnabled} onChange={(v) => setSettings({ ...settings, deliveryEnabled: v })} /></label>
        <div className="wide"><button disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}</button></div>
      </form></>}
      {tab === "categories" && <><div className="top"><div><h1>دسته‌بندی‌ها</h1><p className="muted">نام، توضیحات، نمایش و ترتیب</p></div><button onClick={() => setCategoryDialog(null)}>+ دسته‌بندی</button></div><div className="listCard">{categories.length ? categories.map((c, i) => <div className="row" key={c.id}><span className="orderBadge">{i + 1}</span><div className="grow"><strong>{c.name}</strong>{c.description && <small>{c.description}</small>}<small>{c.productCount} محصول</small></div><div className="actions"><Switch checked={c.isVisible} onChange={(v) => quickCategory(c, { isVisible: v })} /><button className="subtle" disabled={i === 0} onClick={() => reorderCategories(c.id, -1)}>↑</button><button className="subtle" disabled={i === categories.length - 1} onClick={() => reorderCategories(c.id, 1)}>↓</button><button onClick={() => setCategoryDialog(c)}>ویرایش</button><button className="danger" onClick={() => removeCategory(c)}>حذف</button></div></div>) : <div className="empty">هنوز دسته‌بندی ایجاد نشده است.</div>}</div></>}
      {tab === "products" && <><div className="top"><div><h1>محصولات</h1><p className="muted">جزئیات، عکس، موجودی و ترتیب</p></div><button disabled={!categories.length} onClick={() => setProductDialog(null)}>+ محصول</button></div>{categories.map((c) => { const ps = products.filter((p) => p.categoryId === c.id); return <section className="category" key={c.id}><div className="categoryTitle"><h2>{c.name}</h2><small>{ps.length} محصول</small></div>{ps.length ? ps.map((p, i) => <div className={`productRow ${p.isVisible ? "" : "hiddenProduct"}`} key={p.id}><div className="thumb">{p.imagePath ? <img src={p.imagePath} alt="" /> : "بدون عکس"}</div><div className="grow"><strong>{p.name}</strong>{p.description && <small className="descriptionPreview">{p.description}</small>}<small className="priceText">{Number(p.price).toLocaleString("fa-IR")} {settings.currency}</small></div><div className="checks"><label>نمایش <Switch checked={p.isVisible} onChange={(v) => quickProduct(p, { isVisible: v })} /></label><label>موجود <Switch checked={p.isAvailable} onChange={(v) => quickProduct(p, { isAvailable: v })} /></label><label>ویژه <Switch checked={p.isFeatured} onChange={(v) => quickProduct(p, { isFeatured: v })} /></label></div><div className="actions"><button className="subtle" disabled={i === 0} onClick={() => reorderProduct(p, -1)}>↑</button><button className="subtle" disabled={i === ps.length - 1} onClick={() => reorderProduct(p, 1)}>↓</button><button onClick={() => setProductDialog(p)}>ویرایش</button><button className="danger" onClick={() => removeProduct(p)}>حذف</button></div></div>) : <div className="empty compact">محصولی در این دسته نیست.</div>}</section>; })}</>}
    </main>
    {categoryDialog !== undefined && <CategoryDialog category={categoryDialog} onClose={() => setCategoryDialog(undefined)} onSave={saveCategory} />}
    {productDialog !== undefined && <ProductDialog product={productDialog} categories={categories} onClose={() => setProductDialog(undefined)} onSave={saveProduct} onUpload={(f) => upload(f, "product")} />}
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
