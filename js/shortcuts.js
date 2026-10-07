/* =========================================================
   GfxPrints - Design Studio keyboard shortcuts + mouse-wheel zoom
   Uses the studio's own globals (designCanvas, undoDesign, redoDesign,
   deleteSelectedLayers, refreshLayersList, commitDesignHistory, addImageLayer).
   Press ? in the studio to see the full list.
   ========================================================= */
(function(){
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const MOD = MAC ? "\u2318" : "Ctrl";
  const $ = (id) => document.getElementById(id);
  let clip = null, nudgeTimer = null, wheelAcc = 0;

  const canvas = () => (typeof designCanvas !== "undefined" && designCanvas) || null;
  const toast = (m) => { if (typeof showToast === "function") showToast(m); };
  const bgrOpen = () => !!document.querySelector(".bgr:not([hidden])");
  const editing = () => { const c = canvas(), a = c && c.getActiveObject(); return !!(a && a.isEditing); };
  function inField(e, allowButtonsLike){
    const t = e.target; if (!t || !t.tagName) return false;
    if (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return true;
    if (t.tagName !== "INPUT") return false;
    return allowButtonsLike ? !/^(range|checkbox|radio|button|color)$/.test(t.type) : true;
  }
  function changed(){
    const c = canvas(); if (!c) return;
    c.requestRenderAll();
    if (typeof refreshLayersList === "function") refreshLayersList();
    if (typeof commitDesignHistory === "function") commitDesignHistory();
  }

  /* ---------- clipboard ---------- */
  function copy(){
    const c = canvas(), a = c && c.getActiveObject();
    if (!a) return false;
    a.clone((o) => { clip = o; });
    toast("Copied");
    return true;
  }
  function place(o){
    const c = canvas();
    c.discardActiveObject();
    o.set({ left: o.left + 20, top: o.top + 20, evented: true });
    if (o.type === "activeSelection"){
      o.canvas = c;
      o.forEachObject((x) => c.add(x));
      o.setCoords();
    } else c.add(o);
    c.setActiveObject(o);
    changed();
  }
  function paste(){
    if (!canvas() || !clip) return false;
    clip.clone((o) => { place(o); clip.left += 20; clip.top += 20; });
    return true;
  }
  function cut(){
    if (!copy()) return false;
    if (typeof deleteSelectedLayers === "function") deleteSelectedLayers();
    toast("Cut");
    return true;
  }
  function duplicate(){
    const c = canvas(), a = c && c.getActiveObject(); if (!a) return false;
    a.clone(place);
    return true;
  }
  function selectAll(){
    const c = canvas(); if (!c) return false;
    const all = c.getObjects().filter((o) => o.selectable !== false && o.visible !== false);
    if (!all.length) return false;
    c.discardActiveObject();
    c.setActiveObject(all.length > 1 ? new fabric.ActiveSelection(all, { canvas: c }) : all[0]);
    c.requestRenderAll();
    return true;
  }
  function nudge(dx, dy){
    const c = canvas(), a = c && c.getActiveObject();
    if (!a || a.lockMovementX || a.lockMovementY) return false;
    a.set({ left: a.left + dx, top: a.top + dy }); a.setCoords();
    c.requestRenderAll();
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => { c.fire("object:modified", { target: a }); }, 350);
    return true;
  }
  function stack(fn){
    const c = canvas(), a = c && c.getActiveObject(); if (!a) return false;
    c[fn](a); changed(); return true;
  }

  /* ---------- zoom (handled by view.js) ---------- */
  const V = () => window.GfxView;
  const zoomStep = (d) => { if (V()) V().stepZoom(d); };
  const zoomReset = () => { if (V()) V().reset(); };

  /* ---------- keys ---------- */
  document.addEventListener("keydown", (e) => {
    const c = canvas(); if (bgrOpen() || e.altKey) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key;
    const lk = k.length === 1 ? k.toLowerCase() : k;
    const help = $("sc-modal");
    if (k === "Escape" && help && !help.hidden){ help.hidden = true; return; }
    if (editing()) return;
    let done = false;

    if (mod){
      if (inField(e, true)) return;
      if (lk === "z") { if (c) e.shiftKey ? redoDesign() : undoDesign(); done = true; }
      else if (lk === "y") { if (c) redoDesign(); done = true; }
      else if (lk === "a") done = selectAll();
      else if (lk === "c") { if (!String(window.getSelection && window.getSelection()).trim()) done = copy(); }
      else if (lk === "x") done = cut();
      else if (lk === "d") done = duplicate();
      else if (lk === "v") return;                       // handled by the paste event
      else if (e.code === "BracketRight") done = stack(e.shiftKey ? "bringToFront" : "bringForward");
      else if (e.code === "BracketLeft") done = stack(e.shiftKey ? "sendToBack" : "sendBackwards");
      else if (lk === "+" || lk === "=") { zoomStep(1); done = true; }
      else if (lk === "-" || lk === "_") { zoomStep(-1); done = true; }
      else if (lk === "0") { zoomReset(); done = true; }
    } else {
      if (inField(e, false)) return;
      const step = e.shiftKey ? 10 : 1;
      if (k === "Delete" || k === "Backspace") { if (c && c.getActiveObject()){ deleteSelectedLayers(); done = true; } }
      else if (k === "Escape") { if (c){ c.discardActiveObject(); c.requestRenderAll(); } done = true; }
      else if (k === "ArrowLeft") done = nudge(-step, 0);
      else if (k === "ArrowRight") done = nudge(step, 0);
      else if (k === "ArrowUp") done = nudge(0, -step);
      else if (k === "ArrowDown") done = nudge(0, step);
      else if (k === "+" || k === "=") { zoomStep(1); done = true; }
      else if (k === "-" || k === "_") { zoomStep(-1); done = true; }
      else if (k === "0") { zoomReset(); done = true; }
      else if (k === "?" ) { toggleHelp(); done = true; }
    }
    if (done) e.preventDefault();
  });

  // Ctrl/Cmd+V: an image from the system clipboard becomes a layer; otherwise paste what we copied.
  document.addEventListener("paste", (e) => {
    if (!canvas() || bgrOpen() || editing() || inField(e, true)) return;
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []).filter((f) => /^image\//.test(f.type));
    if (files.length && typeof addImageLayer === "function"){ e.preventDefault(); files.forEach(addImageLayer); return; }
    if (paste()) e.preventDefault();
  });

  /* ---------- help dialog ---------- */
  const ROWS = [
    ["Edit", [["Copy", MOD + " C"], ["Cut", MOD + " X"], ["Paste (also images)", MOD + " V"], ["Duplicate", MOD + " D"], ["Delete", "Del"], ["Select all", MOD + " A"], ["Deselect", "Esc"]]],
    ["History & order", [["Undo", MOD + " Z"], ["Redo", MOD + " Shift Z"], ["Bring forward / back", MOD + " ] / ["], ["To front / back", MOD + " Shift ] / ["]]],
    ["Move & view", [["Nudge 1px", "Arrows"], ["Nudge 10px", "Shift Arrows"], ["Zoom in / out", MOD + " Scroll"], ["Zoom in / out (keys)", "+ / -"], ["Reset zoom", "0"], ["Fit to screen", "F"], ["Hand tool", "H"], ["Hand (hold)", "Space"], ["Scroll the canvas", "Scroll"], ["This help", "?"]]]
  ];
  function toggleHelp(){ const m = $("sc-modal"); if (m) m.hidden = !m.hidden; }
  function initHelp(){
    const m = document.createElement("div");
    m.id = "sc-modal"; m.className = "sc-modal"; m.hidden = true;
    m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Keyboard shortcuts");
    m.innerHTML = `<div class="sc-card"><div class="sc-top"><strong>Keyboard shortcuts</strong><button type="button" class="sc-x" aria-label="Close">\u00d7</button></div>` +
      ROWS.map((g) => `<h4>${g[0]}</h4><dl>` + g[1].map((r) => `<div><dt>${r[0]}</dt><dd>${r[1].split(" ").filter(Boolean).map((x) => /^\/$/.test(x) ? ` ${x} ` : `<kbd>${x}</kbd>`).join("")}</dd></div>`).join("") + `</dl>`).join("") + `</div>`;
    document.body.appendChild(m);
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest(".sc-x")) m.hidden = true; });
    const bar = $("view-bar");
    if (bar){
      const b = document.createElement("button");
      b.type = "button"; b.className = "vb vb-icon sc-help"; b.title = "Keyboard shortcuts (?)"; b.setAttribute("aria-label", "Keyboard shortcuts");
      b.textContent = "?"; b.addEventListener("click", toggleHelp); bar.appendChild(b);
    }
  }

  function init(){
    initHelp();
  }
  if (document.readyState !== "loading") init(); else document.addEventListener("DOMContentLoaded", init);
})();
