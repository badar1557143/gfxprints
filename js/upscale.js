/* =========================================================
   GfxPrints - Hi-res & DPI tool (original, runs fully in the browser)
   1. Normal upscaler: enlarges 2x / 3x / 4x (or "Auto" to reach 300 DPI) in small
      steps with high-quality resampling, then adds a light luminance-only sharpen.
   2. DPI tool: shows the print size you get at 72 / 150 / 300 / 600 DPI and downloads
      a PNG that carries that DPI inside the file (pHYs chunk), so print shops and
      Photoshop read it correctly.
   Note: a normal upscale makes the file bigger and keeps edges clean. It cannot
   invent detail that is not in the picture (that needs an AI upscaler).
   Nothing is uploaded; all pixels are processed on the customer's device.
   ========================================================= */
(function(){
  "use strict";
  const MAX_PIXELS = 16e6;          // keeps memory safe on phones (about 4000 x 4000)
  const MAX_SIDE = 16000;           // browser canvas side limit
  const $ = (id) => document.getElementById(id);
  const tick = () => new Promise((r) => setTimeout(r, 0));
  let root = null, S = null, onApply = null, timer = 0, token = 0;
  const CANCEL = { cancelled: true };

  /* ---------------- pure helpers (also unit-tested) ---------------- */
  function plan(sw, sh, want){
    const maxS = Math.min(MAX_SIDE / sw, MAX_SIDE / sh, Math.sqrt(MAX_PIXELS / (sw * sh)));
    let s = want, capped = false;
    if (s > maxS){ s = maxS; capped = true; }
    if (s < 1.05) return { ok: false, maxS, s: 1, w: sw, h: sh, capped: true };
    s = Math.floor(s * 100) / 100;
    return { ok: true, maxS, s, w: Math.round(sw * s), h: Math.round(sh * s), capped };
  }

  // one box-blur pass along rows (horizontal) or columns (vertical); edges are clamped.
  // It hands control back to the browser every ~1.5 million pixels so the page stays responsive.
  async function blurPass(a, o, w, h, r, vertical, pause){
    const win = 2 * r + 1, len = vertical ? h : w, lines = vertical ? w : h, step = vertical ? w : 1, line = vertical ? 1 : w;
    const every = Math.max(1, Math.floor(1.5e6 / len));
    for (let l = 0; l < lines; l++){
      const base = l * line;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += a[base + Math.min(len - 1, Math.max(0, k)) * step];
      for (let k = 0; k < len; k++){
        o[base + k * step] = (sum / win + 0.5) | 0;
        sum += a[base + Math.min(len - 1, k + r + 1) * step] - a[base + Math.max(0, k - r) * step];
      }
      if (pause && l % every === every - 1) await pause();
    }
  }

  // Unsharp mask on brightness only (no colour fringes). Works in place on RGBA data.
  // pause(fraction) is optional: it lets the caller show progress and cancel.
  async function sharpen(d, w, h, radius, amount, pause){
    const N = w * h, Y = new Uint8Array(N), B = new Uint8Array(N), T = new Uint8Array(N), chunk = 1.5e6;
    for (let i = 0, j = 0; i < N; i++, j += 4){
      Y[i] = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8;
      if (pause && i % chunk === chunk - 1) await pause();
    }
    B.set(Y);
    for (let p = 0; p < 3; p++){                                 // 3 box passes ~ a gaussian blur
      if (pause) await pause(p / 3 * 0.8);
      await blurPass(B, T, w, h, radius, false, pause); await blurPass(T, B, w, h, radius, true, pause);
    }
    if (pause) await pause(0.8);
    const k = amount / 100 * 1.5;
    for (let i = 0, j = 0; i < N; i++, j += 4){
      if (pause && i % chunk === chunk - 1) await pause(0.8 + 0.2 * i / N);
      let v = Y[i] - B[i];
      if (v > -3 && v < 3) continue;                              // ignore tiny differences so noise is not boosted
      if (d[j + 3] === 0) continue;
      v *= k; if (v > 48) v = 48; else if (v < -48) v = -48;      // limit halos
      d[j] += v; d[j + 1] += v; d[j + 2] += v;                    // Uint8ClampedArray clamps for us
    }
  }

  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b){ let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  // Write the DPI into a PNG file (pHYs chunk, pixels per metre)
  function pngWithDpi(bytes, dpi){
    const ppm = Math.round(dpi / 0.0254);
    const chunk = new Uint8Array(21), cv = new DataView(chunk.buffer);
    cv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4);
    cv.setUint32(8, ppm); cv.setUint32(12, ppm); chunk[16] = 1;
    cv.setUint32(17, crc32(chunk.subarray(4, 17)));
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const parts = [bytes.subarray(0, 8)];
    let pos = 8, total = 8;
    while (pos + 8 <= bytes.length){
      const len = dv.getUint32(pos), type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]), end = pos + 12 + len;
      if (type !== "pHYs"){ parts.push(bytes.subarray(pos, end)); total += end - pos; }
      if (type === "IHDR"){ parts.push(chunk); total += chunk.length; }
      pos = end;
    }
    const out = new Uint8Array(total); let o = 0;
    parts.forEach((p) => { out.set(p, o); o += p.length; });
    return out;
  }

  /* ---------------- canvas pipeline ---------------- */
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

  // Scan in strips so we never hold a second full-size copy in memory
  async function hasTransparency(c, pause){
    const x = c.getContext("2d"), rows = Math.max(1, Math.floor(2e6 / c.width));
    for (let y = 0; y < c.height; y += rows){
      const d = x.getImageData(0, y, c.width, Math.min(rows, c.height - y)).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
      if (pause) await pause();
    }
    return false;
  }

  // Enlarge in steps of at most 2x (smoother than one big jump), then sharpen.
  // pause(fraction 0..1) is optional (progress + cancel). Returns { canvas, alpha }.
  async function enlarge(src, sw, sh, scale, amount, pause, wantAlpha){
    let cur = mk(sw, sh);
    cur.getContext("2d").drawImage(src, 0, 0, sw, sh);
    if (pause) await pause(0.02);
    const alpha = wantAlpha ? await hasTransparency(cur, pause) : false;   // known before resampling: resizing never adds transparency
    if (scale < 1.01) return { canvas: cur, alpha };
    const tw = Math.round(sw * scale), th = Math.round(sh * scale);
    let cw = sw, ch = sh, i = 0;
    const steps = Math.max(1, Math.ceil(Math.log2(scale)));
    while (cw < tw || ch < th){
      const nw = Math.min(tw, Math.round(cw * Math.min(2, tw / cw))), nh = Math.min(th, Math.round(ch * Math.min(2, th / ch)));
      const c = mk(nw, nh), x = c.getContext("2d");
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(cur, 0, 0, nw, nh);
      cur = c; cw = nw; ch = nh; i++;
      if (pause) await pause(0.05 + 0.2 * Math.min(1, i / steps));
    }
    if (amount > 0){
      const x = cur.getContext("2d"), id = x.getImageData(0, 0, cw, ch);
      await sharpen(id.data, cw, ch, Math.max(1, Math.min(6, Math.round(scale * 0.7))), amount, pause ? (p) => pause(p == null ? undefined : 0.25 + 0.65 * p) : null);
      x.putImageData(id, 0, 0);
    }
    return { canvas: cur, alpha };
  }

  // Most detailed, non-empty part of the picture: used as the before/after preview spot
  function pickSpot(src, sw, sh){
    const k = Math.min(1, 128 / Math.max(sw, sh)), tw = Math.max(8, Math.round(sw * k)), th = Math.max(8, Math.round(sh * k));
    let d;
    try { const c = mk(tw, th); c.getContext("2d").drawImage(src, 0, 0, tw, th); d = c.getContext("2d").getImageData(0, 0, tw, th).data; }
    catch (e){ return { x: 0.5, y: 0.5 }; }
    const ww = Math.max(6, Math.round(tw * 0.25)), wh = Math.max(6, Math.round(th * 0.25));
    let best = { x: 0.5, y: 0.5 }, bestScore = -1;
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++){
      const x0 = Math.round((tw - ww) * (0.1 + gx * 0.2)), y0 = Math.round((th - wh) * (0.1 + gy * 0.2));
      let n = 0, s = 0, s2 = 0;
      for (let y = y0; y < y0 + wh; y++) for (let x = x0; x < x0 + ww; x++){
        const j = (y * tw + x) * 4; if (d[j + 3] < 200) continue;
        const l = (77 * d[j] + 150 * d[j + 1] + 29 * d[j + 2]) >> 8; n++; s += l; s2 += l * l;
      }
      if (n < ww * wh * 0.7) continue;
      const score = s2 / n - (s / n) * (s / n);
      if (score > bestScore){ bestScore = score; best = { x: (x0 + ww / 2) / tw, y: (y0 + wh / 2) / th }; }
    }
    return best;
  }

  /* ---------------- UI ---------------- */
  const svg = (p) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const chips = (id, list) => `<div class="hr-chips" id="${id}" role="group">${list.map(([v, l, on]) => `<button type="button" class="hr-chip${on ? " on" : ""}" data-v="${v}" aria-pressed="${on ? "true" : "false"}">${l}</button>`).join("")}</div>`;

  function build(){
    root = document.createElement("div");
    root.className = "bgr hr"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Hi-res and DPI");
    root.innerHTML = `
      <div class="bgr-top">
        <button type="button" class="pp-btn" id="hr-cancel">Cancel</button>
        <strong class="bgr-title">Hi-res &amp; DPI</strong>
        <button type="button" class="btn btn-accent btn-sm" id="hr-apply">Apply to design</button>
      </div>
      <div class="bgr-stage hr-stage">
        <div class="hr-compare">
          <figure><canvas id="hr-before"></canvas><figcaption>Before</figcaption></figure>
          <figure><canvas id="hr-after"></canvas><figcaption>After</figcaption></figure>
        </div>
        <p class="hr-note">A zoomed-in spot of your picture, shown at real print pixels.</p>
      </div>
      <div class="bgr-panel bgp">
        <div class="bgp-body">
          <section class="bgp-card">
            <h3 class="bgp-h">Enlarge</h3>
            ${chips("hr-scale", [["1", "Keep size"], ["2", "2×", true], ["3", "3×"], ["4", "4×"], ["auto", "Auto 300 DPI"]])}
          </section>
          <section class="bgp-card">
            <h3 class="bgp-h">Sharpen</h3>
            <div class="bgp-row"><label for="hr-sharp">Crispness</label><output class="bgp-val" for="hr-sharp"><span id="hr-sharp-v">35</span></output><input type="range" id="hr-sharp" min="0" max="100" value="35"></div>
          </section>
          <section class="bgp-card">
            <h3 class="bgp-h">Print DPI (always 300, saved inside the file)</h3>
            ${chips("hr-dpi", [["300", "300", true]])}
          </section>
          <section class="bgp-card hr-info" id="hr-info" role="status"></section>
        </div>
        <div class="bgp-actions"><button type="button" class="bgp-act" id="hr-dl">${svg('<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>')}<span id="hr-dl-t">Download PNG</span></button></div>
      </div>`;
    document.body.appendChild(root);

    $("hr-cancel").addEventListener("click", close);
    $("hr-apply").addEventListener("click", apply);
    $("hr-dl").addEventListener("click", download);
    document.addEventListener("keydown", (e) => { if (root && !root.hidden && e.key === "Escape" && !S.busy) close(); });
    $("hr-scale").addEventListener("click", (e) => { const b = e.target.closest(".hr-chip"); if (b && !b.disabled){ S.scale = b.dataset.v; mark("hr-scale", b); refresh(); } });
    $("hr-dpi").addEventListener("click", (e) => { const b = e.target.closest(".hr-chip"); if (b){ S.dpi = Number(b.dataset.v); mark("hr-dpi", b); info(); } });
    $("hr-sharp").addEventListener("input", () => { S.sharp = Number($("hr-sharp").value); $("hr-sharp-v").textContent = S.sharp; fill($("hr-sharp")); refresh(); });
  }
  function mark(id, btn){ $(id).querySelectorAll(".hr-chip").forEach((c) => { c.classList.toggle("on", c === btn); c.setAttribute("aria-pressed", c === btn ? "true" : "false"); }); }
  function fill(el){ el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min) * 100) + "%"); }

  // source: an <img> or <canvas>. opts: { dpi: current effective DPI on the product, inches: printed width in inches }
  function open(src, opts, cb){
    if (root && !root.hidden) return;
    if (!root) build();
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    if (!sw || !sh){ alert("This picture is not ready yet. Please try again in a moment."); return; }
    opts = opts || {};
    onApply = cb;
    const dpiNow = opts.dpi > 0 ? opts.dpi : 0;
    S = { src, sw, sh, dpiNow, inches: opts.inches || 0, scale: !dpiNow ? "2" : dpiNow < 290 ? "auto" : "1", sharp: 35, dpi: 300, busy: false, job: 0, kind: "", spot: pickSpot(src, sw, sh) };
    const auto = root.querySelector('#hr-scale [data-v="auto"]');
    auto.disabled = !dpiNow || dpiNow >= 290; auto.title = auto.disabled ? "Not needed: this picture is already about 300 DPI or more" : "";
    mark("hr-scale", root.querySelector(`#hr-scale [data-v="${S.scale}"]`));
    mark("hr-dpi", root.querySelector('#hr-dpi [data-v="300"]'));
    $("hr-sharp").value = 35; $("hr-sharp-v").textContent = "35"; fill($("hr-sharp"));
    root.hidden = false; document.body.classList.add("bgr-open");
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    root.tabIndex = -1; root.focus({ preventScroll: true });
    refresh();
  }
  function close(){ token++; clearTimeout(timer); if (S) S.job++; if (root) root.hidden = true; document.body.classList.remove("bgr-open"); S = null; }

  // the scale the user effectively gets (after the size limit)
  function current(){
    let want = S.scale === "auto" ? Math.min(4, Math.max(1.5, 300 / Math.max(1, S.dpiNow))) : Number(S.scale);
    if (want <= 1) return { ok: true, s: 1, w: S.sw, h: S.sh, capped: false, keep: true, maxS: 1 };
    return plan(S.sw, S.sh, want);
  }

  function info(){
    if (!S) return;
    const P = current(), el = $("hr-info"), f = (n) => n.toLocaleString();
    const dpi = S.dpi, inW = P.w / dpi, inH = P.h / dpi;
    let h = `<div class="hr-line"><span>Original</span><b>${f(S.sw)} × ${f(S.sh)} px</b></div>`;
    h += `<div class="hr-line"><span>Result</span><b>${f(P.w)} × ${f(P.h)} px${P.keep ? "" : ` (${P.s}×)`}</b></div>`;
    h += `<div class="hr-line"><span>Largest print at ${dpi} DPI</span><b>${inW.toFixed(1)} × ${inH.toFixed(1)} in<br>${(inW * 2.54).toFixed(1)} × ${(inH * 2.54).toFixed(1)} cm</b></div>`;
    let note = "", cls = "q-good";
    const now = Math.round(S.dpiNow), enough = S.dpiNow >= 290;
    if (!P.ok){
      cls = "q-ok";
      note = `This picture is already very large, so it cannot be enlarged further in the browser. You can still download it with the DPI saved inside.`;
    } else if (S.dpiNow && enough && P.keep){
      note = `Already sharp: about ${f(now)} DPI at the size it is used on this product. No enlarging needed.`;
    } else if (S.dpiNow && enough){
      cls = "q-ok";
      note = `Not needed: this picture already prints at about ${f(now)} DPI here (300 is enough). Enlarging only makes the file bigger.`;
    } else if (S.dpiNow){
      const after = Math.round(S.dpiNow * P.s);
      cls = after >= 250 ? "q-good" : after >= 150 ? "q-ok" : "q-low";
      note = `On this product: about ${f(now)} DPI now &rarr; about <b>${f(after)} DPI</b> after.`;
      if (P.capped) note += ` The biggest size that is safe in the browser is ${P.s}×.`;
    } else if (P.capped && !P.keep){
      cls = "q-ok"; note = `The biggest size that is safe in the browser is ${P.s}×.`;
    }
    el.innerHTML = h + (note ? `<p class="pp-quality ${cls}">${note}</p>` : "");
    const can = P.ok && !P.keep;
    $("hr-apply").disabled = !can || S.busy;
    $("hr-dl-t").textContent = `Download PNG (${dpi} DPI)`;
    $("hr-dl").disabled = S.busy;
  }

  function refresh(){ info(); clearTimeout(timer); timer = setTimeout(preview, 140); }

  async function preview(){
    if (!S) return;
    const my = ++token, P = current(), dpr = Math.min(2, window.devicePixelRatio || 1), stageW = root.querySelector(".hr-stage").clientWidth || 360, box = Math.max(120, Math.min(380, Math.floor((stageW - 48) / 2)));
    const s = P.ok ? P.s : 1;
    const cw = Math.max(8, Math.min(S.sw, S.sh, Math.round(box * dpr / s))), ch = cw;
    const sx = Math.round(Math.min(S.sw - cw, Math.max(0, S.sw * S.spot.x - cw / 2))), sy = Math.round(Math.min(S.sh - ch, Math.max(0, S.sh * S.spot.y - ch / 2)));
    try {
      const crop = mk(cw, ch); crop.getContext("2d").drawImage(S.src, sx, sy, cw, ch, 0, 0, cw, ch);
      const after = (await enlarge(crop, cw, ch, s, P.ok && s > 1 ? S.sharp : 0, null, false)).canvas;
      if (my !== token || !S) return;
      const b = $("hr-before"), a = $("hr-after");
      b.width = a.width = after.width; b.height = a.height = after.height;
      const bx = b.getContext("2d"); bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = "low";   // plain stretch = what printing would do
      bx.drawImage(crop, 0, 0, after.width, after.height);
      a.getContext("2d").drawImage(after, 0, 0);
      b.style.width = a.style.width = Math.round(after.width / dpr) + "px";
      b.style.height = a.style.height = Math.round(after.height / dpr) + "px";
    } catch (e){ /* preview is optional */ }
  }

  function setBusy(on, kind){
    S.busy = on; S.kind = on ? kind : "";
    $("hr-apply").textContent = "Apply to design";
    info();
    root.classList.toggle("hr-busy", on);
  }
  function setProgress(f){
    if (!S || !S.busy) return;
    const t = `Working… ${Math.max(1, Math.min(99, Math.round(f * 100)))}%`;
    if (S.kind === "apply") $("hr-apply").textContent = t; else $("hr-dl-t").textContent = t;
  }
  // handed to the pipeline: shows progress, lets the browser breathe, and stops if the dialog was closed
  function pauser(){
    const job = S.job;
    return async (f) => { if (f != null) setProgress(f); await tick(); if (!S || S.job !== job) throw CANCEL; };
  }

  async function build_full(){
    const P = current();
    const r = await enlarge(S.src, S.sw, S.sh, P.s, P.s > 1 ? S.sharp : 0, pauser(), true);
    return { P, canvas: r.canvas, alpha: r.alpha };
  }

  async function apply(){
    if (!S || S.busy) return;
    const P = current(); if (!P.ok || P.keep) return;
    setBusy(true, "apply");
    try {
      await tick();
      const { canvas, alpha } = await build_full();
      if (!S) return;
      setProgress(0.95); await tick();
      const url = alpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.95);
      if (!url || url.length < 64) throw new Error("export failed");
      const cb = onApply, w = canvas.width, h = canvas.height;
      close();
      if (cb) cb(url, { w, h, scale: P.s });
    } catch (e){
      if (e === CANCEL || !S) return;
      setBusy(false);
      alert("Could not enlarge this picture on this device. Try a smaller scale, or Keep size.");
    }
  }

  async function download(){
    if (!S || S.busy) return;
    setBusy(true, "dl");
    const dpi = S.dpi;
    try {
      await tick();
      const { canvas } = await build_full();
      if (!S) return;
      setProgress(0.95);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("export failed");
      const bytes = pngWithDpi(new Uint8Array(await blob.arrayBuffer()), dpi);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
      a.download = `gfxprints-${canvas.width}x${canvas.height}-${dpi}dpi.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e){
      if (e === CANCEL || !S) return;
      alert("Could not create the file on this device. Try a smaller scale.");
    }
    if (S) setBusy(false);
  }

  // Headless auto-fix (no dialog): enlarges a picture so it reaches about `target` DPI on the product.
  // opts: { dpiNow, target (default 300), sharp (default 30) }. Resolves { url, w, h, scale } or null when nothing is needed or possible.
  async function auto(src, opts){
    opts = opts || {};
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const target = opts.target || 300, dpiNow = opts.dpiNow || 0;
    if (!sw || !sh || !(dpiNow > 0) || dpiNow >= target * 0.93) return null;
    const P = plan(sw, sh, Math.min(4, target / dpiNow));
    if (!P.ok) return null;
    const r = await enlarge(src, sw, sh, P.s, opts.sharp == null ? 30 : opts.sharp, async () => { await tick(); }, true);
    const url = r.alpha ? r.canvas.toDataURL("image/png") : r.canvas.toDataURL("image/jpeg", 0.95);
    if (!url || url.length < 64) return null;
    return { url, w: r.canvas.width, h: r.canvas.height, scale: P.s };
  }

  window.GfxUpscale = { open, auto, pngWithDpi, _t: { plan, blurPass, sharpen, pngWithDpi, crc32, enlarge } };
})();
