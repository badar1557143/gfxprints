/* =========================================================
   GfxPrints - Shared site behavior
   Loaded on every page. Handles navigation, cart badge,
   wishlist, toast notifications, and homepage rendering.
   ========================================================= */

/* ---------- Storage helpers (shared with cart.js / product.js) ---------- */
const STORAGE_CART = "gfxprints_cart";
const STORAGE_WISHLIST = "gfxprints_wishlist";

/* ---------- WhatsApp ----------
   One number powers the floating chat bubble (every page) plus the "Buy on
   WhatsApp" (product.html) and "Checkout on WhatsApp" (checkout.html) buttons.
   Replace with your real WhatsApp Business number: country code + number,
   digits only - no "+", spaces, or leading zero (e.g. Pakistan 03xx-xxxxxxx
   becomes "923xxxxxxxxx"). */
const WHATSAPP_NUMBER = "923222920135";

/* Online order saving (Google Drive + Google Sheets, via Apps Script).
   After you deploy google-apps-script/Code.gs (see SETUP-GUIDE.md), paste the web app URL
   (ends in /exec) and the ORDER_TOKEN that setup() printed. While ORDER_ENDPOINT is empty the
   site keeps using the old WhatsApp-only flow. */
const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfycbx3pOeyIc6qiTSrYaOMl6mZB2HCGzRg2Ej5kJA0C1Ui7r9QJMXUQ_Lpi6kQJqwfI5deIg/exec";
const ORDER_TOKEN = "82fd6ca49f3b42769ae19b62d7f24b84";

function whatsappLink(message){
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Floating chat bubble, added to every page that loads main.js.
function initWhatsAppFloat(){
  if (document.getElementById("whatsapp-float")) return;
  const a = document.createElement("a");
  a.id = "whatsapp-float";
  a.className = "whatsapp-float";
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", "Chat with us on WhatsApp");
  a.title = "Chat with us on WhatsApp";
  a.href = whatsappLink("Hi GfxPrints! I have a question.");
  a.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.19 0 4.25.85 5.8 2.4a8.2 8.2 0 0 1 2.42 5.84c0 4.55-3.71 8.25-8.25 8.25a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.14.82.84-3.06-.2-.32a8.18 8.18 0 0 1-1.26-4.37c0-4.55 3.71-8.23 8.29-8.23zm-4.55 4.74c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03 0 1.2.87 2.35.99 2.51.12.16 1.7 2.7 4.19 3.68 2.07.82 2.49.66 2.94.62.45-.04 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.45-.71-1.67-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42h-.35z"/></svg>`;
  document.body.appendChild(a);
}

/* ---------- Visitor counter ----------
   A real count, kept by a free hosted counter (counterapi.dev). Each browser
   session adds one visit; every page then shows the running total in the
   footer. If the counter can't be reached, nothing is shown (never a made-up
   number). To start a fresh count, change `namespace` to anything unique. */
const VISITOR_COUNTER = {
  enabled: true,
  api: "https://api.counterapi.dev/v1",
  namespace: "gfxprints-site-k7q2m9",
  key: "visits"
};

async function initVisitorCounter(){
  if (!VISITOR_COUNTER.enabled) return;
  const bar = document.querySelector(".footer-bottom");
  if (!bar) return;
  const SEEN = "gfxprints_visit_counted";
  let counted = false;
  try { counted = sessionStorage.getItem(SEEN) === "1"; } catch (e){}
  const base = `${VISITOR_COUNTER.api}/${VISITOR_COUNTER.namespace}/${VISITOR_COUNTER.key}`;
  try {
    const res = await fetch(counted ? base : base + "/up");
    if (!res.ok) throw new Error("counter unavailable");
    const data = await res.json();
    const n = Number(data.count != null ? data.count : data.value);
    if (!isFinite(n) || n < 0) throw new Error("bad counter value");
    try { sessionStorage.setItem(SEEN, "1"); } catch (e){}
    const el = document.createElement("span");
    el.className = "visitor-count";
    el.textContent = `${n.toLocaleString("en-US")} visits`;
    el.title = "Total visits to this website";
    const first = bar.querySelector("span");
    if (first) first.insertAdjacentElement("afterend", el); else bar.prepend(el);
  } catch (e){ /* offline or blocked: show nothing */ }
}

/* ---------- Design file downloads (JPG only) ---------- */
// Design files are exported as flattened JPGs (white background, no
// transparency). Shared by the Design Studio and the cart's "Download" buttons.

function triggerFileDownload(href, filename){
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Downloads any image data URL as a JPG. Files that are already JPG go straight
// through; older cart items saved as PNG are flattened onto white first.
function downloadDesignAsJpg(dataUrl, filenameBase){
  if (/^data:image\/jpe?g/i.test(dataUrl)){
    triggerFileDownload(dataUrl, `${filenameBase}.jpg`);
    return;
  }
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    triggerFileDownload(canvas.toDataURL("image/jpeg", 0.95), `${filenameBase}.jpg`);
  };
  img.src = dataUrl;
}

function getCart(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_CART)) || []; }
  catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
  updateCartBadge();
}
function cartCount(){
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}
function addToCart(item){
  const cart = getCart();
  // Combine identical variant + product
  const existing = cart.find(c =>
    c.id === item.id && c.color === item.color && c.size === item.size && (c.packaging || null) === (item.packaging || null) && (c.orientation || null) === (item.orientation || null) &&
    JSON.stringify(c.customDesign || null) === JSON.stringify(item.customDesign || null)
  );
  if (existing){ existing.qty += item.qty; }
  else { cart.push(item); }
  saveCart(cart);
}

function getWishlist(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_WISHLIST)) || []; }
  catch(e){ return []; }
}
function toggleWishlist(id){
  let list = getWishlist();
  if (list.includes(id)) list = list.filter(x => x !== id);
  else list.push(id);
  localStorage.setItem(STORAGE_WISHLIST, JSON.stringify(list));
  return list.includes(id);
}

function updateCartBadge(){
  document.querySelectorAll(".js-cart-count").forEach(el => {
    const count = cartCount();
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(message){
  let toast = document.getElementById("toast");
  if (!toast){
    toast = document.createElement("div");
    toast.id = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = '<span class="toast-msg"></span>' +
      '<button type="button" class="toast-close" aria-label="Close message">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
      '</button>';
    document.body.appendChild(toast);
    toast.querySelector(".toast-close").addEventListener("click", () => {
      clearTimeout(toastTimer);
      toast.classList.remove("show");
    });
  }
  toast.querySelector(".toast-msg").textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

/* ---------- Mobile nav ---------- */
function initMobileNav(){
  const btn = document.getElementById("hamburger");
  const nav = document.getElementById("mobile-nav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
  const close = () => {
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  };

  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", close));

  // Rotating a phone or widening the window shouldn't leave the drawer
  // half-open behind the desktop nav.
  let last = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth !== last){
      last = window.innerWidth;
      if (window.innerWidth > 900) close();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && nav.classList.contains("open")){ close(); btn.focus(); }
  });
}

/* ---------- Newsletter ---------- */
function initNewsletter(){
  const form = document.querySelector(".newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input[type=email]");
    const msg = document.querySelector(".form-msg");
    if (input && input.value){
      msg.textContent = "You're subscribed. Watch your inbox for new designs and offers.";
      form.reset();
    } else {
      msg.textContent = "Please enter a valid email address.";
    }
  });
}

/* ---------- Reveal-on-scroll (shared observer, safe to call after any re-render) ---------- */
let revealObserver = null;
function getRevealObserver(){
  if (revealObserver || !("IntersectionObserver" in window)) return revealObserver;
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  return revealObserver;
}
// Call after any innerHTML update that introduces new .reveal elements -
// initial page load AND every dynamic re-render (shop filters/sort/search).
function observeReveal(root){
  const scope = root || document;
  const items = scope.querySelectorAll(".reveal:not(.visible)");
  if (items.length === 0) return;
  const io = getRevealObserver();
  if (!io){
    items.forEach(el => el.classList.add("visible"));
    return;
  }
  items.forEach(el => io.observe(el));
}
function initReveal(){
  observeReveal(document);
}

/* ---------- Product card builder (shared by home + shop) ---------- */
function productCardHTML(p){
  const isWishlisted = getWishlist().includes(p.id);
  const priceHTML = p.oldPrice
    ? `<span class="old">${formatPrice(p.oldPrice)}</span>${formatPrice(p.price)}`
    : (p.variantPrices ? "From " : "") + formatPrice(p.price);
  return `
    <article class="product-card reveal">
      <div class="pc-media">
        <a href="product.html?id=${p.id}" aria-label="View ${p.name}">
          <img src="${p.image}" alt="${p.name}" loading="lazy" width="400" height="400">
        </a>
        <button class="pc-wishlist ${isWishlisted ? "active" : ""}" data-id="${p.id}" aria-label="Add to wishlist" aria-pressed="${isWishlisted}">
          <svg viewBox="0 0 24 24" fill="${isWishlisted ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.6 4.1c2-.2 3.7.8 4.9 2.4C11.7 4.9 13.4 3.9 15.4 4.1 19 4.5 20.6 8 20 11.7 17.5 16.4 12 21 12 21z"/></svg>
        </button>
        <a class="pc-quick" href="product.html?id=${p.id}">Quick View</a>
      </div>
      <div class="pc-body">
        <span class="pc-cat">${p.category}</span>
        <h3 class="pc-name">${p.name}</h3>
        ${p.rating == null ? "" : `<div class="pc-rating"><span class="stars">${starString(p.rating)}</span> ${p.rating} (${p.reviews})</div>`}
        <p class="pc-desc">${p.description}</p>
        <div class="pc-footer">
          <span class="pc-price">${priceHTML}</span>
          ${p.customizable === false
            ? `<a href="product.html?id=${p.id}" class="btn btn-outline btn-sm">View</a>`
            : `<a href="${customizeURL(p.id)}" class="btn btn-outline btn-sm">Customize</a>`}
        </div>
      </div>
    </article>`;
}

function bindWishlistButtons(container){
  container.querySelectorAll(".pc-wishlist").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = Number(btn.dataset.id);
      const active = toggleWishlist(id);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active);
      btn.querySelector("svg").setAttribute("fill", active ? "currentColor" : "none");
      showToast(active ? "Added to wishlist" : "Removed from wishlist");
    });
  });
}

/* Category rail: prev/next arrows + mouse drag-to-scroll (touch already swipes natively) */
function initCategoryRail(rail){
  const prev = document.getElementById("cat-prev");
  const next = document.getElementById("cat-next");
  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const overflow = max > 4;
    if (prev) prev.hidden = !overflow || rail.scrollLeft <= 4;
    if (next) next.hidden = !overflow || rail.scrollLeft >= max - 4;
  };
  const step = () => Math.max(rail.clientWidth * 0.8, 160);
  if (prev) prev.addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
  if (next) next.addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));
  rail.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  rail.querySelectorAll("img").forEach(img => img.addEventListener("load", update));

  // Mouse drag
  let down = false, moved = false, startX = 0, startLeft = 0;
  rail.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    down = true; moved = false; startX = e.pageX; startLeft = rail.scrollLeft;
  });
  window.addEventListener("mousemove", e => {
    if (!down) return;
    const dx = e.pageX - startX;
    if (!moved && Math.abs(dx) > 5){ moved = true; rail.classList.add("is-dragging"); }
    if (moved){ rail.scrollLeft = startLeft - dx; e.preventDefault(); }
  });
  window.addEventListener("mouseup", () => {
    if (!down) return;
    down = false;
    if (moved) setTimeout(() => rail.classList.remove("is-dragging"), 0);
  });
  rail.addEventListener("dragstart", e => e.preventDefault());
  rail.addEventListener("click", e => { if (moved){ e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  update();
}

/* ---------- Homepage: category shortcuts, trending, just for you, testimonials ---------- */
function renderHomepage(){
  // Category shortcuts - small circular icons, one tap to a filtered shop view
  const catCircles = document.getElementById("category-circles");
  if (catCircles){
    catCircles.innerHTML = CATEGORIES.map(c => `
      <a href="shop.html?category=${encodeURIComponent(c.name)}" class="cat-circle" role="listitem">
        <span class="cat-circle-img">
          <img src="${c.image}" alt="" loading="lazy" width="140" height="140">
        </span>
        <span>${c.name}</span>
      </a>`).join("");
    initCategoryRail(catCircles);
  }

  // Trending Now - the top category families, shown with a "searched for"
  // signal (derived from combined product review counts as a stand-in
  // for real search analytics)
  const trendRow = document.getElementById("trending-row");
  if (trendRow){
    const byCategory = CATEGORIES.map(c => {
      const inCat = PRODUCTS.filter(p => p.category === c.name);
      const reviews = inCat.reduce((sum, p) => sum + p.reviews, 0);
      return { ...c, image: inCat[0] ? inCat[0].image : c.image, searched: reviews * 480 };
    }).sort((a, b) => b.searched - a.searched).slice(0, 3);

    trendRow.innerHTML = byCategory.map(c => `
      <a href="shop.html?category=${encodeURIComponent(c.name)}" class="trend-card reveal">
        <div class="trend-media"><img src="${c.image}" alt="${c.name}" loading="lazy" width="400" height="400"></div>
        <h3>${c.name}</h3>
        <p>${formatCount(c.searched)} people searched for this</p>
      </a>`).join("");
  }

  const featured = document.getElementById("featured-grid");
  if (featured){
    featured.innerHTML = PRODUCTS.slice(0, 8).map(productCardHTML).join("");
    bindWishlistButtons(featured);
  }

  const testiGrid = document.getElementById("testimonial-grid");
  if (testiGrid){
    testiGrid.innerHTML = TESTIMONIALS.map(t => `
      <div class="testi-card reveal">
        <div class="testi-stars">${"★".repeat(t.rating)}</div>
        <p>"${t.text}"</p>
        <div class="testi-name">${t.name}</div>
      </div>`).join("");
  }
}

/* ---------- Shop page: filter, search, sort ---------- */
const shopState = { category: null, maxPrice: 5000, sort: "featured", query: "" };
const DEFAULT_MAX_PRICE = 5000;
// Populated by initShopPage; lets renderShop()'s empty-state reset button
// re-sync the filter controls without threading DOM refs between functions.
let shopSyncControls = null;

let shopRenderCategoryBar = null;
function initShopPage(){
  const grid = document.getElementById("shop-grid");
  if (!grid) return;

  const urlCategory = getURLParam("category");
  if (urlCategory) shopState.category = urlCategory;

  const priceRange = document.getElementById("price-range");
  const priceLabel = document.getElementById("price-range-label");
  const searchInput = document.getElementById("shop-search");
  const catWrap = document.getElementById("category-filters");
  // "Gifts" is a catch-all category: it lists every product in the shop.
  const cats = [...new Set(PRODUCTS.map(p => p.category)), "Gifts"];

  function renderCategoryCheckboxes(){
    if (!catWrap) return; // sidebar removed - category pills handle this
    const active = shopState.category
      ? (Array.isArray(shopState.category) ? shopState.category : [shopState.category])
      : [];
    catWrap.innerHTML = cats.map(c => {
      const count = c === "Gifts" ? PRODUCTS.length : PRODUCTS.filter(p => p.category === c).length;
      return `
      <label class="filter-check">
        <input type="checkbox" value="${c}" ${active.includes(c) ? "checked" : ""}>
        <span>${c}</span>
        <span class="filter-check-count">${count}</span>
      </label>`;
    }).join("");
    catWrap.querySelectorAll("input").forEach(cb => {
      cb.addEventListener("change", () => {
        const checked = [...catWrap.querySelectorAll("input:checked")].map(c => c.value);
        shopState.category = checked.length ? checked : null;
        renderShop();
      });
    });
  }
  renderCategoryCheckboxes();

  // Horizontal, swipeable category bar (All + one pill per category).
  const catBar = document.getElementById("cat-bar");
  function renderCategoryBar(){
    if (!catBar) return;
    const keepScroll = catBar.dataset.ready ? catBar.scrollLeft : null; // multi-select: don't jump on re-render
    const active = shopState.category
      ? (Array.isArray(shopState.category) ? shopState.category : [shopState.category])
      : [];
    const items = ["All", ...cats];
    catBar.innerHTML = items.map(c => {
      const isAll = c === "All";
      const on = isAll ? active.length === 0 : active.includes(c);
      return `<button type="button" class="cat-pill${on ? " active" : ""}" data-cat="${isAll ? "" : c}" aria-pressed="${on}">${c}</button>`;
    }).join("");
    catBar.dataset.ready = "1";
    if (keepScroll !== null){ catBar.scrollLeft = keepScroll; return; }
    const on = catBar.querySelector(".cat-pill.active");
    if (on && catBar.scrollWidth > catBar.clientWidth){
      const left = on.offsetLeft - (catBar.clientWidth - on.offsetWidth) / 2;
      catBar.scrollTo({ left: Math.max(0, left) });
    }
  }
  if (catBar){
    catBar.addEventListener("click", (e) => {
      const pill = e.target.closest(".cat-pill");
      if (!pill) return;
      const picked = pill.dataset.cat;
      if (!picked){
        shopState.category = null; // "All" clears the selection
      } else {
        // Toggle: click to add a category, click again to remove it
        const cur = shopState.category
          ? (Array.isArray(shopState.category) ? shopState.category : [shopState.category])
          : [];
        const next = cur.includes(picked) ? cur.filter(c => c !== picked) : [...cur, picked];
        shopState.category = next.length ? next : null;
      }
      renderCategoryBar();
      renderCategoryCheckboxes();
      renderShop();
    });
  }
  shopRenderCategoryBar = renderCategoryBar;
  renderCategoryBar();

  // Left/right arrows for the category slider (shown on small screens via CSS)
  const catPrev = document.getElementById("shop-cat-prev");
  const catNext = document.getElementById("shop-cat-next");
  function updateCatArrows(){
    if (!catBar || !catPrev || !catNext) return;
    const max = catBar.scrollWidth - catBar.clientWidth;
    const overflow = max > 4;
    catPrev.hidden = !overflow || catBar.scrollLeft <= 4;
    catNext.hidden = !overflow || catBar.scrollLeft >= max - 4;
  }
  if (catBar && catPrev && catNext){
    const step = () => Math.max(120, Math.round(catBar.clientWidth * 0.7));
    catPrev.addEventListener("click", () => catBar.scrollBy({ left: -step(), behavior: "smooth" }));
    catNext.addEventListener("click", () => catBar.scrollBy({ left: step(), behavior: "smooth" }));
    catBar.addEventListener("scroll", updateCatArrows, { passive: true });
    window.addEventListener("resize", updateCatArrows);
    // pills are re-rendered on every selection, so refresh after each render too
    const baseRender = shopRenderCategoryBar;
    shopRenderCategoryBar = function(){ baseRender(); updateCatArrows(); };
    window.addEventListener("load", updateCatArrows);
    updateCatArrows();
  }

  // Keep every control in sync with shopState - used after "Clear all"
  // and after removing a single filter chip.
  function syncControls(){
    renderCategoryCheckboxes();
    renderCategoryBar();
    if (priceRange) priceRange.value = shopState.maxPrice;
    if (priceLabel) priceLabel.textContent = formatPrice(shopState.maxPrice);
    if (searchInput) searchInput.value = shopState.query;
  }
  shopSyncControls = syncControls;

  if (priceRange){
    priceRange.addEventListener("input", () => {
      shopState.maxPrice = Number(priceRange.value);
      priceLabel.textContent = formatPrice(shopState.maxPrice);
      renderShop();
    });
  }

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect){
    sortSelect.addEventListener("change", () => {
      shopState.sort = sortSelect.value;
      renderShop();
    });
  }

  if (searchInput){
    searchInput.addEventListener("input", () => {
      shopState.query = searchInput.value.trim().toLowerCase();
      renderShop();
    });
  }

  const clearBtn = document.getElementById("clear-filters");
  if (clearBtn){
    clearBtn.addEventListener("click", () => {
      shopState.category = null;
      shopState.maxPrice = DEFAULT_MAX_PRICE;
      shopState.query = "";
      syncControls();
      renderShop();
    });
  }

  // Active-filter chip removal (event delegation - chips are re-rendered often)
  const activeFiltersWrap = document.getElementById("active-filters");
  if (activeFiltersWrap){
    activeFiltersWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (!btn) return;
      const kind = btn.dataset.remove;
      if (kind === "category"){
        const cats2 = Array.isArray(shopState.category) ? shopState.category : [shopState.category];
        const remaining = cats2.filter(c => c !== btn.dataset.value);
        shopState.category = remaining.length ? remaining : null;
      } else if (kind === "price"){
        shopState.maxPrice = DEFAULT_MAX_PRICE;
      } else if (kind === "query"){
        shopState.query = "";
      } else if (kind === "all"){
        shopState.category = null;
        shopState.maxPrice = DEFAULT_MAX_PRICE;
        shopState.query = "";
      }
      syncControls();
      renderShop();
    });
  }

  // Mobile filter drawer
  const filterToggle = document.getElementById("filter-toggle");
  const filtersPanel = document.getElementById("filters-panel");
  const filtersBackdrop = document.getElementById("filters-backdrop");
  const filtersClose = document.getElementById("filters-close");
  const filtersApply = document.getElementById("filters-apply");
  if (filterToggle && filtersPanel){
    const openFilters = () => {
      filtersPanel.classList.add("open");
      filtersBackdrop.classList.add("show");
      filterToggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    const closeFilters = () => {
      filtersPanel.classList.remove("open");
      filtersBackdrop.classList.remove("show");
      filterToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    filterToggle.addEventListener("click", openFilters);
    filtersClose.addEventListener("click", closeFilters);
    filtersBackdrop.addEventListener("click", closeFilters);
    filtersApply.addEventListener("click", closeFilters);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && filtersPanel.classList.contains("open")) closeFilters();
    });
    let lastWidth = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth !== lastWidth){
        lastWidth = window.innerWidth;
        if (window.innerWidth > 900) closeFilters();
      }
    });
  }

  renderShop();
}

function getURLParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function renderActiveFilters(){
  const wrap = document.getElementById("active-filters");
  const toggleCount = document.getElementById("filter-toggle-count");
  if (!wrap) return;

  const chips = [];
  if (shopState.category){
    const cats = Array.isArray(shopState.category) ? shopState.category : [shopState.category];
    cats.forEach(c => chips.push({ label: c, kind: "category", value: c }));
  }
  if (shopState.maxPrice && shopState.maxPrice < DEFAULT_MAX_PRICE){
    chips.push({ label: `Under ${formatPrice(shopState.maxPrice)}`, kind: "price" });
  }
  if (shopState.query){
    chips.push({ label: `"${shopState.query}"`, kind: "query" });
  }

  if (chips.length === 0){
    wrap.hidden = true;
    wrap.innerHTML = "";
  } else {
    wrap.hidden = false;
    wrap.innerHTML = chips.map(c => `
      <span class="filter-chip">
        ${c.label}
        <button type="button" data-remove="${c.kind}" ${c.value ? `data-value="${c.value}"` : ""} aria-label="Remove filter">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </span>`).join("") + `<button type="button" class="filter-chip-clear-all" data-remove="all">Clear all</button>`;
  }

  if (toggleCount){
    if (chips.length > 0){
      toggleCount.hidden = false;
      toggleCount.textContent = chips.length;
    } else {
      toggleCount.hidden = true;
    }
  }
}

function renderShop(){
  if (typeof shopRenderCategoryBar === "function") shopRenderCategoryBar();
  const grid = document.getElementById("shop-grid");
  const countEl = document.getElementById("result-count");
  let list = PRODUCTS.slice();

  if (shopState.category){
    const cats = Array.isArray(shopState.category) ? shopState.category : [shopState.category];
    if (!cats.includes("Gifts")) list = list.filter(p => cats.includes(p.category));
  }
  if (shopState.maxPrice){
    list = list.filter(p => p.price <= shopState.maxPrice);
  }
  if (shopState.query){
    const q = shopState.query;
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  switch (shopState.sort){
    case "price-asc": list.sort((a,b) => a.price - b.price); break;
    case "price-desc": list.sort((a,b) => b.price - a.price); break;
    case "rating": list.sort((a,b) => (b.rating || 0) - (a.rating || 0)); break;
    default: break;
  }

  renderActiveFilters();

  countEl.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
  if (list.length === 0){
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>No products match your filters yet.</p>
        <button type="button" class="btn btn-outline btn-sm" id="empty-reset">Clear all filters</button>
      </div>`;
    const resetBtn = document.getElementById("empty-reset");
    if (resetBtn){
      resetBtn.addEventListener("click", () => {
        shopState.category = null;
        shopState.maxPrice = DEFAULT_MAX_PRICE;
        shopState.query = "";
        if (shopSyncControls) shopSyncControls();
        renderShop();
      });
    }
    return;
  }
  grid.innerHTML = list.map(productCardHTML).join("");
  bindWishlistButtons(grid);
  observeReveal(grid);
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  initMobileNav();
  initNewsletter();
  renderHomepage();
  initShopPage();
  initReveal();
  initWhatsAppFloat();
  initVisitorCounter();
});
