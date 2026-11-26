/* =========================================================
   GfxPrints - Design Gallery (design-gallery.html)
   Browse ready-made designs, then pick a compatible product and open
   the Design Studio with that design already on it:
     customize.html?id=<product id>&template=<design id>
   Designs come from js/templates.js (window.GfxTemplates), the same list
   the Design Studio's Templates tab uses, so there is only one copy.
   A design is never sold on its own: the customer always ends up in the
   Design Studio with a printed product.
   ========================================================= */
(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);
  if (!$("dg-grid")) return;

  const state = { q: "", cat: "All", product: "All" };
  let G = null, lastFocus = null;

  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* ---- Filtering ---- */
  function matches(t){
    if (state.product !== "All" && !G.compatible(t, state.product)) return false;
    if (state.cat !== "All" && t.cat !== state.cat) return false;
    const q = state.q.trim().toLowerCase();
    return !q || (t.name + " " + t.cat + " " + t.tags + " " + t.desc + " " + t.products.join(" ")).toLowerCase().includes(q);
  }
  const filtersActive = () => state.q.trim() !== "" || state.cat !== "All" || state.product !== "All";

  /* ---- Cards ---- */
  function card(t){
    return `<article class="dg-card">
      <button type="button" class="dg-thumb" data-id="${esc(t.id)}" aria-label="Customize the ${esc(t.name)} design">${G.previewSVG(t, false)}</button>
      <div class="dg-body">
        <h3 class="dg-name">${esc(t.name)}</h3>
        <p class="dg-cat">${esc(t.cat)}</p>
        <p class="dg-prods"><span class="dg-prods-label">Works on:</span> ${t.products.map(esc).join(", ")}</p>
        <button type="button" class="btn btn-primary btn-sm btn-block dg-go" data-id="${esc(t.id)}">Customize Design</button>
      </div>
    </article>`;
  }
  const grid = (list) => list.map(card).join("");

  function render(){
    const list = G.TEMPLATES.filter(matches);
    const active = filtersActive();
    const sections = $("dg-sections");

    // Featured / Popular / Latest rows only when nothing is filtered, so results stay easy to read
    if (active){
      sections.innerHTML = "";
    } else {
      const featured = G.TEMPLATES.filter(t => t.featured).slice(0, 8);
      const popular = G.TEMPLATES.filter(t => t.popular).slice(0, 8);
      const latest = G.TEMPLATES.slice().sort((a, b) => b.added.localeCompare(a.added) || a.name.localeCompare(b.name)).slice(0, 8);
      const row = (id, title, items) => items.length ? `<section class="dg-section" aria-labelledby="${id}"><h2 class="dg-h2" id="${id}">${title}</h2><div class="dg-grid">${grid(items)}</div></section>` : "";
      sections.innerHTML = row("dg-featured", "Featured designs", featured) + row("dg-popular", "Popular designs", popular) + row("dg-latest", "Latest designs", latest);
    }
    $("dg-results-title").textContent = active ? "Results" : "All designs";
    $("dg-grid").innerHTML = grid(list);
    $("dg-empty").hidden = list.length > 0;
    $("dg-count").textContent = active ? `${list.length} design${list.length === 1 ? "" : "s"} found` : `${G.TEMPLATES.length} designs`;
  }

  /* ---- Product picker (a design can only be opened on a product it suits) ---- */
  function compatibleProducts(t){
    const all = (typeof getCustomizableProducts === "function") ? getCustomizableProducts() : [];
    return all.filter(p => G.compatible(t, p.category));
  }

  function closeDialog(){
    const d = $("dg-dlg"); if (d) d.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e){
    if (e.key === "Escape"){ closeDialog(); return; }
    if (e.key !== "Tab") return;
    const d = $("dg-dlg"); if (!d) return;
    const f = d.querySelectorAll("button, a[href]");
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  function openPicker(t, trigger){
    lastFocus = trigger || null;
    const old = $("dg-dlg"); if (old) old.remove();
    const prods = compatibleProducts(t);
    // If a product filter is on, that product group comes first
    prods.sort((a, b) => (b.category === state.product) - (a.category === state.product));
    const d = document.createElement("div");
    d.id = "dg-dlg"; d.className = "copy-dlg dg-dlg";
    const list = prods.length
      ? prods.map(p => `<a class="dg-prod" href="customize.html?id=${encodeURIComponent(p.id)}&amp;template=${encodeURIComponent(t.id)}">
          <img src="${esc(gfxThumb(p.image))}" alt="" width="64" height="64" loading="lazy" decoding="async">
          <span class="dg-prod-name">${esc(p.name)}<small>${esc(p.category)}</small></span>
          <span class="dg-prod-go" aria-hidden="true">Choose</span></a>`).join("")
      : `<p class="dg-prod-none">There is no product available for this design right now. <a href="shop.html">Browse the shop</a>.</p>`;
    d.innerHTML = `<div class="copy-card dg-card-dlg" role="dialog" aria-modal="true" aria-labelledby="dg-dlg-title">
        <div class="dg-dlg-preview">${G.previewSVG(t, false)}</div>
        <h3 id="dg-dlg-title">${esc(t.name)}</h3>
        <p class="dg-dlg-sub">Choose a product to print it on. You can edit the design in the Design Studio.</p>
        <div class="dg-prod-list">${list}</div>
        <button type="button" class="copy-cancel" data-close="1">Cancel</button>
      </div>`;
    document.body.appendChild(d);
    document.body.style.overflow = "hidden";
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) closeDialog(); });
    document.addEventListener("keydown", onKey);
    const first = d.querySelector(".dg-prod") || d.querySelector("button"); if (first) first.focus();
  }

  /* ---- Controls ---- */
  function buildControls(){
    $("dg-cats").innerHTML = G.CATS.map(c => `<button type="button" class="clip-chip${c === state.cat ? " active" : ""}" data-cat="${esc(c)}" aria-pressed="${c === state.cat}">${esc(c)}</button>`).join("");
    $("dg-product").innerHTML = '<option value="All">All products</option>' + G.PRODUCT_GROUPS.map(p => `<option value="${esc(p)}"${p === state.product ? " selected" : ""}>${esc(p)}</option>`).join("");
  }
  function syncChips(){
    document.querySelectorAll("#dg-cats .clip-chip").forEach(b => {
      const on = b.dataset.cat === state.cat;
      b.classList.toggle("active", on); b.setAttribute("aria-pressed", on);
    });
  }

  function init(){
    G = window.GfxTemplates;
    if (!G || !G.TEMPLATES){
      $("dg-count").textContent = "Designs could not be loaded. Please refresh the page.";
      return;
    }
    // Links such as design-gallery.html?category=Eid or ?product=Mugs
    try {
      const sp = new URLSearchParams(window.location.search);
      if (G.CATS.indexOf(sp.get("category")) > 0) state.cat = sp.get("category");
      if (G.PRODUCT_GROUPS.indexOf(sp.get("product")) !== -1) state.product = sp.get("product");
      if (sp.get("q")) state.q = sp.get("q").slice(0, 60);
    } catch (e){ /* ignore */ }
    buildControls();
    $("dg-search").value = state.q;
    render();

    $("dg-search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    $("dg-product").addEventListener("change", (e) => { state.product = e.target.value; render(); });
    $("dg-cats").addEventListener("click", (e) => {
      const b = e.target.closest(".clip-chip"); if (!b) return;
      state.cat = b.dataset.cat; syncChips(); render();
    });
    $("dg-clear").addEventListener("click", () => {
      state.q = ""; state.cat = "All"; state.product = "All";
      $("dg-search").value = ""; $("dg-product").value = "All"; syncChips(); render();
    });
    $("main").addEventListener("click", (e) => {
      const b = e.target.closest(".dg-thumb, .dg-go"); if (!b) return;
      const t = G.byId(b.dataset.id); if (t) openPicker(t, b);
    });
  }

  // clipart.js, templates.js and products.js are all deferred, so they are ready by DOMContentLoaded
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
