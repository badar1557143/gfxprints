/* =========================================================
   GfxPrints - Design Studio auto-save
   Keeps the customer's design on their device so it is still there after
   they close the browser tab or come back another day.

   What is saved (per product): the design on every side, plus the chosen
   colour, size, orientation, packaging and quantity.
   Where: IndexedDB (designs with photos are too big for localStorage), with a
   small localStorage fallback when IndexedDB is blocked.
   Saved on this device and browser only (there are no customer accounts).
   The saved copy is removed once an order is placed (see cart.js).
   ========================================================= */
(function(){
  "use strict";

  var DB_NAME = "gfxprints-draft", STORE = "d";
  var LS_PREFIX = "gfxprints_draft_";
  var KEEP_DAYS = 30;
  var dirty = false, timer = null, restoring = true, flashTimer = null;
  var dbp = null;

  /* ---------- storage ---------- */
  function openDb(){
    if (dbp) return dbp;
    dbp = new Promise(function(res, rej){
      try {
        var r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = function(){ r.result.createObjectStore(STORE); };
        r.onsuccess = function(){ res(r.result); };
        r.onerror = function(){ rej(r.error); };
      } catch (e){ rej(e); }
    });
    return dbp;
  }
  function idb(mode, fn){
    return openDb().then(function(d){
      return new Promise(function(res, rej){
        var t = d.transaction(STORE, mode), req = fn(t.objectStore(STORE));
        t.oncomplete = function(){ res(req ? req.result : undefined); };
        t.onerror = t.onabort = function(){ rej(t.error); };
      });
    });
  }
  function put(key, val){
    return idb("readwrite", function(s){ return s.put(val, key); }).catch(function(){
      try {
        var str = JSON.stringify(val);
        if (str.length < 3500000) localStorage.setItem(LS_PREFIX + key, str);
      } catch (e){ /* storage full or blocked: nothing more we can do */ }
    });
  }
  function get(key){
    return idb("readonly", function(s){ return s.get(key); }).then(function(v){
      if (v) return v;
      try { return JSON.parse(localStorage.getItem(LS_PREFIX + key) || "null"); } catch (e){ return null; }
    }, function(){
      try { return JSON.parse(localStorage.getItem(LS_PREFIX + key) || "null"); } catch (e){ return null; }
    });
  }
  function del(key){
    try { localStorage.removeItem(LS_PREFIX + key); } catch (e){}
    return idb("readwrite", function(s){ return s.delete(key); }).catch(function(){});
  }

  /* ---------- capture ---------- */
  function qtyInput(){ return document.getElementById("pd-qty"); }

  function capture(){
    if (!designCanvas || !currentProduct || !currentSides || !currentSides.length) return null;
    var sides = {}, any = false;
    currentSides.forEach(function(s){
      var st = sidesState[s.id];
      if (!st) return;
      var has, json;
      if (s.id === activeSideId){
        has = designCanvas.getObjects().length > 0;
        json = has ? JSON.stringify(designCanvas.toJSON()) : null;
      } else {
        has = !!st.hasContent;
        json = has ? st.history[st.historyIndex] : null;
      }
      if (has && json){ sides[s.id] = json; any = true; }
    });
    var q = qtyInput();
    return {
      v: 1,
      t: Date.now(),
      productId: currentProduct.id,
      color: selectedColor,
      size: selectedSize,
      orientation: selectedOrientation,
      packaging: selectedPackaging,
      qty: q ? (Number(q.value) || 1) : 1,
      activeSideId: activeSideId,
      sides: sides,
      any: any
    };
  }

  /* ---------- save ---------- */
  function flashSaved(){
    var btn = document.getElementById("tool-save");
    if (!btn) return;
    btn.classList.add("saved");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function(){ btn.classList.remove("saved"); }, 1400);
  }

  function save(manual){
    dirty = false;
    clearTimeout(timer);
    var d;
    try { d = capture(); } catch (e){ return Promise.resolve(false); }
    if (!d) return Promise.resolve(false);
    if (!d.any){
      return del("p-" + d.productId).then(function(){ return false; });
    }
    return put("p-" + d.productId, d).then(function(){
      return put("last", { productId: d.productId, t: d.t });
    }).then(function(){
      flashSaved();
      return true;
    });
  }

  function schedule(){
    if (restoring) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(function(){ save(false); }, 800);
  }

  /* ---------- restore ---------- */
  function clickMatch(selector, attr, value){
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++){
      if (els[i].dataset[attr] === String(value)){
        if (!els[i].classList.contains("selected") && !els[i].classList.contains("unavailable")) els[i].click();
        return;
      }
    }
  }

  function applyDraft(rec){
    var p = getProductById(rec.productId);
    if (!p || p.customizable === false) return false;

    // The studio opens on one product; switch to the saved one (the canvas is empty, so nothing is carried over).
    if (!currentProduct || String(currentProduct.id) !== String(p.id)) selectProduct(p);

    // Options. Colour first (it can change which sizes exist), then size, then the rest.
    if (rec.color) clickMatch("#pd-colors .swatch", "color", rec.color);
    if (rec.size) clickMatch("#pd-sizes .pill", "size", rec.size);
    if (rec.orientation) clickMatch("#pd-orientation .pill", "orientation", rec.orientation);
    if (rec.packaging) clickMatch("#pd-packaging .pill", "packaging", rec.packaging);
    var q = qtyInput();
    if (q && rec.qty > 1){ q.value = rec.qty; if (typeof updateTotal === "function") updateTotal(); }

    // Designs, side by side.
    var ids = Object.keys(rec.sides || {}), loaded = 0;
    ids.forEach(function(id){
      var st = sidesState[id];
      if (!st) return;
      st.history = [rec.sides[id]];
      st.historyIndex = 0;
      st.hasContent = true;
      loaded++;
    });
    if (!loaded) return false;

    var target = (rec.activeSideId && sidesState[rec.activeSideId]) ? rec.activeSideId : ids.filter(function(id){ return sidesState[id]; })[0];
    activeSideId = target;
    applySideView(currentSides.find(function(s){ return s.id === target; }));
    if (typeof updateStudioHint === "function") updateStudioHint();
    loadSideIntoCanvas(target);
    return true;
  }

  function restore(){
    var wanted = (typeof getURLParam === "function") ? getURLParam("id") : null;
    var lookup = wanted
      ? get("p-" + wanted)
      : get("last").then(function(l){ return l && l.productId != null ? get("p-" + l.productId) : null; });
    return lookup.then(function(rec){
      if (!rec || !rec.any) return false;
      if (Date.now() - rec.t > KEEP_DAYS * 86400000){ del("p-" + rec.productId); return false; }
      return applyDraft(rec);
    }).catch(function(){ return false; });
  }

  /* ---------- wiring ---------- */
  function bindSaveButton(){
    var btn = document.getElementById("tool-save");
    if (!btn) return;
    btn.addEventListener("click", function(){
      if (!anySideHasContent()){
        showToast("Add something to your design first, then it can be saved");
        return;
      }
      save(true).then(function(ok){
        showToast(ok
          ? "Design saved on this device. It will be here when you come back"
          : "Sorry, this browser would not let us save your design");
      });
    });
  }

  function bindEvents(){
    ["object:added", "object:modified", "object:removed", "text:changed", "text:editing:exited"].forEach(function(ev){
      designCanvas.on(ev, function(){ if (!isRestoringHistory) schedule(); });
    });

    // Anything the customer taps that changes the design or its options: save a moment after the
    // studio has finished handling the tap.
    document.addEventListener("click", function(e){
      if (e.target.closest && e.target.closest("#tool-undo,#tool-redo,#tool-reset,#sides-list,#pd-colors,#pd-sizes,#pd-orientation,#pd-packaging,#cz-picker,#qty-minus,#qty-plus,#layers-list,.app-drawer-panel")){
        setTimeout(schedule, 250);
      }
    }, true);
    var q = qtyInput();
    if (q){ q.addEventListener("input", schedule); q.addEventListener("change", schedule); }

    // Every history commit (property panel edits, reorder, etc.)
    if (typeof window.commitDesignHistory === "function"){
      var orig = window.commitDesignHistory;
      window.commitDesignHistory = function(){
        var r = orig.apply(this, arguments);
        if (!isRestoringHistory) schedule();
        return r;
      };
    }

    // Closing the tab or switching apps: write right now.
    document.addEventListener("visibilitychange", function(){
      if (document.visibilityState === "hidden" && dirty) save(false);
    });
    window.addEventListener("pagehide", function(){ if (dirty) save(false); });
  }

  function boot(tries){
    if (!document.getElementById("studio-stage")) return;
    if (typeof designCanvas === "undefined" || !designCanvas || !currentProduct || !sidesState || !activeSideId){
      if (tries < 100) setTimeout(function(){ boot(tries + 1); }, 100);
      return;
    }
    bindSaveButton();
    restore().then(function(ok){
      // Give the canvas a moment to finish loading the saved JSON before saving is switched on.
      setTimeout(function(){
        restoring = false;
        bindEvents();
        if (ok) showToast("Welcome back. Your saved design was restored");
      }, ok ? 900 : 0);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ boot(0); });
  else boot(0);
})();
