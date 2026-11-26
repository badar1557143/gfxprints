#!/usr/bin/env node
/* Writes one real HTML page per product (e.g. custom-printed-classic-cotton-t-shirt.html).

   Why: product.html fills its title, photo and description with JavaScript. Google can run
   JavaScript, but WhatsApp, Facebook, Bing and other bots often do not, so they saw the
   T-shirt tags for every product. These pages carry the right tags in the HTML itself.
   The page still loads the same scripts, so buying and customizing work exactly as before.

   Run from the site folder after changing products or product.html:
       node tools/build-product-pages.js
   Add --sitemap to also rewrite the product lines in sitemap.xml.
   Prices are never read or written here. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const SITE = "https://gfxprints.com";

global.window = { location: { href: SITE + "/", origin: SITE, pathname: "/", search: "" } };
const src = fs.readFileSync(path.join(root, "js/products.js"), "utf8");
const { PRODUCTS, slugOf } = new Function(src + ";return { PRODUCTS, slugOf: gfxProductSlug };")();

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const abs = (u) => new URL(u, SITE + "/").href;

// Replace exactly one match, and stop loudly if product.html changed shape.
function swap(html, re, fn, label) {
  if (!re.test(html)) throw new Error("product.html: could not find " + label);
  return html.replace(re, fn);
}
const setContentById = (html, id, value) =>
  swap(html, new RegExp('(<meta[^>]*\\bid="' + id + '"[^>]*\\bcontent=")[^"]*(")'), (m, a, b) => a + esc(value) + b, "#" + id);

const template = fs.readFileSync(path.join(root, "product.html"), "utf8");
const written = [];

PRODUCTS.forEach((p) => {
  const seo = p.seo || {};
  const slug = slugOf(p);
  const title = p.seoTitle || (p.name + " | GfxPrints");
  const desc = seo.metaDescription || p.description || "";
  const img = abs(seo.ogImage || p.image);
  const imgAlt = seo.imageAlt || (seo.imageAltBase ? seo.imageAltBase + " in White" : p.name);
  const url = SITE + "/" + slug + ".html";
  const h1 = seo.h1 || p.name;

  let html = template;
  html = swap(html, /<title>[\s\S]*?<\/title>/, "<title>" + esc(title) + "</title>", "<title>");
  html = setContentById(html, "meta-description", desc);
  html = setContentById(html, "og-title", title);
  html = setContentById(html, "og-description", desc);
  html = setContentById(html, "og-image", img);
  html = setContentById(html, "og-image-alt", imgAlt);
  html = setContentById(html, "tw-title", title);
  html = setContentById(html, "tw-description", desc);
  html = setContentById(html, "tw-image", img);
  html = swap(html, /(<link rel="canonical"[^>]*\bhref=")[^"]*(")/, (m, a, b) => a + url + b, "canonical");
  // og:url and the product id the page script reads
  html = swap(html, /(<meta property="og:type"[^>]*>)/,
    (m) => m + '\n<meta property="og:url" content="' + url + '">\n<meta name="gfx-product-id" content="' + esc(p.id) + '">', "og:type");
  // Words a crawler can read before any script runs
  html = swap(html, /(<h1 class="pd-title" id="pd-title">)(<\/h1>)/, (m, a, b) => a + esc(h1) + b, "h1");
  html = swap(html, /(<p class="pd-desc" id="pd-desc">)(<\/p>)/, (m, a, b) => a + esc(p.description || desc) + b, "pd-desc");
  html = swap(html, /(<span id="breadcrumb-name">)Product(<\/span>)/, (m, a, b) => a + esc(seo.breadcrumbName || p.name) + b, "breadcrumb");

  fs.writeFileSync(path.join(root, slug + ".html"), html);
  written.push({ id: p.id, slug });
});

console.log("Wrote " + written.length + " product pages:");
written.forEach((w) => console.log("  " + w.id + "  " + w.slug + ".html"));

if (process.argv.includes("--sitemap")) {
  const file = path.join(root, "sitemap.xml");
  let xml = fs.readFileSync(file, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const lines = xml.split(/\r?\n/);
  const kept = lines.filter((l) => !/<loc>[^<]*\/product\.html\?id=\d+<\/loc>/.test(l) &&
    !written.some((w) => l.includes("<loc>" + SITE + "/" + w.slug + ".html</loc>")));
  const at = kept.findIndex((l) => l.includes("</urlset>"));
  const add = written.map((w) =>
    '  <url><loc>' + SITE + "/" + w.slug + '.html</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>');
  kept.splice(at, 0, ...add);
  fs.writeFileSync(file, kept.join("\n"));
  console.log("sitemap.xml updated (" + add.length + " product pages).");
}
