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
  const originals = new Map();      // gfxId -> uncut canvas, so Restore can bring pixels back
  let root = null, S = null, onDone = null;

  const $ = (id) => document.getElementById(id);
  const rng = (id, label, min, max, val, unit) =>
    `<div class="pp-row"><label for="${id}">${label}</label><output class="pp-val"><span id="${id}-v">${val}</span>${unit || ""}</output><input type="range" id="${id}" min="${min}" max="${max}" value="${val}"></div>`;

  function build(){
    root = document.createElement("div");
    root.className = "bgr"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Remove background");
    root.innerHTML = `
      <div class="bgr-top">
        <button type="button" class="pp-btn" id="bgr-cancel">Cancel</button>
        <strong>Remove background</strong>
        <button type="button" class="btn btn-accent btn-sm" id="bgr-done">Apply</button>
      </div>
      <div class="bgr-stage" id="bgr-stage"><div class="bgr-wrap" id="bgr-wrap"><canvas id="bgr-canvas"></canvas></div></div>
      <div class="bgr-ring" id="bgr-ring"></div>
      <div class="bgr-panel pp">
        <div class="pp-chips" id="bgr-tools">
          <button type="button" class="pp-chip on" data-tool="erase">Erase</button>
          <button type="button" class="pp-chip" data-tool="restore">Restore</button>
          <button type="button" class="pp-chip" data-tool="pick">Pick background</button>
          <button type="button" class="pp-chip" data-tool="pan">Move</button>
        </div>
        <p class="pp-tip" id="bgr-hint"></p>
        ${rng("bgr-size", "Brush size", 4, 300, 40)}
        ${rng("bgr-tol", "Tolerance", 1, 70, 18, "%")}
        ${rng("bgr-shrink", "Edge shrink", 0, 6, 0, "px")}
        ${rng("bgr-soft", "Edge softness", 0, 8, 1, "px")}
        ${rng("bgr-zoom", "Zoom", 100, 400, 100, "%")}
        <label class="pp-check"><input type="checkbox" id="bgr-global"> Remove this color everywhere (not just the outer background)</label>
        <div class="pp-colorline"><span class="pp-tip">Background color</span><span class="bgr-swatch" id="bgr-swatch"></span></div>
        <div class="pp-grid pp-grid-2"><button type="button" class="pp-btn" id="bgr-undo">Undo brush</button><button type="button" class="pp-btn" id="bgr-reset">Reset</button></div>
      </div>`;
    document.body.appendChild(root);

    $("bgr-cancel").addEventListener("click", close);
    $("bgr-done").addEventListener("click", apply);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !root.hidden) close(); });

    $("bgr-tools").querySelectorAll(".pp-chip").forEach(c => c.addEventListener("click", () => setTool(c.dataset.tool)));
    ["bgr-tol", "bgr-shrink", "bgr-soft"].forEach(id => $(id).addEventListener("input", () => { $(id + "-v").textContent = $(id).value; schedule(); }));
    $("bgr-global").addEventListener("change", schedule);
    $("bgr-size").addEventListener("input", () => { $("bgr-size-v").textContent = $("bgr-size").value; });
    $("bgr-zoom").addEventListener("input", () => { $("bgr-zoom-v").textContent = $("bgr-zoom").value; layout(); });
    $("bgr-undo").addEventListener("click", undo);
    $("bgr-reset").addEventListener("click", () => { S.edits.fill(0); S.undo = []; autoDetect(); schedule(true); });

    const cv = $("bgr-canvas");
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    ["pointerup", "pointercancel", "pointerleave"].forEach(ev => cv.addEventListener(ev, up));
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
    if (!root) build();
    if (!obj.gfxId) obj.gfxId = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    let base = originals.get(obj.gfxId);
    if (!base){ base = toCanvas(obj._originalElement || obj._element); originals.set(obj.gfxId, base); }
    const w = base.width, h = base.height;
    const d = base.getContext("2d").getImageData(0, 0, w, h);
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    S = { w, h, d: d.data, out, outImg: new ImageData(new Uint8ClampedArray(d.data), w, h), outCtx: out.getContext("2d"),
          auto: new Uint8Array(w * h).fill(255), edits: new Uint8Array(w * h), undo: [], bg: [255, 255, 255], tool: "erase",
          last: null, raf: 0, scale: 1 };
    onDone = cb;
    const cv = $("bgr-canvas"); cv.width = w; cv.height = h;
    $("bgr-size").value = Math.max(4, Math.round(Math.min(w, h) / 20)); $("bgr-size-v").textContent = $("bgr-size").value;
    $("bgr-zoom").value = 100; $("bgr-zoom-v").textContent = "100";
    $("bgr-tol").value = 18; $("bgr-tol-v").textContent = "18";
    $("bgr-shrink").value = 0; $("bgr-shrink-v").textContent = "0";
    $("bgr-soft").value = 1; $("bgr-soft-v").textContent = "1";
    $("bgr-global").checked = false;
    root.hidden = false; document.body.classList.add("bgr-open");
    setTool("erase");
    autoDetect();
    requestAnimationFrame(() => { layout(); schedule(true); });
  }

  function close(){ if (root) root.hidden = true; document.body.classList.remove("bgr-open"); S = null; }

  function apply(){
    if (!S) return;
    const url = S.out.toDataURL("image/png");
    const cb = onDone; close();
    if (cb) cb(url);
  }

  const HINTS = {
    erase: "Drag over anything you want to remove.",
    restore: "Drag to bring back parts that were removed by mistake.",
    pick: "Tap the background color you want to remove.",
    pan: "Scroll or drag to move around when zoomed in."
  };
  function setTool(t){
    S.tool = t;
    $("bgr-tools").querySelectorAll(".pp-chip").forEach(c => c.classList.toggle("on", c.dataset.tool === t));
    $("bgr-hint").textContent = HINTS[t];
    $("bgr-canvas").style.touchAction = t === "pan" ? "auto" : "none";
    $("bgr-canvas").style.cursor = t === "pan" ? "grab" : "crosshair";
    $("bgr-ring").style.display = "none";
  }

  function layout(){
    if (!S) return;
    const st = $("bgr-stage"), z = Number($("bgr-zoom").value) / 100;
    const fit = Math.min((st.clientWidth - 16) / S.w, (st.clientHeight - 16) / S.h);
    S.scale = Math.max(0.05, fit) * z;
    const cv = $("bgr-canvas");
    cv.style.width = Math.round(S.w * S.scale) + "px"; cv.style.height = Math.round(S.h * S.scale) + "px";
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
  function swatch(){ $("bgr-swatch").style.background = `rgb(${S.bg.join(",")})`; }

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
    ctx.drawImage(S.out, 0, 0);
  }
  function schedule(now){
    if (!S) return;
    if (now === true){ computeAuto(); renderAll(); return; }
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(() => { computeAuto(); renderAll(); });
  }

  // ----- pointer tools -----
  function pt(e){
    const r = $("bgr-canvas").getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * S.w, y: (e.clientY - r.top) / r.height * S.h };
  }
  function ring(e){
    const rg = $("bgr-ring"), size = Number($("bgr-size").value) * S.scale;
    if (S.tool === "pan" || S.tool === "pick"){ rg.style.display = "none"; return; }
    rg.style.display = "block"; rg.style.width = rg.style.height = size + "px";
    rg.style.left = e.clientX + "px"; rg.style.top = e.clientY + "px";
  }
  function down(e){
    if (!S || S.tool === "pan") return;
    const p = pt(e);
    if (S.tool === "pick"){
      const x = Math.min(S.w - 1, Math.max(0, p.x | 0)), y = Math.min(S.h - 1, Math.max(0, p.y | 0)), j = (y * S.w + x) * 4;
      S.bg = [S.d[j], S.d[j + 1], S.d[j + 2]]; swatch(); schedule(true);
      return;
    }
    e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    S.undo.push(S.edits.slice()); if (S.undo.length > 15) S.undo.shift();
    S.last = p; stroke(p, p); ring(e);
  }
  function move(e){
    if (!S) return;
    ring(e);
    if (!S.last) return;
    const p = pt(e); stroke(S.last, p); S.last = p;
  }
  function up(){ if (S) S.last = null; if (root) $("bgr-ring").style.display = "none"; }

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
  function undo(){
    if (!S || !S.undo.length) return;
    S.edits = S.undo.pop(); renderAll();
  }

  window.GfxBgRemove = { open };
})();
