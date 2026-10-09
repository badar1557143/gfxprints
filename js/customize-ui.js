/* =========================================================
   GfxPrints - Design Studio app chrome
   Purely presentational: switches which drawer panel is open
   from the left icon rail, and drives the zoom control. Doesn't
   touch design/cart logic - that all still lives in customize.js.
   ========================================================= */
(function(){

  function ready(fn){
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function(){
    const drawer = document.getElementById("app-drawer");
    const panels = document.querySelectorAll(".app-drawer-panel");
    const railBtns = document.querySelectorAll(".app-rail-btn");
    if (!drawer || !panels.length) return;

    const smallScreen = () => window.matchMedia("(max-width: 900px)").matches;
    let openName = null;
    let nextCtx = "";

    function showPanel(name){
      if (name === "edit"){ applyEditCtx(nextCtx); nextCtx = ""; }
      else applyEditCtx("", true);
      panels.forEach(p => { p.hidden = p.id !== ("panel-" + name); });
      drawer.classList.add("open");
      openName = name;
      railBtns.forEach(b => b.classList.toggle("active", b.dataset.opens === name));
      // Keep the active tool in view on the sliding tool bar
      const act = document.querySelector(".app-rail-btn.active");
      if (act && act.scrollIntoView) act.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }

    function closeDrawer(){
      drawer.classList.remove("open");
      openName = null;
      railBtns.forEach(b => b.classList.remove("active"));
    }

    function toggle(name){
      if (openName === name) closeDrawer();
      else showPanel(name);
    }

    // Rail: Product panel toggle
    const railProduct = document.getElementById("rail-product");
    if (railProduct) railProduct.addEventListener("click", () => toggle("product"));

    // Rail: Uploads panel toggle (upload button + "My Uploads" library)
    const railUploads = document.getElementById("rail-uploads");
    if (railUploads) railUploads.addEventListener("click", () => toggle("uploads"));

    // Rail: Clipart & Stickers library panel
    const railClipart = document.getElementById("rail-clipart");
    if (railClipart) railClipart.addEventListener("click", () => toggle("clipart"));

    // Rail: Layers -> opens Edit panel on the Layers tab
    const railLayers = document.getElementById("rail-layers");
    if (railLayers){
      railLayers.addEventListener("click", () => {
        if (openName === "edit" && railLayers.classList.contains("active")){
          closeDrawer();
          return;
        }
        showPanel("edit");
        const layersTab = document.querySelector('.studio-tab[data-tab="layers"]');
        if (layersTab) layersTab.click();
      });
    }

    // Rail: Text -> opens the Text panel (search fonts, add a text box, styles, combinations)
    const railText = document.getElementById("tool-add-text");
    if (railText) railText.addEventListener("click", () => toggle("text"));

    (function initTextPanel(){
      const sel = document.getElementById("prop-text-font");
      const fontsEl = document.getElementById("text-fonts");
      const combosEl = document.getElementById("text-combos");
      const search = document.getElementById("text-search");
      if (!sel || !fontsEl || !combosEl) return;

      const fonts = [];
      sel.querySelectorAll("optgroup").forEach(g => g.querySelectorAll("option").forEach(o => {
        fonts.push({ value: o.value, name: o.textContent.replace(/\s*\(.*\)/, ""), group: g.label.replace(/&amp;/g, "&") });
      }));
      const nameOf = (v) => { const f = fonts.find(x => x.value === v); return f ? f.name : v; };
      const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

      fontsEl.innerHTML = fonts.map((f, i) =>
        '<button type="button" class="tp-font" data-i="' + i + '" data-q="' + esc((f.name + " " + f.group).toLowerCase()) + '">' +
        '<span class="tp-font-s" style="font-family:' + esc(f.value) + '">' + esc(f.name) + '</span><small>' + esc(f.group) + '</small></button>').join("");

      const COMBOS = [
        { a: ["'Anton', sans-serif", 54, "normal", "YOUR HEADING"], b: ["'Poppins', sans-serif", 22, "normal", "your subheading here"] },
        { a: ["'Playfair Display', serif", 46, "bold", "Elegant Title"], b: ["'IBM Plex Sans', sans-serif", 20, "normal", "a simple supporting line"] },
        { a: ["'Pacifico', cursive", 46, "normal", "Happy Days"], b: ["'Montserrat', sans-serif", 20, "normal", "MAKE IT YOURS"] },
        { a: ["'Bebas Neue', sans-serif", 62, "normal", "BIG STATEMENT"], b: ["'Caveat', cursive", 32, "normal", "handwritten note"] },
        { a: ["'Lobster', cursive", 48, "normal", "Sweet Moments"], b: ["'Poppins', sans-serif", 20, "normal", "with love"] },
        { a: ["'Abril Fatface', serif", 48, "normal", "Classic Style"], b: ["'Dancing Script', cursive", 32, "normal", "made with care"] },
        { a: ["'Bangers', cursive", 56, "normal", "BOOM!"], b: ["'Oswald', sans-serif", 22, "normal", "LOUD AND PROUD"] },
        { a: ["'Great Vibes', cursive", 54, "normal", "Forever Yours"], b: ["'Playfair Display', serif", 20, "normal", "est. together"] }
      ];
      combosEl.innerHTML = COMBOS.map((c, i) =>
        '<button type="button" class="tp-combo" data-i="' + i + '" data-q="' + esc((nameOf(c.a[0]) + " " + nameOf(c.b[0]) + " combination").toLowerCase()) + '">' +
        '<span style="font-family:' + esc(c.a[0]) + ';font-weight:' + (c.a[2] === "bold" ? 700 : 400) + ';font-size:1.45rem;line-height:1.1">' + esc(c.a[3]) + '</span>' +
        '<span style="font-family:' + esc(c.b[0]) + ';font-size:0.95rem">' + esc(c.b[3]) + '</span></button>').join("");

      // Adds the layer, then (phones/tablets) straight into typing: keyboard opens, text selected,
// formatting bar on top - done inside the tap so the browser allows the keyboard.
const add = (o) => {
        if (typeof designCanvas === "undefined" || !designCanvas || typeof addTextLayer !== "function") return;
        const t = addTextLayer(o);
        if (smallScreen()) openKbEditor();
        return t;
      };

      document.getElementById("text-add-box").addEventListener("click", () => add({ text: "Your paragraph text", fontSize: 30 }));
      document.getElementById("text-styles").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-size]");
        if (!b) return;
        add({ text: b.dataset.text, fontSize: Number(b.dataset.size), fontWeight: b.dataset.bold === "1" ? "bold" : "normal" });
      });
      fontsEl.addEventListener("click", (e) => {
        const b = e.target.closest(".tp-font"); if (!b) return;
        const f = fonts[Number(b.dataset.i)];
        add({ text: f.name, fontFamily: f.value, fontSize: 40 });
      });
      combosEl.addEventListener("click", (e) => {
        const b = e.target.closest(".tp-combo"); if (!b) return;
        const c = COMBOS[Number(b.dataset.i)];
        add({ text: c.b[3], fontFamily: c.b[0], fontSize: c.b[1], fontWeight: c.b[2], dy: 0.08 });
        add({ text: c.a[3], fontFamily: c.a[0], fontSize: c.a[1], fontWeight: c.a[2], dy: -0.04 });
      });

      // Search: filters fonts and combinations; sections with no matches hide
      const panel = document.getElementById("panel-text");
      const emptyEl = document.getElementById("text-empty");
      function filter(){
        const q = (search.value || "").trim().toLowerCase();
        let any = false;
        panel.querySelectorAll(".tp-font, .tp-combo").forEach(el => {
          const hit = !q || el.dataset.q.indexOf(q) !== -1;
          el.hidden = !hit; if (hit) any = true;
        });
        ["combos", "fonts"].forEach(k => {
          const box = panel.querySelector('.tp-' + (k === "fonts" ? "fonts" : "combos"));
          const has = box && box.querySelector("button:not([hidden])");
          panel.querySelectorAll('[data-tp="' + k + '"]').forEach(el => { el.hidden = !has; });
        });
        panel.querySelectorAll('[data-tp="styles"]').forEach(el => { el.hidden = !!q; });
        emptyEl.hidden = any || !q;
      }
      search.addEventListener("input", filter);

      // After a layer is added: phones close the sheet so the customer sees the canvas
      // (and the Edit button); desktop opens the Properties panel.
      document.addEventListener("studio:text-added", () => {
        if (openName !== "text") return;
        if (smallScreen()){ closeDrawer(); }
        else {
          showPanel("edit");
          const propsTab = document.querySelector('.studio-tab[data-tab="properties"]');
          if (propsTab) propsTab.click();
        }
      });
    })();

    // Uploads: choosing files only fills "Your uploads"; the panel stays open.
    // The Edit panel opens when the customer taps an image in the list.

    // Phones/tablets: tapping anywhere outside the Edit panel (and the bottom
    // tool bar) closes it. A tap on the canvas "Edit" button is left alone.
    document.addEventListener("pointerdown", (e) => {
      if (!smallScreen() || openName !== "edit") return;
      if (e.target.closest("#app-drawer, .app-rail, .app-ctx-bar, .app-zoom-bar")) return;
      const inStage = !!e.target.closest("#studio-stage");
      setTimeout(() => {
        if (openName !== "edit") return;
        if (inStage && typeof designCanvas !== "undefined" && designCanvas){
          const a = designCanvas.getActiveObject();
          if (a && a.__corner === "edit") return;
        }
        closeDrawer();
      }, 0);
    }, true);

    // Phones/tablets: drag the grey handle at the top of the sheet down to close it
    // (a quick tap on the handle closes it too).
    const grip = document.createElement("div");
    grip.className = "app-drawer-grip";
    grip.setAttribute("role", "button");
    grip.setAttribute("aria-label", "Drag down to close");
    grip.innerHTML = "<span></span>";
    drawer.insertBefore(grip, drawer.firstChild);
    (function(){
      let startY = 0, startT = 0, dy = 0, dragging = false, moved = false;
      grip.addEventListener("pointerdown", (e) => {
        if (!smallScreen()) return;
        dragging = true; moved = false; dy = 0;
        startY = e.clientY; startT = Date.now();
        try { grip.setPointerCapture(e.pointerId); } catch (err){}
        drawer.style.transition = "none";
      });
      grip.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        dy = Math.max(0, e.clientY - startY);
        if (dy > 4) moved = true;
        drawer.style.transform = "translateY(" + dy + "px)";
      });
      function end(){
        if (!dragging) return;
        dragging = false;
        const fast = dy / Math.max(1, Date.now() - startT) > 0.5; // px per ms
        drawer.style.transition = "";
        drawer.style.transform = "";
        if (!moved || dy > 90 || (fast && dy > 24)) closeDrawer();
      }
      grip.addEventListener("pointerup", end);
      grip.addEventListener("pointercancel", end);
    })();

    // ---------- Phones/tablets: editing tool bar ----------
    // Nothing selected -> the main tool bar. Something selected -> an editing tool bar
    // (Replace, Remove BG, Adjust ... plus a tick to finish), like Canva.
    const rail = document.querySelector(".app-rail");
    const ctx = document.createElement("div");
    ctx.className = "app-ctx-bar";
    ctx.setAttribute("aria-label", "Edit selected item");
    ctx.innerHTML = '<div class="app-ctx-scroll" id="ctx-scroll"></div>' +
      '<button type="button" class="app-ctx-done" id="ctx-done" aria-label="Done editing">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>';
    if (rail && rail.parentNode) rail.parentNode.insertBefore(ctx, rail.nextSibling);
    const ctxScroll = ctx.querySelector("#ctx-scroll");

    const I = (d) => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    const ICON = {
      replace: I('<path d="M4 9a8 8 0 0 1 14-3l2 2"/><path d="M20 4v4h-4"/><path d="M20 15a8 8 0 0 1-14 3l-2-2"/><path d="M4 20v-4h4"/>'),
      bg: I('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>'),
      adjust: I('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
      effects: I('<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>'),
      layout: I('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/>'),
      flip: I('<path d="M12 3v18"/><path d="M8 7 3 12l5 5z"/><path d="M16 7l5 5-5 5z"/>'),
      edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
      font: I('<path d="M5 19 12 5l7 14M8 14h8"/>'),
      color: I('<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor"/>'),
      dup: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
      del: I('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
      lock: I('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
      styles: I('<path d="M6 4v16M18 4v16M6 12h12"/>'),
      size: I('<path d="M3 19 8 7l5 12M5 15h6"/><path d="M14 19l3.5-8 3.5 8M15.5 16h4"/>'),
      format: I('<path d="M4 6h16M4 12h10M4 18h14"/>'),
      advanced: I('<path d="M7 5h10M12 5v10"/><path d="M4 19h16M7 17l-3 2 3 2M17 17l3 2-3 2"/>'),
      transp: I('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h8M12 4v8M12 20v-8h8"/>'),
      layers: I('<polygon points="12 3 3 8 12 13 21 8 12 3"/><polyline points="3 12 12 17 21 12"/>'),
      position: I('<rect x="4" y="4" width="8" height="8" rx="1.5"/><rect x="12" y="12" width="8" height="8" rx="1.5"/>'),
      nudge: I('<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>'),
      more: I('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>')
    };

    // ----- Edit sheet "focus mode": show only one section (Font, Color, Nudge ...) -----
    const editPanel = document.getElementById("panel-edit");
    let ctxTitle = null;
    if (editPanel){
      ctxTitle = document.createElement("h2");
      ctxTitle.className = "pp-ctx-title";
      editPanel.insertBefore(ctxTitle, editPanel.firstChild);
    }
    function applyEditCtx(ctxName, quiet){
      if (!editPanel) return;
      if (ctxName){ editPanel.setAttribute("data-ctx", ctxName); }
      else { editPanel.removeAttribute("data-ctx"); }
      editPanel.querySelectorAll("[data-sec]").forEach(el => {
        const secs = el.getAttribute("data-sec").split(/\s+/);
        const only = el.hasAttribute("data-only");
        el.hidden = ctxName ? !secs.includes(ctxName) : only;
      });
      if (ctxName) editPanel.querySelectorAll("details.pp-acc").forEach(d => { d.open = true; });
      if (ctxTitle) ctxTitle.textContent = ctxName ? (CTX_TITLES[ctxName] || "") : "";
    }
    const CTX_TITLES = { edit:"Edit text", font:"Font", styles:"Text styles", size:"Font size", color:"Color",
      format:"Format", advanced:"Advanced", effects:"Effects", transparency:"Transparency",
      position:"Position", nudge:"Nudge", more:"More" };

    // Open the Edit sheet on the Properties tab (optionally in focus mode on one section).
    function openEditAt(opts){
      opts = opts || {};
      nextCtx = opts.ctx || "";
      showPanel("edit");
      const propsTab = document.querySelector('.studio-tab[data-tab="properties"]');
      if (propsTab) propsTab.click();
      setTimeout(() => {
        if (opts.radio){ const r = document.getElementById(opts.radio); if (r) r.checked = true; }
        if (opts.focus){ const f = document.querySelector(opts.focus); if (f && f.scrollIntoView) f.scrollIntoView({ block: "start", behavior: "smooth" }); }
        if (opts.type){ const t = document.getElementById(opts.type); if (t) t.focus(); }
      }, 60);
    }
    function openLayers(){
      nextCtx = "";
      showPanel("edit");
      const layersTab = document.querySelector('.studio-tab[data-tab="layers"]');
      if (layersTab) layersTab.click();
    }
    const clickId = (id) => () => { const el = document.getElementById(id); if (el) el.click(); };

    // Text styles presets
    const presets = document.getElementById("text-presets");
    if (presets) presets.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-size]");
      if (!b) return;
      const size = document.getElementById("prop-text-size");
      if (size){ size.value = b.dataset.size; size.dispatchEvent(new Event("input", { bubbles: true })); size.dispatchEvent(new Event("change", { bubbles: true })); }
      const bold = document.getElementById("prop-text-bold");
      if (bold && bold.classList.contains("active") !== (b.dataset.bold === "1")) bold.click();
    });

    // Nudge pad
    let nudgeStep = 1;
    const nudgeSteps = document.getElementById("nudge-steps");
    if (nudgeSteps) nudgeSteps.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-step]");
      if (!b) return;
      nudgeStep = Number(b.dataset.step) || 1;
      nudgeSteps.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    });
    const nudge = document.getElementById("props-nudge");
    if (nudge) nudge.addEventListener("click", (e) => {
      const b = e.target.closest(".nudge-b");
      if (!b || typeof designCanvas === "undefined" || !designCanvas) return;
      const o = designCanvas.getActiveObject();
      if (!o) return;
      o.set({ left: o.left + Number(b.dataset.dx) * nudgeStep, top: o.top + Number(b.dataset.dy) * nudgeStep });
      o.setCoords();
      designCanvas.requestRenderAll();
      designCanvas.fire("object:modified", { target: o });
    });

    // Phones: tools open a small floating tray (customize-tray.js) instead of the big sheet.
    const tray = (name) => () => {
      closeDrawer();
      document.dispatchEvent(new CustomEvent("studio:tray", { detail: { name: name } }));
    };
    const SHARED = [
      { label: "Layers", icon: ICON.layers, tray: "layers", run: tray("layers") },
      { label: "Position", icon: ICON.position, tray: "position", run: tray("position") },
      { label: "Nudge", icon: ICON.nudge, tray: "nudge", run: tray("nudge") },
      { label: "More", icon: ICON.more, tray: "more", run: tray("more") }
    ];
    const SETS = {
      image: [
        { label: "Replace", icon: ICON.replace, run: clickId("img-replace-input") },
        { label: "Remove BG", icon: ICON.bg, run: () => { clickId("img-bgremove")(); } },
        { label: "Adjust", icon: ICON.adjust, run: () => openEditAt({ radio: "ip-t-filters", focus: ".ip-tabs" }) },
        { label: "Layout", icon: ICON.layout, run: () => openEditAt({ radio: "ip-t-layout", focus: ".ip-tabs" }) },
        { label: "Effects", icon: ICON.effects, run: () => openEditAt({ radio: "ip-t-effects", focus: ".ip-tabs" }) },
        { label: "Transparency", icon: ICON.transp, tray: "opacity", run: tray("opacity") }
      ].concat(SHARED),
      text: [
        { label: "Edit", icon: ICON.edit, run: () => { if (!(smallScreen() && openKbEditor())) openEditAt({ ctx: "edit", type: "prop-text-content" }); } },
        { label: "Font", icon: ICON.font, tray: "font", run: tray("font") },
        { label: "Text styles", icon: ICON.styles, tray: "styles", run: tray("styles") },
        { label: "Font size", icon: ICON.size, tray: "size", run: tray("size") },
        { label: "Color", icon: ICON.color, tray: "color", run: tray("color") },
        { label: "Format", icon: ICON.format, tray: "format", run: tray("format") },
        { label: "Spacing", icon: ICON.advanced, tray: "spacing", run: tray("spacing") },
        { label: "Effects", icon: ICON.effects, tray: "effects", run: tray("effects") },
        { label: "Transparency", icon: ICON.transp, tray: "opacity", run: tray("opacity") }
      ].concat(SHARED),
      other: [
        { label: "Transparency", icon: ICON.transp, tray: "opacity", run: tray("opacity") }
      ].concat(SHARED)
    };

    let ctxKind = "";
    function renderCtx(kind){
      if (kind === ctxKind) return;
      ctxKind = kind;
      const set = SETS[kind] || [];
      ctxScroll.innerHTML = set.map((b, i) =>
        '<button type="button" class="app-ctx-btn' + (b.danger ? " danger" : "") + '" data-i="' + i + '" data-tray="' + (b.tray || "") + '">' + b.icon + '<span>' + b.label + '</span></button>'
      ).join("");
      ctxScroll.scrollLeft = 0;
    }
    ctxScroll.addEventListener("click", (e) => {
      const btn = e.target.closest(".app-ctx-btn");
      if (!btn) return;
      const item = (SETS[ctxKind] || [])[Number(btn.dataset.i)];
      if (item) item.run();
    });

    function finishEditing(){
      if (typeof designCanvas !== "undefined" && designCanvas){
        designCanvas.discardActiveObject();
        designCanvas.requestRenderAll();
      }
      closeDrawer();
    }
    const ctxDone = ctx.querySelector("#ctx-done");
    if (ctxDone) ctxDone.addEventListener("click", finishEditing);

    function applySelection(kind){
      if (kind !== ctxKind && editPanel && editPanel.hasAttribute("data-ctx")) applyEditCtx("");
      const on = !!kind && smallScreen();
      if (on) renderCtx(kind); else ctxKind = "";
      document.body.classList.toggle("has-selection", on);
    }
    document.addEventListener("studio:selection", (e) => applySelection(e.detail && e.detail.kind));
    window.addEventListener("resize", () => {
      if (!smallScreen()) document.body.classList.remove("has-selection");
    });


    // ---------- Phones/tablets: keyboard text editor ----------
    // Tapping "Edit" on a text layer opens the keyboard with a formatting bar
    // sitting right on top of it (Font, size, B / I / U / S, align, colour, tick),
    // like Canva. The bar drives the same controls as the Properties panel.
    const kbEl = document.createElement("div");
    kbEl.className = "kb-editor";
    kbEl.hidden = true;
    kbEl.innerHTML =
      '<textarea id="kb-text" rows="1" maxlength="80" placeholder="Type your text" enterkeyhint="done" aria-label="Edit text"></textarea>' +
      '<div class="kb-bar">' +
        '<div class="kb-scroll">' +
          '<label class="kb-btn kb-color" title="Text color" aria-label="Text color"><span class="kb-a" id="kb-a">A</span><input type="color" id="kb-color" value="#15171b"></label>' +
          '<label class="kb-btn kb-font" title="Font"><select id="kb-font" aria-label="Font"></select><span id="kb-font-name">Font</span></label>' +
          '<div class="kb-size"><button type="button" id="kb-size-dn" aria-label="Smaller">−</button><output id="kb-size-val">32</output><button type="button" id="kb-size-up" aria-label="Larger">+</button></div>' +
          '<button type="button" class="kb-btn" id="kb-bold" aria-label="Bold"><b>B</b></button>' +
          '<button type="button" class="kb-btn" id="kb-italic" aria-label="Italic"><i>I</i></button>' +
          '<button type="button" class="kb-btn" id="kb-underline" aria-label="Underline"><u>U</u></button>' +
          '<button type="button" class="kb-btn" id="kb-strike" aria-label="Strikethrough"><s>S</s></button>' +
          '<button type="button" class="kb-btn" id="kb-align" aria-label="Alignment"></button>' +
        '</div>' +
        '<button type="button" class="app-ctx-done" id="kb-done" aria-label="Done">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
      '</div>';
    document.body.appendChild(kbEl);

    const kbText = kbEl.querySelector("#kb-text");
    const kbFont = kbEl.querySelector("#kb-font");
    const kbColor = kbEl.querySelector("#kb-color");
    const kbAlignBtn = kbEl.querySelector("#kb-align");
    const propFont = document.getElementById("prop-text-font");
    if (propFont) kbFont.innerHTML = propFont.innerHTML;

    const ALIGN_ICON = {
      left: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>',
      center: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>',
      right: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M10 10h10M4 14h16M10 18h10"/></svg>'
    };
    const ALIGNS = ["left", "center", "right"];
    const activeText = () => {
      const o = (typeof designCanvas !== "undefined" && designCanvas) ? designCanvas.getActiveObject() : null;
      return o && (o.type === "i-text" || o.type === "text" || o.type === "textbox") ? o : null;
    };
    const fire = (el, types) => types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
    const clickProp = (id) => { const el = document.getElementById(id); if (el) el.click(); };

    function kbSync(){
      const o = activeText();
      if (!o) return;
      const size = Math.round(o.fontSize || 32);
      kbEl.querySelector("#kb-size-val").textContent = size;
      kbEl.querySelector("#kb-bold").classList.toggle("active", o.fontWeight === "bold");
      kbEl.querySelector("#kb-italic").classList.toggle("active", o.fontStyle === "italic");
      kbEl.querySelector("#kb-underline").classList.toggle("active", !!o.underline);
      kbEl.querySelector("#kb-strike").classList.toggle("active", !!o.linethrough);
      const al = o.textAlign || "left";
      kbAlignBtn.innerHTML = ALIGN_ICON[al] || ALIGN_ICON.left;
      kbAlignBtn.dataset.align = al;
      const fill = /^#[0-9a-f]{6}$/i.test(o.fill) ? o.fill : "#15171b";
      kbColor.value = fill;
      kbEl.querySelector("#kb-a").style.borderBottomColor = fill;
      if (propFont){
        kbFont.value = o.fontFamily || propFont.value;
        const opt = kbFont.options[kbFont.selectedIndex];
        kbEl.querySelector("#kb-font-name").textContent = opt ? opt.textContent.replace(/\s*\(.*\)/, "") : "Font";
      }
    }

    // Keep the bar glued to the top of the on-screen keyboard.
    const vv = window.visualViewport;
    function kbPlace(){
      if (kbEl.hidden) return;
      const inset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      kbEl.style.bottom = inset + "px";
      document.documentElement.style.setProperty("--kb-h", (inset + kbEl.offsetHeight) + "px");
    }
    if (vv){ vv.addEventListener("resize", kbPlace); vv.addEventListener("scroll", kbPlace); }

    function openKbEditor(){
      const o = activeText();
      if (!o) return false;
      closeDrawer();
      kbEl.hidden = false;
      document.body.classList.add("kb-editing");
      kbText.value = o.text || "";
      kbEl.querySelector(".kb-scroll").scrollLeft = 0;
      kbSync();
      kbPlace();
      document.dispatchEvent(new CustomEvent("studio:kb-open"));
      kbText.focus();
      try { kbText.select(); } catch (_) {}
      setTimeout(kbPlace, 120); setTimeout(kbPlace, 350);
      return true;
    }
    function closeKbEditor(){
      if (kbEl.hidden) return;
      kbText.blur();
      kbEl.hidden = true;
      document.body.classList.remove("kb-editing");
      document.documentElement.style.removeProperty("--kb-h");
    }

    kbText.addEventListener("input", () => {
      const src = document.getElementById("prop-text-content");
      if (!src) return;
      src.value = kbText.value;
      fire(src, ["input"]);
    });
    kbText.addEventListener("change", () => { const src = document.getElementById("prop-text-content"); if (src) fire(src, ["change"]); });
    kbText.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); closeKbEditor(); } });

    // Keep taps on the bar from stealing focus (so the keyboard stays open).
    kbEl.querySelector(".kb-bar").addEventListener("pointerdown", (e) => {
      if (e.target.closest("select, input")) return;
      e.preventDefault();
    });
    kbEl.querySelector("#kb-bold").addEventListener("click", () => { clickProp("prop-text-bold"); kbSync(); });
    kbEl.querySelector("#kb-italic").addEventListener("click", () => { clickProp("prop-text-italic"); kbSync(); });
    kbEl.querySelector("#kb-underline").addEventListener("click", () => { clickProp("prop-text-underline"); kbSync(); });
    kbEl.querySelector("#kb-strike").addEventListener("click", () => { clickProp("prop-text-strike"); kbSync(); });
    kbAlignBtn.addEventListener("click", () => {
      const next = ALIGNS[(ALIGNS.indexOf(kbAlignBtn.dataset.align) + 1) % ALIGNS.length];
      const b = document.querySelector('#prop-text-align .toggle-btn[data-align="' + next + '"]');
      if (b) b.click();
      kbSync();
    });
    function bumpSize(d){
      const sz = document.getElementById("prop-text-size");
      const o = activeText();
      if (!sz || !o) return;
      const v = Math.max(+sz.min || 10, Math.min(+sz.max || 160, Math.round(o.fontSize || 32) + d));
      sz.value = v;
      fire(sz, ["input", "change"]);
      kbSync();
    }
    kbEl.querySelector("#kb-size-dn").addEventListener("click", () => bumpSize(-2));
    kbEl.querySelector("#kb-size-up").addEventListener("click", () => bumpSize(2));
    kbFont.addEventListener("change", () => {
      if (!propFont) return;
      propFont.value = kbFont.value;
      fire(propFont, ["change"]);
      kbSync();
      kbText.focus();
    });
    kbColor.addEventListener("input", () => {
      const c = document.getElementById("prop-text-color");
      if (c){ c.value = kbColor.value; fire(c, ["input"]); }
      kbEl.querySelector("#kb-a").style.borderBottomColor = kbColor.value;
    });
    kbColor.addEventListener("change", () => { const c = document.getElementById("prop-text-color"); if (c) fire(c, ["change"]); });
    kbEl.querySelector("#kb-done").addEventListener("click", closeKbEditor);
    document.addEventListener("studio:selection", (e) => { if (!(e.detail && e.detail.kind === "text")) closeKbEditor(); });

    const closeBtn = document.getElementById("drawer-close");
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    // The "Edit" button under a selected layer (drawn on the canvas by
    // customize.js) fires "studio:edit-requested"; only then do we open the
    // Edit/Properties panel.
    document.addEventListener("studio:edit-requested", () => {
      if (smallScreen() && openKbEditor()) return;
      showPanel("edit");
      const propsTab = document.querySelector('.studio-tab[data-tab="properties"]');
      if (propsTab) propsTab.click();
    });

    // Keep the rail's layer-count badge mirrored from the drawer's own badge.
    const railBadge = document.getElementById("layer-count-badge-rail");
    const drawerBadge = document.getElementById("layer-count-badge");
    if (railBadge && drawerBadge){
      const badgeObs = new MutationObserver(() => { railBadge.textContent = drawerBadge.textContent; });
      badgeObs.observe(drawerBadge, { childList: true, characterData: true, subtree: true });
    }

    // Default view: Product panel open on desktop. On phones and tablets the
    // product stays fully visible and the tools open as a bottom sheet on tap.
    if (window.matchMedia("(min-width: 901px)").matches) showPanel("product");

    // Bottom-bar shortcuts (phones and tablets) reuse the existing top-bar actions.
    function proxy(id, targetId){
      const el = document.getElementById(id);
      const target = document.getElementById(targetId);
      if (!el || !target) return;
      el.addEventListener("click", (e) => { e.stopPropagation(); target.click(); });
    }
    proxy("rail-download", "download-design-btn");
    proxy("rail-clear", "tool-reset");

    /* ---------- Zoom ---------- */
    const zoomSlider = document.getElementById("zoom-slider");
    const zoomVal = document.getElementById("zoom-val");
    const stageWrap = document.getElementById("stage-zoom-wrap");

    function applyZoom(v){
      v = Math.max(25, Math.min(300, Math.round(Number(v) / 5) * 5));
      if (stageWrap) stageWrap.style.transform = `scale(${v / 100})`;
      if (zoomVal) zoomVal.textContent = v + "%";
      if (zoomSlider) zoomSlider.value = v;
    }

    if (zoomSlider) zoomSlider.addEventListener("input", () => applyZoom(zoomSlider.value));
    const zoomOut = document.getElementById("zoom-out");
    const zoomIn = document.getElementById("zoom-in");
    if (zoomOut) zoomOut.addEventListener("click", () => applyZoom(Number(zoomSlider.value) - 10));
    if (zoomIn) zoomIn.addEventListener("click", () => applyZoom(Number(zoomSlider.value) + 10));

    // Small screens: tapping the rail should feel like opening a full sheet;
    // closing it (via the × or re-tapping the same icon) returns to canvas.
  });
})();
