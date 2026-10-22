/* =========================================================
   GfxPrints - Design Studio Templates
   Ready-made designs (like Canva's Templates). The customer taps one and
   it lands on the product as separate, editable layers: the text is real
   text (tap to change it) and the artwork is vector, so it stays sharp in
   the print file.

   HOW TO ADD YOUR OWN TEMPLATE
   Copy one entry in TEMPLATES below and change it. Every template is drawn
   on a 100 x 100 box; x and y are the CENTRE of a layer in that box.
     T(text, x, y, size, font, colour, extras)   a line of editable text
     S(svgMarkup, x, y, width, vbW, vbH, extras) vector artwork (drawn on a vbW x vbH grid)
     C(clipartId, x, y, width, colour, extras)   a drawing from the Clipart library
   Colours: "@ink" is the main text colour (dark on light products, white on
   dark ones), "@soft" is a calmer second ink, and "@blue", "@brown", "@green" are
   accents that brighten on dark products. Any normal hex colour also works.
   extras: bold:true, sp (letter spacing), angle, op (opacity), stroke, sw (outline width)
   ========================================================= */
(function(){
  "use strict";

  const F = {
    anton: "'Anton', sans-serif", bebas: "'Bebas Neue', sans-serif", mont: "'Montserrat', sans-serif",
    pop: "'Poppins', sans-serif", play: "'Playfair Display', serif", abril: "'Abril Fatface', serif",
    pacifico: "'Pacifico', cursive", lobster: "'Lobster', cursive", dance: "'Dancing Script', cursive",
    vibes: "'Great Vibes', cursive", satisfy: "'Satisfy', cursive", caveat: "'Caveat', cursive",
    bangers: "'Bangers', cursive", marker: "'Permanent Marker', cursive", urdu: "'Noto Nastaliq Urdu', serif"
  };

  const T = (text, x, y, size, font, fill, o) => Object.assign({ k: "t", text: text, x: x, y: y, size: size, font: font, fill: fill }, o || {});
  const S = (svg, x, y, w, vbW, vbH, o) => Object.assign({ k: "s", svg: svg, x: x, y: y, w: w, vbW: vbW || 100, vbH: vbH || 100 }, o || {});
  const C = (id, x, y, w, color, o) => Object.assign({ k: "s", clip: id, color: color, x: x, y: y, w: w, vbW: 100, vbH: 100 }, o || {});

  /* ---- A few drawings made for the templates (100 x 100 grid unless noted) ---- */
  const CUP = '<path d="M72 46h5a11 11 0 0 1 0 22h-8" fill="none" stroke="#C8643B" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M18 40h56v24a26 26 0 0 1-26 26h-4a26 26 0 0 1-26-26z" fill="#C8643B"/>' +
    '<ellipse cx="46" cy="40" rx="28" ry="5.5" fill="#6B3F26"/>' +
    '<path d="M34 28q-6-8 0-16M48 28q-6-8 0-16M62 28q-6-8 0-16" fill="none" stroke="@soft" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M14 95h64" stroke="@soft" stroke-width="3.5" stroke-linecap="round"/>';
  const DIV = '<path d="M0 10h40M60 10h40" stroke="@ink" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M50 2.5l7 7.5-7 7.5-7-7.5z" fill="#C8643B"/>';
  const RING = '<circle cx="50" cy="50" r="46" fill="none" stroke="@ink" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="none" stroke="#C8643B" stroke-width="1.6" stroke-dasharray="2 4"/>';
  const LANTERN = '<path d="M50 2v10" stroke="@soft" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M38 12h24l5 9H33z" fill="#F5B301"/>' +
    '<path d="M33 21h34l3 46a20 16 0 0 1-40 0z" fill="#E5384F"/>' +
    '<path d="M33 21l9 62M67 21l-9 62M50 21v66" stroke="#F5B301" stroke-width="2.4" fill="none"/>' +
    '<path d="M36 70h28" stroke="#F5B301" stroke-width="2.4"/>' +
    '<path d="M42 85h16l-3 10H45z" fill="#F5B301"/>';
  const HEX = '<polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="@blue"/>';
  const WAVE = '<path d="M2 8q8-8 16 0t16 0 16 0 16 0 16 0 16 0" fill="none" stroke="#C8643B" stroke-width="3" stroke-linecap="round"/>';

  const TEMPLATES = [
    { id: "but-first-coffee", name: "But First, Coffee", cat: "Coffee", tags: "mug cafe morning drink", layers: [
      T("BUT FIRST,", 50, 13, 8, F.mont, "@brown", { bold: true, sp: 480 }),
      T("Coffee", 50, 32, 25, F.pacifico, "@ink"),
      S(DIV, 50, 47, 56, 100, 20),
      S(CUP, 50, 74, 42)
    ] },
    { id: "coffee-lover", name: "Coffee Lover", cat: "Coffee", tags: "mug cafe drink latte", layers: [
      C("star", 50, 12, 9, "#C8643B"),
      T("COFFEE", 50, 32, 27, F.anton, "@ink", { sp: 90 }),
      S(DIV, 50, 47, 62, 100, 20),
      T("lover", 50, 62, 20, F.pacifico, "#C8643B"),
      C("coffee", 50, 85, 26)
    ] },
    { id: "rise-and-grind", name: "Rise and Grind", cat: "Coffee", tags: "morning sun work hustle", layers: [
      C("sun", 50, 20, 34),
      T("RISE", 50, 49, 24, F.anton, "@ink", { sp: 120 }),
      T("& GRIND", 50, 71, 22, F.anton, "#C8643B", { sp: 80 }),
      S(WAVE, 50, 88, 56, 100, 16)
    ] },

    { id: "love-you-always", name: "Love You Always", cat: "Love", tags: "valentine couple heart romantic", layers: [
      C("heart", 22, 24, 16, null, { angle: -16 }),
      C("heart", 80, 17, 10, null, { angle: 14 }),
      T("Love", 50, 42, 34, F.vibes, "#E5384F"),
      T("YOU ALWAYS", 50, 62, 7, F.mont, "@ink", { bold: true, sp: 360 }),
      C("two-hearts", 50, 84, 26)
    ] },
    { id: "be-mine", name: "Be Mine", cat: "Love", tags: "valentine heart romantic gift", layers: [
      C("heart", 50, 50, 88),
      T("Be Mine", 50, 45, 18, F.lobster, "#ffffff"),
      T("XOXO", 50, 60, 6.5, F.mont, "#ffffff", { bold: true, sp: 420 }),
      C("sparkles", 86, 14, 18),
      C("sparkles", 14, 86, 14)
    ] },
    { id: "couple-names", name: "Couple Names", cat: "Love", tags: "wedding anniversary names together mr mrs", layers: [
      T("Ali & Sara", 50, 31, 21, F.vibes, "#E5384F"),
      S(DIV, 50, 47, 60, 100, 20),
      T("TOGETHER FOREVER", 50, 60, 5.6, F.mont, "@ink", { bold: true, sp: 220 }),
      T("EST. 2026", 50, 70, 5.5, F.mont, "@soft", { sp: 400 }),
      C("two-hearts", 50, 86, 20)
    ] },

    { id: "happy-birthday", name: "Happy Birthday", cat: "Birthday", tags: "party balloons celebrate", layers: [
      C("balloon", 24, 27, 26, null, { angle: -10 }),
      C("balloon", 77, 25, 24, null, { angle: 12 }),
      T("Happy", 50, 53, 17, F.lobster, "#FF4F6D"),
      T("Birthday", 50, 72, 17, F.pacifico, "@ink"),
      C("sparkles", 50, 17, 13)
    ] },
    { id: "birthday-queen", name: "Birthday Queen", cat: "Birthday", tags: "crown girl her party", layers: [
      C("crown", 50, 21, 34, "#F5B301"),
      T("BIRTHDAY", 50, 48, 16, F.anton, "@ink", { sp: 130 }),
      T("Queen", 50, 70, 28, F.vibes, "#E5384F"),
      C("sparkles", 20, 16, 11),
      C("sparkles", 82, 20, 9),
      C("sparkles", 86, 84, 10)
    ] },
    { id: "birthday-king", name: "Birthday King", cat: "Birthday", tags: "crown boy him party", layers: [
      C("crown", 50, 21, 34, "#F5B301"),
      T("BIRTHDAY", 50, 48, 16, F.anton, "@ink", { sp: 130 }),
      T("KING", 50, 70, 26, F.anton, "@blue", { sp: 220 }),
      C("star", 20, 18, 9),
      C("star", 80, 20, 7),
      C("star", 86, 84, 8)
    ] },

    { id: "best-dad", name: "Best Dad Ever", cat: "Family", tags: "father fathers day papa", layers: [
      T("WORLD'S", 50, 17, 8, F.mont, "@blue", { bold: true, sp: 560 }),
      T("BEST DAD", 50, 40, 20, F.anton, "@ink", { sp: 60 }),
      T("Ever", 50, 65, 24, F.pacifico, "#E5384F"),
      C("badge", 50, 87, 20)
    ] },
    { id: "best-mom", name: "World's Best Mom", cat: "Family", tags: "mother mothers day mama mum", layers: [
      T("World's Best", 50, 22, 16, F.dance, "#E5384F", { bold: true }),
      T("MOM", 50, 45, 30, F.abril, "@ink", { sp: 100 }),
      T("EVER", 50, 64, 8, F.mont, "@ink", { bold: true, sp: 620 }),
      C("flower", 22, 84, 20),
      C("heart", 50, 86, 13),
      C("flower", 78, 84, 20)
    ] },
    { id: "cat-mom", name: "Cat Mom", cat: "Family", tags: "pet cat lover kitty paw", layers: [
      C("cat", 50, 33, 42),
      T("CAT MOM", 50, 64, 19, F.anton, "@ink", { sp: 80 }),
      T("purrfectly loved", 50, 79, 10, F.dance, "#C8643B", { bold: true }),
      C("paw", 50, 91, 8, "#C8643B")
    ] },

    { id: "stay-weird", name: "Stay Weird", cat: "Funny", tags: "fun cool crazy sticker", layers: [
      C("burst", 50, 50, 92),
      T("STAY", 50, 39, 24, F.bangers, "#ffffff", { stroke: "#15171b", sw: 1.4, sp: 60 }),
      T("WEIRD", 50, 62, 24, F.bangers, "#ffffff", { stroke: "#15171b", sw: 1.4, sp: 60 }),
      C("bolt", 86, 15, 12, null, { angle: 14 })
    ] },
    { id: "not-morning-person", name: "Not a Morning Person", cat: "Funny", tags: "sleep tired night lazy", layers: [
      C("moon", 50, 20, 22),
      C("star", 24, 30, 7),
      C("star", 78, 27, 9),
      T("NOT A", 50, 44, 9, F.mont, "@ink", { bold: true, sp: 560 }),
      T("MORNING", 50, 60, 20, F.anton, "@ink", { sp: 90 }),
      T("PERSON", 50, 78, 20, F.anton, "#7B5CFA", { sp: 90 })
    ] },

    { id: "good-vibes-only", name: "Good Vibes Only", cat: "Quotes", tags: "positive happy rainbow", layers: [
      C("rainbow", 50, 30, 62),
      T("Good Vibes", 50, 62, 18, F.pacifico, "@ink"),
      T("ONLY", 50, 80, 10, F.mont, "#7B5CFA", { bold: true, sp: 760 })
    ] },
    { id: "dream-big", name: "Dream Big", cat: "Quotes", tags: "motivation rocket work hard goals", layers: [
      C("rocket", 50, 29, 40, null, { angle: 22 }),
      T("DREAM BIG", 50, 62, 17, F.anton, "@ink", { sp: 60 }),
      T("WORK HARD, STAY KIND", 50, 76, 4.6, F.mont, "@brown", { bold: true, sp: 200 }),
      C("sparkles", 80, 22, 11),
      C("sparkles", 18, 50, 9)
    ] },

    { id: "eid-mubarak", name: "Eid Mubarak", cat: "Eid", tags: "eid islamic moon festival gift", layers: [
      C("moon", 50, 20, 28),
      C("star", 67, 16, 8, "#F5B301"),
      T("Eid Mubarak", 50, 45, 17, F.lobster, "@green"),
      T("\u0639\u06CC\u062F \u0645\u0628\u0627\u0631\u06A9", 50, 66, 14, F.urdu, "@ink"),
      C("sparkles", 20, 22, 9),
      C("sparkles", 82, 28, 10),
      S(WAVE, 50, 88, 50, 100, 16)
    ] },
    { id: "ramadan-kareem", name: "Ramadan Kareem", cat: "Eid", tags: "ramzan islamic lantern fanoos", layers: [
      S(LANTERN, 50, 30, 34),
      C("moon", 18, 16, 15),
      C("star", 82, 20, 8, "#F5B301"),
      T("Ramadan", 50, 64, 20, F.lobster, "@green"),
      T("KAREEM", 50, 80, 10, F.mont, "@ink", { bold: true, sp: 640 })
    ] },

    { id: "monogram", name: "Monogram", cat: "Names", tags: "initial letter name personalised gift", layers: [
      S(RING, 50, 38, 56),
      T("A", 50, 38, 44, F.play, "@ink", { bold: true }),
      T("YOUR NAME", 50, 76, 8, F.mont, "@ink", { bold: true, sp: 360 }),
      T("EST. 2026", 50, 88, 5.5, F.mont, "@brown", { sp: 420 })
    ] },
    { id: "brand-logo", name: "Brand Logo", cat: "Names", tags: "business company shop logo team", layers: [
      S(HEX, 50, 33, 40),
      T("B", 50, 33, 26, F.anton, "#ffffff"),
      T("YOUR BRAND", 50, 68, 9, F.mont, "@ink", { bold: true, sp: 160 }),
      T("Your tagline goes here", 50, 80, 5.4, F.mont, "@soft", { sp: 120 })
    ] }
  ];

  const CATS = ["All", "Coffee", "Love", "Birthday", "Family", "Funny", "Quotes", "Eid", "Names"];

  /* ---- Colour helpers: "@ink" follows the product colour ---- */
  // [colour on light products, colour on dark products]
  const TONES = {
    "@ink": ["#15171b", "#ffffff"], "@soft": ["#4a4f58", "#d9dce1"],
    "@blue": ["#2438E0", "#7C93FF"], "@brown": ["#8A5A3B", "#E0B08A"], "@green": ["#1F8A5B", "#3FD08F"]
  };
  function toneColour(c, dark){
    return TONES[c] ? TONES[c][dark ? 1 : 0] : c;
  }
  function toneSvg(str, dark){
    return String(str).replace(/@[a-z]+/g, (m) => toneColour(m, dark));
  }
  function artwork(l, dark){
    if (l.clip){
      return window.GfxClipart ? window.GfxClipart.inner(l.clip, l.color || "#15171b") : "";
    }
    return toneSvg(l.svg, dark);
  }
  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  const TEXT_BASELINE = 0.33;   // baseline sits about a third of the font size below the centre of the line

  /* ---- Preview thumbnail (inline SVG built from the same layers) ---- */
  function layerPreview(l, dark){
    if (l.k === "t"){
      const fill = toneColour(l.fill, dark);
      const rot = l.angle ? ` transform="rotate(${l.angle} ${l.x} ${l.y})"` : "";
      const st = l.stroke ? ` stroke="${esc(toneColour(l.stroke, dark))}" stroke-width="${l.sw || 1}" paint-order="stroke" stroke-linejoin="round"` : "";
      return `<text x="${l.x}" y="${(l.y + l.size * TEXT_BASELINE).toFixed(2)}" text-anchor="middle" font-family="${esc(l.font)}" font-size="${l.size}" font-weight="${l.bold ? 700 : 400}" fill="${esc(fill)}"${l.sp ? ` letter-spacing="${(l.sp / 1000 * l.size).toFixed(2)}"` : ""}${st}${rot}>${esc(l.text)}</text>`;
    }
    const w = l.w, h = l.w * l.vbH / l.vbW;
    const rot = l.angle ? ` transform="rotate(${l.angle} ${l.x} ${l.y})"` : "";
    return `<svg x="${(l.x - w / 2).toFixed(2)}" y="${(l.y - h / 2).toFixed(2)}" width="${w}" height="${h.toFixed(2)}" viewBox="0 0 ${l.vbW} ${l.vbH}" overflow="visible"${l.op ? ` opacity="${l.op}"` : ""}><g${rot ? ` transform="rotate(${l.angle} ${l.vbW / 2} ${l.vbH / 2})"` : ""}>${artwork(l, dark)}</g></svg>`;
  }
  function previewSVG(tpl, dark){
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${tpl.layers.map(l => layerPreview(l, dark)).join("")}</svg>`;
  }

  window.GfxTemplates = { TEMPLATES: TEMPLATES, CATS: CATS, previewSVG: previewSVG, artwork: artwork, toneColour: toneColour, TEXT_BASELINE: TEXT_BASELINE };

  /* =========================================================
     Everything below needs the Design Studio page
     ========================================================= */
  const $ = (id) => document.getElementById(id);
  if (!$ || !$("panel-templates")) return;
  const state = { cat: "All", q: "", dark: null };

  function surfaceIsDark(){
    try {
      return !!(currentProduct && currentProduct.colorImages && typeof isDarkSurface === "function" && isDarkSurface(currentProduct, selectedColor));
    } catch (e){ return false; }
  }

  function render(force){
    const grid = $("tpl-grid"), empty = $("tpl-empty");
    if (!grid) return;
    const dark = surfaceIsDark();
    if (!force && state.dark === dark && grid.dataset.cat === state.cat && grid.dataset.q === state.q) return;
    state.dark = dark;
    grid.dataset.cat = state.cat; grid.dataset.q = state.q;
    grid.classList.toggle("is-dark", dark);
    const q = state.q.trim().toLowerCase();
    const list = TEMPLATES.filter(t => (state.cat === "All" || t.cat === state.cat) &&
      (!q || (t.name + " " + t.tags + " " + t.cat).toLowerCase().includes(q)));
    empty.hidden = list.length > 0;
    grid.innerHTML = list.map(t =>
      `<button type="button" class="tpl-item" data-id="${t.id}" title="${esc(t.name)}" aria-label="Use the ${esc(t.name)} template">` +
      `<span class="tpl-thumb">${previewSVG(t, dark)}</span><span class="tpl-name">${esc(t.name)}</span></button>`).join("");
  }

  /* ---- Put a template on the product ---- */
  function loadFonts(layers){
    if (!(document.fonts && document.fonts.load)) return Promise.resolve();
    const jobs = [];
    layers.forEach(l => {
      if (l.k !== "t") return;
      const fam = String(l.font).split(",")[0].trim().replace(/['"]/g, "");
      jobs.push(document.fonts.load(`${l.bold ? "bold" : "normal"} 40px "${fam}"`, l.text).catch(() => {}));
    });
    // Never wait long: a slow font should not stop the template from appearing.
    return Promise.race([Promise.all(jobs), new Promise(res => setTimeout(res, 2500))]);
  }

  function loadSvgImage(markup){
    return new Promise((resolve) => {
      fabric.Image.fromURL("data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup), (img) => resolve(img));
    });
  }

  let placing = false;
  function applyTemplate(tpl, mode){
    if (placing) return;
    if (!designCanvas || typeof fabric === "undefined"){ showToast("Design Studio isn't ready yet"); return; }
    placing = true;
    const dark = surfaceIsDark();
    const rect = (typeof sidePrintRect === "function") ? sidePrintRect(activeSideId) : { x: 0, y: 0, w: designCanvas.getWidth(), h: designCanvas.getHeight() };
    const k = Math.min(rect.w, rect.h) / 100 * 0.94;          // canvas pixels per template unit
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    // How many times bigger the 300 DPI print file is than the studio canvas (same sum the print export uses)
    const cat = currentProduct && currentProduct.category;
    const inches = (typeof IMG_PRINT_WIDTH_IN !== "undefined" && IMG_PRINT_WIDTH_IN[cat]) || 10;
    const printMult = (inches * (typeof PRINT_DPI !== "undefined" ? PRINT_DPI : 300)) / Math.max(1, designCanvas.getWidth());

    loadFonts(tpl.layers).then(() => Promise.all(tpl.layers.map(l => {
      if (l.k === "t"){
        const t = new fabric.IText(l.text, {
          left: cx + (l.x - 50) * k, top: cy + (l.y - 50) * k, originX: "center", originY: "center",
          fontFamily: l.font, fontSize: l.size * k, fill: toneColour(l.fill, dark),
          fontWeight: l.bold ? "bold" : "normal", fontStyle: "normal", textAlign: "center",
          charSpacing: l.sp || 0, angle: l.angle || 0, opacity: l.op || 1
        });
        if (l.stroke){ t.set({ stroke: toneColour(l.stroke, dark), strokeWidth: (l.sw || 1) * k, paintFirst: "stroke", strokeLineJoin: "round" }); }
        return Promise.resolve(t);
      }
      const w = l.vbW, h = l.vbH;
      // Draw the artwork at the size the 300 DPI print file needs (plus a little spare), not bigger:
      // a huge picture squeezed onto a small screen canvas looks rough, a right-sized one stays crisp.
      const px = Math.min(2400, Math.max(400, Math.round(l.w * k * printMult * 1.15)));
      const pw = px, ph = Math.round(px * h / w);
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${w} ${h}">${artwork(l, dark)}</svg>`;
      return loadSvgImage(markup).then((img) => {
        if (!img) return null;
        const s = (l.w * k) / (img.width || pw);
        img.set({ left: cx + (l.x - 50) * k, top: cy + (l.y - 50) * k, originX: "center", originY: "center",
          scaleX: s, scaleY: s, angle: l.angle || 0, opacity: l.op || 1 });
        img.gfxVector = true;      // vector artwork: redrawn sharp at print size
        return img;
      });
    }))).then((objs) => {
      if (mode === "replace"){
        designCanvas.discardActiveObject();
        designCanvas.clear();
      }
      objs.forEach(o => { if (o) designCanvas.add(o); });
      designCanvas.discardActiveObject();
      objs.forEach(o => { if (o && o.initDimensions && o.type === "i-text"){ o.initDimensions(); o.setCoords(); } });
      designCanvas.requestRenderAll();
      if (typeof refreshLayersList === "function") refreshLayersList();
      commitDesignHistory();
      placing = false;
      showToast(`${tpl.name} added. Tap any text to change it`);
      // Phones and tablets: close the tool sheet so the design is visible.
      if (window.matchMedia("(max-width: 900px)").matches){
        const rail = $("rail-templates");
        if (rail && rail.classList.contains("active")) rail.click();
      }
    }).catch((err) => {
      placing = false;
      console.error("Template failed", err);
      showToast("Sorry, that template could not be added. Please try again");
    });
  }

  function askMode(tpl){
    const old = $("tpl-dlg"); if (old) old.remove();
    const d = document.createElement("div");
    d.id = "tpl-dlg"; d.className = "copy-dlg";
    d.innerHTML = '<div class="copy-card" role="dialog" aria-modal="true" aria-label="Use template">' +
      '<h3>Your design already has layers</h3><p>Do you want ' + esc(tpl.name) + ' to replace them, or go on top?</p>' +
      '<button type="button" class="btn btn-primary" data-m="replace">Replace my design</button>' +
      '<button type="button" class="btn btn-outline" data-m="add">Add on top of it</button>' +
      '<button type="button" class="copy-cancel" data-m="">Cancel</button></div>';
    document.body.appendChild(d);
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-m]")){
        const b = e.target.closest("[data-m]"), m = b ? b.dataset.m : "";
        d.remove(); if (m) applyTemplate(tpl, m);
      }
    });
    const first = d.querySelector("button"); if (first) first.focus();
  }

  function init(){
    const grid = $("tpl-grid");
    if (!grid) return;
    $("tpl-cats").innerHTML = CATS.map(c => `<button type="button" class="clip-chip${c === state.cat ? " active" : ""}" data-cat="${c}">${c}</button>`).join("");
    $("tpl-cats").addEventListener("click", (e) => {
      const b = e.target.closest(".clip-chip"); if (!b) return;
      state.cat = b.dataset.cat;
      document.querySelectorAll("#tpl-cats .clip-chip").forEach(x => x.classList.toggle("active", x === b));
      render();
    });
    $("tpl-search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    grid.addEventListener("click", (e) => {
      const b = e.target.closest(".tpl-item"); if (!b) return;
      const tpl = TEMPLATES.find(t => t.id === b.dataset.id);
      if (!tpl) return;
      if (typeof designCanvas !== "undefined" && designCanvas && designCanvas.getObjects().length) askMode(tpl);
      else applyTemplate(tpl, "add");
    });
    // The thumbnails follow the product colour (white text on dark products), so refresh them when it changes.
    const refresh = () => setTimeout(() => render(false), 60);
    document.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest("#pd-colors, #cz-picker, #rail-templates")) refresh();
    });
    render(true);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
