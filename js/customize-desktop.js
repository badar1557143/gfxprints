/* =========================================================
   GfxPrints Design Studio - DESKTOP / big-screen tool bar
   A context bar above the canvas (like Canva): it changes with the selected layer
   (text / image / other) and drives the same controls as the Properties panel.
   Deeper tools (Filters, Crop, Effects, Spacing ...) open as small pop-ups under the
   button, using the tray tools in customize-tray.js.
   ========================================================= */
(function(){
  function ready(fn){ if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  ready(function(){
    const main = document.querySelector(".app-canvas-area");
    if (!main) return;
    const big = () => window.matchMedia("(min-width: 901px)").matches;
    const $ = (id) => document.getElementById(id);
    const canvas = () => (typeof designCanvas !== "undefined" && designCanvas) ? designCanvas : null;
    const active = () => { const c = canvas(); return c ? c.getActiveObject() : null; };
    const isText = (o) => !!o && (o.type === "i-text" || o.type === "text" || o.type === "textbox");
    const fire = (el, types) => { if (el) types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))); };
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const click = (id) => { const el = $(id); if (el) el.click(); };

    const bar = document.createElement("div");
    bar.className = "dt-bar";
    bar.id = "dt-bar";
    bar.hidden = true;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Layer tools");
    main.appendChild(bar);

    const I = (d, w) => '<svg width="' + (w || 18) + '" height="' + (w || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    const IC = {
      replace: I('<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>'),
      bg: I('<path d="M15 4V2M15 16v-2M8 9H6M22 9h-2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M3 21l9-9"/>'),
      filters: I('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
      crop: I('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>'),
      layout: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
      fx: I('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>'),
      opacity: I('<path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/>'),
      position: I('<path d="M3 3v18M21 3v18"/><rect x="8" y="8" width="8" height="8" rx="1"/>'),
      spacing: I('<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>'),
      copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
      lock: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
      trash: I('<path d="M3 6h18"/><path d="M19 6l-.9 13.2a2 2 0 0 1-2 1.8H7.9a2 2 0 0 1-2-1.8L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M10 11v6M14 11v6"/>'),
      flip: I('<path d="M12 3v18"/><path d="M8 7 3 12l5 5z"/><path d="M16 7l5 5-5 5z"/>'),
      left: I('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
      center: I('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
      right: I('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
      edit: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')
    };

    // What each kind of layer shows. k: font | size | color | fmt | align | tray | act | sep
    const SHARED = [
      { k: "sep" },
      { k: "tray", name: "position", label: "Position", ic: IC.position },
      { k: "act", id: "prop-duplicate", label: "Duplicate", ic: IC.copy },
      { k: "act", id: "prop-lock", label: "Lock", ic: IC.lock, lock: true },
      { k: "act", id: "prop-delete", label: "Delete", ic: IC.trash, danger: true }
    ];
    const SETS = {
      text: [
        { k: "font" }, { k: "size" }, { k: "color" }, { k: "sep" },
        { k: "fmt", id: "prop-text-bold", label: "Bold", html: "<b>B</b>", prop: "bold" },
        { k: "fmt", id: "prop-text-italic", label: "Italic", html: "<i>I</i>", prop: "italic" },
        { k: "fmt", id: "prop-text-underline", label: "Underline", html: "<u>U</u>", prop: "underline" },
        { k: "fmt", id: "prop-text-strike", label: "Strikethrough", html: "<s>S</s>", prop: "strike" },
        { k: "align" }, { k: "sep" },
        { k: "tray", name: "spacing", label: "Spacing", ic: IC.spacing },
        { k: "tray", name: "effects", label: "Effects", ic: IC.fx },
        { k: "tray", name: "opacity", label: "Transparency", ic: IC.opacity }
      ].concat(SHARED),
      image: [
        { k: "act", id: "img-replace-input", label: "Replace image", ic: IC.replace, text: "Replace" },
        { k: "act", id: "img-bgremove", label: "Remove background", ic: IC.bg, text: "Remove BG" },
        { k: "sep" },
        { k: "tray", name: "filters", label: "Filters", ic: IC.filters, text: "Filters" },
        { k: "tray", name: "crop", label: "Crop", ic: IC.crop, text: "Crop" },
        { k: "tray", name: "imglayout", label: "Layout and shape", ic: IC.layout, text: "Layout" },
        { k: "tray", name: "imgfx", label: "Effects", ic: IC.fx, text: "Effects" },
        { k: "tray", name: "opacity", label: "Transparency", ic: IC.opacity }
      ].concat(SHARED),
      other: [
        { k: "tray", name: "opacity", label: "Transparency", ic: IC.opacity }
      ].concat(SHARED)
    };

    let kind = "", items = [], curTray = "";

    function build(k){
      kind = k; items = SETS[k] || [];
      bar.innerHTML = items.map((it, i) => {
        switch (it.k){
          case "sep": return '<span class="dt-sep" aria-hidden="true"></span>';
          case "font": return '<label class="dt-font" title="Font"><select id="dt-font" aria-label="Font"></select></label>';
          case "size": return '<div class="dt-size" title="Font size"><button type="button" data-d="-2" aria-label="Smaller">&minus;</button><input type="number" id="dt-size" min="8" max="400" aria-label="Font size"><button type="button" data-d="2" aria-label="Larger">+</button></div>';
          case "color": return '<label class="dt-color" title="Text colour"><span class="dt-a" id="dt-a">A</span><input type="color" id="dt-color" aria-label="Text colour"></label>';
          case "align": return '<button type="button" class="dt-b" id="dt-align" title="Alignment" aria-label="Alignment"></button>';
          case "fmt": return '<button type="button" class="dt-b dt-fmt" data-i="' + i + '" title="' + it.label + '" aria-label="' + it.label + '">' + it.html + '</button>';
          default: return '<button type="button" class="dt-b' + (it.text ? " dt-wide" : "") + (it.danger ? " dt-danger" : "") + '" data-i="' + i + '" data-tray="' + (it.name || "") + '" title="' + esc(it.label) + '" aria-label="' + esc(it.label) + '">' + it.ic + (it.text ? '<span>' + it.text + '</span>' : "") + '</button>';
        }
      }).join("");
      const f = $("dt-font"), src = $("prop-text-font");
      if (f && src) f.innerHTML = src.innerHTML;
    }

    function sync(){
      const o = active();
      if (!o || bar.hidden) return;
      if (isText(o)){
        const f = $("dt-font"), src = $("prop-text-font");
        if (f && src && f.value !== src.value) f.value = src.value;
        const sz = $("dt-size"); if (sz && document.activeElement !== sz) sz.value = Math.round(o.fontSize || 32);
        const col = $("dt-color"), pc = $("prop-text-color");
        if (col && pc){ col.value = pc.value; const a = $("dt-a"); if (a) a.style.borderBottomColor = pc.value; }
        bar.querySelectorAll(".dt-fmt").forEach(b => {
          const it = items[Number(b.dataset.i)], p = it.prop;
          const on = p === "bold" ? o.fontWeight === "bold" || Number(o.fontWeight) >= 600
            : p === "italic" ? o.fontStyle === "italic" : p === "underline" ? !!o.underline : !!o.linethrough;
          b.classList.toggle("on", on);
        });
        const al = $("dt-align"); if (al){ const a = o.textAlign || "left"; al.dataset.align = a; al.innerHTML = IC[a] || IC.left; }
      }
      const li = items.findIndex(x => x.lock);
      if (li >= 0){
        const lb = bar.querySelector('[data-i="' + li + '"]');
        if (lb) lb.classList.toggle("on", !!(o.lockMovementX && o.lockMovementY));
      }
    }

    function show(k){
      if (!big() || !k){ bar.hidden = true; document.body.classList.remove("dt-has-bar"); closePop(); return; }
      if (k !== kind || !bar.firstChild) build(k);
      bar.hidden = false;
      document.body.classList.add("dt-has-bar");
      sync();
    }

    /* ----- pop-ups (tray tools) ----- */
    const trayRoot = () => document.querySelector(".tr");
    function placePop(btn){
      const tr = trayRoot(); if (!tr || tr.hidden) return;
      const r = btn.getBoundingClientRect(), b = bar.getBoundingClientRect(), w = tr.offsetWidth || 360;
      tr.style.left = clamp(r.left + r.width / 2 - w / 2, 8, window.innerWidth - w - 8) + "px";
      tr.style.top = (b.bottom + 8) + "px";
    }
    function closePop(){
      const tr = trayRoot();
      if (tr && !tr.hidden){ const x = tr.querySelector("#tr-x"); if (x) x.click(); }
      curTray = ""; markTray();
    }
    function markTray(){ bar.querySelectorAll("[data-tray]").forEach(b => b.classList.toggle("on", !!curTray && b.dataset.tray === curTray)); }
    const tr0 = trayRoot();
    if (tr0) new MutationObserver(() => { if (tr0.hidden){ curTray = ""; markTray(); } }).observe(tr0, { attributes: true, attributeFilter: ["hidden"] });

    function openTool(btn, it){
      curTray = curTray === it.name ? "" : it.name;
      document.dispatchEvent(new CustomEvent("studio:tray", { detail: { name: it.name } }));
      markTray();
      requestAnimationFrame(() => placePop(btn));
      setTimeout(() => placePop(btn), 90);
    }

    /* ----- clicks ----- */
    bar.addEventListener("click", (e) => {
      const o = active(); if (!o) return;
      const sd = e.target.closest(".dt-size button");
      if (sd){
        const sz = $("prop-text-size"); if (!sz) return;
        sz.value = clamp(Math.round(o.fontSize || 32) + Number(sd.dataset.d), +sz.min || 8, +sz.max || 400);
        fire(sz, ["input", "change"]); setTimeout(sync, 30); return;
      }
      if (e.target.closest("#dt-align")){
        const order = ["left", "center", "right"], cur = (o.textAlign || "left");
        const next = order[(order.indexOf(cur) + 1) % order.length];
        const t = document.querySelector('#prop-text-align .toggle-btn[data-align="' + next + '"]'); if (t) t.click();
        setTimeout(sync, 30); return;
      }
      const btn = e.target.closest("button[data-i]"); if (!btn) return;
      const it = items[Number(btn.dataset.i)]; if (!it) return;
      if (it.k === "fmt"){ click(it.id); setTimeout(sync, 30); }
      else if (it.k === "tray") openTool(btn, it);
      else if (it.k === "act"){
        if (it.id === "img-replace-input") click(it.id);          // opens the file picker
        else { click(it.id); setTimeout(sync, 60); }
      }
    });
    bar.addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "dt-font"){ const p = $("prop-text-font"); if (p){ p.value = t.value; fire(p, ["change"]); } setTimeout(sync, 30); }
      else if (t.id === "dt-size"){
        const sz = $("prop-text-size"); if (!sz) return;
        sz.value = clamp(Math.round(Number(t.value) || 32), +sz.min || 8, +sz.max || 400); fire(sz, ["input", "change"]); setTimeout(sync, 30);
      } else if (t.id === "dt-color"){ const c = $("prop-text-color"); if (c){ c.value = t.value; fire(c, ["change"]); } }
    });
    bar.addEventListener("input", (e) => {
      if (e.target.id === "dt-color"){ const c = $("prop-text-color"); if (c){ c.value = e.target.value; fire(c, ["input"]); const a = $("dt-a"); if (a) a.style.borderBottomColor = e.target.value; } }
    });
    bar.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "dt-size"){ e.target.blur(); } });

    // Clicking elsewhere closes an open pop-up
    document.addEventListener("pointerdown", (e) => {
      if (!curTray) return;
      if (e.target.closest(".tr, #dt-bar")) return;
      closePop();
    }, true);


    /* ----- Bottom bar (desktop): undo / redo / layers on the left, view tools on the right ----- */
    (function(){
      const vb = $("view-bar");
      if (!vb || vb.querySelector(".vb-left")) return;
      const left = document.createElement("div");
      left.className = "vb-left";
      left.innerHTML =
        '<button type="button" class="vb vb-txt" id="vb-undo" title="Undo (Ctrl+Z)" aria-label="Undo">' + I('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 17) + '<span>Undo</span></button>' +
        '<button type="button" class="vb vb-txt" id="vb-redo" title="Redo (Ctrl+Y)" aria-label="Redo">' + I('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>', 17) + '<span>Redo</span></button>' +
        '<span class="vb-sep" aria-hidden="true"></span>' +
        '<button type="button" class="vb vb-txt" id="vb-layers" title="Layers" aria-label="Layers">' + I('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', 17) + '<span>Layers</span><em id="vb-lc">0</em></button>';
      vb.insertBefore(left, vb.firstChild);
      const proxy = (btnId, srcId) => {
        const b = $(btnId), src = $(srcId); if (!b || !src) return;
        b.addEventListener("click", () => src.click());
        const mirror = () => { b.disabled = !!src.disabled; };
        mirror(); new MutationObserver(mirror).observe(src, { attributes: true, attributeFilter: ["disabled"] });
      };
      proxy("vb-undo", "tool-undo"); proxy("vb-redo", "tool-redo");
      const lay = $("vb-layers"), rail = $("rail-layers");
      if (lay && rail) lay.addEventListener("click", () => rail.click());
      const badge = $("layer-count-badge-rail"), lc = $("vb-lc");
      if (badge && lc){
        const m = () => { lc.textContent = badge.textContent; lc.hidden = !Number(badge.textContent); };
        m(); new MutationObserver(m).observe(badge, { childList: true, characterData: true, subtree: true });
      }
    })();

    /* ----- keep in step with the selection ----- */
    document.addEventListener("studio:selection", (e) => show(e.detail && e.detail.kind));
    const hook = () => {
      const c = canvas(); if (!c || c.__dtHooked) return !!c;
      c.__dtHooked = true;
      ["object:modified", "text:changed", "selection:updated"].forEach(ev => c.on(ev, () => setTimeout(sync, 20)));
      return true;
    };
    if (!hook()){ const t = setInterval(() => { if (hook()) clearInterval(t); }, 400); }
    window.addEventListener("resize", () => { closePop(); if (!big()){ bar.hidden = true; document.body.classList.remove("dt-has-bar"); } else { const o = active(); if (o) show(isText(o) ? "text" : o.type === "image" ? "image" : "other"); } });
  });
})();
