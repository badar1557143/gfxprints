/* =========================================================
   GfxPrints - Product detail page
   The live Design Studio now lives on its own page
   (customize.html / js/customize.js). This page shows the
   product and links across to it with the product pre-selected.
   ========================================================= */

let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let selectedPackaging = null;
let selectedOrientation = null;

function initProductPage(){
  const root = document.getElementById("pd-title");
  if (!root) return;

  const id = getURLParam("id");
  currentProduct = getProductById(id) || PRODUCTS[0];
  const p = currentProduct;
  selectedColor = p.colors[0];
  selectedSize = p.sizes[0];
  selectedOrientation = p.orientations ? p.orientations[0] : null;
  const firstPackagings = getPackagingsFor(p, selectedSize);
  selectedPackaging = firstPackagings ? firstPackagings[0] : null;
  // Start on a size that can actually be ordered in the first colour
  selectedSize = firstOrderableSize(p, selectedColor) || selectedSize;

  document.title = p.seoTitle || `${p.name} | GfxPrints`;

  // Meta description, Open Graph, and JSON-LD - use per-product overrides where set,
  // fall back to generic values built from the product data for every other product.
  const seo = p.seo || {};
  const metaDesc = seo.metaDescription || p.description;
  setMetaContent("meta-description", metaDesc);
  setMetaContent("og-title", p.seoTitle || `${p.name} | GfxPrints`);
  setMetaContent("og-description", metaDesc);
  setMetaContent("og-image", absoluteAssetURL(seo.ogImage || p.image));
  setMetaTag("og:url", canonicalURL(p));
  setMetaContent("og-image-alt", seo.imageAlt || (seo.imageAltBase ? `${seo.imageAltBase} in White` : p.name));
  setMetaContent("tw-title", p.seoTitle || `${p.name} | GfxPrints`);
  setMetaContent("tw-description", metaDesc);
  setMetaContent("tw-image", absoluteAssetURL(seo.ogImage || p.image));
  const canonical = document.getElementById("canonical-link");
  if (canonical) canonical.setAttribute("href", canonicalURL(p));
  injectProductSchema(p, seo, metaDesc);

  // Breadcrumb - links to this product's category instead of the generic Shop page
  const breadcrumbCat = document.getElementById("breadcrumb-cat");
  breadcrumbCat.textContent = p.category;
  breadcrumbCat.href = `shop.html?category=${encodeURIComponent(p.category)}`;
  document.getElementById("breadcrumb-name").textContent = seo.breadcrumbName || p.name;

  // Gallery - for products with per-color photos the gallery and the color swatches stay in sync
  const mainImg = document.getElementById("gallery-main-img");
  const galleryList = p.heroImage ? [p.heroImage, ...p.gallery] : p.gallery;
  mainImg.src = p.heroImage || getColorImage(p, selectedColor);
  mainImg.alt = seo.imageAlt || (seo.imageAltBase ? `${seo.imageAltBase} in ${selectedColor}` : p.name);
  if (p.colorImages) mainImg.parentElement.classList.add("gallery-tall");
  if (p.galleryFit === "contain") mainImg.parentElement.classList.add("gallery-contain"); // show whole photo, no crop
  const thumbsWrap = document.getElementById("gallery-thumbs");
  thumbsWrap.classList.toggle("many", galleryList.length > 6); // 7 color views fit on one row
  thumbsWrap.innerHTML = galleryList.map((src, i) => `
    <button class="${src === mainImg.getAttribute("src") ? "active" : ""}" data-src="${src}" aria-label="View image ${i+1}">
      <img src="${src}" alt="" loading="lazy">
    </button>`).join("");
  document.querySelectorAll("#gallery-thumbs button").forEach(btn => {
    btn.addEventListener("click", () => {
      const colorForThumb = p.colorImages && p.colors.find(c => p.colorImages[c] === btn.dataset.src);
      if (colorForThumb){
        selectColor(colorForThumb);
      } else {
        mainImg.src = btn.dataset.src;
        document.querySelectorAll("#gallery-thumbs button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  });

  // Text fields
  document.getElementById("pd-cat").textContent = p.category;
  document.getElementById("pd-title").textContent = seo.h1 || p.name;
  if (seo.hideRatings || p.rating == null){
    // No ratings or reviews are shown (or sent to search engines) for this product
    const ratingRow = document.getElementById("pd-rating-stars").parentElement;
    if (ratingRow) ratingRow.style.display = "none";
  } else {
    document.getElementById("pd-rating-stars").textContent = starString(p.rating);
    document.getElementById("pd-rating-text").textContent = `${p.rating} (${p.reviews} reviews)`;
  }
  if (seo.hideSizeGuide){
    const sizeItem = document.getElementById("size-guide-item");
    if (sizeItem) sizeItem.style.display = "none";
  }
  if (seo.hideShippingReturns){
    const shipItem = document.getElementById("shipping-returns-item");
    if (shipItem) shipItem.style.display = "none";
  }
  document.getElementById("pd-desc").textContent = p.description;
  updatePrice();

  if (p.oldPrice){
    document.getElementById("pd-old-price").textContent = formatPrice(p.oldPrice);
    document.getElementById("pd-old-price").style.display = "inline";
  }

  // Size Guide - show the t-shirt size chart for T-Shirts, keep the generic note for everything else
  const sizeGuideBody = document.getElementById("size-guide-body");
  if (sizeGuideBody){
    if (p.category === "T-Shirts"){
      sizeGuideBody.innerHTML = `
        All measurements are in inches. Not sure which size to pick? Compare your favorite tee against the chart below.
        <img class="size-guide-img" src="assets/images/size-chart-mens-tshirt.webp" alt="T-shirt size chart in inches, chest, length, shoulder and sleeve measurements for sizes S, M, L, XL and XXL" width="720" height="720" loading="lazy">
      `;
    } else {
      sizeGuideBody.textContent = "Refer to the size options above. Contact us if you'd like help choosing the right fit.";
    }
  }

  // Description & Features, Materials, FAQ - use per-product overrides where set,
  // otherwise leave the generic copy that's already in the HTML.
  if (seo.featuresHTML){
    document.getElementById("desc-features-body").innerHTML = seo.featuresHTML;
  }
  if (seo.materials){
    document.getElementById("materials-body").textContent = seo.materials;
  }
  if (seo.faq && seo.faq.length){
    document.getElementById("faq-body").innerHTML = seo.faq.map(item => `
      <p style="margin:0 0 10px;"><strong>${item.q}</strong><br>${item.a}</p>
    `).join("");
  }

  // "Customize This Product" -> customization page with this product pre-selected
  const customizeBtn = document.getElementById("customize-btn");
  if (customizeBtn){
    if (p.customizable === false){
      customizeBtn.style.display = "none";
    } else {
      customizeBtn.href = customizeURL(p.id);
    }
  }

  // Colors
  const colorLabel = document.getElementById("pd-color-label");
  if (colorLabel) colorLabel.textContent = p.colorLabel || "Color";
  const colorWrap = document.getElementById("pd-colors");
  colorWrap.innerHTML = p.colors.map((c, i) => colorSwatchHTML(p, c, i === 0)).join("");
  colorWrap.querySelectorAll(".swatch").forEach(sw => {
    sw.addEventListener("click", () => selectColor(sw.dataset.color));
  });

  // Sizes (sizes that are not available in the chosen colour are shown disabled)
  renderSizes();

  // Orientation (only products with orientations, e.g. the framed poster)
  const orientBlock = document.getElementById("pd-orientation-block");
  if (orientBlock && p.orientations){
    orientBlock.style.display = "";
    const orientWrap = document.getElementById("pd-orientation");
    orientWrap.innerHTML = p.orientations.map((o, i) => `
      <button class="pill ${i === 0 ? "selected" : ""}" data-orientation="${o}">${o}</button>`).join("");
    orientWrap.querySelectorAll(".pill").forEach(pill => {
      pill.addEventListener("click", () => {
        orientWrap.querySelectorAll(".pill").forEach(pl => pl.classList.remove("selected"));
        pill.classList.add("selected");
        selectedOrientation = pill.dataset.orientation;
      });
    });
  }

  // Packaging (only products with packagings, e.g. mugs)
  renderPackaging();

  // Quantity
  const qtyInput = document.getElementById("pd-qty");
  document.getElementById("qty-minus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    qtyInput.value = Number(qtyInput.value) + 1;
  });

  // Accordions
  document.querySelectorAll(".accordion-item").forEach(item => {
    const head = item.querySelector(".accordion-head");
    const body = item.querySelector(".accordion-body");
    head.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".accordion-item").forEach(i => {
        i.classList.remove("open");
        i.querySelector(".accordion-body").style.maxHeight = null;
      });
      if (!isOpen){
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  });

  // Add to cart / buy now (plain product - designs are added from customize.html)
  document.getElementById("add-to-cart-btn").addEventListener("click", () => handleAddToCart(false));
  document.getElementById("buy-now-btn").addEventListener("click", () => handleAddToCart(true));

  renderRelated(p);
}

function renderSizes(){
  const p = currentProduct;
  const sizeWrap = document.getElementById("pd-sizes");
  sizeWrap.innerHTML = p.sizes.map(s => sizePillHTML(p, s, s === selectedSize, selectedColor)).join("");
  sizeWrap.querySelectorAll(".pill:not(.unavailable)").forEach(pill => {
    pill.addEventListener("click", () => {
      selectedSize = pill.dataset.size;
      sizeWrap.querySelectorAll(".pill").forEach(pl => {
        const on = pl.dataset.size === selectedSize;
        pl.classList.toggle("selected", on);
        if (!pl.classList.contains("unavailable")) pl.setAttribute("aria-pressed", String(on));
      });
      renderPackaging(); // packaging choices can depend on the size
      updatePrice();
    });
  });
}

function renderPackaging(){
  const p = currentProduct;
  const pkgBlock = document.getElementById("pd-packaging-block");
  const list = getPackagingsFor(p, selectedSize);
  if (!pkgBlock || !list) return;
  pkgBlock.style.display = "";
  if (!list.includes(selectedPackaging)) selectedPackaging = list[0];
  const pkgWrap = document.getElementById("pd-packaging");
  pkgWrap.innerHTML = list.map(k => `
    <button class="pill ${k === selectedPackaging ? "selected" : ""}" data-packaging="${k}">${k}</button>`).join("");
  pkgWrap.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", () => {
      pkgWrap.querySelectorAll(".pill").forEach(pl => pl.classList.remove("selected"));
      pill.classList.add("selected");
      selectedPackaging = pill.dataset.packaging;
      updatePrice();
    });
  });
}

function updatePrice(){
  const p = currentProduct;
  const orderable = isVariantOrderable(p, selectedColor, selectedPackaging, selectedSize);
  const priceEl = document.getElementById("pd-price");
  if (hasValidVariantPrice(p, selectedColor, selectedPackaging, selectedSize)){
    priceEl.textContent = formatPrice(getVariantPrice(p, selectedColor, selectedPackaging, selectedSize));
  } else {
    priceEl.textContent = "Price coming soon";
  }
  const status = document.getElementById("pd-status");
  if (status){
    status.textContent = orderable ? "" : (isVariantAvailable(p, selectedColor, selectedSize)
      ? "This option can't be ordered yet."
      : `Size ${selectedSize} is not available in ${selectedColor}.`);
    status.style.display = orderable ? "none" : "";
  }
  // No checkout for a colour/size that is unavailable or has no valid retail price
  ["add-to-cart-btn", "buy-now-btn"].forEach(id => {
    const b = document.getElementById(id);
    if (b){ b.disabled = !orderable; b.setAttribute("aria-disabled", String(!orderable)); }
  });
}

function selectColor(color){
  selectedColor = color;
  // Keep the selected size if it exists in this colour, otherwise move to the first size that does
  if (!isSizeOrderable(currentProduct, color, selectedSize)){
    selectedSize = firstOrderableSize(currentProduct, color) || selectedSize;
  }
  renderPackaging();
  renderSizes();
  updatePrice();
  document.querySelectorAll("#pd-colors .swatch").forEach(sw => {
    const on = sw.dataset.color === color;
    sw.classList.toggle("selected", on);
    sw.setAttribute("aria-pressed", String(on));
  });
  // Show that color's photo (products without per-color photos keep their current image)
  if (currentProduct.colorImages && currentProduct.colorImages[color]){
    const src = currentProduct.colorImages[color];
    document.getElementById("gallery-main-img").src = src;
    document.querySelectorAll("#gallery-thumbs button").forEach(b => {
      b.classList.toggle("active", b.dataset.src === src);
    });
  }
}

function handleAddToCart(buyNow){
  const p = currentProduct;
  // Required selections + availability + valid retail price before anything reaches the cart
  if (!selectedColor || !selectedSize || !isVariantOrderable(p, selectedColor, selectedPackaging, selectedSize)){
    showToast(selectedColor && selectedSize ? `Size ${selectedSize} is not available in ${selectedColor}` : "Please choose a colour and size");
    return;
  }
  const qty = Number(document.getElementById("pd-qty").value) || 1;
  addToCart({
    id: p.id,
    name: p.name,
    image: getColorImage(p, selectedColor),
    price: getVariantPrice(p, selectedColor, selectedPackaging, selectedSize),
    color: selectedColor,
    size: selectedSize,
    packaging: selectedPackaging,
    orientation: selectedOrientation,
    customText: "",
    customDesign: null,
    designPreview: null,
    qty: qty
  });
  showToast(`${p.name} added to cart`);
  if (buyNow){
    window.location.href = "checkout.html";
  }
}

function renderRelated(p){
  const wrap = document.getElementById("related-grid");
  if (!wrap) return;
  const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
  const fallback = related.length ? related : PRODUCTS.filter(x => x.id !== p.id).slice(0, 4);
  wrap.innerHTML = fallback.map(productCardHTML).join("");
  bindWishlistButtons(wrap);
}

/* ---------- SEO helpers ---------- */

// Set the content of a <meta id="..."> tag already present in the page head.
function setMetaContent(id, content){
  const tag = document.getElementById(id);
  if (tag) tag.setAttribute("content", content);
}

// Set (or create) a <meta property="..."> tag that has no fixed id in the HTML - used for
// og:url, which is different on every load and so isn't hardcoded into product.html.
function setMetaTag(property, content){
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag){
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

// Resolve a project-relative asset path (e.g. "assets/products/tee-plain-white.webp")
// to an absolute URL, since Open Graph and JSON-LD image URLs must be absolute.
function absoluteAssetURL(relativePath){
  return new URL(relativePath, window.location.href).href;
}

// Canonical URL on the real domain/routing: this site serves every product at product.html?id=<id>.
function canonicalURL(p){
  return window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(p.id);
}

// Build and inject (or update) the Product JSON-LD schema for the currently loaded product.
function injectProductSchema(p, seo, metaDesc){
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": seo.h1 || p.name,
    "description": metaDesc,
    "image": [absoluteAssetURL(seo.ogImage || p.image)],
    "brand": { "@type": "Brand", "name": "GfxPrints" },
    "category": p.category
  };
  // Ratings only for products that really have them
  if (!seo.hideRatings && p.rating != null){
    schema.aggregateRating = { "@type": "AggregateRating", "ratingValue": String(p.rating), "reviewCount": String(p.reviews) };
  }
  // Offer data only from real, valid retail prices and orderable variants
  const orderable = [];
  p.colors.forEach(c => p.sizes.forEach(s => {
    if (!isVariantAvailable(p, c, s)) return;
    (getPackagingsFor(p, s) || [null]).forEach(pk => {
      if (hasValidVariantPrice(p, c, pk, s)) orderable.push(getVariantPrice(p, c, pk, s));
    });
  }));
  if (orderable.length){
    const lo = Math.min(...orderable), hi = Math.max(...orderable);
    schema.offers = lo === hi
      ? { "@type": "Offer", "url": canonicalURL(p), "priceCurrency": "PKR", "price": String(lo), "availability": "https://schema.org/InStock", "itemCondition": "https://schema.org/NewCondition" }
      : { "@type": "AggregateOffer", "url": canonicalURL(p), "priceCurrency": "PKR", "lowPrice": String(lo), "highPrice": String(hi), "offerCount": String(orderable.length), "availability": "https://schema.org/InStock", "itemCondition": "https://schema.org/NewCondition" };
  }
  let script = document.getElementById("product-schema");
  if (!script){
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "product-schema";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

document.addEventListener("DOMContentLoaded", initProductPage);
