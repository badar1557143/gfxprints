/* =========================================================
   GfxPrints - Design Studio tool trays (phones / tablets)
   Tapping a tool on the editing tool bar (Font, Size, Color, Format,
   Effects, Spacing, Opacity, Layers, Position, Nudge, More ...) opens a
   small floating "tray" above the bar instead of the big sheet, so the
   product stays in view while the customer adjusts it.

   Opened by:  document.dispatchEvent(new CustomEvent("studio:tray", { detail:{ name } }))
   Reuses the same canvas helpers as the Properties panel
   (commitDesignHistory, refreshLayersList, updatePropsPanel, applyFontFamily).
   ========================================================= */
(function(){
  function ready(fn){
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function(){
    const small = () => window.matchMedia("(max-width: 900px)").matches;
    const canvas = () => (typeof designCanvas !== "undefined" && designCanvas) ? designCanvas : null;
    const active = () => { const c = canvas(); return c ? c.getActiveObject() : null; };
    const isText = (o) => !!o && (o.type === "i-text" || o.type === "text" || o.type === "textbox");
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const $ = (id) => document.getElementById(id);
    const fire = (el, types) => { if (el) types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))); };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const commit = () => { if (typeof commitDesignHistory === "function") commitDesignHistory(); };
    const redraw = () => { const c = canvas(); if (c) c.requestRenderAll(); };
    const relayers = () => { if (typeof refreshLayersList === "function") refreshLayersList(); };
    const syncPanel = (o) => { try { if (typeof updatePropsPanel === "function" && o) updatePropsPanel(o); } catch (_) {} };
    function touchText(o){ o.dirty = true; if (o.initDimensions) o.initDimensions(); o.setCoords(); }

    const I = (d, w) => '<svg width="' + (w || 20) + '" height="' + (w || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

    /* ---------- tray shell ---------- */
    const root = document.createElement("div");
    root.className = "tr";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.innerHTML = '<div class="tr-head"><span class="tr-title" id="tr-title"></span>' +
      '<button type="button" class="tr-x" id="tr-x" aria-label="Close tool">' + I('<path d="M6 6l12 12M18 6 6 18"/>', 18) + '</button></div>' +
      '<div class="tr-body" id="tr-body"></div>';
    document.body.appendChild(root);
    const body = root.querySelector("#tr-body");
    const title = root.querySelector("#tr-title");
    let current = "";

    function measure(){
      if (root.hidden){ document.documentElement.style.removeProperty("--tray-h"); return; }
      document.documentElement.style.setProperty("--tray-h", (root.offsetHeight + 14) + "px");
    }
    function markCtx(){
      document.querySelectorAll(".app-ctx-btn").forEach(b => b.classList.toggle("on", !!current && b.dataset.tray === current));
    }
    function closeTray(){
      if (root.hidden) return;
      root.hidden = true;
      current = "";
      document.body.classList.remove("tray-open");
      body.innerHTML = "";
      measure(); markCtx();
    }
    root.querySelector("#tr-x").addEventListener("click", closeTray);

    /* ---------- tools ---------- */
    const TOOLS = {};
    const TEXT_ONLY = new Set(["font", "styles", "size", "color", "format", "effects", "spacing"]);

    /* FONT: category pills + a swipe row of fonts, each in its own face */
    TOOLS.font = { title: "Font", render(){
      const sel = $("prop-text-font");
      if (!sel) return;
      const fonts = [];
      sel.querySelectorAll("optgroup").forEach(g => g.querySelectorAll("option").forEach(o => {
        fonts.push({ v: o.value, n: o.textContent.replace(/\s*\(.*\)/, ""), g: g.label.replace(/&amp;/g, "&") });
      }));
      const groups = ["All"].concat(fonts.map(f => f.g).filter((g, i, a) => a.indexOf(g) === i));
      let grp = "All";
      body.innerHTML = '<div class="tr-row tr-pills" id="f-groups"></div><div class="tr-row tr-scroll" id="f-list"></div>';
      const gEl = body.querySelector("#f-groups"), lEl = body.querySelector("#f-list");
      const cur = () => { const o = active(); return o ? o.fontFamily : ""; };
      function draw(){
        gEl.innerHTML = groups.map(g => '<button type="button" class="tr-pill' + (g === grp ? " on" : "") + '" data-g="' + esc(g) + '">' + esc(g.split(/[ &]/)[0]) + '</button>').join("");
        lEl.innerHTML = fonts.filter(f => grp === "All" || f.g === grp).map(f =>
          '<button type="button" class="tr-chip tr-font' + (f.v === cur() ? " on" : "") + '" data-v="' + esc(f.v) + '" style="font-family:' + esc(f.v) + '">' + esc(f.n) + '</button>').join("");
      }
      draw();
      gEl.addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (!b) return; grp = b.dataset.g; draw(); lEl.scrollLeft = 0; });
      lEl.addEventListener("click", (e) => {
        const b = e.target.closest("[data-v]"); if (!b) return;
        sel.value = b.dataset.v; fire(sel, ["change"]);
        lEl.querySelectorAll(".tr-font").forEach(x => x.classList.toggle("on", x === b));
      });
      const on = lEl.querySelector(".on"); if (on && on.scrollIntoView) on.scrollIntoView({ inline: "center", block: "nearest" });
    }};

    /* TEXT STYLES: Title ... Body */
    const STYLES = [
      { n: "Title", s: 72, b: true, sp: 0, p: 1.9 },
      { n: "Subtitle", s: 48, b: true, sp: 0, p: 1.45 },
      { n: "Heading", s: 40, b: false, sp: 0, p: 1.3 },
      { n: "Subheading", s: 30, b: true, sp: 0, p: 1.1 },
      { n: "Section header", s: 22, b: true, sp: 160, p: 0.9 },
      { n: "Body", s: 18, b: false, sp: 0, p: 0.85 }
    ];
    TOOLS.styles = { title: "Text styles", render(){
      body.innerHTML = '<div class="tr-list">' + STYLES.map((s, i) =>
        '<button type="button" class="tr-style" data-i="' + i + '" style="font-size:' + s.p + 'rem;font-weight:' + (s.b ? 800 : 400) + ';letter-spacing:' + (s.sp / 1000) + 'em">' + s.n +
        '<small>' + s.s + ' px</small></button>').join("") + '</div>';
      body.querySelector(".tr-list").addEventListener("click", (e) => {
        const b = e.target.closest("[data-i]"); const o = active(); const c = canvas();
        if (!b || !isText(o) || !c) return;
        const s = STYLES[Number(b.dataset.i)];
        o.set({ fontSize: s.s, fontWeight: s.b ? "bold" : "normal", charSpacing: s.sp });
        let g = 40; touchText(o);
        while (o.width * (o.scaleX || 1) > c.getWidth() * 0.92 && o.fontSize > 12 && g--){ o.set("fontSize", Math.max(12, Math.round(o.fontSize * 0.9))); touchText(o); }
        redraw(); syncPanel(o); commit();
      });
    }};

    /* FONT SIZE: slider, stepper, quick sizes */
    TOOLS.size = { title: "Font size", render(){
      const QUICK = [12, 18, 24, 32, 48, 64, 96, 128];
      body.innerHTML =
        '<div class="tr-row tr-split"><input type="range" class="tr-range" id="sz-r" min="10" max="160" step="1" aria-label="Font size">' +
        '<div class="tr-step"><button type="button" id="sz-dn" aria-label="Smaller">−</button><input type="number" id="sz-n" min="10" max="160" inputmode="numeric" aria-label="Size in px"><button type="button" id="sz-up" aria-label="Larger">+</button></div></div>' +
        '<div class="tr-row tr-scroll">' + QUICK.map(q => '<button type="button" class="tr-pill" data-q="' + q + '">' + q + '</button>').join("") + '</div>';
      const r = body.querySelector("#sz-r"), n = body.querySelector("#sz-n");
      const ps = $("prop-text-size");
      const show = () => { const o = active(); const v = o ? Math.round(o.fontSize || 32) : 32; r.value = v; n.value = v; body.querySelectorAll("[data-q]").forEach(b => b.classList.toggle("on", Number(b.dataset.q) === v)); };
      function set(v, done){
        v = clamp(Math.round(Number(v) || 32), 10, 160);
        if (ps){ ps.value = v; fire(ps, done ? ["input", "change"] : ["input"]); }
        r.value = v; n.value = v;
        if (done) show();
      }
      r.addEventListener("input", () => set(r.value, false));
      r.addEventListener("change", () => set(r.value, true));
      n.addEventListener("change", () => set(n.value, true));
      body.querySelector("#sz-dn").addEventListener("click", () => set(Number(n.value) - 1, true));
      body.querySelector("#sz-up").addEventListener("click", () => set(Number(n.value) + 1, true));
      body.addEventListener("click", (e) => { const q = e.target.closest("[data-q]"); if (q) set(q.dataset.q, true); });
      show();
    }};

    /* COLOR: swatch row (+ colours already in the design) and a full picker */
    const PALETTE = ["#15171b", "#ffffff", "#e5484d", "#f76b15", "#f5a524", "#f5d90a", "#46a758", "#12a150", "#0b9fb0", "#2447f0", "#5b3df5", "#8e4ec6", "#e93d82", "#8b5e3c", "#6b7280", "#d1d5db"];
    function hexToHsv(hex){
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return [0, 0, 0];
      const n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
      if (d){ if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
      return [h, mx ? d / mx : 0, mx];
    }
    function hsvToHex(h, s, v){
      const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0;
      if (h < 60){ r = c; g = x; } else if (h < 120){ r = x; g = c; } else if (h < 180){ g = c; b = x; }
      else if (h < 240){ g = x; b = c; } else if (h < 300){ r = x; b = c; } else { r = c; b = x; }
      const to = (t) => Math.round((t + m) * 255).toString(16).padStart(2, "0");
      return "#" + to(r) + to(g) + to(b);
    }
    TOOLS.color = { title: "Text colour", render(){
      const c = canvas(), pk = $("prop-text-color");
      if (!c || !pk) return;
      const inDesign = [];
      c.getObjects().forEach(o => { if (isText(o) && /^#[0-9a-f]{6}$/i.test(o.fill) && inDesign.indexOf(o.fill.toLowerCase()) < 0) inDesign.push(o.fill.toLowerCase()); });
      body.innerHTML =
        '<div class="tr-row tr-scroll" id="c-row">' +
          '<button type="button" class="tr-sw tr-sw-pick" id="c-more" aria-label="Open colour picker" aria-expanded="false">' + I('<path d="M12 5v14M5 12h14"/>', 18) + '</button>' +
          inDesign.map(h => '<button type="button" class="tr-sw" data-c="' + h + '" style="--c:' + h + '" aria-label="' + h + '"></button>').join("") +
          (inDesign.length ? '<span class="tr-sep"></span>' : "") +
          PALETTE.map(h => '<button type="button" class="tr-sw" data-c="' + h + '" style="--c:' + h + '" aria-label="' + h + '"></button>').join("") +
        '</div>' +
        '<div class="tr-picker" id="c-picker" hidden>' +
          '<div class="tr-sv" id="c-sv"><canvas width="240" height="120"></canvas><i class="tr-dot" id="c-dot"></i></div>' +
          '<input type="range" class="tr-hue" id="c-hue" min="0" max="360" step="1" aria-label="Hue">' +
          '<div class="tr-row tr-split"><span class="tr-prev" id="c-prev"></span><input type="text" id="c-hex" class="tr-hex" maxlength="7" autocapitalize="off" spellcheck="false" aria-label="Hex colour"></div>' +
        '</div>';
      let [h, s, v] = hexToHsv(active() && active().fill);
      const sv = body.querySelector("#c-sv"), cv = sv.querySelector("canvas"), dot = body.querySelector("#c-dot"),
            hue = body.querySelector("#c-hue"), hex = body.querySelector("#c-hex"), prev = body.querySelector("#c-prev");
      const g2 = cv.getContext("2d");
      function paintSV(){
        g2.fillStyle = hsvToHex(h, 1, 1); g2.fillRect(0, 0, 240, 120);
        let g = g2.createLinearGradient(0, 0, 240, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); g2.fillStyle = g; g2.fillRect(0, 0, 240, 120);
        g = g2.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000"); g2.fillStyle = g; g2.fillRect(0, 0, 240, 120);
      }
      function put(done){
        const col = hsvToHex(h, s, v);
        hex.value = col; prev.style.background = col; hue.value = h;
        dot.style.left = (s * 100) + "%"; dot.style.top = ((1 - v) * 100) + "%";
        pk.value = col; fire(pk, done ? ["input", "change"] : ["input"]);
        body.querySelectorAll(".tr-sw[data-c]").forEach(b => b.classList.toggle("on", b.dataset.c === col));
      }
      function fromHex(col){ [h, s, v] = hexToHsv(col); paintSV(); put(true); }
      paintSV();
      { const col = hsvToHex(h, s, v); hex.value = col; prev.style.background = col; hue.value = h; dot.style.left = (s * 100) + "%"; dot.style.top = ((1 - v) * 100) + "%";
        body.querySelectorAll(".tr-sw[data-c]").forEach(b => b.classList.toggle("on", b.dataset.c === col)); }
      body.querySelector("#c-row").addEventListener("click", (e) => {
        const b = e.target.closest("[data-c]");
        if (b) fromHex(b.dataset.c);
      });
      body.querySelector("#c-more").addEventListener("click", function(){
        const pnl = body.querySelector("#c-picker"); pnl.hidden = !pnl.hidden;
        this.setAttribute("aria-expanded", String(!pnl.hidden)); this.classList.toggle("on", !pnl.hidden);
        measure();
      });
      let drag = false;
      function pick(e){ const r = sv.getBoundingClientRect(); s = clamp((e.clientX - r.left) / r.width, 0, 1); v = 1 - clamp((e.clientY - r.top) / r.height, 0, 1); put(false); }
      sv.addEventListener("pointerdown", (e) => { drag = true; sv.setPointerCapture(e.pointerId); pick(e); });
      sv.addEventListener("pointermove", (e) => { if (drag) pick(e); });
      const end = () => { if (drag){ drag = false; fire(pk, ["change"]); } };
      sv.addEventListener("pointerup", end); sv.addEventListener("pointercancel", end);
      hue.addEventListener("input", () => { h = Number(hue.value); paintSV(); put(false); });
      hue.addEventListener("change", () => fire(pk, ["change"]));
      hex.addEventListener("change", () => { let t = hex.value.trim(); if (t[0] !== "#") t = "#" + t; if (/^#[0-9a-f]{6}$/i.test(t)) fromHex(t.toLowerCase()); else hex.value = hsvToHex(h, s, v); });
    }};

    /* FORMAT: B I U S, letter case, alignment, lists */
    function setLines(o, fn){
      const lines = String(o.text || "").split("\n");
      o.set("text", fn(lines).join("\n")); touchText(o);
    }
    const BUL = /^•\s/, NUM = /^\d+\.\s/;
    const titleCase = (t) => t.toLowerCase().replace(/(^|[\s\-"(])(\S)/g, (m, a, b) => a + b.toUpperCase());
    TOOLS.format = { title: "Format", render(){
      const AL = {
        left: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>', center: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
        right: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>', justify: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'
      };
      body.innerHTML =
        '<div class="tr-row tr-grid5" id="fm-a">' +
          '<button type="button" class="tr-tg" data-t="bold" aria-label="Bold"><b>B</b></button>' +
          '<button type="button" class="tr-tg" data-t="italic" aria-label="Italic"><i>I</i></button>' +
          '<button type="button" class="tr-tg" data-t="underline" aria-label="Underline"><u>U</u></button>' +
          '<button type="button" class="tr-tg" data-t="strike" aria-label="Strikethrough"><s>S</s></button>' +
          '<button type="button" class="tr-tg" data-t="case" aria-label="Change case">aA</button>' +
        '</div>' +
        '<div class="tr-row tr-seg" id="fm-al">' + Object.keys(AL).map(k => '<button type="button" data-al="' + k + '" aria-label="Align ' + k + '">' + I(AL[k]) + '</button>').join("") + '</div>' +
        '<div class="tr-row tr-grid2" id="fm-l">' +
          '<button type="button" class="tr-tg" data-l="bul">' + I('<circle cx="5" cy="7" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="17" r="1.2" fill="currentColor"/><path d="M10 7h10M10 12h10M10 17h10"/>') + '<span>Bullets</span></button>' +
          '<button type="button" class="tr-tg" data-l="num">' + I('<path d="M10 7h10M10 12h10M10 17h10"/><path d="M4 6l1.2-.8V9M4 14h2.2L4 16.6h2.4" stroke-width="1.5"/>') + '<span>Numbers</span></button>' +
        '</div>';
      function state(){
        const o = active(); if (!isText(o)) return;
        const set = (sel, on) => { const el = body.querySelector(sel); if (el) el.classList.toggle("on", !!on); };
        set('[data-t="bold"]', o.fontWeight === "bold"); set('[data-t="italic"]', o.fontStyle === "italic");
        set('[data-t="underline"]', o.underline); set('[data-t="strike"]', o.linethrough);
        body.querySelectorAll("[data-al]").forEach(b => b.classList.toggle("on", b.dataset.al === (o.textAlign || "left")));
        const lines = String(o.text || "").split("\n");
        set('[data-l="bul"]', lines.every(l => BUL.test(l))); set('[data-l="num"]', lines.every(l => NUM.test(l)));
      }
      body.querySelector("#fm-a").addEventListener("click", (e) => {
        const b = e.target.closest("[data-t]"); const o = active(); if (!b || !isText(o)) return;
        const t = b.dataset.t;
        if (t === "case"){
          const x = String(o.text || "");
          o.set("text", x === x.toUpperCase() && x !== x.toLowerCase() ? x.toLowerCase() : (x === x.toLowerCase() ? titleCase(x) : x.toUpperCase()));
          touchText(o); redraw(); syncPanel(o); commit();
        } else { const btn = $("prop-text-" + t); if (btn) btn.click(); }
        state();
      });
      body.querySelector("#fm-al").addEventListener("click", (e) => {
        const b = e.target.closest("[data-al]"); const o = active(); if (!b || !isText(o)) return;
        o.set("textAlign", b.dataset.al); touchText(o); redraw(); syncPanel(o); commit(); state();
      });
      body.querySelector("#fm-l").addEventListener("click", (e) => {
        const b = e.target.closest("[data-l]"); const o = active(); if (!b || !isText(o)) return;
        const kind = b.dataset.l, re = kind === "bul" ? BUL : NUM;
        const strip = (l) => l.replace(BUL, "").replace(NUM, "");
        const allOn = String(o.text || "").split("\n").every(l => re.test(l));
        setLines(o, (ls) => ls.map((l, i) => allOn ? strip(l) : (kind === "bul" ? "• " : (i + 1) + ". ") + strip(l)));
        redraw(); syncPanel(o); relayers(); commit(); state();
      });
      state();
    }};

    /* EFFECTS: shadow, lift, glow, outline, hollow */
    function applyFx(o, name, s, col){
      if (o.gfxHollow){ o.set("fill", o.gfxHollow); o.gfxHollow = null; }
      o.set({ shadow: null, stroke: null, strokeWidth: 0 });
      const k = Number(s) || 8;
      if (name === "shadow") o.set("shadow", new fabric.Shadow({ color: "rgba(0,0,0,0.45)", blur: k * 1.2, offsetX: k / 3, offsetY: k / 3 }));
      else if (name === "lift") o.set("shadow", new fabric.Shadow({ color: col, blur: 0, offsetX: k / 2, offsetY: k / 2 }));
      else if (name === "glow") o.set("shadow", new fabric.Shadow({ color: col, blur: k * 2.5, offsetX: 0, offsetY: 0 }));
      else if (name === "outline") o.set({ stroke: col, strokeWidth: Math.max(1, k / 3), paintFirst: "stroke", strokeLineJoin: "round" });
      else if (name === "hollow"){ o.gfxHollow = o.fill; o.set({ stroke: typeof o.fill === "string" ? o.fill : "#15171b", strokeWidth: Math.max(1, k / 4), fill: "rgba(0,0,0,0)", paintFirst: "stroke", strokeLineJoin: "round" }); }
      o.gfxFx = name; o.dirty = true; if (o.setCoords) o.setCoords();
    }
    TOOLS.effects = { title: "Effects", render(){
      const FX = [["none", "None", ""], ["shadow", "Shadow", "text-shadow:2px 3px 4px rgba(0,0,0,.5)"], ["lift", "Lift", "text-shadow:3px 3px 0 #8a8f98"],
        ["glow", "Glow", "text-shadow:0 0 8px #2447f0,0 0 14px #2447f0;color:#fff"], ["outline", "Outline", "-webkit-text-stroke:1.5px #15171b;color:#fff"], ["hollow", "Hollow", "-webkit-text-stroke:1.5px #15171b;color:transparent"]];
      body.innerHTML =
        '<div class="tr-row tr-scroll" id="fx-l">' + FX.map(f => '<button type="button" class="tr-fx" data-f="' + f[0] + '"><b style="' + f[2] + '">Ag</b><span>' + f[1] + '</span></button>').join("") + '</div>' +
        '<div class="tr-row tr-split" id="fx-o"><label class="tr-lab" for="fx-s">Strength</label><input type="range" class="tr-range" id="fx-s" min="1" max="20" step="1" value="8"><label class="tr-sw tr-sw-in" title="Effect colour"><input type="color" id="fx-c" value="#000000" aria-label="Effect colour"></label></div>';
      const o0 = active();
      let name = (o0 && o0.gfxFx) || (o0 && o0.stroke ? "outline" : (o0 && o0.shadow ? "shadow" : "none"));
      const sl = body.querySelector("#fx-s"), cl = body.querySelector("#fx-c"), opts = body.querySelector("#fx-o");
      if (o0 && o0.stroke && /^#/.test(o0.stroke)) cl.value = o0.stroke;
      const mark = () => { body.querySelectorAll("[data-f]").forEach(b => b.classList.toggle("on", b.dataset.f === name)); opts.hidden = name === "none"; measure(); };
      const run = (done) => { const o = active(); if (!isText(o)) return; applyFx(o, name, sl.value, cl.value); redraw(); if (done){ syncPanel(o); commit(); } };
      body.querySelector("#fx-l").addEventListener("click", (e) => {
        const b = e.target.closest("[data-f]"); if (!b) return; name = b.dataset.f;
        if (name === "glow" && cl.value === "#000000") cl.value = "#ffd166";
        if (name === "lift" && cl.value === "#000000") cl.value = "#8a8f98";
        mark(); run(true);
      });
      sl.addEventListener("input", () => run(false)); sl.addEventListener("change", () => run(true));
      cl.addEventListener("input", () => run(false)); cl.addEventListener("change", () => run(true));
      mark();
    }};

    /* SPACING: letter + line */
    TOOLS.spacing = { title: "Spacing", render(){
      const sp = $("prop-text-spacing"), lh = $("prop-text-lineheight");
      const o = active();
      body.innerHTML =
        '<div class="tr-row tr-split"><label class="tr-lab" for="sp-l">Letters</label><input type="range" class="tr-range" id="sp-l" min="-50" max="600" step="10"><output id="sp-lv"></output></div>' +
        '<div class="tr-row tr-split"><label class="tr-lab" for="sp-h">Lines</label><input type="range" class="tr-range" id="sp-h" min="0.8" max="2.4" step="0.1"><output id="sp-hv"></output></div>';
      const l = body.querySelector("#sp-l"), h = body.querySelector("#sp-h"), lv = body.querySelector("#sp-lv"), hv = body.querySelector("#sp-hv");
      l.value = Math.round((o && o.charSpacing) || 0); h.value = Number((o && o.lineHeight) || 1.16).toFixed(1);
      const out = () => { lv.textContent = l.value; hv.textContent = Number(h.value).toFixed(1); };
      const drive = (src, dst, done) => { if (!dst) return; dst.value = src.value; fire(dst, done ? ["input", "change"] : ["input"]); out(); };
      l.addEventListener("input", () => drive(l, sp, false)); l.addEventListener("change", () => drive(l, sp, true));
      h.addEventListener("input", () => drive(h, lh, false)); h.addEventListener("change", () => drive(h, lh, true));
      out();
    }};

    /* OPACITY: any layer */
    TOOLS.opacity = { title: "Transparency", render(){
      const o = active();
      body.innerHTML = '<div class="tr-row tr-split"><label class="tr-lab" for="op-r">Opacity</label><input type="range" class="tr-range" id="op-r" min="5" max="100" step="1"><output id="op-v"></output></div>';
      const r = body.querySelector("#op-r"), v = body.querySelector("#op-v");
      r.value = Math.round((o && o.opacity != null ? o.opacity : 1) * 100); v.textContent = r.value + "%";
      r.addEventListener("input", () => { const x = active(); if (!x) return; x.set("opacity", Number(r.value) / 100); v.textContent = r.value + "%"; redraw(); });
      r.addEventListener("change", () => { const x = active(); syncPanel(x); commit(); });
    }};

    /* POSITION: arrange / align / precise */
    TOOLS.position = { title: "Position", render(){
      let tab = "arrange";
      body.innerHTML = '<div class="tr-row tr-seg tr-tabs" id="po-t"><button type="button" data-p="arrange">Arrange</button><button type="button" data-p="align">Align</button><button type="button" data-p="exact">Exact</button></div><div id="po-b"></div>';
      const tb = body.querySelector("#po-t"), pb = body.querySelector("#po-b");
      function draw(){
        tb.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.p === tab));
        const o = active(), c = canvas(); if (!o || !c) return;
        if (tab === "arrange"){
          const arr = c.getObjects(), i = arr.indexOf(o), top = i === arr.length - 1, bot = i === 0;
          pb.innerHTML = '<div class="tr-row tr-grid2">' +
            '<button type="button" class="tr-tg" data-a="fwd"' + (top ? " disabled" : "") + '>' + I('<path d="M12 19V5M6 11l6-6 6 6"/>') + '<span>Forward</span></button>' +
            '<button type="button" class="tr-tg" data-a="bwd"' + (bot ? " disabled" : "") + '>' + I('<path d="M12 5v14M6 13l6 6 6-6"/>') + '<span>Backward</span></button>' +
            '<button type="button" class="tr-tg" data-a="front"' + (top ? " disabled" : "") + '>' + I('<path d="M5 4h14M12 20V8M6 14l6-6 6 6"/>') + '<span>To front</span></button>' +
            '<button type="button" class="tr-tg" data-a="back"' + (bot ? " disabled" : "") + '>' + I('<path d="M5 20h14M12 4v12M6 10l6 6 6-6"/>') + '<span>To back</span></button></div>';
        } else if (tab === "align"){
          pb.innerHTML = '<div class="tr-row tr-grid3">' + [
            ["l", "Left", '<path d="M4 4v16M8 8h12M8 14h8"/>'], ["c", "Centre", '<path d="M12 4v16M5 8h14M8 14h8"/>'], ["r", "Right", '<path d="M20 4v16M4 8h12M8 14h8"/>'],
            ["t", "Top", '<path d="M4 4h16M8 8v12M14 8v8"/>'], ["m", "Middle", '<path d="M4 12h16M8 5v14M14 8v8"/>'], ["b", "Bottom", '<path d="M4 20h16M8 4v12M14 8v8"/>']
          ].map(a => '<button type="button" class="tr-tg" data-al="' + a[0] + '">' + I(a[2]) + '<span>' + a[1] + '</span></button>').join("") + '</div>' +
            '<p class="tr-note">Aligns to the print area.</p>';
        } else {
          const cp = o.getCenterPoint();
          pb.innerHTML = '<div class="tr-row tr-grid4">' +
            ["x:X:" + Math.round(cp.x), "y:Y:" + Math.round(cp.y), "r:Turn °:" + Math.round(o.angle || 0), "s:Size %:" + Math.round((o.scaleX || 1) * 100)].map(f => {
              const p = f.split(":"); return '<label class="tr-num"><span>' + p[1] + '</span><input type="number" data-n="' + p[0] + '" value="' + p[2] + '" inputmode="numeric"></label>'; }).join("") + '</div>';
        }
      }
      tb.addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b){ tab = b.dataset.p; draw(); measure(); } });
      pb.addEventListener("click", (e) => {
        const o = active(), c = canvas(); if (!o || !c) return;
        const a = e.target.closest("[data-a]");
        if (a){
          ({ fwd: () => o.bringForward(), bwd: () => o.sendBackwards(), front: () => o.bringToFront(), back: () => o.sendToBack() })[a.dataset.a]();
          redraw(); relayers(); commit(); draw(); return;
        }
        const al = e.target.closest("[data-al]");
        if (al){
          const pa = (typeof printAreaRect === "function") ? printAreaRect() : { x: 0, y: 0, w: c.getWidth(), h: c.getHeight() };
          const br = o.getBoundingRect(true, true);
          let dx = 0, dy = 0;
          switch (al.dataset.al){
            case "l": dx = pa.x - br.left; break; case "c": dx = pa.x + (pa.w - br.width) / 2 - br.left; break; case "r": dx = pa.x + pa.w - br.width - br.left; break;
            case "t": dy = pa.y - br.top; break; case "m": dy = pa.y + (pa.h - br.height) / 2 - br.top; break; case "b": dy = pa.y + pa.h - br.height - br.top; break;
          }
          o.set({ left: o.left + dx, top: o.top + dy }); o.setCoords(); redraw(); commit();
        }
      });
      pb.addEventListener("change", (e) => {
        const n = e.target.closest("[data-n]"), o = active(); if (!n || !o) return;
        const v = Number(n.value); if (!isFinite(v)) return;
        const cp = o.getCenterPoint();
        if (n.dataset.n === "x") o.setPositionByOrigin(new fabric.Point(v, cp.y), "center", "center");
        else if (n.dataset.n === "y") o.setPositionByOrigin(new fabric.Point(cp.x, v), "center", "center");
        else if (n.dataset.n === "r") o.rotate(v);
        else if (n.dataset.n === "s"){ const k = clamp(v, 5, 800) / 100, ratio = (o.scaleY || 1) / (o.scaleX || 1); o.set({ scaleX: k, scaleY: k * ratio }); }
        o.setCoords(); redraw(); commit();
      });
      draw();
    }};

    /* NUDGE: arrows with hold-to-repeat */
    TOOLS.nudge = { title: "Nudge", render(){
      body.innerHTML =
        '<div class="tr-nudge"><button type="button" data-d="0,-1" aria-label="Up">' + I('<path d="M12 19V5M6 11l6-6 6 6"/>', 24) + '</button>' +
        '<button type="button" data-d="-1,0" aria-label="Left">' + I('<path d="M19 12H5M11 6l-6 6 6 6"/>', 24) + '</button>' +
        '<button type="button" data-d="1,0" aria-label="Right">' + I('<path d="M5 12h14M13 6l6 6-6 6"/>', 24) + '</button>' +
        '<button type="button" data-d="0,1" aria-label="Down">' + I('<path d="M12 5v14M6 13l6 6 6-6"/>', 24) + '</button></div>' +
        '<div class="tr-row tr-seg" id="nu-s"><button type="button" data-s="1" class="on">1 px</button><button type="button" data-s="5">5 px</button><button type="button" data-s="20">20 px</button></div>';
      let step = 1, timer = null, rep = null;
      body.querySelector("#nu-s").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (!b) return; step = Number(b.dataset.s); body.querySelectorAll("#nu-s button").forEach(x => x.classList.toggle("on", x === b)); });
      const move = (d) => { const o = active(); if (!o) return; const p = d.split(",").map(Number); o.set({ left: o.left + p[0] * step, top: o.top + p[1] * step }); o.setCoords(); redraw(); };
      const stop = () => { clearTimeout(timer); clearInterval(rep); if (timer || rep){ timer = rep = null; commit(); } };
      body.querySelectorAll(".tr-nudge button").forEach(b => {
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); move(b.dataset.d); timer = setTimeout(() => { rep = setInterval(() => move(b.dataset.d), 70); }, 350); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(t => b.addEventListener(t, stop));
      });
    }};

    /* LAYERS: reorder by dragging the grip */
    TOOLS.layers = { title: "Layers", render(){
      const c = canvas(); if (!c) return;
      body.innerHTML = '<ul class="tr-layers" id="ly"></ul>';
      const ul = body.querySelector("#ly");
      function draw(){
        const objs = c.getObjects().slice().reverse(), cur = active();
        ul.innerHTML = objs.map((o, i) => {
          const t = isText(o);
          const th = t ? '<span class="tr-th tr-th-t">Aa</span>' : '<span class="tr-th"><img alt="" src="' + esc(o.getSrc ? o.getSrc() : "") + '"></span>';
          return '<li class="tr-ly' + (o === cur ? " on" : "") + '" data-i="' + i + '"><span class="tr-grip" aria-label="Drag to reorder">' + I('<circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/>', 18) + '</span>' + th +
            '<span class="tr-ln">' + esc(t ? (o.text || "Text") : "Image") + '</span>' +
            '<button type="button" class="tr-ib" data-x="lock" aria-label="Lock layer">' + (o.lockMovementX ? I('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 18) : I('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>', 18)) + '</button>' +
            '<button type="button" class="tr-ib tr-bad" data-x="del" aria-label="Delete layer">' + I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>', 18) + '</button></li>';
        }).join("");
      }
      draw();
      ul.addEventListener("click", (e) => {
        const li = e.target.closest(".tr-ly"); if (!li) return;
        const objs = c.getObjects().slice().reverse(), o = objs[Number(li.dataset.i)]; if (!o) return;
        const x = e.target.closest("[data-x]");
        if (x && x.dataset.x === "del"){ c.remove(o); c.discardActiveObject(); redraw(); relayers(); commit(); closeTray(); return; }
        if (x && x.dataset.x === "lock"){ const lock = !o.lockMovementX; o.set({ lockMovementX: lock, lockMovementY: lock, lockScalingX: lock, lockScalingY: lock, lockRotation: lock, hasControls: !lock }); redraw(); commit(); draw(); return; }
        if (e.target.closest(".tr-grip")) return;
        c.setActiveObject(o); redraw();
      });
      // drag to reorder
      ul.addEventListener("pointerdown", (e) => {
        const grip = e.target.closest(".tr-grip"); if (!grip) return;
        const li = grip.closest(".tr-ly"), from = Number(li.dataset.i), rows = [...ul.children], h = li.offsetHeight + 6;
        e.preventDefault(); grip.setPointerCapture(e.pointerId);
        const y0 = e.clientY; let to = from;
        li.classList.add("drag");
        const mv = (ev) => {
          const dy = ev.clientY - y0; li.style.transform = "translateY(" + dy + "px)";
          to = clamp(from + Math.round(dy / h), 0, rows.length - 1);
          rows.forEach((r, i) => { if (r === li) return; let sh = 0; if (from < to && i > from && i <= to) sh = -h; if (from > to && i < from && i >= to) sh = h; r.style.transform = sh ? "translateY(" + sh + "px)" : ""; });
        };
        const up = () => {
          grip.removeEventListener("pointermove", mv); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up);
          if (to !== from){
            const objs = c.getObjects().slice().reverse(), o = objs[from];
            c.moveTo(o, c.getObjects().length - 1 - to); redraw(); relayers(); commit();
          }
          draw();
        };
        grip.addEventListener("pointermove", mv); grip.addEventListener("pointerup", up); grip.addEventListener("pointercancel", up);
      });
    }};

    /* MORE: clipboard, style copy, lock, flip, duplicate, delete */
    let clip = null, styleClip = null;
    TOOLS.more = { title: "More", render(){
      const o0 = active();
      const text = isText(o0);
      const items = [
        ["copy", "Copy", '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', false],
        ["paste", "Paste", '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4h6v1"/>', !clip],
        ["cstyle", "Copy style", '<path d="M5 4h12v5H5zM11 9v4M9 13h4v7H9z"/>', !text],
        ["pstyle", "Paste style", '<path d="M5 4h12v5H5zM11 9v4M9 13h4v7H9z"/><path d="M19 12l2 2-2 2"/>', !text || !styleClip],
        ["dup", "Duplicate", '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>', false],
        ["flip", "Flip", '<path d="M12 3v18"/><path d="M8 7 3 12l5 5z"/><path d="M16 7l5 5-5 5z"/>', false],
        ["lock", o0 && o0.lockMovementX ? "Unlock" : "Lock", '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', false],
        ["del", "Delete", '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>', false, true]
      ];
      body.innerHTML = '<div class="tr-row tr-grid4 tr-more">' + items.map(i =>
        '<button type="button" class="tr-tg' + (i[4] ? " tr-bad" : "") + '" data-m="' + i[0] + '"' + (i[3] ? " disabled" : "") + '>' + I(i[2]) + '<span>' + i[1] + '</span></button>').join("") + '</div>';
      body.querySelector(".tr-more").addEventListener("click", (e) => {
        const b = e.target.closest("[data-m]"); const o = active(), c = canvas(); if (!b || !o || !c || b.disabled) return;
        const m = b.dataset.m;
        if (m === "copy"){ o.clone((cl) => { clip = cl; TOOLS.more.render(); measure(); }); }
        else if (m === "paste" && clip){
          clip.clone((cl) => { cl.set({ left: (clip.left || 0) + 20, top: (clip.top || 0) + 20 }); clip.left = cl.left; clip.top = cl.top;
            c.add(cl); c.setActiveObject(cl); redraw(); relayers(); commit(); });
        }
        else if (m === "cstyle" && isText(o)){
          styleClip = { fontFamily: o.fontFamily, fontSize: o.fontSize, fontWeight: o.fontWeight, fontStyle: o.fontStyle, fill: o.fill, underline: o.underline, linethrough: o.linethrough,
            charSpacing: o.charSpacing, lineHeight: o.lineHeight, textAlign: o.textAlign, stroke: o.stroke, strokeWidth: o.strokeWidth, opacity: o.opacity, shadow: o.shadow ? o.shadow.toObject() : null };
          TOOLS.more.render(); measure();
        }
        else if (m === "pstyle" && isText(o) && styleClip){
          const st = Object.assign({}, styleClip); const fam = st.fontFamily; const sh = st.shadow; delete st.shadow;
          o.set(st); o.set("shadow", sh ? new fabric.Shadow(sh) : null);
          if (typeof applyFontFamily === "function") applyFontFamily(o, fam);
          touchText(o); redraw(); syncPanel(o); commit();
        }
        else if (m === "dup"){ const d = $("prop-duplicate"); if (d) d.click(); }
        else if (m === "flip"){ o.set("flipX", !o.flipX); o.setCoords(); redraw(); commit(); }
        else if (m === "lock"){ const l = $("prop-lock"); if (l) l.click(); TOOLS.more.render(); }
        else if (m === "del"){ const d = $("prop-delete"); if (d) d.click(); closeTray(); }
      });
    }};

    /* ---------- open / switch ---------- */
    function openTray(name, kind){
      const t = TOOLS[name]; if (!t || !small()) return;
      if (current === name){ closeTray(); return; }
      const o = active(); if (!o) return;
      if (TEXT_ONLY.has(name) && !isText(o)) return;
      current = name;
      title.textContent = t.title;
      body.innerHTML = "";
      root.hidden = false;
      document.body.classList.add("tray-open");
      t.render();
      markCtx();
      requestAnimationFrame(measure); setTimeout(measure, 120);
    }
    document.addEventListener("studio:tray", (e) => openTray(e.detail && e.detail.name));
    document.addEventListener("studio:kb-open", closeTray);
    document.addEventListener("studio:selection", (e) => {
      const kind = e.detail && e.detail.kind;
      if (!kind || !small()){ closeTray(); return; }
      if (!current) return;
      if (TEXT_ONLY.has(current) && kind !== "text"){ closeTray(); return; }
      const name = current; current = ""; root.hidden = true; // re-render for the newly selected layer
      openTray(name);
    });
    window.addEventListener("resize", () => { if (!small()) closeTray(); else measure(); });
    // Tapping the empty page area (outside tray / bars / canvas) leaves the tray open on purpose:
    // it closes with the X, by re-tapping its tool, or when the layer is deselected.
  });
})();
