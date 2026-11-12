/* =========================================================
   PHOTO SLOTS - drop a photo on a frame and it fills the frame
   A frame is a layer that has a "gfxSlot" (its photo spot, written in the layer's own drawing units).
   When the customer drags one of their photos and lets go on a frame, the photo is scaled to cover the
   spot, turned to match the frame, clipped to the spot and placed just above the frame.
   Dropping a photo away from every frame frees it again.
   A photo that is added from the Images list also goes into a frame: the one it is dropped on (desktop drag),
   the selected frame, or the next empty frame (tap).
   Only plain photos take part: clipart, stickers and the frames themselves are left alone.
   Loaded before customize.js. customize.js calls GfxSlots.attach(canvas) once the canvas exists.
   ========================================================= */
(function(){
  "use strict";

  const rad = (a) => (a || 0) * Math.PI / 180;

  // Where the photo spot of a frame is on the canvas (centre, size, turn), plus what is needed to test a drop.
  function slotGeometry(card){
    const s = card.gfxSlot, c = card.getCenterPoint();
    const W = card.getScaledWidth(), H = card.getScaledHeight();
    const sx = W / s.vw, sy = H / s.vh;
    const r = rad(card.angle), cos = Math.cos(r), sin = Math.sin(r);
    const ox = (s.x + s.w / 2 - s.vw / 2) * sx, oy = (s.y + s.h / 2 - s.vh / 2) * sy;
    return {
      cx: c.x + ox * cos - oy * sin, cy: c.y + ox * sin + oy * cos,
      w: s.w * sx, h: s.h * sy, angle: card.angle || 0, key: s.key,
      center: c, cardW: W, cardH: H, cos: cos, sin: sin
    };
  }

  // Is the point on the frame (the whole card, not only the photo spot, so a drop does not have to be exact)?
  function insideCard(g, p){
    const dx = p.x - g.center.x, dy = p.y - g.center.y;
    const lx = dx * g.cos + dy * g.sin, ly = -dx * g.sin + dy * g.cos;
    return Math.abs(lx) <= g.cardW / 2 && Math.abs(ly) <= g.cardH / 2;
  }

  // Scale that makes a picture cover the spot completely (the extra is clipped away).
  function coverScale(iw, ih, sw, sh){
    return Math.max(sw / Math.max(1, iw), sh / Math.max(1, ih));
  }

  // The frame under a point. If frames overlap, the one whose spot is nearest wins.
  function findFrameAt(canvas, p, skip){
    let best = null, bestD = Infinity;
    canvas.getObjects().forEach((o) => {
      if (o === skip || !o.gfxSlot) return;
      const g = slotGeometry(o);
      if (!insideCard(g, p)) return;
      const d = Math.hypot(p.x - g.cx, p.y - g.cy);
      if (d < bestD){ best = { card: o, geo: g }; bestD = d; }
    });
    return best;
  }
  // The frame under the middle of a photo that was just dropped.
  function findFrame(canvas, img){
    return findFrameAt(canvas, img.getCenterPoint(), img);
  }

  // Frames with no photo in them yet, in reading order (top row first, left to right).
  function emptyFrames(canvas){
    const objs = canvas.getObjects();
    const taken = {};
    objs.forEach((o) => { if (o.gfxInSlot) taken[o.gfxInSlot] = true; });
    return objs.filter((o) => o.gfxSlot && !taken[o.gfxSlot.key])
      .map((o) => ({ card: o, geo: slotGeometry(o) }))
      .sort((a, b) => {
        const ra = Math.round(a.geo.cy / (a.geo.cardH * 0.7)), rb = Math.round(b.geo.cy / (b.geo.cardH * 0.7));
        return ra - rb || a.geo.cx - b.geo.cx;
      });
  }

  // Which frame should a photo that is being ADDED (not dragged on the canvas) go into?
  //  - dropped at a point: the frame under that point
  //  - a frame is selected: that frame
  //  - otherwise: the next empty frame
  // Returns null when there is no frame, or all are full (the photo is then added as a normal free photo).
  function chooseFrame(canvas, point){
    if (point) return findFrameAt(canvas, point, null);
    const active = canvas.getActiveObject && canvas.getActiveObject();
    if (active && active.gfxSlot) return { card: active, geo: slotGeometry(active) };
    const free = emptyFrames(canvas);
    return free.length ? free[0] : null;
  }

  function fillFrame(canvas, img, hit){
    const g = hit.geo;
    const scale = coverScale(img.width, img.height, g.w, g.h);
    // A photo already in this frame is replaced by the new one.
    canvas.getObjects().slice().forEach((o) => { if (o !== img && o.gfxInSlot === g.key) canvas.remove(o); });
    img.set({ originX: "center", originY: "center", left: g.cx, top: g.cy, angle: g.angle, scaleX: scale, scaleY: scale });
    // The clip is drawn in the photo's own units and turns and scales with it.
    img.clipPath = new fabric.Rect({ width: g.w / scale, height: g.h / scale, originX: "center", originY: "center", left: 0, top: 0 });
    img.gfxInSlot = g.key;
    img.dirty = true;
    img.setCoords();
    // Sit just above the frame, so frames drawn later still overlap the photo like in the template.
    const objs = canvas.getObjects();
    const ci = objs.indexOf(hit.card), ii = objs.indexOf(img);
    canvas.moveTo(img, ii < ci ? ci : ci + 1);
  }

  function freePhoto(img){
    img.clipPath = null;
    img.gfxInSlot = null;
    img.dirty = true;
  }

  function onModified(canvas, e){
    const t = e && e.target;
    // Single plain photos only (not a group selection, clipart, sticker or a frame)
    if (!t || t.type !== "image" || t.gfxVector || t.gfxSlot) return;
    // Only a drag counts. Resizing or turning a photo must not make it jump.
    if (e.action && e.action !== "drag") return;
    const hit = findFrame(canvas, t);
    if (hit){
      const first = t.gfxInSlot !== hit.geo.key;
      fillFrame(canvas, t, hit);
      canvas.requestRenderAll();
      if (typeof refreshLayersList === "function") refreshLayersList();
      if (first && typeof showToast === "function") showToast("Photo placed in the frame. Drag another photo here to replace it");
    } else if (t.gfxInSlot){
      freePhoto(t);
      canvas.requestRenderAll();
    }
  }

  function attach(canvas){
    if (!canvas || canvas.__gfxSlots) return;
    canvas.__gfxSlots = true;
    canvas.on("object:modified", (e) => {
      try { onModified(canvas, e); } catch (err){ console.error("Photo frame snap failed", err); }
    });
  }

  window.GfxSlots = { attach: attach, slotGeometry: slotGeometry, insideCard: insideCard, coverScale: coverScale, findFrame: findFrame, findFrameAt: findFrameAt, emptyFrames: emptyFrames, chooseFrame: chooseFrame, fillFrame: fillFrame, onModified: onModified };
})();
