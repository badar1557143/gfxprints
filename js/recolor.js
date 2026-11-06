/* =========================================================
   GfxPrints - Recolor vector artwork (clipart, shapes, template graphics)
   Clipart is placed on the canvas as an SVG picture, so its colors cannot be
   changed the way text color can. This module reads the colors out of that SVG,
   lets the Colors tool swap any one of them, and reloads the picture.
   Only SVG artwork made by the Design Studio is recolorable. Photos and
   uploaded PNG/JPG files are not (they have no editable colors).
   Used by: customize-tray.js (the "Colors" tool), customize-desktop.js and
   customize-ui.js (the toolbar button).
   ========================================================= */
(function(){
  "use strict";
  const PREFIX = "data:image/svg+xml";
  const MAX_COLORS = 8;

  // Colors set through fill, stroke, stop-color or flood-color. Looking only at these avoids matching ids such as url(#abc).
  const CTX = () => /((?:fill|stroke|stop-color|flood-color)\s*[=:]\s*["']?\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-fA-F])/g;

  function norm(h){
    h = String(h).toLowerCase();
    return h.length === 4 ? "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
  }

  function svgText(img){
    try {
      const src = img && typeof img.getSrc === "function" ? img.getSrc() : "";
      if (!src || src.indexOf(PREFIX) !== 0) return null;
      const comma = src.indexOf(",");
      const head = src.slice(0, comma), data = src.slice(comma + 1);
      return /;base64/i.test(head) ? atob(data) : decodeURIComponent(data);
    } catch (e){ return null; }
  }

  function colorsIn(text){
    const out = [];
    if (!text) return out;
    text.replace(CTX(), (m, pre, hex) => { const c = norm(hex); if (out.indexOf(c) === -1) out.push(c); return m; });
    return out.slice(0, MAX_COLORS);
  }

  function isVectorImage(o){ return !!o && o.type === "image" && o.gfxVector === true; }
  function colors(img){ return isVectorImage(img) ? colorsIn(svgText(img)) : []; }
  function can(img){ return colors(img).length > 0; }

  // Rebuild the picture from baseText with the given { "#old": "#new" } swaps.
  // Always starts from the same base text so quick color-picker drags never pile up.
  const busy = new WeakMap(), queued = new WeakMap();
  function apply(img, baseText, map, done){
    if (!img || !baseText) return;
    if (busy.get(img)){ queued.set(img, { baseText: baseText, map: map, done: done }); return; }
    const out = baseText.replace(CTX(), (m, pre, hex) => {
      const to = map[norm(hex)];
      return to ? pre + to : m;
    });
    busy.set(img, true);
    img.setSrc(PREFIX + ";charset=utf-8," + encodeURIComponent(out), () => {
      busy.set(img, false);
      try { if (img.filters && img.filters.length && img.applyFilters) img.applyFilters(); } catch (e){ /* keep going */ }
      img.dirty = true;
      if (done) done();
      const next = queued.get(img);
      if (next){ queued.delete(img); apply(img, next.baseText, next.map, next.done); }
    });
  }

  window.GfxRecolor = { colors: colors, can: can, svgText: svgText, apply: apply, norm: norm };

  /* ---- Show the toolbar "Colors" button only when the selected picture can be recolored ---- */
  function syncButtons(){
    const c = (typeof designCanvas !== "undefined" && designCanvas) ? designCanvas : null;
    const o = c ? c.getActiveObject() : null;
    const show = !!o && can(o);
    document.querySelectorAll('[data-tray="imgcolors"]').forEach(b => { b.style.display = show ? "" : "none"; });
  }
  document.addEventListener("studio:selection", () => setTimeout(syncButtons, 0));
  document.addEventListener("studio:tray", () => setTimeout(syncButtons, 0));
  window.addEventListener("load", () => setTimeout(syncButtons, 300));
})();
