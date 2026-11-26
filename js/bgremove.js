/* =========================================================
   GfxPrints - Background Remover (original, runs fully in the browser)
   1. Auto-detects the background colour from the image border.
   2. Flood-fills from the edges (or removes the colour everywhere).
   3. Edge shrink + edge softness for clean cut-out edges.
   4. Erase / Restore brushes, colour picker, zoom and undo for fine-tuning.
   Nothing is uploaded; all pixels are processed on the customer's device.
   ========================================================= */
(function(){
  const MAX = 2000;                 // longest side used for processing
  const states = new Map();         // gfxId -> last applied brush edits + slider settings, so re-opening continues where you stopped
  const natives = new Map();        // gfxId -> the original full-resolution picture (used so the result keeps its DPI)
  const originals = new Map();      // gfxId -> uncut canvas, so Restore can bring pixels back
  let root = null, S = null, onDone = null, spaceDown = false;

  const $ = (id) => document.getElementById(id);
  const rng = (id, label, min, max, val, unit) =>
    `<div class="bgp-row"><label for="${id}">${label}</label><output class="bgp-val" for="${id}"><span id="${id}-v">${val}</span>${unit || ""}</output><input type="range" id="${id}" min="${min}" max="${max}" value="${val}"></div>`;
  const ICON = {
    erase:   '<path d="M7 21h10"/><path d="m5.5 13.5 8-8a2.1 2.1 0 0 1 3 0l2 2a2.1 2.1 0 0 1 0 3l-8 8H8.5l-3-3a2.1 2.1 0 0 1 0-2z"/><path d="m9 10 5 5"/>',
    restore: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    pick:    '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3z"/>',
    pan:     '<path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/>',
    undo:    '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo:    '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    reset:   '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>'
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const tool = (k, label, on) => `<button type="button" class="bgp-tool${on ? " on" : ""}" data-tool="${k}" aria-pressed="${on ? "true" : "false"}">${svg(k)}<span>${label}</span></button>`;

  function build(){
    root = document.createElement("div");
    root.className = "bgr"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Remove background");
    root.innerHTML = `
      <div class="bgr-top">
        <button type="button" class="pp-btn" id="bgr-cancel">Cancel</button>
        <div class="bgr-hist">
          <button type="button" class="bgr-ico" id="bgr-top-undo" aria-label="Undo" title="Undo" disabled>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
          </button>
          <button type="button" class="bgr-ico" id="bgr-top-redo" aria-label="Redo" title="Redo" disabled>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>
          </button>
        </div>
        <strong class="bgr-title">Remove background</strong>
        <button type="button" class="btn btn-accent btn-sm" id="bgr-done">Apply</button>
      </div>
      <div class="bgr-stage" id="bgr-stage"><div class="bgr-wrap" id="bgr-wrap"><canvas id="bgr-canvas"></canvas></div></div>
      <div class="bgr-ring" id="bgr-ring"></div>
      <div class="bgr-panel bgp">
        <div class="bgp-body">
          <div class="bgp-tools" id="bgr-tools" role="group" aria-label="Tools">
            ${tool("erase", "Erase", true)}${tool("restore", "Restore")}${tool("pick", "Pick color")}${tool("pan", "Move")}
          </div>
          <p class="bgp-hint" id="bgr-hint"></p>

          <section class="bgp-card" id="bgr-brush-card">
            ${rng("bgr-size", "Brush size", 4, 300, 40, "px")}
          </section>

          <section class="bgp-card">
            <h3 class="bgp-h">Automatic cut-out</h3>
            <div class="bgp-bg">
              <button type="button" class="bgr-swatch" id="bgr-swatch" aria-label="Pick background color from the picture" title="Pick background color"></button>
              <div class="bgp-bg-t"><strong>Background color</strong><span id="bgr-hex">#FFFFFF</span></div>
            </div>
            ${rng("bgr-tol", "Tolerance", 1, 70, 18, "%")}
            <label class="bgp-switch"><span>Remove this color everywhere<small>Also inside letters and holes, not just the outer background</small></span><input type="checkbox" id="bgr-global" role="switch"></label>
          </section>

          <section class="bgp-card">
            <h3 class="bgp-h">Edges</h3>
            ${rng("bgr-shrink", "Edge shrink", 0, 6, 0, "px")}
            ${rng("bgr-soft", "Edge softness", 0, 8, 1, "px")}
          </section>

          <section class="bgp-card">
            <h3 class="bgp-h">View</h3>
            <div class="bgp-zoom">
              <button type="button" class="bgp-step" id="bgr-zout" aria-label="Zoom out">&minus;</button>
              ${rng("bgr-zoom", "Zoom", 100, 600, 100, "%")}
              <button type="button" class="bgp-step" id="bgr-zin" aria-label="Zoom in">+</button>
            </div>
          </section>
        </div>

        <div class="bgp-actions">
          <button type="button" class="bgp-act" id="bgr-undo" disabled>${svg("undo")}<span>Undo</span></button>
          <button type="button" class="bgp-act" id="bgr-redo" disabled>${svg("redo")}<span>Redo</span></button>
          <button type="button" class="bgp-act bgp-reset" id="bgr-reset">${svg("reset")}<span>Reset</span></button>
        </div>
      </div>`;

    document.body.appendChild(root);

    $("bgr-cancel").addEventListener("click", cancel);
    $("bgr-done").addEventListener("click", apply);
    document.addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key === "Escape") cancel();
      // Undo / redo: Ctrl or Cmd + Z, Shift + Ctrl/Cmd + Z, Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && !e.altKey){
        const k = (e.key || "").toLowerCase(), t = e.target;
        const typing = t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !/range|checkbox|button/.test(t.type)));
        if (!typing && (k === "z" || e.code === "KeyZ" || k === "y" || e.code === "KeyY")){
          e.preventDefault(); e.stopPropagation();
          if (k === "y" || e.code === "KeyY" || e.shiftKey) redo(); else undo();
        }
      }
      if (e.code === "Space"){
        const t = e.target, typing = t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !/range|checkbox|button/.test(t.type));
        if (!typing){ spaceDown = true; e.preventDefault(); }       // Space = hand tool, never a button click
      }
    });
    document.addEventListener("keyup", (e) => {
      if (e.code !== "Space") return;
      spaceDown = false;
      if (root && !root.hidden) e.preventDefault();                  // stops a focused button firing its click
    });

    $("bgr-tools").querySelectorAll(".bgp-tool").forEach(c => c.addEventListener("click", () => setTool(c.dataset.tool)));
    ["bgr-tol", "bgr-shrink", "bgr-soft"].forEach(id => $(id).addEventListener("input", () => { $(id + "-v").textContent = $(id).value; schedule(); }));
    $("bgr-global").addEventListener("change", schedule);
    $("bgr-size").addEventListener("input", () => { $("bgr-size-v").textContent = $("bgr-size").value; });
    $("bgr-zoom").addEventListener("input", () => { $("bgr-zoom-v").textContent = $("bgr-zoom").value; layout(); });
    const zstep = (dir) => { const r = $("bgr-stage").getBoundingClientRect(); setZoom(Number($("bgr-zoom").value) * (dir > 0 ? 1.25 : 0.8), r.left + r.width / 2, r.top + r.height / 2); };
    $("bgr-zin").addEventListener("click", () => S && zstep(1));
    $("bgr-zout").addEventListener("click", () => S && zstep(-1));
    $("bgr-swatch").addEventListener("click", () => S && setTool("pick"));
    root.querySelector(".bgr-panel").addEventListener("input", (e) => { if (e.target.type === "range") fill(e.target); });
    $("bgr-undo").addEventListener("click", undo);
    $("bgr-redo").addEventListener("click", redo);
    $("bgr-top-undo").addEventListener("click", undo);
    $("bgr-top-redo").addEventListener("click", redo);
    $("bgr-reset").addEventListener("click", () => {
      S.edits.fill(0); S.undo = []; S.redo = [];
      [["bgr-tol", 18], ["bgr-shrink", 0], ["bgr-soft", 1]].forEach(([id, v]) => { $(id).value = v; $(id + "-v").textContent = v; });
      $("bgr-global").checked = false;
      // Everything that was erased comes back, so show the WHOLE original picture again (not the old trimmed window)
      S.view = { x: 0, y: 0, w: S.w, h: S.h };
      const cv0 = $("bgr-canvas"); cv0.width = S.view.w; cv0.height = S.view.h;
      $("bgr-zoom").value = 100; $("bgr-zoom-v").textContent = "100";
      $("bgr-stage").scrollLeft = 0; $("bgr-stage").scrollTop = 0;
      layout();
      autoDetect(); schedule(true); updateHistory(); syncFills();
    });

    const cv = $("bgr-canvas");
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, up));
    cv.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") up(e); });
    // Ctrl/Cmd + wheel (and trackpad pinch) zooms around the cursor
    $("bgr-stage").addEventListener("wheel", (e) => {
      if (!S || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      // Gentle steps: a mouse-wheel notch is ~15%, trackpad pinch events are tiny
      const dy = Math.max(-40, Math.min(40, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY));
      setZoom(Number($("bgr-zoom").value) * Math.exp(-dy * 0.004), e.clientX, e.clientY);
    }, { passive: false });
    window.addEventListener("resize", () => { if (!root.hidden) layout(); });
  }

  function toCanvas(src){
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const k = Math.min(1, MAX / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  function open(obj, cb){
    if (root && !root.hidden) return;          // already open: never restart (would reset zoom + edits)
    if (!root) build();
    if (!obj.gfxId) obj.gfxId = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    let base = originals.get(obj.gfxId);
    // The uncut original is gone (e.g. page reloaded): the current picture IS the base, so it is no longer "trimmed" from anything
    if (!base && obj.gfxTrim) obj.gfxTrim = null;
    if (!base){
      const srcEl = obj._originalElement || obj._element;
      base = toCanvas(srcEl); originals.set(obj.gfxId, base); natives.set(obj.gfxId, srcEl);
    }
    const w = base.width, h = base.height;
    let d;
    try { d = base.getContext("2d").getImageData(0, 0, w, h); }
    catch (err){ originals.delete(obj.gfxId); natives.delete(obj.gfxId); alert("This picture cannot be edited here. Please upload it again from your device."); return; }
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    S = { w, h, d: d.data, out, outImg: new ImageData(new Uint8ClampedArray(d.data), w, h), outCtx: out.getContext("2d"),
          auto: new Uint8Array(w * h).fill(255), edits: new Uint8Array(w * h), undo: [], redo: [], pointers: new Map(), gesture: null, bg: [255, 255, 255], tool: "erase",
          last: null, raf: 0, scale: 1, id: obj.gfxId };
    onDone = cb;
    // The editor only shows the part you kept (plus some room to touch it up), never the whole empty picture
    const st = states.get(obj.gfxId);
    S.view = { x: 0, y: 0, w, h };
    if (st && st.w === w && st.h === h && st.trim && (st.trim.w < w * 0.95 || st.trim.h < h * 0.95)){
      const t = st.trim, mx = Math.max(24, t.w * 0.15), my = Math.max(24, t.h * 0.15);
      const x0 = Math.max(0, Math.floor(t.x - mx)), y0 = Math.max(0, Math.floor(t.y - my));
      const x1 = Math.min(w, Math.ceil(t.x + t.w + mx)), y1 = Math.min(h, Math.ceil(t.y + t.h + my));
      S.view = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    const cv = $("bgr-canvas"); cv.width = S.view.w; cv.height = S.view.h;
    $("bgr-size").value = Math.max(4, Math.round(Math.min(w, h) / 20)); $("bgr-size-v").textContent = $("bgr-size").value;
    $("bgr-zoom").value = 100; $("bgr-zoom-v").textContent = "100";
    $("bgr-tol").value = 18; $("bgr-tol-v").textContent = "18";
    $("bgr-shrink").value = 0; $("bgr-shrink-v").textContent = "0";
    $("bgr-soft").value = 1; $("bgr-soft-v").textContent = "1";
    $("bgr-global").checked = false;
    root.hidden = false; document.body.classList.add("bgr-open");
    // Move focus into the dialog. Otherwise the "Remove background" button behind it keeps
    // focus, and pressing Space "clicks" it again, which re-opens the tool and resets the zoom.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    root.tabIndex = -1; root.focus({ preventScroll: true });
    setTool("erase");
    autoDetect();
    if (st && st.w === w && st.h === h){                       // continue from the last applied result
      S.edits = st.edits.slice(); S.bg = st.bg.slice(); swatch();
      [["bgr-tol", st.tol], ["bgr-shrink", st.shrink], ["bgr-soft", st.soft]].forEach(([id, v]) => { $(id).value = v; $(id + "-v").textContent = v; });
      $("bgr-global").checked = st.global;
    }
    updateHistory(); syncFills();
    requestAnimationFrame(() => { layout(); schedule(true); });
  }

  function close(){
    if (S) cancelAnimationFrame(S.raf);                      // a pending redraw must not run after the dialog is gone
    if (root) root.hidden = true;
    document.body.classList.remove("bgr-open"); S = null;
  }
  function cancel(){
    if (S && S.undo.length && !window.confirm("Discard your changes?")) return;
    close();
  }

  // Smallest box that still contains visible (non-transparent) pixels, plus a small margin
  function visibleBounds(){
    const { w, h } = S, a = S.outCtx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++){
      const row = y * w * 4;
      for (let x = 0; x < w; x++){
        if (a[row + x * 4 + 3] > 8){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    if (x1 < x0 || y1 < y0) return null;                      // nothing left: keep the full image
    const m = 2;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  // Build the final PNG. The cut-out is made at screen-friendly size (max 2000px), but the picture
  // itself is re-cut from the ORIGINAL full-resolution file, so print DPI is not lost.
  function buildOutput(bb){
    const src = natives.get(S.id);
    const nw = src ? (src.naturalWidth || src.width) : S.w, nh = src ? (src.naturalHeight || src.height) : S.h;
    const fx = nw / S.w, fy = nh / S.h;
    const c = document.createElement("canvas"), ctx = c.getContext("2d");
    if (!src || (fx < 1.02 && fy < 1.02)){
      c.width = bb.w; c.height = bb.h;
      ctx.drawImage(S.out, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);
      return c;
    }
    let ow = Math.max(1, Math.round(bb.w * fx)), oh = Math.max(1, Math.round(bb.h * fy));
    const CAP = 36e6;                                        // keep within browser canvas limits
    if (ow * oh > CAP){ const q = Math.sqrt(CAP / (ow * oh)); ow = Math.max(1, Math.round(ow * q)); oh = Math.max(1, Math.round(oh * q)); }
    c.width = ow; c.height = oh;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, bb.x * fx, bb.y * fy, bb.w * fx, bb.h * fy, 0, 0, ow, oh);   // original pixels
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(S.out, bb.x, bb.y, bb.w, bb.h, 0, 0, ow, oh);                      // the cut-out shape
    return c;
  }

  function apply(){
    if (!S) return;
    if (S.pending) schedule(true);                           // make sure the last slider change is in the mask
    // Trim the empty transparent area so the layer box wraps only what is left
    const bb = visibleBounds();
    if (!bb){ alert("Nothing is left of the picture. Use Restore, or lower the Tolerance, then try again."); return; }
    let out = buildOutput(bb), url = "";
    try { url = out.toDataURL("image/png"); } catch (err){ url = ""; }
    if (!url || url.length < 64){                            // browser refused a very large canvas: fall back to the screen-size cut-out
      out = document.createElement("canvas"); out.width = bb.w; out.height = bb.h;
      out.getContext("2d").drawImage(S.out, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);
      url = out.toDataURL("image/png");
    }
    const info = { x: bb.x, y: bb.y, w: bb.w, h: bb.h, fullW: S.w, fullH: S.h };
    states.set(S.id, {
      w: S.w, h: S.h, edits: S.edits.slice(), bg: S.bg.slice(), global: $("bgr-global").checked,
      tol: $("bgr-tol").value, shrink: $("bgr-shrink").value, soft: $("bgr-soft").value, trim: info
    });
    const cb = onDone; close();
    if (cb) cb(url, info);
  }

  const HINTS = {
    erase: "Drag over anything you want to remove. Pinch with two fingers to zoom.",
    restore: "Drag to bring back parts that were removed by mistake.",
    pick: "Tap the color on the picture that you want to remove.",
    pan: "Drag to move around when zoomed in. Pinch with two fingers to zoom."
  };
  function setTool(t){
    S.tool = t;
    $("bgr-tools").querySelectorAll(".bgp-tool").forEach(c => { const on = c.dataset.tool === t; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on ? "true" : "false"); });
    $("bgr-brush-card").hidden = !(t === "erase" || t === "restore");      // brush size only matters for the two brushes
    if (root && !root.hidden) requestAnimationFrame(layout);
    $("bgr-hint").textContent = HINTS[t];
    $("bgr-canvas").style.touchAction = "none";
    $("bgr-canvas").style.cursor = t === "pan" ? "grab" : "crosshair";
    $("bgr-ring").style.display = "none";
  }

  function layout(){
    if (!S) return;
    const st = $("bgr-stage"), z = Number($("bgr-zoom").value) / 100;
    const V = S.view;
    const fit = Math.min((st.clientWidth - 16) / V.w, (st.clientHeight - 16) / V.h);
    S.scale = Math.max(0.05, fit) * z;
    const cv = $("bgr-canvas");
    cv.style.width = Math.round(V.w * S.scale) + "px"; cv.style.height = Math.round(V.h * S.scale) + "px";
  }

  // ----- background colour: most common (quantised) colour along the image border -----
  function autoDetect(){
    const { w, h, d } = S, votes = new Map();
    const vote = (i) => { const j = i * 4; if (d[j + 3] < 10) return; const k = (d[j] >> 4) << 8 | (d[j + 1] >> 4) << 4 | (d[j + 2] >> 4); votes.set(k, (votes.get(k) || 0) + 1); };
    for (let x = 0; x < w; x++){ vote(x); vote((h - 1) * w + x); }
    for (let y = 0; y < h; y++){ vote(y * w); vote(y * w + w - 1); }
    let best = 0xfff, n = -1;
    votes.forEach((v, k) => { if (v > n){ n = v; best = k; } });
    S.bg = [((best >> 8) & 15) * 17, ((best >> 4) & 15) * 17, (best & 15) * 17];
    swatch();
  }
  function swatch(){
    $("bgr-swatch").style.background = `rgb(${S.bg.join(",")})`;
    $("bgr-hex").textContent = "#" + S.bg.map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  // blue "filled" part of each slider track
  function fill(el){ el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min) * 100) + "%"); }
  function syncFills(){ root.querySelectorAll('.bgr-panel input[type="range"]').forEach(fill); }

  // ----- mask computation -----
  function computeAuto(){
    const { w, h, d } = S, N = w * h;
    const tol = Number($("bgr-tol").value), shrink = Number($("bgr-shrink").value), soft = Number($("bgr-soft").value);
    const thr = Math.pow(tol / 100 * 441.67, 2), R = S.bg[0], G = S.bg[1], B = S.bg[2];
    const match = (i) => { const j = i * 4; if (d[j + 3] < 10) return true; const dr = d[j] - R, dg = d[j + 1] - G, db = d[j + 2] - B; return dr * dr + dg * dg + db * db <= thr; };
    const isBg = new Uint8Array(N);
    if ($("bgr-global").checked){
      for (let i = 0; i < N; i++) if (match(i)) isBg[i] = 1;
    } else {
      const stack = new Int32Array(N); let sp = 0;
      const push = (i) => { if (!isBg[i] && match(i)){ isBg[i] = 1; stack[sp++] = i; } };
      for (let x = 0; x < w; x++){ push(x); push((h - 1) * w + x); }
      for (let y = 0; y < h; y++){ push(y * w); push(y * w + w - 1); }
      while (sp){
        const i = stack[--sp], x = i % w;
        if (x > 0) push(i - 1); if (x < w - 1) push(i + 1);
        if (i >= w) push(i - w); if (i < N - w) push(i + w);
      }
    }
    let a = new Uint8Array(N);
    for (let i = 0; i < N; i++) a[i] = isBg[i] ? 0 : 255;
    // Anti-aliased edge pixels are a mix of subject + background. Give the 1px ring next to the
    // removed area a partial opacity based on how close its colour is to the background.
    const hi = thr * 3.2;                                    // squared distance where a ring pixel becomes fully opaque
    if (hi > thr) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      const i = y * w + x;
      if (isBg[i]) continue;
      if (!((x > 0 && isBg[i - 1]) || (x < w - 1 && isBg[i + 1]) || (y > 0 && isBg[i - w]) || (y < h - 1 && isBg[i + w]))) continue;
      const j = i * 4, dr = d[j] - R, dg = d[j + 1] - G, db = d[j + 2] - B, dd = dr * dr + dg * dg + db * db;
      if (dd < hi) a[i] = Math.max(0, Math.min(255, Math.round(255 * (dd - thr) / (hi - thr))));
    }
    for (let k = 0; k < shrink; k++){
      const n = a.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
        const i = y * w + x;
        if (a[i] && ((x > 0 && !a[i - 1]) || (x < w - 1 && !a[i + 1]) || (y > 0 && !a[i - w]) || (y < h - 1 && !a[i + w]))) n[i] = 0;
      }
      a = n;
    }
    if (soft > 0){ a = boxBlur(a, w, h, soft); a = boxBlur(a, w, h, soft); }
    S.auto = a;
  }

  function boxBlur(a, w, h, r){
    const t = new Uint8Array(a.length), o = new Uint8Array(a.length), win = 2 * r + 1;
    for (let y = 0; y < h; y++){
      const row = y * w; let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++){
        t[row + x] = (sum / win + 0.5) | 0;
        sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++){
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++){
        o[y * w + x] = (sum / win + 0.5) | 0;
        sum += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
      }
    }
    return o;
  }

  function pixelAlpha(i){
    const e = S.edits[i], oa = S.d[i * 4 + 3];
    return e === 1 ? 0 : e === 2 ? oa : (S.auto[i] * oa / 255) | 0;
  }

  function renderAll(){
    const o = S.outImg.data, N = S.w * S.h;
    for (let i = 0; i < N; i++) o[i * 4 + 3] = pixelAlpha(i);
    S.outCtx.putImageData(S.outImg, 0, 0);
    paint();
  }
  function paint(){
    const cv = $("bgr-canvas"), ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    const V = S.view;
    ctx.drawImage(S.out, V.x, V.y, V.w, V.h, 0, 0, V.w, V.h);
  }
  function schedule(now){
    if (!S) return;
    if (now === true){ cancelAnimationFrame(S.raf); S.pending = false; computeAuto(); renderAll(); return; }
    cancelAnimationFrame(S.raf); S.pending = true;
    S.raf = requestAnimationFrame(() => { if (!S) return; S.pending = false; computeAuto(); renderAll(); });
  }

  // ----- pointer tools -----
  function pt(e){
    const r = $("bgr-canvas").getBoundingClientRect();
    return { x: S.view.x + (e.clientX - r.left) / r.width * S.view.w, y: S.view.y + (e.clientY - r.top) / r.height * S.view.h };
  }
  function ring(e){
    const rg = $("bgr-ring"), size = Number($("bgr-size").value) * S.scale;
    if (S.tool === "pan" || S.tool === "pick"){ rg.style.display = "none"; return; }
    rg.style.display = "block"; rg.style.width = rg.style.height = size + "px";
    rg.style.left = e.clientX + "px"; rg.style.top = e.clientY + "px";
  }
  // ----- two-finger pinch zoom + pan (works in every tool) -----
  function setZoom(z, cx, cy){
    const zi = $("bgr-zoom"), st = $("bgr-stage");
    z = Math.max(Number(zi.min), Math.min(Number(zi.max), z));
    const p = pt({ clientX: cx, clientY: cy });                 // image point under the fingers
    zi.value = Math.round(z); $("bgr-zoom-v").textContent = zi.value; fill(zi);
    layout();
    const r = $("bgr-canvas").getBoundingClientRect();
    st.scrollLeft += r.left + (p.x - S.view.x) / S.view.w * r.width - cx;          // keep that point under the fingers
    st.scrollTop  += r.top  + (p.y - S.view.y) / S.view.h * r.height - cy;
  }
  function pinchInfo(){
    const [a, b] = Array.from(S.pointers.values());
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  function down(e){
    if (!S) return;
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;   // right click does nothing
    S.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    if (S.pointers.size >= 2){
      // A second finger: cancel the half-drawn stroke and start pinching
      if (S.last){ S.last = null; if (S.undo.length){ S.edits = S.undo.pop(); renderAll(); updateHistory(); } }
      const i = pinchInfo();
      S.gesture = { d: i.d, cx: i.cx, cy: i.cy, z: Number($("bgr-zoom").value) };
      $("bgr-ring").style.display = "none";
      return;
    }
    // Mouse: Move tool, middle button, or hold Space and drag = move the picture
    if (S.tool === "pan" || (e.pointerType === "mouse" && (e.button === 1 || spaceDown))){
      if (e.button === 1) e.preventDefault();
      S.pan = { x: e.clientX, y: e.clientY }; $("bgr-canvas").style.cursor = "grabbing"; return;
    }
    const p = pt(e);
    if (S.tool === "pick"){
      const x = Math.min(S.w - 1, Math.max(0, p.x | 0)), y = Math.min(S.h - 1, Math.max(0, p.y | 0)), j = (y * S.w + x) * 4;
      S.bg = [S.d[j], S.d[j + 1], S.d[j + 2]]; swatch(); schedule(true);
      return;
    }
    S.undo.push(S.edits.slice()); if (S.undo.length > 10) S.undo.shift();
    S.redo = []; updateHistory();
    S.last = p; stroke(p, p); ring(e);
  }
  function move(e){
    if (!S) return;
    if (S.pointers.has(e.pointerId)) S.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (S.pointers.size >= 2 && S.gesture){
      const i = pinchInfo(), g = S.gesture, st = $("bgr-stage");
      st.scrollLeft -= i.cx - g.cx; st.scrollTop -= i.cy - g.cy;   // two-finger drag moves the picture
      g.cx = i.cx; g.cy = i.cy;
      setZoom(g.z * Math.pow(i.d / g.d, 0.55), i.cx, i.cy);   // damped so pinching feels smooth, not jumpy
      return;
    }
    if (S.pan){
      const st = $("bgr-stage");
      st.scrollLeft -= e.clientX - S.pan.x; st.scrollTop -= e.clientY - S.pan.y;
      S.pan = { x: e.clientX, y: e.clientY };
      return;
    }
    ring(e);
    if (!S.last) return;
    const p = pt(e); stroke(S.last, p); S.last = p;
  }
  function up(e){
    if (S && e){
      S.pointers.delete(e.pointerId);
      if (S.pointers.size < 2) S.gesture = null;
      if (S.pointers.size === 0){ S.pan = null; $("bgr-canvas").style.cursor = S.tool === "pan" ? "grab" : "crosshair"; }
    }
    if (S) S.last = null;
    if (root) $("bgr-ring").style.display = "none";
  }

  function stroke(a, b){
    const r = Number($("bgr-size").value) / 2, mode = S.tool === "erase" ? 1 : 2;
    const dist = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(dist / Math.max(1, r / 3)));
    let x0 = S.w, y0 = S.h, x1 = 0, y1 = 0;
    for (let s = 0; s <= steps; s++){
      const cx = a.x + (b.x - a.x) * s / steps, cy = a.y + (b.y - a.y) * s / steps;
      const ys = Math.max(0, Math.floor(cy - r)), ye = Math.min(S.h - 1, Math.ceil(cy + r));
      const xs = Math.max(0, Math.floor(cx - r)), xe = Math.min(S.w - 1, Math.ceil(cx + r));
      for (let y = ys; y <= ye; y++) for (let x = xs; x <= xe; x++){
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r){
          const i = y * S.w + x; S.edits[i] = mode; S.outImg.data[i * 4 + 3] = pixelAlpha(i);
        }
      }
      x0 = Math.min(x0, xs); y0 = Math.min(y0, ys); x1 = Math.max(x1, xe); y1 = Math.max(y1, ye);
    }
    if (x1 >= x0 && y1 >= y0) S.outCtx.putImageData(S.outImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    paint();
  }
  function updateHistory(){
    if (!S) return;
    $("bgr-top-undo").disabled = $("bgr-undo").disabled = !S.undo.length;
    $("bgr-top-redo").disabled = $("bgr-redo").disabled = !S.redo.length;
  }
  function undo(){
    if (!S || !S.undo.length) return;
    S.redo.push(S.edits.slice());
    S.edits = S.undo.pop(); renderAll(); updateHistory();
  }
  function redo(){
    if (!S || !S.redo.length) return;
    S.undo.push(S.edits.slice());
    S.edits = S.redo.pop(); renderAll(); updateHistory();
  }

  // Another tool (e.g. the Hi-res tool) replaced the picture: the stored uncut original no longer matches it
  function forget(id){ if (!id) return; originals.delete(id); natives.delete(id); states.delete(id); }
  window.GfxBgRemove = { open, forget };
})();
