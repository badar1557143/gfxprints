/* =========================================================
   GfxPrints - Customization page (customize.html)
   Opens with the product from ?id=<n> already selected, lets the
   customer switch product without losing their design, and hosts
   the live Design Studio (Fabric.js) + cart handoff.
   ========================================================= */

let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let selectedPackaging = null;
let selectedOrientation = null;

/* ---- Design Studio state ---- */
let designCanvas = null;
let selectedObject = null;
let settingProps = false;      // guard: true while JS is programmatically filling the props panel
let isRestoringHistory = false;

/* ---- Print Sides state ----
   Each product exposes one or more "sides" (see getEffectiveSides in products.js).
   Every side keeps its own undo/redo history and its own "has the customer put a
   design on it yet" flag, so switching sides never loses work and the order total
   only counts a side once something has actually been placed on it. */
let currentSides = [];     // effective sides list for currentProduct
let activeSideId = null;   // id of the side currently loaded into designCanvas
let sidesState = {};       // side id -> { history: [json,...], historyIndex, hasContent }

/* ---- "Both Sides" quick option ----
   Shown only for products with a Front + Back pair. Purely a convenience: it walks
   the customer front -> back so they don't miss that Back is also customizable.
   Doesn't change pricing - each side's own price still only applies once it has
   a design, same as clicking the two side cards individually. */
let bothSidesRequested = false;   // customer tapped the "Both Sides" banner for this product
let bothSidesAutoSwitched = false; // guards the one-time auto-hop from Front to Back

function initCustomizePage(){
  const stage = document.getElementById("studio-stage");
  if (!stage) return;

  const choices = getCustomizableProducts();
  if (!choices.length) return;

  // Pre-select the product from the link (?id=). Unknown / non-customizable ids fall back to the first product.
  const requested = getProductById(getURLParam("id"));
  const start = requested && requested.customizable !== false ? requested : choices[0];

  renderProductPicker(choices);
  initPickerArrows();
  bindOptionControls();
  selectProduct(start, { initial: true });
  initDesignStudio();
  renderUploadLibrary();

  document.getElementById("add-to-cart-btn").addEventListener("click", () => handleAddToCart(false));
  document.getElementById("buy-now-btn").addEventListener("click", () => handleAddToCart(true));
  const downloadBtn = document.getElementById("download-design-btn");
  if (downloadBtn){
    initDownloadButton(downloadBtn, downloadBtn.parentElement);
  }
}

// Lets the customer save their design as a JPG print file so they can attach it
// in the WhatsApp chat (a wa.me link can only pre-fill text, not attach files).
// JPG only, artwork only, 4x resolution, flattened onto white. Products with more
// than one print side get a small "choose side" menu; single-side products
// download straight away.
function initDownloadButton(btn, wrap){
  let menu = wrap.querySelector(".download-menu");
  if (!menu){
    menu = document.createElement("div");
    menu.className = "download-menu";
    wrap.appendChild(menu);
  }
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!anySideHasContent()){
      showToast("Add some text or an image to your design first");
      return;
    }
    if (currentSides.length < 2){
      handleDownloadDesign(null);
      return;
    }
    renderDownloadMenu(menu);
    menu.classList.toggle("open");
  });
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    const item = e.target.closest("button[data-side]");
    if (!item || item.disabled) return;
    menu.classList.remove("open");
    handleDownloadDesign(item.dataset.side);
  });
  document.addEventListener("click", () => menu.classList.remove("open"));
}

function renderDownloadMenu(menu){
  const withDesign = currentSides.filter(s => sidesState[s.id] && sidesState[s.id].hasContent);
  let html = '<div class="download-menu-title">Download JPG - choose side</div>';
  html += currentSides.map(s => {
    const has = !!(sidesState[s.id] && sidesState[s.id].hasContent);
    return `<button type="button" data-side="${s.id}"${has ? "" : " disabled"}>${s.label}<small>${has ? "JPG of this side" : "No design on this side yet"}</small></button>`;
  }).join("");
  if (withDesign.length > 1){
    html += '<button type="button" data-side="all">All sides<small>One JPG per side</small></button>';
  }
  menu.innerHTML = html;
}

// Flattens a fabric canvas onto white and returns a high-res JPG data URL.
function canvasToJpg(canvas){
  const prev = canvas.backgroundColor;
  canvas.backgroundColor = "#ffffff";
  try {
    return canvas.toDataURL({ format: "jpeg", quality: 0.95, multiplier: 4 });
  } finally {
    canvas.backgroundColor = prev;
    if (canvas.renderAll) canvas.renderAll();
  }
}

// JPG data URL for one print side. The side on screen is exported live; any
// other side is rendered from its saved state on an off-screen canvas.
function exportSideJpg(sideId, callback){
  if (currentSides.length < 2 || sideId === activeSideId){
    callback(canvasToJpg(designCanvas));
    return;
  }
  const st = sidesState[sideId];
  if (!st || !st.hasContent || !st.history.length){ callback(null); return; }
  const temp = new fabric.StaticCanvas(null, { width: designCanvas.getWidth(), height: designCanvas.getHeight() });
  temp.loadFromJSON(st.history[st.historyIndex], () => {
    temp.renderAll();
    const url = canvasToJpg(temp);
    temp.dispose();
    callback(url);
  });
}

// sideId: a side id, "all" (every side that has a design), or null (single-side product).
function handleDownloadDesign(sideId){
  if (!anySideHasContent()){
    showToast("Add some text or an image to your design first");
    return;
  }
  const multi = currentSides.length > 1;
  const ids = sideId === "all"
    ? currentSides.filter(s => sidesState[s.id] && sidesState[s.id].hasContent).map(s => s.id)
    : [multi ? sideId : (currentSides[0] && currentSides[0].id)];
  const productSlug = (currentProduct && currentProduct.name || "gfxprints-design").replace(/\s+/g, "-").toLowerCase();

  ids.forEach((id, i) => {
    exportSideJpg(id, (dataUrl) => {
      if (!dataUrl) return;
      const side = currentSides.find(s => s.id === id);
      const sidePart = multi && side ? `-${side.label.replace(/\s+/g, "-").toLowerCase()}` : "";
      // Staggered so browsers don't block several downloads fired at once.
      setTimeout(() => triggerFileDownload(dataUrl, `${productSlug}${sidePart}-design.jpg`), i * 400);
    });
  });
  const label = multi ? (sideId === "all" ? "All sides" : ((currentSides.find(s => s.id === sideId) || {}).label || "Design")) : "Design";
  showToast(`${label} downloaded as JPG. Attach it to your WhatsApp order`);
}

/* ---------- Product picker ---------- */

function renderProductPicker(choices){
  const wrap = document.getElementById("cz-picker");
  if (!wrap) return;
  wrap.innerHTML = choices.map(p => `
    <button type="button" class="cz-chip" data-id="${p.id}" aria-pressed="false">
      <img src="${p.image}" alt="" width="56" height="56" loading="lazy">
      <span class="cz-chip-text">
        <span class="cz-chip-name">${p.name}</span>
        <span class="cz-chip-price">${formatPrice(p.price)}</span>
      </span>
    </button>`).join("");

  wrap.querySelectorAll(".cz-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const next = getProductById(chip.dataset.id);
      if (!next || next === currentProduct) return;
      const hadDesign = !!(designCanvas && designCanvas.getObjects().length);
      selectProduct(next);
      showToast(hadDesign ? `Switched to ${next.name}. Your design was kept` : `Now customizing ${next.name}`);
    });
  });
}

function initPickerArrows(){
  const wrap = document.getElementById("cz-picker");
  const prev = document.getElementById("cz-prev");
  const next = document.getElementById("cz-next");
  if (!wrap || !prev || !next) return;

  const update = () => {
    prev.hidden = wrap.scrollLeft <= 2;
    next.hidden = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2;
  };
  prev.addEventListener("click", () => wrap.scrollBy({ left: -wrap.clientWidth * 0.8, behavior: "smooth" }));
  next.addEventListener("click", () => wrap.scrollBy({ left: wrap.clientWidth * 0.8, behavior: "smooth" }));
  wrap.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

function highlightPickerChip(id, instant){
  const wrap = document.getElementById("cz-picker");
  if (!wrap) return;
  let selectedChip = null;
  wrap.querySelectorAll(".cz-chip").forEach(chip => {
    const on = Number(chip.dataset.id) === id;
    chip.classList.toggle("selected", on);
    chip.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) selectedChip = chip;
  });
  if (selectedChip){
    // Centre the chosen product in the strip (handles a product far along the row).
    const left = selectedChip.offsetLeft - (wrap.clientWidth - selectedChip.offsetWidth) / 2;
    wrap.scrollTo({ left: Math.max(0, left), behavior: instant ? "auto" : "smooth" });
  }
}

/* ---------- Selected product: options, preview, price ---------- */

function selectProduct(p, opts){
  const initial = !!(opts && opts.initial);
  // Switching products keeps whatever is on the side currently being edited (existing
  // behaviour), so we carry that one side's design over before rebuilding sidesState
  // for the new product.
  let carryJson = (!initial && designCanvas && designCanvas.getObjects().length)
    ? JSON.stringify(designCanvas.toJSON())
    : null;

  currentProduct = p;
  selectedColor = p.colors[0];
  selectedSize = firstOrderableSize(p, selectedColor) || p.sizes[0];
  selectedOrientation = p.orientations ? p.orientations[0] : null;
  const firstPackagings = getPackagingsFor(p, selectedSize);
  selectedPackaging = firstPackagings ? firstPackagings[0] : null;

  document.title = `Customize ${p.name} | GfxPrints`;
  document.getElementById("breadcrumb-name").textContent = `Customize ${p.name}`;
  document.getElementById("cz-selected-name").textContent = p.name;

  // Framed poster: fit the stage + canvas to the frame for the chosen size/orientation. This
  // rescales whatever is on the canvas, so re-read the carried-over design afterwards.
  applyFrameLayout();
  if (carryJson && designCanvas) carryJson = JSON.stringify(designCanvas.toJSON());

  // Preview stage background (per-color photo when the product has them)
  updatePreviewImage();
  if (p.colorImages){
    // Warm the cache so swapping colors/sides doesn't flash
    p.colors.forEach(c => {
      const img = new Image(); img.src = getColorImage(p, c);
      if (p.frontColorImages && p.frontColorImages[c]){ const fi = new Image(); fi.src = p.frontColorImages[c]; }
      if (p.backColorImages && p.backColorImages[c]){ const bi = new Image(); bi.src = p.backColorImages[c]; }
    });
  }

  // Product summary card
  document.getElementById("cz-thumb").alt = p.name;
  document.getElementById("cz-cat").textContent = p.category;
  document.getElementById("cz-name").textContent = p.name;
  updateBasePriceLabel();
  const oldEl = document.getElementById("cz-old-price");
  if (p.oldPrice){
    oldEl.textContent = formatPrice(p.oldPrice);
    oldEl.style.display = "inline";
  } else {
    oldEl.style.display = "none";
  }
  document.getElementById("cz-details-link").href = `product.html?id=${p.id}`;

  // Colors
  const colorWrap = document.getElementById("pd-colors");
  colorWrap.innerHTML = p.colors.map((c, i) => colorSwatchHTML(p, c, i === 0)).join("");
  colorWrap.querySelectorAll(".swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      colorWrap.querySelectorAll(".swatch").forEach(s => { s.classList.remove("selected"); s.setAttribute("aria-pressed", "false"); });
      sw.classList.add("selected");
      sw.setAttribute("aria-pressed", "true");
      selectedColor = sw.dataset.color;
      // Move to a size that exists in this colour (e.g. Black has no M or L yet)
      if (!isSizeOrderable(p, selectedColor, selectedSize)){
        selectedSize = firstOrderableSize(p, selectedColor) || selectedSize;
      }
      renderSizes();
      renderPackaging();
      updateBasePriceLabel();
      updateTotal();
      updatePreviewImage();
      applySideView(currentSides.find(s => s.id === activeSideId));
      updateSidesPanelUI();
    });
  });

  const colorLabel = document.getElementById("pd-color-label");
  if (colorLabel) colorLabel.textContent = p.colorLabel || "Color";

  // Sizes
  renderSizes();

  // Orientation (only products with orientations, e.g. the framed poster)
  const orientBlock = document.getElementById("pd-orientation-block");
  if (orientBlock){
    orientBlock.style.display = p.orientations ? "" : "none";
    const orientWrap = document.getElementById("pd-orientation");
    orientWrap.innerHTML = (p.orientations || []).map((o, i) => `
      <button type="button" class="pill ${i === 0 ? "selected" : ""}" data-orientation="${o}">${o}</button>`).join("");
    orientWrap.querySelectorAll(".pill").forEach(pill => {
      pill.addEventListener("click", () => {
        orientWrap.querySelectorAll(".pill").forEach(pl => pl.classList.remove("selected"));
        pill.classList.add("selected");
        selectedOrientation = pill.dataset.orientation;
        applyFrameLayout(); // framed poster: frame flips portrait <-> landscape
      });
    });
  }

  // Packaging (only products with packagings, e.g. mugs)
  renderPackaging();

  setupSidesForProduct(p, carryJson);
  highlightPickerChip(p.id, initial);

  // Keep the address bar in sync so the page can be refreshed / shared with this product selected.
  try {
    window.history.replaceState(null, "", customizeURL(p.id));
  } catch (e){ /* file:// or sandboxed previews may refuse - harmless */ }
}

/* ---------- Framed poster: wooden frame that follows size + orientation ---------- */

const FRAME_CANVAS_LONG_SIDE = 560; // internal canvas px along the print's long side (matches the old 420x560)

// Shows the frame overlay for the current size/orientation (or removes it for other products),
// gives the stage the frame's exact proportions and resizes the design canvas to the print's
// proportions - so the artwork always fills the opening and exports at the real print ratio.
function applyFrameLayout(){
  const stage = document.getElementById("studio-stage");
  const overlay = document.getElementById("frame-overlay");
  if (!stage || !currentProduct) return;
  const layout = getFrameLayout(currentProduct, selectedSize, selectedOrientation);
  let cw = 420, ch = 560;

  if (layout){
    const k = FRAME_CANVAS_LONG_SIDE / Math.max(layout.print[0], layout.print[1]);
    cw = Math.round(layout.print[0] * k);
    ch = Math.round(layout.print[1] * k);
    stage.classList.add("has-frame");
    stage.classList.toggle("frame-landscape", layout.w > layout.h);
    // Fixed on-screen long side, so the frame border is the same thickness for every size and
    // orientation; only the overall frame size changes.
    const longPx = Math.round(Math.min(460, window.innerHeight * 0.62));
    const wPx = layout.w >= layout.h ? longPx : Math.round(longPx * layout.w / layout.h);
    stage.style.width = wPx + "px";
    stage.style.maxWidth = "none";
    stage.style.setProperty("--fr-w", layout.w);
    stage.style.setProperty("--fr-h", layout.h);
    stage.style.setProperty("--fr-t", layout.inset[0] + "%");
    stage.style.setProperty("--fr-r", layout.inset[1] + "%");
    stage.style.setProperty("--fr-b", layout.inset[2] + "%");
    stage.style.setProperty("--fr-l", layout.inset[3] + "%");
    if (overlay){
      if (!overlay.src.endsWith(layout.file)) overlay.src = layout.file;
      overlay.hidden = false;
    }
  } else {
    stage.classList.remove("has-frame", "frame-landscape");
    stage.style.width = "";
    stage.style.maxWidth = "";
    ["--fr-w", "--fr-h", "--fr-t", "--fr-r", "--fr-b", "--fr-l"].forEach(v => stage.style.removeProperty(v));
    if (overlay) overlay.hidden = true;
  }

  resizeDesignCanvas(cw, ch);
  updateStudioHint();
}

// Resizes the fabric canvas and moves/scales every layer with it, so a design made in
// Portrait is carried over (fitted inside the new shape) when the customer picks Landscape.
function resizeDesignCanvas(cw, ch){
  if (!designCanvas){
    const el = document.getElementById("design-canvas");
    if (el){ el.width = cw; el.height = ch; }
    return;
  }
  const oldW = designCanvas.getWidth(), oldH = designCanvas.getHeight();
  if (oldW === cw && oldH === ch) return;

  const sx = cw / oldW, sy = ch / oldH, s = Math.min(sx, sy);
  designCanvas.discardActiveObject();
  designCanvas.getObjects().forEach(obj => {
    const c = obj.getCenterPoint();
    obj.scaleX = (obj.scaleX || 1) * s;
    obj.scaleY = (obj.scaleY || 1) * s;
    obj.setPositionByOrigin(new fabric.Point(c.x * sx, c.y * sy), "center", "center");
    obj.setCoords();
  });
  designCanvas.setDimensions({ width: cw, height: ch });
  designCanvas.calcOffset();
  designCanvas.requestRenderAll();

  // Undo snapshots taken at the old proportions would restore layers in the wrong place,
  // so restart the history from the re-fitted design.
  const st = sidesState && sidesState[activeSideId];
  if (st && st.history.length){
    st.history = [JSON.stringify(designCanvas.toJSON())];
    st.historyIndex = 0;
    updateUndoRedoButtons();
  }
  if (typeof onDesignSelectionCleared === "function") onDesignSelectionCleared();
}

function updatePreviewImage(){
  const previewBase = document.getElementById("preview-base");
  const frontImg = getStageImage(currentProduct, selectedColor, "front");
  previewBase.src = frontImg;
  previewBase.alt = `${currentProduct.name} in ${selectedColor}`;
  document.getElementById("cz-thumb").src = frontImg;
  // Lighter print-guide line so it stays visible over dark garments
  const stage = document.getElementById("studio-stage");
  if (stage) stage.classList.toggle("stage-dark", !!(currentProduct.colorImages && isDarkSurface(currentProduct, selectedColor)));
}

/* =========================================================
   PRINT SIDES - right-hand panel + per-side canvas state
   ========================================================= */

// Swaps the stage between a garment photo (front/back) and a plain "flat" mock
// backdrop for sides with no garment photo yet (inside tag, packaging), and moves
// the dashed print guide to that side's own printable area.
function applySideView(sideDef){
  const stage = document.getElementById("studio-stage");
  const guide = document.querySelector(".print-guide");
  if (!stage || !sideDef) return;

  const isFlat = sideDef.view === "flat";
  stage.classList.toggle("side-flat", isFlat);
  stage.classList.remove("tone-tag", "tone-packaging");
  if (isFlat) stage.classList.add("tone-" + (sideDef.flatTone || "tag"));

  // Garment sides show that side's own mockup photo (front vs. back), when the
  // product has one - see frontColorImages/backColorImages in products.js.
  if (!isFlat && currentProduct){
    const previewBase = document.getElementById("preview-base");
    if (previewBase){
      previewBase.src = getStageImage(currentProduct, selectedColor, sideDef.id);
      const suffix = sideDef.id !== "default" ? ` (${sideDef.label})` : "";
      previewBase.alt = `${currentProduct.name}${suffix} in ${selectedColor}`;
    }
  }

  if (guide) guide.style.inset = sideDef.printArea || "";

  let label = stage.querySelector(".flat-label");
  if (isFlat){
    if (!label){
      label = document.createElement("div");
      label.className = "flat-label";
      stage.appendChild(label);
    }
    label.textContent = sideDef.label;
  } else if (label){
    label.remove();
  }
}

function updateStudioHint(){
  const hint = document.getElementById("studio-hint-text");
  if (!hint) return;
  const sideDef = currentSides.find(s => s.id === activeSideId);
  const frameLayout = currentProduct && getFrameLayout(currentProduct, selectedSize, selectedOrientation);
  if (frameLayout){
    hint.textContent = `Your ${frameLayout.print[0]} × ${frameLayout.print[1]} cm print fills the area inside the frame. Drag a layer to move it; drag the round corner handles to resize, the blue handle on top to rotate, and use the buttons underneath to duplicate or delete.`;
  } else if (sideDef && sideDef.id !== "default"){
    const dims = sideDef.dims ? ` (${sideDef.dims})` : "";
    hint.textContent = `Dashed line marks the ${sideDef.label.toLowerCase()} print area${dims}. Drag a layer to move it; drag the round corner handles to resize, the blue handle on top to rotate, and use the buttons underneath to duplicate or delete.`;
  } else {
    hint.textContent = "Dashed line marks the printable area. Drag a layer to move it; drag the round corner handles to resize, the blue handle on top to rotate, and use the buttons underneath to duplicate or delete.";
  }
}

function sideCardHTML(s){
  const st = sidesState[s.id] || { hasContent: false };
  const active = s.id === activeSideId;
  const isFlat = s.view === "flat";
  const thumb = isFlat
    ? `<span class="side-thumb flat tone-${s.flatTone || "tag"}" aria-hidden="true"></span>`
    : `<span class="side-thumb"><img src="${getStageImage(currentProduct, selectedColor, s.id)}" alt="" loading="lazy"></span>`;
  const priceLabel = !s.price ? "Included" : (st.hasContent ? "Added" : `+${formatPrice(s.price)}`);
  return `
    <button type="button" class="side-card${active ? " active" : ""}${st.hasContent ? " added" : ""}" data-side="${s.id}" aria-pressed="${active}">
      ${thumb}
      <span class="side-info">
        <span class="side-top-row">
          <span class="side-name">${escapeHtml(s.label)}</span>
          <span class="side-price">${priceLabel}</span>
        </span>
        ${s.sublabel ? `<span class="side-sub">${escapeHtml(s.sublabel)}</span>` : ""}
        ${s.dims ? `<span class="side-dims">${escapeHtml(s.dims)}</span>` : ""}
      </span>
    </button>`;
}

// True for products offering exactly the Front + Back pair - the only shape the
// "Both Sides" quick option supports.
function hasFrontAndBack(){
  return currentSides.length === 2 && currentSides.some(s => s.id === "front") && currentSides.some(s => s.id === "back");
}

function bothSidesBannerHTML(){
  if (!hasFrontAndBack()) return "";
  const front = currentSides.find(s => s.id === "front");
  const back = currentSides.find(s => s.id === "back");
  const frontDone = !!(sidesState.front && sidesState.front.hasContent);
  const backDone = !!(sidesState.back && sidesState.back.hasContent);
  const bothDone = frontDone && backDone;
  const combined = (front.price || 0) + (back.price || 0);
  const priceLabel = bothDone ? "Added" : `+${formatPrice(combined)}`;
  return `
    <button type="button" class="side-card both-sides-card${bothDone ? " added" : ""}${bothSidesRequested ? " requested" : ""}" id="both-sides-card" aria-pressed="${bothSidesRequested}">
      <span class="side-thumb both-sides-thumb" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4 4 7v3h3v10h10V10h3V7l-4-3h-2a2 2 0 0 1-4 0z"/></svg>
      </span>
      <span class="side-info">
        <span class="side-top-row">
          <span class="side-name">Both Sides</span>
          <span class="side-price">${priceLabel}</span>
        </span>
        <span class="side-sub">${bothDone ? "Front and back are set" : "Print your design on Front and Back"}</span>
      </span>
    </button>`;
}

// Only shown for products that define a `sides` array (see products.js) - everything
// else keeps the plain single-canvas Design Studio it always had.
function renderSidesPanel(){
  const panel = document.getElementById("sides-panel");
  const list = document.getElementById("sides-list");
  if (!panel || !list) return;

  const show = !!(currentProduct && currentProduct.sides && currentProduct.sides.length);
  panel.hidden = !show;
  if (!show){ list.innerHTML = ""; return; }

  list.innerHTML = bothSidesBannerHTML() + currentSides.map(sideCardHTML).join("");
  list.querySelectorAll(".side-card:not(.both-sides-card)").forEach(card => {
    card.addEventListener("click", () => switchSide(card.dataset.side));
  });
  const bothBtn = document.getElementById("both-sides-card");
  if (bothBtn) bothBtn.addEventListener("click", activateBothSides);
}

// "Both Sides" click handler: walks the customer Front -> Back instead of making
// them notice and click the Back card themselves. No pricing changes - each side
// still only adds its price once it actually has a design on it.
function activateBothSides(){
  if (!hasFrontAndBack()) return;
  bothSidesRequested = true;
  const frontDone = sidesState.front && sidesState.front.hasContent;
  const backDone = sidesState.back && sidesState.back.hasContent;

  if (frontDone && backDone){
    showToast("Both sides are already set!");
  } else if (!frontDone){
    if (activeSideId !== "front") switchSide("front");
    showToast("Add your design to the Front. We'll take you to the Back next");
  } else {
    bothSidesAutoSwitched = true;
    if (activeSideId !== "back") switchSide("back");
    showToast("Now add your design to the Back");
  }
  updateSidesPanelUI();
}

// Lightweight refresh (active state, added/price labels, thumb color) that doesn't
// rebuild the DOM - keeps scroll position and avoids re-attaching listeners.
function updateSidesPanelUI(){
  const list = document.getElementById("sides-list");
  if (!list) return;
  list.querySelectorAll(".side-card:not(.both-sides-card)").forEach(card => {
    const id = card.dataset.side;
    const s = currentSides.find(x => x.id === id);
    const st = sidesState[id];
    if (!s || !st) return;
    card.classList.toggle("active", id === activeSideId);
    card.classList.toggle("added", st.hasContent);
    card.setAttribute("aria-pressed", id === activeSideId ? "true" : "false");
    const priceEl = card.querySelector(".side-price");
    if (priceEl) priceEl.textContent = !s.price ? "Included" : (st.hasContent ? "Added" : `+${formatPrice(s.price)}`);
    const img = card.querySelector(".side-thumb img");
    if (img) img.src = getStageImage(currentProduct, selectedColor, id);
  });

  const bothBtn = document.getElementById("both-sides-card");
  if (bothBtn && hasFrontAndBack()){
    const frontDone = sidesState.front && sidesState.front.hasContent;
    const backDone = sidesState.back && sidesState.back.hasContent;
    const bothDone = frontDone && backDone;
    bothBtn.classList.toggle("added", bothDone);
    bothBtn.classList.toggle("requested", bothSidesRequested);
    const priceEl = bothBtn.querySelector(".side-price");
    if (priceEl){
      const front = currentSides.find(s => s.id === "front");
      const back = currentSides.find(s => s.id === "back");
      const combined = (front.price || 0) + (back.price || 0);
      priceEl.textContent = bothDone ? "Added" : `+${formatPrice(combined)}`;
    }
    const subEl = bothBtn.querySelector(".side-sub");
    if (subEl) subEl.textContent = bothDone ? "Front and back are set" : "Print your design on Front and Back";
  }
}

// Loads the given side's saved design into the live Fabric canvas (or clears it and
// establishes a blank history baseline the first time that side is visited).
function loadSideIntoCanvas(id){
  const st = sidesState[id];
  if (!st || !designCanvas) return;
  const seed = st.history[st.historyIndex];
  isRestoringHistory = true;
  const done = () => {
    designCanvas.requestRenderAll();
    isRestoringHistory = false;
    selectedObject = null;
    updatePropsPanel(null);
    refreshLayersList();
    if (seed){
      st.hasContent = designCanvas.getObjects().length > 0;
      updateUndoRedoButtons();
      updateTotal();
      updateSidesPanelUI();
    } else {
      commitDesignHistory(); // establishes the blank baseline + refreshes total/panel/undo-redo
    }
  };
  if (seed) designCanvas.loadFromJSON(seed, done);
  else { designCanvas.clear(); done(); }
}

function switchSide(id){
  if (!sidesState[id] || id === activeSideId) return;
  activeSideId = id;
  applySideView(currentSides.find(s => s.id === id));
  updateStudioHint();
  if (designCanvas) loadSideIntoCanvas(id);
  else updateSidesPanelUI();
}

// Rebuilds Print Sides state for a (newly selected) product. carryJson, when given,
// is the design that was on the previously active side - it's carried onto the new
// product's first side so switching products never silently discards work.
function setupSidesForProduct(p, carryJson){
  currentSides = getEffectiveSides(p);
  sidesState = {};
  currentSides.forEach(s => { sidesState[s.id] = { history: [], historyIndex: -1, hasContent: false }; });
  activeSideId = currentSides[0].id;
  bothSidesRequested = false;
  bothSidesAutoSwitched = false;

  if (carryJson){
    const st = sidesState[activeSideId];
    st.history = [carryJson];
    st.historyIndex = 0;
    try {
      const parsed = JSON.parse(carryJson);
      st.hasContent = !!(parsed.objects && parsed.objects.length);
    } catch (e){ /* malformed/unexpected JSON - leave hasContent false */ }
  }

  applySideView(currentSides[0]);
  updateStudioHint();
  renderSidesPanel();

  if (designCanvas) loadSideIntoCanvas(activeSideId);
  updateTotal();
}

function bindOptionControls(){
  const qtyInput = document.getElementById("pd-qty");
  document.getElementById("qty-minus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    updateTotal();
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    qtyInput.value = Number(qtyInput.value) + 1;
    updateTotal();
  });
}

// Size pills: sizes that are not available in the chosen colour are shown disabled.
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
      updateBasePriceLabel();
      updateTotal();
      applyFrameLayout(); // framed poster: frame follows the size
    });
  });
}

function renderPackaging(){
  const p = currentProduct;
  const pkgBlock = document.getElementById("pd-packaging-block");
  if (!pkgBlock) return;
  const list = getPackagingsFor(p, selectedSize);
  pkgBlock.style.display = list ? "" : "none";
  if (!list) return;
  if (!list.includes(selectedPackaging)) selectedPackaging = list[0];
  const pkgWrap = document.getElementById("pd-packaging");
  pkgWrap.innerHTML = list.map(k => `
    <button type="button" class="pill ${k === selectedPackaging ? "selected" : ""}" data-packaging="${k}">${k}</button>`).join("");
  pkgWrap.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", () => {
      pkgWrap.querySelectorAll(".pill").forEach(pl => pl.classList.remove("selected"));
      pill.classList.add("selected");
      selectedPackaging = pill.dataset.packaging;
      updateBasePriceLabel();
      updateTotal();
    });
  });
}

// Base product price plus the price of every side the customer has actually put a
// design on (matches the "Price applies when you add design to a side" rule shown
// in the Print Sides panel).
function computeUnitPrice(){
  if (!currentProduct) return 0;
  let unit = getVariantPrice(currentProduct, selectedColor, selectedPackaging, selectedSize);
  if (currentProduct.sides && currentProduct.sides.length){
    currentProduct.sides.forEach(s => {
      const st = sidesState[s.id];
      if (st && st.hasContent) unit += s.price;
    });
  }
  return unit;
}

function updateBasePriceLabel(){
  if (!currentProduct) return;
  const priceOk = hasValidVariantPrice(currentProduct, selectedColor, selectedPackaging, selectedSize);
  document.getElementById("cz-price").textContent = priceOk
    ? formatPrice(getVariantPrice(currentProduct, selectedColor, selectedPackaging, selectedSize))
    : "Price coming soon";
  // No checkout for a colour/size that is unavailable or has no valid retail price
  const orderable = isVariantOrderable(currentProduct, selectedColor, selectedPackaging, selectedSize);
  ["add-to-cart-btn", "buy-now-btn"].forEach(id => {
    const b = document.getElementById(id);
    if (b){ b.disabled = !orderable; b.setAttribute("aria-disabled", String(!orderable)); }
  });
}

function updateTotal(){
  if (!currentProduct) return;
  const qty = Number(document.getElementById("pd-qty").value) || 1;
  document.getElementById("cz-total").textContent = formatPrice(computeUnitPrice() * qty);
}

// True once at least one side (or the single implicit side, for products without
// a Print Sides picker) has a design on it.
function anySideHasContent(){
  if (currentProduct && currentProduct.sides && currentProduct.sides.length){
    return Object.keys(sidesState).some(id => sidesState[id].hasContent);
  }
  return !!(designCanvas && designCanvas.getObjects().length);
}

// Bundles every side that has a design into one object keyed by side id, for cart/
// checkout. Returns null for products with no Print Sides picker (single-canvas flow).
function collectSidesDesign(){
  if (!(currentProduct && currentProduct.sides && currentProduct.sides.length)) return null;
  const out = {};
  currentSides.forEach(s => {
    const st = sidesState[s.id];
    if (st && st.hasContent && st.history.length) out[s.id] = st.history[st.historyIndex];
  });
  return Object.keys(out).length ? out : null;
}

// Renders every side's saved JSON into an off-screen canvas and exports each as
// a high-res JPG (flattened on white) - so a design made on the Back (or any side that
// isn't the one currently open) still gets attached to the cart item, not just
// whichever side happened to be on screen when "Add to Cart" was clicked.
function buildAllSideDesignFiles(sidesDesignMap, callback){
  const ids = Object.keys(sidesDesignMap || {});
  if (!ids.length){ callback([]); return; }
  const width = designCanvas.getWidth();
  const height = designCanvas.getHeight();
  const results = [];
  let remaining = ids.length;

  ids.forEach(sideId => {
    const temp = new fabric.StaticCanvas(null, { width, height });
    temp.loadFromJSON(sidesDesignMap[sideId], () => {
      temp.renderAll();
      const sideDef = currentSides.find(s => s.id === sideId);
      results.push({ id: sideId, label: (sideDef && sideDef.label) || sideId, dataUrl: canvasToJpg(temp) });
      temp.dispose();
      remaining -= 1;
      if (remaining === 0){
        results.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        callback(results);
      }
    });
  });
}

function handleAddToCart(buyNow){
  const p = currentProduct;
  if (!selectedColor || !selectedSize || !isVariantOrderable(p, selectedColor, selectedPackaging, selectedSize)){
    showToast(selectedColor && selectedSize ? `Size ${selectedSize} is not available in ${selectedColor}` : "Please choose a colour and size");
    return;
  }
  const qty = Number(document.getElementById("pd-qty").value) || 1;
  const hasDesign = anySideHasContent();
  const sidesDesign = collectSidesDesign();

  const finish = (previewDataUrl, designFiles) => {
    // Save a copy of the customer's design to their own device right when
    // they add it to the cart / buy now - before the cart write below -
    // so they already have the file even if they never reach checkout, or
    // checkout's own attach step doesn't cover their case (e.g. desktop,
    // where WhatsApp sharing falls back to a manual-attach step anyway).
    // Staggered a beat apart per file since browsers can silently block
    // several downloads triggered in the same instant.
    if (designFiles && designFiles.length){
      let delay = 0;
      designFiles.forEach(file => {
        setTimeout(() => {
          const base = `${(p.name || "gfxprints-design").replace(/\s+/g, "-").toLowerCase()}-${file.label.replace(/\s+/g, "-").toLowerCase()}`;
          triggerFileDownload(file.dataUrl, `${base}.jpg`);
        }, delay);
        delay += 400;
      });
    }

    addToCart({
      id: p.id,
      name: p.name,
      image: getStageImage(p, selectedColor, "front"),
      price: computeUnitPrice(),
      color: selectedColor,
      size: selectedSize,
      packaging: selectedPackaging,
      orientation: selectedOrientation,
      customText: hasDesign ? summarizeDesign() : "",
      customDesign: sidesDesign || (hasDesign ? designCanvas.toJSON() : null),
      designPreview: previewDataUrl || null,
      // High-res artwork-only JPG(s) - the actual print file(s), one
      // per customized side (vs. designPreview above, which is a mockup thumbnail).
      designFiles: designFiles || [],
      qty: qty
    });
    showToast(designFiles && designFiles.length ? `${p.name} added to cart. Design saved to your device` : `${p.name} added to cart`);
    if (buyNow){
      window.location.href = "checkout.html";
    }
  };

  const withDesignFiles = (previewDataUrl) => {
    if (!hasDesign){
      finish(previewDataUrl, []);
      return;
    }
    if (sidesDesign){
      // Multi-side product: export every customized side, not just the one on screen.
      buildAllSideDesignFiles(sidesDesign, (files) => finish(previewDataUrl, files));
    } else {
      // Single-canvas product: what's on screen right now is the whole design.
      finish(previewDataUrl, [{ id: "design", label: "Design", dataUrl: canvasToJpg(designCanvas) }]);
    }
  };

  if (hasDesign){
    buildDesignPreview(p, withDesignFiles);
  } else {
    withDesignFiles(null);
  }
}

function showStudioLoadError(){
  const stage = document.getElementById("studio-stage");
  if (stage && !stage.querySelector(".studio-error")){
    const msg = document.createElement("div");
    msg.className = "studio-error";
    msg.setAttribute("role", "alert");
    msg.textContent = "The design tool couldn't load. Check your internet connection and refresh the page.";
    stage.appendChild(msg);
  }
  document.querySelectorAll(".studio-toolbar .studio-btn").forEach(b => { b.disabled = true; });
  const upload = document.getElementById("tool-upload-image");
  if (upload) upload.disabled = true;
}

/* =========================================================
   DESIGN STUDIO - live, drag/resize/rotate product customizer
   Built on Fabric.js. Customers can add text layers and upload
   their own artwork, arrange it directly on the product, and
   the whole layered design is saved with the cart line item.
   ========================================================= */

/* =========================================================
   SELECTION HANDLES - bigger, high-contrast, touch friendly
   Round corner handles (resize), pill side handles (stretch), a blue rotate
   handle with an arrow icon, and a floating Duplicate / Delete bar under the
   selected layer. A white halo keeps everything visible on dark garments.
   ========================================================= */

let studioHandleK = 1;   // internal canvas px per on-screen px, so handles look the same size at any zoom

function studioHandleScale(){
  const el = designCanvas && designCanvas.upperCanvasEl;
  const w = el ? el.getBoundingClientRect().width : 0;
  if (!w) return 1;
  return Math.min(2.4, Math.max(0.8, designCanvas.getWidth() / w));
}

function setupStudioControls(){
  if (typeof fabric === "undefined" || fabric.__gfxControls) return;
  fabric.__gfxControls = true;

  const BLUE = "#2447F0", RED = "#E5484D", WHITE = "#ffffff";
  const touch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const R = touch ? 11 : 8;                 // corner handle radius (screen px)
  const O = fabric.Object.prototype;

  const baseToObject = O.toObject;
  O.toObject = function(extra){
    return baseToObject.call(this, ["gfxShape", "gfxId", "lockMovementX", "lockMovementY", "lockScalingX", "lockScalingY", "lockRotation", "hasControls"].concat(extra || []));
  };
  O.transparentCorners = false;
  O.cornerStyle = "circle";
  O.cornerColor = WHITE;
  O.cornerStrokeColor = BLUE;
  O.borderColor = BLUE;
  O.borderScaleFactor = 2;
  O.borderOpacityWhenMoving = 1;
  O.snapAngle = 15;          // rotation clicks to every 15 degrees when you get close
  O.snapThreshold = 6;

  function shadow(ctx){
    ctx.shadowColor = "rgba(10,14,40,0.45)";
    ctx.shadowBlur = 5 * studioHandleK;
    ctx.shadowOffsetY = 1 * studioHandleK;
  }
  function place(ctx, x, y, obj, rotate){
    ctx.save();
    ctx.translate(x, y);
    if (rotate) ctx.rotate(fabric.util.degreesToRadians(obj.angle));
    ctx.scale(studioHandleK, studioHandleK);
  }
  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Corner handles: white circle, blue ring
  function renderCorner(ctx, left, top, style, obj){
    place(ctx, left, top, obj, false);
    shadow(ctx);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = WHITE; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 2.5; ctx.strokeStyle = BLUE; ctx.stroke();
    ctx.restore();
  }

  // Side handles: white pill, blue outline, turned to follow the layer
  function renderSide(vertical){
    return function(ctx, left, top, style, obj){
      place(ctx, left, top, obj, true);
      if (vertical) ctx.rotate(Math.PI / 2);
      shadow(ctx);
      const w = R * 2.6, h = R * 1.05;
      roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fillStyle = WHITE; ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2.2; ctx.strokeStyle = BLUE; ctx.stroke();
      ctx.restore();
    };
  }

  // Rotate handle: solid blue circle with a circular arrow
  function renderRotate(ctx, left, top, style, obj){
    place(ctx, left, top, obj, false);
    const r = R + 4;
    shadow(ctx);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = BLUE; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 2.5; ctx.strokeStyle = WHITE; ctx.stroke();
    const rr = r * 0.5, end = Math.PI * 1.45;
    ctx.beginPath(); ctx.arc(0, 0, rr, -Math.PI * 0.15, end);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = WHITE; ctx.stroke();
    const ex = Math.cos(end) * rr, ey = Math.sin(end) * rr, tx = -Math.sin(end), ty = Math.cos(end), nx = Math.cos(end), ny = Math.sin(end);
    ctx.beginPath();
    ctx.moveTo(ex + tx * 4.2, ey + ty * 4.2);
    ctx.lineTo(ex + nx * 3.4, ey + ny * 3.4);
    ctx.lineTo(ex - nx * 3.4, ey - ny * 3.4);
    ctx.closePath(); ctx.fillStyle = WHITE; ctx.fill();
    ctx.restore();
  }

  // Round action buttons (Duplicate / Delete)
  function actionRenderer(kind){
    return function(ctx, left, top, style, obj){
      place(ctx, left, top, obj, false);
      const r = R + 5;
      shadow(ctx);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = kind === "del" ? RED : "#1c2340"; ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2; ctx.strokeStyle = WHITE; ctx.stroke();
      ctx.lineWidth = 1.9; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = WHITE;
      if (kind === "del"){
        ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.moveTo(4, -4); ctx.lineTo(-4, 4); ctx.stroke();
      } else {
        roundRect(ctx, -5.5, -5.5, 8, 8, 1.5); ctx.stroke();
        roundRect(ctx, -2.5, -2.5, 8, 8, 1.5); ctx.stroke();
      }
      ctx.restore();
    };
  }

  const C = O.controls;
  ["tl", "tr", "bl", "br"].forEach(k => { if (C[k]) C[k].render = renderCorner; });
  ["mt", "mb"].forEach(k => { if (C[k]) C[k].render = renderSide(false); });
  ["ml", "mr"].forEach(k => { if (C[k]) C[k].render = renderSide(true); });
  if (C.mtr){
    C.mtr.render = renderRotate;
    C.mtr.withConnection = true;
    C.mtr.cursorStyleHandler = () => "grab";
  }

  function clickButton(id){
    return function(){ const b = document.getElementById(id); if (b) b.click(); return true; };
  }
  C.dup = new fabric.Control({
    x: 0, y: 0.5, offsetX: -(R + 9), offsetY: 0, cursorStyle: "copy",
    mouseUpHandler: clickButton("prop-duplicate"), render: actionRenderer("dup")
  });
  C.del = new fabric.Control({
    x: 0, y: 0.5, offsetX: (R + 9), offsetY: 0, cursorStyle: "pointer",
    mouseUpHandler: clickButton("prop-delete"), render: actionRenderer("del")
  });

  // Keeps handle size, hit area and the offsets in step with how big the canvas looks on screen
  studioApplyHandleScale = function(){
    const k = studioHandleScale();
    if (Math.abs(k - studioHandleK) < 0.02 && O.cornerSize) return;
    studioHandleK = k;
    O.cornerSize = (R * 2 + 4) * k;
    O.touchCornerSize = (touch ? 46 : 30) * k;
    O.padding = 5 * k;
    O.borderScaleFactor = 2 * Math.max(1, k * 0.9);
    C.mtr.offsetY = -(touch ? 52 : 44) * k;
    C.dup.offsetX = -(R + 9) * k;  C.del.offsetX = (R + 9) * k;
    C.dup.offsetY = C.del.offsetY = (R * 2 + 18) * k;
    const a = designCanvas && designCanvas.getActiveObject();
    if (a) a.setCoords();
  };

  // White halo under the blue outline, so the selection box shows on black and white garments alike
  const baseDrawBorders = O.drawBorders;
  O.drawBorders = function(ctx, styleOverride){
    styleOverride = styleOverride || {};
    ctx.save();
    ctx.lineWidth = ctx.lineWidth + 3 * studioHandleK;
    baseDrawBorders.call(this, ctx, Object.assign({}, styleOverride, { borderColor: "rgba(255,255,255,0.95)" }));
    ctx.restore();
    return baseDrawBorders.call(this, ctx, styleOverride);
  };
}
let studioApplyHandleScale = function(){};

// Live angle read-out while rotating, and handle scaling that follows zoom / window size
function bindStudioHandles(){
  designCanvas.on("before:render", () => studioApplyHandleScale());
  designCanvas.on("after:render", () => {
    const t = designCanvas._currentTransform;
    if (!t || t.action !== "rotate" || !t.target) return;
    const o = t.target;
    const deg = Math.round(((o.angle % 360) + 360) % 360);
    const ctx = designCanvas.getContext(), rs = designCanvas.getRetinaScaling();
    const c = o.getCenterPoint(), k = studioHandleK, text = deg + "\u00b0";
    ctx.save();
    ctx.setTransform(rs, 0, 0, rs, 0, 0);
    ctx.font = "600 " + (13 * k) + "px 'IBM Plex Sans', sans-serif";
    const w = ctx.measureText(text).width + 18 * k, h = 24 * k;
    ctx.fillStyle = "rgba(20,26,56,0.92)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(c.x - w / 2, c.y - h / 2, w, h, h / 2); else ctx.rect(c.x - w / 2, c.y - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, c.x, c.y + 0.5);
    ctx.restore();
  });
  window.addEventListener("resize", () => { studioApplyHandleScale(); designCanvas.requestRenderAll(); });
}

function initDesignStudio(product){
  const canvasEl = document.getElementById("design-canvas");
  if (!canvasEl) return;
  if (typeof fabric === "undefined"){
    // Fabric.js is loaded from a CDN - tell the customer instead of failing silently.
    showStudioLoadError();
    return;
  }

  setupStudioControls();
  designCanvas = new fabric.Canvas("design-canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  bindStudioHandles();
  designCanvas.on("selection:created", onDesignSelectionChange);
  designCanvas.on("selection:updated", onDesignSelectionChange);
  designCanvas.on("selection:cleared", onDesignSelectionCleared);
  designCanvas.on("object:modified", commitDesignHistory);
  designCanvas.on("text:editing:exited", commitDesignHistory);

  // sidesState/activeSideId were already prepared by selectProduct(); now that the
  // canvas exists, load the active side's content (or establish its blank baseline).
  loadSideIntoCanvas(activeSideId);

  bindStudioToolbar(product);
  bindStudioPropertyPanel();
  bindStudioTabs();
  refreshLayersList();
}

function bindStudioToolbar(product){
  const addTextBtn = document.getElementById("tool-add-text");
  if (addTextBtn) addTextBtn.addEventListener("click", addTextLayer);

  initUploadPanel();

  const uploadInput = document.getElementById("tool-upload-image");
  if (uploadInput){
    uploadInput.addEventListener("change", (e) => {
      Array.from(e.target.files || []).forEach(addImageLayer);
      e.target.value = ""; // allow re-selecting the same file later
    });
  }

  const undoBtn = document.getElementById("tool-undo");
  if (undoBtn) undoBtn.addEventListener("click", undoDesign);
  const redoBtn = document.getElementById("tool-redo");
  if (redoBtn) redoBtn.addEventListener("click", redoDesign);

  const resetBtn = document.getElementById("tool-reset");
  if (resetBtn){
    resetBtn.addEventListener("click", () => {
      if (!designCanvas.getObjects().length) return;
      const sideDef = currentSides.find(s => s.id === activeSideId) || {};
      const label = (sideDef.label || "design").toLowerCase();
      if (!window.confirm(`Clear your ${label} design? This can't be undone.`)) return;
      designCanvas.clear();
      designCanvas.requestRenderAll();
      selectedObject = null;
      updatePropsPanel(null);
      refreshLayersList();
      const st = sidesState[activeSideId];
      st.history = [];
      st.historyIndex = -1;
      commitDesignHistory();
    });
  }
}

// New text should be readable on the garment shown: white on dark color photos, near-black otherwise.
function defaultTextColor(){
  const onPhoto = currentProduct && currentProduct.colorImages;
  return onPhoto && isDarkSurface(currentProduct, selectedColor) ? "#ffffff" : "#15171b";
}

function addTextLayer(){
  const text = new fabric.IText("Your Text", {
    left: designCanvas.getWidth() / 2,
    top: designCanvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 32,
    fill: defaultTextColor(),
    fontWeight: "normal",
    fontStyle: "normal",
    textAlign: "center"
  });
  designCanvas.add(text);
  designCanvas.setActiveObject(text);
  designCanvas.requestRenderAll();
  refreshLayersList();
  commitDesignHistory();
}

// Places an image (from a data URL) onto the active canvas - shared by a fresh
// upload and by re-using something from the saved Upload Library.
function placeImageOnCanvas(dataUrl){
  if (!designCanvas){
    showToast("Design Studio isn't ready yet");
    return;
  }
  fabric.Image.fromURL(dataUrl, (img) => {
    const maxDim = Math.min(designCanvas.getWidth(), designCanvas.getHeight()) * 0.55;
    const largestSide = Math.max(img.width || maxDim, img.height || maxDim);
    const scale = Math.min(1, maxDim / largestSide);
    img.set({
      left: designCanvas.getWidth() / 2,
      top: designCanvas.getHeight() / 2,
      originX: "center",
      originY: "center",
      scaleX: scale,
      scaleY: scale
    });
    designCanvas.add(img);
    designCanvas.setActiveObject(img);
    designCanvas.requestRenderAll();
    refreshLayersList();
    commitDesignHistory();
  });
}

function addImageLayer(file){
  if (!file || !file.type || file.type.indexOf("image") !== 0) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    addToUploadLibrary(ev.target.result, file.name);
    placeImageOnCanvas(ev.target.result);
  };
  reader.readAsDataURL(file);
}

/* ---------- Upload Library ----------
   Every file a customer uploads is also kept in localStorage (per-device, not
   per-account - there's no backend here) so they can reuse it in a later
   session or on a different side/product without re-uploading. */
const STORAGE_UPLOAD_LIBRARY = "gfxprints_upload_library";
const UPLOAD_LIBRARY_MAX = 40;

// In-memory copy so uploads always show for this session, even if the browser
// refuses to persist them (storage full / private mode).
let memoryLibrary = null;

function getUploadLibrary(){
  if (memoryLibrary) return memoryLibrary;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_UPLOAD_LIBRARY) || "[]");
    memoryLibrary = Array.isArray(parsed) ? parsed : [];
  } catch (e){
    memoryLibrary = [];
  }
  return memoryLibrary;
}

function saveUploadLibrary(library){
  try {
    localStorage.setItem(STORAGE_UPLOAD_LIBRARY, JSON.stringify(library));
    return true;
  } catch (e){
    return false; // quota exceeded
  }
}

// Phone photos are several MB as data URLs and overflow the ~5 MB localStorage
// limit, so the saved copy is shrunk first. The full-size image is still the
// one placed on the canvas.
function shrinkForLibrary(dataUrl, maxDim = 1200){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        // WebP keeps transparency and is small; browsers without it fall back to PNG.
        let out = c.toDataURL("image/webp", 0.82);
        if (out.indexOf("data:image/webp") !== 0) out = c.toDataURL("image/png");
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch (e){ resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function addToUploadLibrary(dataUrl, name){
  shrinkForLibrary(dataUrl).then((small) => {
    let library = getUploadLibrary().slice();
    if (library.some(item => item.dataUrl === small)) return; // already saved
    library.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl: small,
      name: name || "Upload"
    });
    if (library.length > UPLOAD_LIBRARY_MAX) library = library.slice(0, UPLOAD_LIBRARY_MAX);
    memoryLibrary = library; // always visible this session
    // If storage is full, drop the oldest entries until it fits.
    let persisted = saveUploadLibrary(library);
    let droppedForSpace = false;
    while (!persisted && library.length > 1){
      library.pop();
      droppedForSpace = true;
      persisted = saveUploadLibrary(library);
    }
    if (droppedForSpace) showToast("Storage full. Removed your oldest upload to make space");
    else if (!persisted) showToast("This photo is shown for now but couldn't be saved for later");
    renderUploadLibrary();
  });
}

function removeFromUploadLibrary(id){
  memoryLibrary = getUploadLibrary().filter(item => item.id !== id);
  saveUploadLibrary(memoryLibrary);
  renderUploadLibrary();
}

function escAttr(s){
  return String(s || "").replace(/"/g, "&quot;");
}

function upText(str){
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderUploadLibrary(){
  const grid = document.getElementById("upload-library-grid");
  const empty = document.getElementById("upload-library-empty");
  const count = document.getElementById("upload-library-count");
  const clear = document.getElementById("upload-library-clear");
  if (!grid) return;
  const library = getUploadLibrary();
  if (empty) empty.style.display = library.length ? "none" : "flex";
  if (count) count.textContent = library.length ? `${library.length} of ${UPLOAD_LIBRARY_MAX}` : "";
  if (clear) clear.hidden = !library.length;

  grid.innerHTML = library.map(item => `
    <div class="upload-lib-item" data-id="${item.id}" title="${escAttr(item.name)}">
      <button type="button" class="upload-lib-add" aria-label="Add ${escAttr(item.name)} to your design">
        <img src="${item.dataUrl}" alt="" loading="lazy" decoding="async">
        <span class="up-cap">${upText(String(item.name).replace(/\.[^.]+$/, ""))}</span>
      </button>
      <button type="button" class="upload-lib-remove" data-id="${item.id}" aria-label="Delete ${escAttr(item.name)} from your uploads">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
  `).join("");

  grid.querySelectorAll(".upload-lib-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".upload-lib-item").dataset.id;
      const item = getUploadLibrary().find(i => i.id === id);
      if (item) placeImageOnCanvas(item.dataUrl);
    });
  });
  grid.querySelectorAll(".upload-lib-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromUploadLibrary(btn.dataset.id);
    });
  });
}

// Drag-and-drop onto the drop area, and a two-tap "Clear all".
function initUploadPanel(){
  const dz = document.getElementById("upload-dropzone");
  const input = document.getElementById("tool-upload-image");
  if (dz){
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("dragging"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove("dragging")));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      if (input && input.disabled) return;
      Array.from((e.dataTransfer && e.dataTransfer.files) || []).filter(f => /^image\//.test(f.type)).forEach(addImageLayer);
    });
  }
  const clear = document.getElementById("upload-library-clear");
  if (clear){
    let timer = null;
    clear.addEventListener("click", () => {
      if (!timer){
        clear.textContent = "Tap again to clear";
        timer = setTimeout(() => { clear.textContent = "Clear all"; timer = null; }, 2500);
        return;
      }
      clearTimeout(timer); timer = null;
      clear.textContent = "Clear all";
      memoryLibrary = [];
      saveUploadLibrary([]);
      renderUploadLibrary();
    });
  }
}

/* ---------- Selection + property panel ---------- */

function onDesignSelectionChange(){
  selectedObject = designCanvas.getActiveObject();
  updatePropsPanel(selectedObject);
  refreshLayersList();
}

function onDesignSelectionCleared(){
  selectedObject = null;
  updatePropsPanel(null);
  refreshLayersList();
}

function updatePropsPanel(obj){
  const empty = document.getElementById("props-empty");
  const textPanel = document.getElementById("props-text");
  const imagePanel = document.getElementById("props-image");
  const sharedActions = document.getElementById("props-shared-actions");
  if (!empty || !textPanel || !imagePanel || !sharedActions) return;

  if (!obj){
    empty.style.display = "block";
    textPanel.style.display = "none";
    imagePanel.style.display = "none";
    sharedActions.style.display = "none";
    return;
  }

  empty.style.display = "none";
  sharedActions.style.display = "flex";
  const lockBtn = document.getElementById("prop-lock");
  if (lockBtn) lockBtn.textContent = obj.lockMovementX ? "Unlock" : "Lock";

  if (obj.type === "i-text" || obj.type === "text" || obj.type === "textbox"){
    textPanel.style.display = "block";
    imagePanel.style.display = "none";
    settingProps = true;
    document.getElementById("prop-text-content").value = obj.text || "";
    document.getElementById("prop-text-font").value = obj.fontFamily || "'IBM Plex Sans', sans-serif";
    document.getElementById("prop-text-color").value = /^#/.test(obj.fill) ? obj.fill : "#15171b";
    const size = Math.round(obj.fontSize || 32);
    document.getElementById("prop-text-size").value = size;
    document.getElementById("prop-text-size-val").textContent = size;
    document.getElementById("prop-text-bold").classList.toggle("active", obj.fontWeight === "bold");
    document.getElementById("prop-text-italic").classList.toggle("active", obj.fontStyle === "italic");
    document.querySelectorAll("#prop-text-align .toggle-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.align === (obj.textAlign || "left"));
    });
    const setVal = (id, valId, v) => {
      const el = document.getElementById(id); if (el) el.value = v;
      const out = document.getElementById(valId); if (out) out.textContent = v;
    };
    markActiveSwatch(document.getElementById("prop-text-color").value);
    document.getElementById("prop-text-underline").classList.toggle("active", !!obj.underline);
    document.getElementById("prop-text-strike").classList.toggle("active", !!obj.linethrough);
    setVal("prop-text-spacing", "prop-text-spacing-val", Math.round(obj.charSpacing || 0));
    setVal("prop-text-lineheight", "prop-text-lineheight-val", Number(obj.lineHeight || 1.16).toFixed(1));
    setVal("prop-text-stroke", "prop-text-stroke-val", Math.round(obj.strokeWidth || 0));
    if (obj.stroke && /^#/.test(obj.stroke)) document.getElementById("prop-text-stroke-color").value = obj.stroke;
    setVal("prop-text-shadow", "prop-text-shadow-val", obj.shadow ? Math.round(obj.shadow.blur || 0) : 0);
    if (obj.shadow && /^#/.test(obj.shadow.color || "")) document.getElementById("prop-text-shadow-color").value = obj.shadow.color;
    setVal("prop-text-opacity", "prop-text-opacity-val", Math.round((obj.opacity == null ? 1 : obj.opacity) * 100));
    settingProps = false;
  } else if (obj.type === "image"){
    textPanel.style.display = "none";
    imagePanel.style.display = "block";
    settingProps = true;
    const opacityPct = Math.round((obj.opacity == null ? 1 : obj.opacity) * 100);
    document.getElementById("prop-image-opacity").value = opacityPct;
    document.getElementById("prop-image-opacity-val").textContent = opacityPct;
    updateImagePanel(obj);
    settingProps = false;
  } else {
    // Multiple objects selected at once - just offer duplicate/delete.
    textPanel.style.display = "none";
    imagePanel.style.display = "none";
  }
}

// Loads a (Google) font before drawing it, then re-measures the text so the box fits.
function applyFontFamily(obj, family){
  obj.set("fontFamily", family);
  designCanvas.requestRenderAll();
  const primary = String(family).split(",")[0].trim().replace(/['"]/g, "");
  if (!(document.fonts && document.fonts.load)){ commitDesignHistory(); return; }
  const spec = `${obj.fontStyle || "normal"} ${obj.fontWeight || "normal"} ${Math.round(obj.fontSize || 32)}px "${primary}"`;
  document.fonts.load(spec, obj.text || "A").catch(() => {}).then(() => {
    if (fabric.util.clearFabricFontCache) fabric.util.clearFabricFontCache(primary);
    obj.dirty = true;
    if (obj.initDimensions) obj.initDimensions();
    obj.setCoords();
    designCanvas.requestRenderAll();
    commitDesignHistory();
  });
}

// Wires a slider to an object property: live while dragging, history snapshot on release.
function bindTextRange(id, valId, apply){
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", function(){
    if (settingProps || !selectedObject) return;
    const v = Number(this.value);
    const out = document.getElementById(valId);
    if (out) out.textContent = this.value;
    apply(selectedObject, v);
    selectedObject.dirty = true;
    if (selectedObject.initDimensions) selectedObject.initDimensions();
    selectedObject.setCoords();
    designCanvas.requestRenderAll();
  });
  el.addEventListener("change", commitDesignHistory);
}

function bindTextToggle(id, prop, onVal, offVal){
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", function(){
    if (!selectedObject) return;
    const on = selectedObject[prop] === onVal;
    selectedObject.set(prop, on ? offVal : onVal);
    this.classList.toggle("active", !on);
    designCanvas.requestRenderAll();
    commitDesignHistory();
  });
}

function applyTextOutline(obj){
  const w = Number(document.getElementById("prop-text-stroke").value) || 0;
  const col = document.getElementById("prop-text-stroke-color").value;
  obj.set({ stroke: w ? col : null, strokeWidth: w, paintFirst: "stroke", strokeLineJoin: "round" });
}

function applyTextShadow(obj){
  const blur = Number(document.getElementById("prop-text-shadow").value) || 0;
  const col = document.getElementById("prop-text-shadow-color").value;
  obj.set("shadow", blur ? new fabric.Shadow({ color: col, blur: blur, offsetX: Math.max(1, blur / 4), offsetY: Math.max(1, blur / 4) }) : null);
}

function markActiveSwatch(color){
  document.querySelectorAll("#pp-text-swatches .pp-sw[data-color]").forEach(sw => {
    sw.classList.toggle("on", sw.dataset.color.toLowerCase() === String(color).toLowerCase());
  });
}

function bindExtraTextOptions(){
  const picker = document.getElementById("prop-text-color");
  document.querySelectorAll("#pp-text-swatches .pp-sw[data-color]").forEach(sw => {
    sw.addEventListener("click", () => {
      if (!selectedObject || !picker) return;
      picker.value = sw.dataset.color;
      picker.dispatchEvent(new Event("input", { bubbles: true }));
      picker.dispatchEvent(new Event("change", { bubbles: true }));
      markActiveSwatch(sw.dataset.color);
    });
  });
  if (picker) picker.addEventListener("input", () => markActiveSwatch(picker.value));
  bindTextToggle("prop-text-underline", "underline", true, false);
  bindTextToggle("prop-text-strike", "linethrough", true, false);

  bindTextRange("prop-text-spacing", "prop-text-spacing-val", (o, v) => o.set("charSpacing", v));
  bindTextRange("prop-text-lineheight", "prop-text-lineheight-val", (o, v) => o.set("lineHeight", v));
  bindTextRange("prop-text-stroke", "prop-text-stroke-val", (o) => applyTextOutline(o));
  bindTextRange("prop-text-shadow", "prop-text-shadow-val", (o) => applyTextShadow(o));
  bindTextRange("prop-text-opacity", "prop-text-opacity-val", (o, v) => o.set("opacity", v / 100));

  const sc = document.getElementById("prop-text-stroke-color");
  if (sc){
    sc.addEventListener("input", function(){
      if (settingProps || !selectedObject) return;
      applyTextOutline(selectedObject);
      designCanvas.requestRenderAll();
    });
    sc.addEventListener("change", commitDesignHistory);
  }
  const shc = document.getElementById("prop-text-shadow-color");
  if (shc){
    shc.addEventListener("input", function(){
      if (settingProps || !selectedObject) return;
      applyTextShadow(selectedObject);
      designCanvas.requestRenderAll();
    });
    shc.addEventListener("change", commitDesignHistory);
  }

  // Flip / centre work for text and images
  const flip = document.getElementById("prop-flip");
  if (flip) flip.addEventListener("click", () => {
    if (!selectedObject) return;
    selectedObject.set("flipX", !selectedObject.flipX);
    selectedObject.setCoords();
    designCanvas.requestRenderAll();
    commitDesignHistory();
  });
  const ch = document.getElementById("prop-center-h");
  if (ch) ch.addEventListener("click", () => {
    if (!selectedObject) return;
    designCanvas.centerObjectH(selectedObject);
    selectedObject.setCoords();
    designCanvas.requestRenderAll();
    commitDesignHistory();
  });
  const cv = document.getElementById("prop-center-v");
  if (cv) cv.addEventListener("click", () => {
    if (!selectedObject) return;
    designCanvas.centerObjectV(selectedObject);
    selectedObject.setCoords();
    designCanvas.requestRenderAll();
    commitDesignHistory();
  });
}


/* ---------- Image tools (all client-side, no external services) ---------- */
const IMG_PRINT_WIDTH_IN = { "T-Shirts": 12, "Hoodies": 12, "Tote Bags": 12, "Mugs": 8, "Photo Frames": 8 };

function imgNat(obj){
  const el = obj._originalElement || obj._element || {};
  return { w: el.naturalWidth || el.width || obj.width, h: el.naturalHeight || el.height || obj.height };
}
function imgFilter(obj, type){ return (obj.filters || []).find(f => f && f.type === type); }
function imgSetFilter(obj, type, inst){
  obj.filters = (obj.filters || []).filter(f => f && f.type !== type);
  if (inst) obj.filters.push(inst);
}
function imgRefresh(obj, commit){
  obj.applyFilters();
  obj.dirty = true;
  designCanvas.requestRenderAll();
  if (commit) commitDesignHistory();
}
function imgThrottle(fn, ms){
  let t = 0, tm = null;
  return function(...a){
    const now = Date.now();
    clearTimeout(tm);
    if (now - t >= ms){ t = now; fn.apply(this, a); }
    else tm = setTimeout(() => { t = Date.now(); fn.apply(this, a); }, ms);
  };
}

function printAreaRect(){
  const cw = designCanvas.getWidth(), ch = designCanvas.getHeight();
  const g = document.querySelector(".print-guide"), st = document.getElementById("studio-stage");
  if (g && st){
    const gr = g.getBoundingClientRect(), sr = st.getBoundingClientRect();
    if (gr.width > 20 && sr.width > 20){
      return { x: (gr.left - sr.left) / sr.width * cw, y: (gr.top - sr.top) / sr.height * ch, w: gr.width / sr.width * cw, h: gr.height / sr.height * ch };
    }
  }
  return { x: 0, y: 0, w: cw, h: ch };
}

function imgFit(obj, cover){
  const r = printAreaRect();
  const quarter = Math.round(obj.angle / 90) % 2 !== 0 && obj.angle % 90 === 0;
  const w = quarter ? obj.height : obj.width, h = quarter ? obj.width : obj.height;
  const k = cover ? Math.max(r.w / w, r.h / h) : Math.min(r.w / w, r.h / h);
  obj.set({ scaleX: k, scaleY: k, originX: "center", originY: "center", left: r.x + r.w / 2, top: r.y + r.h / 2 });
  obj.setCoords();
  designCanvas.requestRenderAll();
  commitDesignHistory();
  updateImageQuality(obj);
}

function updateImageQuality(obj){
  const el = document.getElementById("pp-quality");
  if (!el || !obj || obj.type !== "image") return;
  const inches = (IMG_PRINT_WIDTH_IN[currentProduct && currentProduct.category] || 10);
  const shownIn = obj.getScaledWidth() / designCanvas.getWidth() * inches;
  const dpi = Math.round(obj.width / Math.max(0.1, shownIn));
  let cls = "q-good", msg = `Great print quality (about ${dpi} DPI)`;
  if (dpi < 72){ cls = "q-low"; msg = `Very low resolution (about ${dpi} DPI). It will look blurry when printed. Make it smaller or upload a larger photo.`; }
  else if (dpi < 120){ cls = "q-low"; msg = `Low resolution (about ${dpi} DPI). It may print soft. Try a smaller size or a better photo.`; }
  else if (dpi < 200){ cls = "q-ok"; msg = `Good print quality (about ${dpi} DPI)`; }
  el.className = "pp-quality " + cls;
  el.textContent = msg + " - estimate only";
}

function imgShapePath(shape, s){
  if (shape === "heart"){
    const p = new fabric.Path("M50 88C20 62 2 44 2 26C2 12 13 2 27 2C38 2 46 8 50 16C54 8 62 2 73 2C87 2 98 12 98 26C98 44 80 62 50 88Z");
    const k = s / Math.max(p.width, p.height);
    p.set({ originX: "center", originY: "center", left: 0, top: 0, scaleX: k, scaleY: k });
    return p;
  }
  const pts = [];
  for (let i = 0; i < 10; i++){
    const r = (i % 2 ? 0.2 : 0.5) * s * (i % 2 ? 1.0 : 1.0) * (i % 2 ? 1.0 : 1.0);
    const rad = i % 2 ? s * 0.2 : s * 0.5, a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
  }
  return new fabric.Polygon(pts, { originX: "center", originY: "center", left: 0, top: 0 });
}

function imgApplyShape(obj, shape){
  obj.gfxShape = shape || "";
  const s = Math.min(obj.width, obj.height);
  let clip = null;
  if (shape === "circle") clip = new fabric.Circle({ radius: s / 2, originX: "center", originY: "center", left: 0, top: 0 });
  else if (shape === "rounded") clip = new fabric.Rect({ width: obj.width, height: obj.height, rx: s * 0.18, ry: s * 0.18, originX: "center", originY: "center", left: 0, top: 0 });
  else if (shape === "heart" || shape === "star") clip = imgShapePath(shape, s);
  obj.clipPath = clip;
  obj.dirty = true;
  designCanvas.requestRenderAll();
}

function imgApplyCrop(obj){
  const v = id => (Number(document.getElementById(id).value) || 0) / 100;
  let L = v("img-crop-l"), R = v("img-crop-r"), T = v("img-crop-t"), B = v("img-crop-b");
  if (L + R > 0.9){ R = 0.9 - L; }
  if (T + B > 0.9){ B = 0.9 - T; }
  const n = imgNat(obj);
  obj.set({ cropX: n.w * L, cropY: n.h * T, width: n.w * (1 - L - R), height: n.h * (1 - T - B) });
  if (obj.gfxShape) imgApplyShape(obj, obj.gfxShape);
  obj.dirty = true;
  obj.setCoords();
  designCanvas.requestRenderAll();
  updateImageQuality(obj);
}

function imgApplyBorder(obj){
  const w = Number(document.getElementById("img-border").value) || 0;
  obj.set({ stroke: w ? document.getElementById("img-border-color").value : null, strokeWidth: w, strokeUniform: true });
}
function imgApplyShadow(obj){
  const b = Number(document.getElementById("img-shadow").value) || 0;
  obj.set("shadow", b ? new fabric.Shadow({ color: document.getElementById("img-shadow-color").value, blur: b, offsetX: Math.max(1, b / 4), offsetY: Math.max(1, b / 4) }) : null);
}

function imgReadAdjustments(obj){
  const val = (id) => Number(document.getElementById(id).value) || 0;
  const F = fabric.Image.filters;
  imgSetFilter(obj, "Brightness", val("img-brightness") ? new F.Brightness({ brightness: val("img-brightness") / 100 }) : null);
  imgSetFilter(obj, "Contrast", val("img-contrast") ? new F.Contrast({ contrast: val("img-contrast") / 100 }) : null);
  imgSetFilter(obj, "Saturation", val("img-saturation") ? new F.Saturation({ saturation: val("img-saturation") / 100 }) : null);
  imgSetFilter(obj, "Blur", val("img-blur") ? new F.Blur({ blur: val("img-blur") / 100 }) : null);
  const rm = document.getElementById("img-rmwhite").checked;
  imgSetFilter(obj, "RemoveColor", rm ? new F.RemoveColor({ color: "#ffffff", distance: val("img-rmwhite-tol") / 100 }) : null);
}

function updateImagePanel(obj){
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; const o = document.getElementById(id + "-val"); if (o) o.textContent = v; };
  const f = (t) => imgFilter(obj, t);
  set("img-brightness", f("Brightness") ? Math.round(f("Brightness").brightness * 100) : 0);
  set("img-contrast", f("Contrast") ? Math.round(f("Contrast").contrast * 100) : 0);
  set("img-saturation", f("Saturation") ? Math.round(f("Saturation").saturation * 100) : 0);
  set("img-blur", f("Blur") ? Math.round(f("Blur").blur * 100) : 0);
  document.getElementById("img-rmwhite").checked = !!f("RemoveColor");
  set("img-rmwhite-tol", f("RemoveColor") ? Math.round(f("RemoveColor").distance * 100) : 15);
  const n = imgNat(obj);
  const L = (obj.cropX || 0) / n.w, T = (obj.cropY || 0) / n.h;
  set("img-crop-l", Math.round(L * 100)); set("img-crop-t", Math.round(T * 100));
  set("img-crop-r", Math.max(0, Math.round((1 - L - obj.width / n.w) * 100)));
  set("img-crop-b", Math.max(0, Math.round((1 - T - obj.height / n.h) * 100)));
  set("img-border", Math.round(obj.strokeWidth || 0));
  if (obj.stroke && /^#/.test(obj.stroke)) document.getElementById("img-border-color").value = obj.stroke;
  set("img-shadow", obj.shadow ? Math.round(obj.shadow.blur || 0) : 0);
  const shape = obj.gfxShape || "";
  document.querySelectorAll("#img-shapes .pp-chip").forEach(c => c.classList.toggle("on", c.dataset.shape === shape));
  const preset = ["Grayscale", "Sepia", "Invert"].find(t => f(t)) || "";
  document.querySelectorAll("#img-presets .pp-chip").forEach(c => c.classList.toggle("on", c.dataset.preset === preset));
  updateImageQuality(obj);
}

function bindImageTools(){
  const sel = () => (selectedObject && selectedObject.type === "image") ? selectedObject : null;
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };

  on("img-bgremove", "click", () => {
    const o = sel();
    if (!o || !window.GfxBgRemove){ showToast("Background remover is still loading. Try again in a moment"); return; }
    window.GfxBgRemove.open(o, (url) => {
      const keepW = o.getScaledWidth();
      imgSetFilter(o, "RemoveColor", null);
      o.setSrc(url, () => {
        o.set({ cropX: 0, cropY: 0 });
        o.scaleToWidth(keepW);
        if (o.gfxShape) imgApplyShape(o, o.gfxShape);
        o.setCoords();
        designCanvas.requestRenderAll();
        refreshLayersList();
        commitDesignHistory();
        updatePropsPanel(o);
      });
    });
  });
  on("img-fit", "click", () => { const o = sel(); if (o) imgFit(o, false); });
  on("img-fill", "click", () => { const o = sel(); if (o) imgFit(o, true); });
  on("img-rot90", "click", () => { const o = sel(); if (!o) return; o.rotate(((o.angle || 0) + 90) % 360); o.setCoords(); designCanvas.requestRenderAll(); commitDesignHistory(); });
  on("img-flipv", "click", () => { const o = sel(); if (!o) return; o.set("flipY", !o.flipY); designCanvas.requestRenderAll(); commitDesignHistory(); });

  document.querySelectorAll("#img-shapes .pp-chip").forEach(chip => chip.addEventListener("click", () => {
    const o = sel(); if (!o) return;
    imgApplyShape(o, chip.dataset.shape);
    document.querySelectorAll("#img-shapes .pp-chip").forEach(c => c.classList.toggle("on", c === chip));
    commitDesignHistory();
  }));

  ["img-crop-l", "img-crop-r", "img-crop-t", "img-crop-b"].forEach(id => {
    on(id, "input", function(){ if (settingProps) return; const o = sel(); if (!o) return; document.getElementById(id + "-val").textContent = this.value; imgApplyCrop(o); });
    on(id, "change", commitDesignHistory);
  });

  document.querySelectorAll("#img-presets .pp-chip").forEach(chip => chip.addEventListener("click", () => {
    const o = sel(); if (!o) return;
    ["Grayscale", "Sepia", "Invert"].forEach(t => imgSetFilter(o, t, null));
    if (chip.dataset.preset) imgSetFilter(o, chip.dataset.preset, new fabric.Image.filters[chip.dataset.preset]());
    document.querySelectorAll("#img-presets .pp-chip").forEach(c => c.classList.toggle("on", c === chip));
    imgRefresh(o, true);
  }));

  const applyAdj = imgThrottle(() => { const o = sel(); if (o){ imgReadAdjustments(o); imgRefresh(o, false); } }, 150);
  ["img-brightness", "img-contrast", "img-saturation", "img-blur", "img-rmwhite-tol"].forEach(id => {
    on(id, "input", function(){ if (settingProps) return; document.getElementById(id + "-val").textContent = this.value; applyAdj(); });
    on(id, "change", () => { const o = sel(); if (o){ imgReadAdjustments(o); imgRefresh(o, true); } });
  });
  on("img-rmwhite", "change", () => { const o = sel(); if (o){ imgReadAdjustments(o); imgRefresh(o, true); } });

  [["img-border", "img-border-color", imgApplyBorder], ["img-shadow", "img-shadow-color", imgApplyShadow]].forEach(([sl, col, fn]) => {
    on(sl, "input", function(){ if (settingProps) return; const o = sel(); if (!o) return; document.getElementById(sl + "-val").textContent = this.value; fn(o); o.dirty = true; designCanvas.requestRenderAll(); });
    on(col, "input", () => { if (settingProps) return; const o = sel(); if (o){ fn(o); o.dirty = true; designCanvas.requestRenderAll(); } });
    on(sl, "change", commitDesignHistory); on(col, "change", commitDesignHistory);
  });

  on("img-reset", "click", () => {
    const o = sel(); if (!o) return;
    const n = imgNat(o);
    o.filters = []; o.clipPath = null; o.gfxShape = "";
    o.set({ stroke: null, strokeWidth: 0, shadow: null, opacity: 1, flipX: false, flipY: false, cropX: 0, cropY: 0, width: n.w, height: n.h });
    imgRefresh(o, true); o.setCoords(); updatePropsPanel(o);
  });

  on("img-replace-input", "change", function(){
    const o = sel(), file = this.files && this.files[0];
    this.value = "";
    if (!o || !file || file.type.indexOf("image") !== 0) return;
    const rd = new FileReader();
    rd.onload = (ev) => {
      const keepW = o.getScaledWidth();
      addToUploadLibrary(ev.target.result, file.name);
      o.setSrc(ev.target.result, () => {
        o.set({ cropX: 0, cropY: 0 });
        o.gfxId = ""; // new picture: forget the old uncut original
        o.scaleToWidth(keepW);
        if (o.gfxShape) imgApplyShape(o, o.gfxShape);
        o.setCoords();
        designCanvas.requestRenderAll();
        refreshLayersList();
        commitDesignHistory();
        updatePropsPanel(o);
      });
    };
    rd.readAsDataURL(file);
  });

  if (designCanvas){
    designCanvas.on("object:scaling", () => { const o = sel(); if (o) updateImageQuality(o); });
    designCanvas.on("object:modified", () => { const o = sel(); if (o) updateImageQuality(o); });
  }

  on("prop-lock", "click", () => {
    const objs = designCanvas.getActiveObjects();
    if (!objs.length) return;
    const lock = !objs[0].lockMovementX;
    objs.forEach(o => o.set({ lockMovementX: lock, lockMovementY: lock, lockScalingX: lock, lockScalingY: lock, lockRotation: lock, hasControls: !lock }));
    document.getElementById("prop-lock").textContent = lock ? "Unlock" : "Lock";
    designCanvas.requestRenderAll();
    commitDesignHistory();
  });
}

function bindStudioPropertyPanel(){
  bindImageTools();
  bindExtraTextOptions();
  const content = document.getElementById("prop-text-content");
  if (content){
    content.addEventListener("input", function(){
      if (settingProps || !selectedObject) return;
      selectedObject.set("text", this.value);
      designCanvas.requestRenderAll();
      refreshLayersList();
    });
    content.addEventListener("change", commitDesignHistory);
  }

  const font = document.getElementById("prop-text-font");
  if (font){
    font.addEventListener("change", function(){
      if (!selectedObject) return;
      applyFontFamily(selectedObject, this.value);
    });
  }

  const color = document.getElementById("prop-text-color");
  if (color){
    color.addEventListener("input", function(){
      if (settingProps || !selectedObject) return;
      selectedObject.set("fill", this.value);
      designCanvas.requestRenderAll();
    });
    color.addEventListener("change", commitDesignHistory);
  }

  const size = document.getElementById("prop-text-size");
  if (size){
    size.addEventListener("input", function(){
      if (settingProps || !selectedObject) return;
      selectedObject.set("fontSize", Number(this.value));
      document.getElementById("prop-text-size-val").textContent = this.value;
      designCanvas.requestRenderAll();
    });
    size.addEventListener("change", commitDesignHistory);
  }

  const bold = document.getElementById("prop-text-bold");
  if (bold){
    bold.addEventListener("click", function(){
      if (!selectedObject) return;
      const isBold = selectedObject.fontWeight === "bold";
      selectedObject.set("fontWeight", isBold ? "normal" : "bold");
      this.classList.toggle("active", !isBold);
      designCanvas.requestRenderAll();
      commitDesignHistory();
    });
  }

  const italic = document.getElementById("prop-text-italic");
  if (italic){
    italic.addEventListener("click", function(){
      if (!selectedObject) return;
      const isItalic = selectedObject.fontStyle === "italic";
      selectedObject.set("fontStyle", isItalic ? "normal" : "italic");
      this.classList.toggle("active", !isItalic);
      designCanvas.requestRenderAll();
      commitDesignHistory();
    });
  }

  document.querySelectorAll("#prop-text-align .toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!selectedObject) return;
      selectedObject.set("textAlign", btn.dataset.align);
      document.querySelectorAll("#prop-text-align .toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      designCanvas.requestRenderAll();
      commitDesignHistory();
    });
  });

  const opacity = document.getElementById("prop-image-opacity");
  if (opacity){
    opacity.addEventListener("input", function(){
      if (settingProps || !selectedObject) return;
      selectedObject.set("opacity", Number(this.value) / 100);
      document.getElementById("prop-image-opacity-val").textContent = this.value;
      designCanvas.requestRenderAll();
    });
    opacity.addEventListener("change", commitDesignHistory);
  }


  const duplicate = document.getElementById("prop-duplicate");
  if (duplicate){
    duplicate.addEventListener("click", () => {
      if (!selectedObject || designCanvas.getActiveObjects().length > 1) return;
      selectedObject.clone((cloned) => {
        cloned.set({ left: selectedObject.left + 20, top: selectedObject.top + 20 });
        designCanvas.add(cloned);
        designCanvas.setActiveObject(cloned);
        designCanvas.requestRenderAll();
        refreshLayersList();
        commitDesignHistory();
      });
    });
  }

  const del = document.getElementById("prop-delete");
  if (del) del.addEventListener("click", deleteSelectedLayers);
}

function deleteSelectedLayers(){
  const objs = designCanvas.getActiveObjects();
  if (!objs.length) return;
  objs.forEach(o => designCanvas.remove(o));
  designCanvas.discardActiveObject();
  designCanvas.requestRenderAll();
  refreshLayersList();
  commitDesignHistory();
}

function bindStudioTabs(){
  document.querySelectorAll(".studio-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".studio-tab").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      const target = tab.dataset.tab;
      document.getElementById("tab-properties").style.display = target === "properties" ? "block" : "none";
      document.getElementById("tab-layers").style.display = target === "layers" ? "block" : "none";
    });
  });
}

/* ---------- Layers list ---------- */

function refreshLayersList(){
  if (!designCanvas) return;
  const list = document.getElementById("layers-list");
  const empty = document.getElementById("layers-empty");
  const badge = document.getElementById("layer-count-badge");
  if (!list || !empty || !badge) return;

  const objects = designCanvas.getObjects().slice().reverse(); // topmost layer first
  badge.textContent = objects.length;

  if (!objects.length){
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  list.innerHTML = objects.map((obj, i) => {
    const isText = obj.type === "i-text" || obj.type === "text" || obj.type === "textbox";
    const label = isText ? (obj.text || "Text layer") : "Uploaded image";
    const thumb = isText
      ? `<span aria-hidden="true">Aa</span>`
      : `<img src="${obj.getSrc ? obj.getSrc() : ""}" alt="">`;
    return `<li class="layer-item ${obj === selectedObject ? "selected" : ""}" data-index="${i}">
      <span class="layer-thumb">${thumb}</span>
      <span class="layer-name">${escapeHtml(label)}</span>
      <span class="layer-actions">
        <button type="button" class="layer-up" aria-label="Bring forward" title="Bring forward">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </button>
        <button type="button" class="layer-down" aria-label="Send backward" title="Send backward">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
        </button>
        <button type="button" class="layer-delete" aria-label="Delete layer" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </span>
    </li>`;
  }).join("");

  list.querySelectorAll(".layer-item").forEach(li => {
    const idx = Number(li.dataset.index);
    const obj = objects[idx];
    li.addEventListener("click", (e) => {
      if (e.target.closest(".layer-actions")) return;
      designCanvas.setActiveObject(obj);
      designCanvas.requestRenderAll();
    });
    li.querySelector(".layer-up").addEventListener("click", (e) => {
      e.stopPropagation();
      obj.bringForward();
      designCanvas.requestRenderAll();
      refreshLayersList();
      commitDesignHistory();
    });
    li.querySelector(".layer-down").addEventListener("click", (e) => {
      e.stopPropagation();
      obj.sendBackwards();
      designCanvas.requestRenderAll();
      refreshLayersList();
      commitDesignHistory();
    });
    li.querySelector(".layer-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      designCanvas.remove(obj);
      designCanvas.discardActiveObject();
      designCanvas.requestRenderAll();
      refreshLayersList();
      commitDesignHistory();
    });
  });
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- Undo / redo ---------- */

// History (undo/redo) and the hasContent/total/panel refresh are all kept per side
// (see sidesState) so switching sides never mixes up or loses another side's work.
function commitDesignHistory(){
  if (!designCanvas || isRestoringHistory) return;
  const st = sidesState[activeSideId];
  if (!st) return;
  const json = JSON.stringify(designCanvas.toJSON());
  if (st.history[st.historyIndex] !== json){
    st.history = st.history.slice(0, st.historyIndex + 1);
    st.history.push(json);
    st.historyIndex = st.history.length - 1;
  }
  st.hasContent = designCanvas.getObjects().length > 0;
  updateUndoRedoButtons();
  updateTotal();
  updateSidesPanelUI();

  // "Both Sides" was requested and the Front now has a design for the first time -
  // hop the customer over to Back so they don't have to notice and click it themselves.
  if (bothSidesRequested && !bothSidesAutoSwitched && activeSideId === "front" && st.hasContent){
    bothSidesAutoSwitched = true;
    setTimeout(() => {
      switchSide("back");
      showToast("Front looks great. Now add your design to the Back");
    }, 400);
  }
}

function restoreDesignFromJSON(json){
  isRestoringHistory = true;
  designCanvas.loadFromJSON(json, () => {
    designCanvas.requestRenderAll();
    selectedObject = null;
    updatePropsPanel(null);
    refreshLayersList();
    updateUndoRedoButtons();
    const st = sidesState[activeSideId];
    if (st) st.hasContent = designCanvas.getObjects().length > 0;
    updateTotal();
    updateSidesPanelUI();
    isRestoringHistory = false;
  });
}

function undoDesign(){
  const st = sidesState[activeSideId];
  if (!st || st.historyIndex <= 0) return;
  st.historyIndex--;
  restoreDesignFromJSON(st.history[st.historyIndex]);
}

function redoDesign(){
  const st = sidesState[activeSideId];
  if (!st || st.historyIndex >= st.history.length - 1) return;
  st.historyIndex++;
  restoreDesignFromJSON(st.history[st.historyIndex]);
}

function updateUndoRedoButtons(){
  const undoBtn = document.getElementById("tool-undo");
  const redoBtn = document.getElementById("tool-redo");
  const st = sidesState[activeSideId];
  if (undoBtn) undoBtn.disabled = !st || st.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = !st || st.historyIndex >= st.history.length - 1;
}

/* ---------- Cart handoff ---------- */

function summarizeDesign(){
  if (!designCanvas) return "";
  const texts = designCanvas.getObjects().filter(o => o.type === "i-text" || o.type === "text").map(o => o.text).filter(Boolean);
  const imageCount = designCanvas.getObjects().filter(o => o.type === "image").length;
  const parts = [];
  if (texts.length) parts.push(texts.map(t => `\u201C${t}\u201D`).join(", "));
  if (imageCount) parts.push(`${imageCount} custom image${imageCount > 1 ? "s" : ""}`);
  return parts.join(" + ");
}

// Composites the product photo + the customer's design layers into one
// flat thumbnail for the cart/checkout screens. Falls back gracefully
// (calls back with null) if the product photo can't be read back due to
// cross-origin restrictions - the design itself is still saved either way.
function buildFramedPreview(layout, callback){
  try {
    const S = 0.6; // export scale of the frame image
    const W = Math.round(layout.w * S), H = Math.round(layout.h * S);
    const tmp = document.createElement("canvas");
    tmp.width = W; tmp.height = H;
    const ctx = tmp.getContext("2d");
    const x = W * layout.inset[3] / 100, y = H * layout.inset[0] / 100;
    const w = W - x - W * layout.inset[1] / 100, h = H - y - H * layout.inset[2] / 100;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, w, h);

    const designImg = new Image();
    const frameImg = new Image();
    designImg.onerror = () => callback(null);
    frameImg.onerror = () => callback(null);
    designImg.onload = () => { frameImg.src = layout.file; };
    frameImg.onload = () => {
      try {
        ctx.drawImage(designImg, x, y, w, h);
        ctx.drawImage(frameImg, 0, 0, W, H); // frame on top, hides the print's edge
        callback(tmp.toDataURL("image/png"));
      } catch (e){ callback(null); }
    };
    designImg.src = designCanvas.toDataURL({ format: "png" });
  } catch (e){
    callback(null);
  }
}

function buildDesignPreview(product, callback){
  const frameLayout = getFrameLayout(product, selectedSize, selectedOrientation);
  if (frameLayout){ buildFramedPreview(frameLayout, callback); return; }
  try {
    const stageW = designCanvas.getWidth();
    const stageH = designCanvas.getHeight();
    const tmp = document.createElement("canvas");
    tmp.width = stageW;
    tmp.height = stageH;
    const ctx = tmp.getContext("2d");

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        if (bgImg.complete && bgImg.naturalWidth > 0){
          // Cover-fit, matching how the stage shows the photo (object-fit: cover)
          const scale = Math.max(stageW / bgImg.naturalWidth, stageH / bgImg.naturalHeight);
          const dw = bgImg.naturalWidth * scale;
          const dh = bgImg.naturalHeight * scale;
          ctx.drawImage(bgImg, (stageW - dw) / 2, (stageH - dh) / 2, dw, dh);
        }
      } catch (e){ /* CORS-tainted background - continue without it */ }

      const designImg = new Image();
      designImg.onload = () => {
        try {
          ctx.drawImage(designImg, 0, 0, stageW, stageH);
          callback(tmp.toDataURL("image/png"));
        } catch (e){
          callback(null);
        }
      };
      designImg.onerror = () => callback(null);
      designImg.src = designCanvas.toDataURL({ format: "png" });
    };

    bgImg.onload = finish;
    bgImg.onerror = finish;
    // Match whichever side is on screen right now (front/back have different photos).
    bgImg.src = getStageImage(product, selectedColor, activeSideId);
    setTimeout(finish, 1500); // safety net in case neither event fires
  } catch (e){
    callback(null);
  }
}

document.addEventListener("DOMContentLoaded", initCustomizePage);
