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

/* ---------- Background remover ----------
   Runs fully in the customer's browser (no server). Tries an AI cut-out model first
   (@imgly/background-removal, loaded on demand from a CDN, cached after first use).
   If that can't load (offline, blocked, old phone), it falls back to a simple
   "erase the solid background connected to the edges" method. */
const BGREMOVE_LIB = new URL("assets/vendor/imgly/background-removal.mjs", document.baseURI).href; // self-hosted copy of @imgly/background-removal 1.5.8 + onnxruntime-web
let bgRemoveLibPromise = null;
let bgRemoveBusy = false;

function loadBgRemoveLib(){
  if (!bgRemoveLibPromise){
    bgRemoveLibPromise = import(BGREMOVE_LIB).catch((e) => { bgRemoveLibPromise = null; throw e; });
  }
  return bgRemoveLibPromise;
}

function blobToDataUrl(blob){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

function loadImageEl(src){
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("image load failed"));
    im.src = src;
  });
}

// Fallback: flood-fill from the border, erasing pixels close to the background color.
async function removeBgByColor(src){
  const im = await loadImageEl(src);
  const maxSide = 2000;
  const k = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k));
  const h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(im, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Background color = average of the four corner areas.
  const pts = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
  let r = 0, g = 0, b = 0, n = 0;
  pts.forEach(([x, y]) => {
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++){
      const px = Math.min(w-1, Math.max(0, x + (x ? -dx : dx)));
      const py = Math.min(h-1, Math.max(0, y + (y ? -dy : dy)));
      const i = (py * w + px) * 4;
      r += d[i]; g += d[i+1]; b += d[i+2]; n++;
    }
  });
  r /= n; g /= n; b /= n;
  const tol = 48; // how different a pixel may be and still count as background
  const near = (i) => d[i+3] < 10 || Math.hypot(d[i]-r, d[i+1]-g, d[i+2]-b) <= tol;

  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const p = y * w + x;
    if (!seen[p] && near(p * 4)){ seen[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < w; x++){ push(x, 0); push(x, h-1); }
  for (let y = 0; y < h; y++){ push(0, y); push(w-1, y); }
  while (stack.length){
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(x-1, y);
    if (x < w-1) push(x+1, y);
    if (y > 0) push(x, y-1);
    if (y < h-1) push(x, y+1);
  }
  let erased = 0;
  for (let p = 0; p < seen.length; p++) if (seen[p]){ d[p*4+3] = 0; erased++; }
  if (erased < w * h * 0.02) throw new Error("no solid background found");

  // Soften the cut edge by one pixel so it doesn't look jagged.
  const a0 = new Uint8ClampedArray(w * h);
  for (let p = 0; p < a0.length; p++) a0[p] = d[p*4+3];
  for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++){
    const p = y * w + x;
    if (a0[p] && (!a0[p-1] || !a0[p+1] || !a0[p-w] || !a0[p+w])) d[p*4+3] = 128;
  }
  ctx.putImageData(imgData, 0, 0);
  return c.toDataURL("image/png");
}

async function removeBgByAI(src, onProgress){
  const lib = await loadBgRemoveLib();
  const remove = lib.removeBackground || (lib.default && lib.default.removeBackground) || lib.default;
  if (typeof remove !== "function") throw new Error("library not usable");
  const blob = await remove(src, {
    output: { format: "image/png" },
    progress: (key, current, total) => {
      if (total && onProgress) onProgress(Math.min(99, Math.round(current / total * 100)));
    }
  });
  return blobToDataUrl(blob);
}

async function removeBackgroundOfSelected(){
  const obj = selectedObject;
  const btn = document.getElementById("prop-remove-bg");
  const status = document.getElementById("prop-remove-bg-status");
  if (bgRemoveBusy) return;
  if (!obj || obj.type !== "image"){
    showToast("Select an image first");
    return;
  }
  const src = obj.getSrc ? obj.getSrc() : (obj._element && obj._element.src);
  if (!src){ showToast("Couldn't read this image"); return; }

  bgRemoveBusy = true;
  const label = btn ? btn.textContent : "";
  const setBusy = (text) => { if (btn){ btn.disabled = true; btn.textContent = text; } };
  setBusy("Removing background…");
  if (status) status.textContent = "Working on it. The first time can take up to a minute while the model downloads.";

  let result = null, usedFallback = false, aiError = null;
  try {
    result = await removeBgByAI(src, (pct) => setBusy("Removing background… " + pct + "%"));
  } catch (e){
    aiError = e;
    console.warn("AI background removal unavailable, using simple method", e);
    try {
      setBusy("Removing background…");
      result = await removeBgByColor(src);
      usedFallback = true;
    } catch (e2){
      console.warn("Simple background removal failed", e2);
    }
  }

  bgRemoveBusy = false;
  if (btn){ btn.disabled = false; btn.textContent = label; }

  if (!result){
    if (status) status.textContent = "Couldn't remove the background (" + (aiError && aiError.message ? aiError.message : "unknown error") + "). Check your internet connection and try again, or use a photo with a plain background.";
    showToast("Background removal failed");
    return;
  }

  // Swap the picture but keep the same on-canvas size and position.
  const shownW = obj.getScaledWidth(), shownH = obj.getScaledHeight();
  if (!designCanvas.getObjects().includes(obj)){ return; } // layer was deleted meanwhile
  obj.setSrc(result, () => {
    obj.set({ scaleX: shownW / obj.width, scaleY: shownH / obj.height });
    obj.setCoords();
    designCanvas.setActiveObject(obj);
    designCanvas.requestRenderAll();
    refreshLayersList();
    commitDesignHistory();
    if (status) status.textContent = usedFallback
      ? "Done. This photo's plain background was erased. For a busy background, try again with a connection so the AI model can load. Press Undo to go back."
      : "Done. Background removed. Press Undo to go back.";
    showToast("Background removed");
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

function getUploadLibrary(){
  try {
    return JSON.parse(localStorage.getItem(STORAGE_UPLOAD_LIBRARY) || "[]");
  } catch (e){
    return [];
  }
}

function saveUploadLibrary(library){
  try {
    localStorage.setItem(STORAGE_UPLOAD_LIBRARY, JSON.stringify(library));
    return true;
  } catch (e){
    return false; // quota exceeded
  }
}

function addToUploadLibrary(dataUrl, name){
  let library = getUploadLibrary();
  if (library.some(item => item.dataUrl === dataUrl)) return; // already saved
  library.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dataUrl,
    name: name || "Upload"
  });
  if (library.length > UPLOAD_LIBRARY_MAX) library = library.slice(0, UPLOAD_LIBRARY_MAX);
  // If storage is full, drop the oldest entries until it fits.
  let droppedForSpace = false;
  while (library.length && !saveUploadLibrary(library)){
    library.pop();
    droppedForSpace = true;
  }
  if (droppedForSpace) showToast("Storage full. Removed your oldest upload to make space");
  renderUploadLibrary();
}

function removeFromUploadLibrary(id){
  saveUploadLibrary(getUploadLibrary().filter(item => item.id !== id));
  renderUploadLibrary();
}

function escAttr(s){
  return String(s || "").replace(/"/g, "&quot;");
}

function renderUploadLibrary(){
  const grid = document.getElementById("upload-library-grid");
  const empty = document.getElementById("upload-library-empty");
  if (!grid) return;
  const library = getUploadLibrary();
  if (empty) empty.style.display = library.length ? "none" : "block";

  grid.innerHTML = library.map(item => `
    <div class="upload-lib-item" data-id="${item.id}" title="${escAttr(item.name)}">
      <img src="${item.dataUrl}" alt="${escAttr(item.name)}">
      <button type="button" class="upload-lib-remove" data-id="${item.id}" aria-label="Remove ${escAttr(item.name)} from library">×</button>
    </div>
  `).join("");

  grid.querySelectorAll(".upload-lib-item img").forEach(img => {
    img.addEventListener("click", () => {
      const id = img.closest(".upload-lib-item").dataset.id;
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
    settingProps = false;
  } else if (obj.type === "image"){
    textPanel.style.display = "none";
    imagePanel.style.display = "block";
    settingProps = true;
    const opacityPct = Math.round((obj.opacity == null ? 1 : obj.opacity) * 100);
    document.getElementById("prop-image-opacity").value = opacityPct;
    document.getElementById("prop-image-opacity-val").textContent = opacityPct;
    settingProps = false;
  } else {
    // Multiple objects selected at once - just offer duplicate/delete.
    textPanel.style.display = "none";
    imagePanel.style.display = "none";
  }
}

function bindStudioPropertyPanel(){
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
      selectedObject.set("fontFamily", this.value);
      designCanvas.requestRenderAll();
      commitDesignHistory();
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

  const removeBg = document.getElementById("prop-remove-bg");
  if (removeBg) removeBg.addEventListener("click", removeBackgroundOfSelected);

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
