/* =========================================================
   GfxPrints - Canvas view: zoom + Hand tool (built from scratch)
   - Ctrl/Cmd + mouse wheel (or trackpad pinch) zooms toward the cursor
   - Plain wheel scrolls the canvas when it is larger than the view
   - Hand tool (H, or hold Space, or middle mouse) drags the canvas anywhere
   - Toolbar: Hand | - slider + | 100% menu | Fit
   Public API: window.GfxView { stepZoom(dir), zoomTo(k), reset(), fit(), toggleHand(), setHand(on) }
   ========================================================= */
(function(){
  const MIN = 0.25, MAX = 3, PRESETS = [25, 50, 75, 100, 125, 150, 200, 250, 300];
  const st = { k: 1, x: 0, y: 0, hand: false, space: false };
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let area, wrap, slider, pct, menu, handBtn;

  const mobile = () => window.matchMedia("(max-width: 900px)").matches;
  const bgrOpen = () => !!document.querySelector(".bgr:not([hidden])");

  /* ---------- state -> DOM ---------- */
  function apply(){
    wrap.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) scale(${st.k.toFixed(4)})`;
    const p = Math.round(st.k * 100);
    pct.firstChild.nodeValue = p + "%";
    slider.value = p;
    slider.style.setProperty("--fill", ((p - 25) / 275 * 100) + "%");
    menu.querySelectorAll("[data-z]").forEach((b) => b.classList.toggle("on", +b.dataset.z === p));
  }
  function bounds(loose){
    const a = area.getBoundingClientRect();
    const w = wrap.offsetWidth * st.k, h = wrap.offsetHeight * st.k;
    // loose (hand tool): keep a corner of the page in view. strict (wheel): behave like scrolling.
    const mx = loose ? a.width / 2 + w / 2 - 120 : Math.max(0, (w - a.width) / 2 + 24);
    const my = loose ? a.height / 2 + h / 2 - 120 : Math.max(0, (h - a.height) / 2 + 24);
    return [mx, my];
  }
  function clampPan(loose){
    const [mx, my] = bounds(loose);
    st.x = clamp(st.x, -mx, mx); st.y = clamp(st.y, -my, my);
  }

  /* ---------- zoom ---------- */
  // Zoom to k keeping the point (cx, cy) in viewport coordinates fixed (default: centre of the view).
  function zoomAt(k, cx, cy){
    k = clamp(k, MIN, MAX);
    const r = wrap.getBoundingClientRect();
    const ctrX = r.left + r.width / 2, ctrY = r.top + r.height / 2;
    const baseX = ctrX - st.x, baseY = ctrY - st.y;           // un-translated centre of the page
    if (cx == null){ const a = area.getBoundingClientRect(); cx = a.left + a.width / 2; cy = a.top + a.height / 2; }
    const ratio = k / st.k;
    st.x = cx - baseX - (cx - ctrX) * ratio;
    st.y = cy - baseY - (cy - ctrY) * ratio;
    st.k = k;
    clampPan(true); apply();
  }
  function stepZoom(dir){
    const cur = Math.round(st.k * 100);
    const next = dir > 0 ? PRESETS.find((p) => p > cur) : [...PRESETS].reverse().find((p) => p < cur);
    if (next) zoomAt(next / 100);
  }
  function reset(){ st.k = 1; st.x = 0; st.y = 0; apply(); }
  function fit(){
    const a = area.getBoundingClientRect();
    const k = Math.min((a.width - 40) / wrap.offsetWidth, (a.height - (mobile() ? 90 : 210)) / wrap.offsetHeight);
    st.k = clamp(k, MIN, 2); st.x = 0; st.y = 0; apply();
  }

  /* ---------- hand tool ---------- */
  function paintHand(){
    const on = st.hand || st.space;
    area.classList.toggle("hand-on", on);
    handBtn.setAttribute("aria-pressed", String(st.hand));
    handBtn.classList.toggle("on", st.hand);
  }
  function setHand(on){ st.hand = !!on; paintHand(); }

  /* ---------- wiring ---------- */
  function typing(e){
    const t = e.target, a = typeof designCanvas !== "undefined" && designCanvas && designCanvas.getActiveObject();
    if (a && a.isEditing) return true;
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== "range");
  }
  function init(){
    area = $("main"); wrap = $("stage-zoom-wrap"); slider = $("vc-slider");
    pct = $("vc-pct"); menu = $("vc-menu"); handBtn = $("vc-hand");
    if (!area || !wrap || !slider || !pct || !menu || !handBtn) return;

    handBtn.addEventListener("click", () => setHand(!st.hand));
    $("vc-in").addEventListener("click", () => stepZoom(1));
    $("vc-out").addEventListener("click", () => stepZoom(-1));
    $("vc-fit").addEventListener("click", fit);
    slider.addEventListener("input", () => zoomAt(slider.value / 100));

    // percent menu
    const closeMenu = () => { menu.hidden = true; pct.setAttribute("aria-expanded", "false"); };
    pct.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; pct.setAttribute("aria-expanded", String(!menu.hidden)); });
    menu.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.act === "fit") fit(); else if (b.dataset.act === "reset") reset(); else zoomAt(b.dataset.z / 100);
      closeMenu();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".vb-menu-wrap")) closeMenu(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

    // Ctrl/Cmd + wheel (and trackpad pinch) = zoom to cursor. Plain wheel = scroll when it overflows.
    area.addEventListener("wheel", (e) => {
      if (bgrOpen() || e.target.closest(".vbar")) return;
      if (e.ctrlKey || e.metaKey){
        e.preventDefault();
        zoomAt(st.k * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022)), e.clientX, e.clientY);
      } else if (!mobile()){
        e.preventDefault();
        st.x -= e.shiftKey ? e.deltaY : e.deltaX;
        st.y -= e.shiftKey ? 0 : e.deltaY;
        clampPan(false); apply();
      }
    }, { passive: false });

    // drag to pan: Hand tool / held Space with the left button, or the middle button any time
    let pan = null;
    area.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); });
    area.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".vbar") || bgrOpen()) return;
      const hand = (st.hand || st.space) && e.button === 0;
      if (!hand && e.button !== 1) return;
      e.preventDefault();
      pan = { sx: e.clientX, sy: e.clientY, x: st.x, y: st.y };
      area.setPointerCapture(e.pointerId); area.classList.add("panning");
    });
    area.addEventListener("pointermove", (e) => {
      if (!pan) return;
      st.x = pan.x + e.clientX - pan.sx; st.y = pan.y + e.clientY - pan.sy;
      clampPan(true); apply();
    });
    const end = () => { pan = null; area.classList.remove("panning"); };
    area.addEventListener("pointerup", end); area.addEventListener("pointercancel", end);

    // hold Space = temporary Hand tool, H = toggle Hand tool
    document.addEventListener("keydown", (e) => {
      if (typing(e) || bgrOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "Space"){ e.preventDefault(); if (!st.space){ st.space = true; paintHand(); } }
      else if (e.key === "h" || e.key === "H"){ e.preventDefault(); setHand(!st.hand); }
      else if (e.key === "f" || e.key === "F"){ e.preventDefault(); fit(); }
    });
    document.addEventListener("keyup", (e) => {
      if (e.code === "Space" && st.space){ e.preventDefault(); st.space = false; paintHand(); }
    });
    window.addEventListener("blur", () => { st.space = false; paintHand(); });
    window.addEventListener("resize", () => { clampPan(true); apply(); });

    apply();
    window.GfxView = { stepZoom, zoomTo: (k) => zoomAt(k), reset, fit, toggleHand: () => setHand(!st.hand), setHand };
  }
  if (document.readyState !== "loading") init(); else document.addEventListener("DOMContentLoaded", init);
})();
