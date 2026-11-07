/* =========================================================
   GfxPrints - Hero "orbit studio"
   One mug sits in the middle of #hero-waterfall. The other
   products travel slowly in a circle around it, always the
   same distance apart, and stay upright while they move.
   Products pop in one by one. On desktop with a mouse the
   whole scene drifts a little with the pointer, and the orbit
   holds still while the mouse is over it.

   Layout lives here (sizes + angles). Look and motion live in
   css/style.css under "Hero orbit studio".
   ========================================================= */

(function(){
  const DIR = "assets/products/";

  /* The stage is a square, 100 units wide and tall (css: aspect-ratio 1).
     Every number below is in stage % so nothing changes between screens.
     R = radius of the circle the products travel on.
     The sizes and R were checked at every rotation angle so each product keeps
     at least 3 units of gap from its neighbours and from the centre mug.   */
  const R = 38;
  const CENTER = {
    f:"hero-mug-umrah-orange", w:28, r:0,
    alt:"White mug with an orange handle, printed with an Umrah Mubarak design"
  };

  /* Order = order around the circle, starting at the top, going clockwise.
     mob:false = left out on phones and tablets (5 products there, 6 on desktop),
     and the rest are spaced evenly again. w = width, r = tilt in degrees.     */
  const ORBIT = [
    { f:"hoodie-blue",       w:18,   r:-3, mob:true,  alt:"Light blue hoodie with a custom printed front design" },
    { f:"hero-frame-umrah",  w:19,   r: 3, mob:true,  alt:"Wooden framed poster with a custom printed Umrah Mubarak design" },
    { f:"tote-canvas",       w:11.7, r:-2, mob:true,  alt:"Natural canvas tote bag, ready for your custom print" },
    { f:"tee-skyblue-brush", w:17,   r: 3, mob:true,  alt:"Light blue t-shirt with a custom printed front design" },
    { f:"mug-valentine",     w:18,   r:-3, mob:true,  alt:"Personalized photo mug with a couple and a Happy Valentine's Day message" },
    { f:"tee-lucky-green",   w:16.2, r: 2, mob:false, alt:"Forest green t-shirt printed with a 'Lucky, good things take time' design" }
  ];

  // Small deterministic pseudo-random: same layout on every load, but each
  // product still gets its own float speed and timing.
  function rand(seed, min, max){
    const x = Math.sin(seed * 999.7) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  }

  function point(index, count){
    const a = (-90 + index * 360 / count) * Math.PI / 180;
    return [50 + R * Math.cos(a), 50 + R * Math.sin(a)];
  }

  function buildItem(it, i, extraClass, vars){
    const el = document.createElement("div");
    el.className = "wf-item" + extraClass;
    el.style.cssText =
      `${vars}--w:${it.w}%;--r:${it.r}deg;--i:${i};` +
      `--fy:${rand(i + 1, 5, 9).toFixed(1)}px;--fdur:${rand(i + 2, 5.5, 8.5).toFixed(1)}s;` +
      `--fdelay:${(-rand(i + 3, 0, 6)).toFixed(1)}s`;
    // The centre mug and the first two products load right away; the rest wait.
    const eager = i < 3 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    el.innerHTML =
      `<div class="wf-upright"><div class="wf-pop"><div class="wf-float"><div class="wf-tilt">` +
      `<img class="wf-photo" src="${DIR}${it.f}.webp" alt="${it.alt}" ${eager} decoding="async" draggable="false">` +
      `</div></div></div></div>`;
    return el;
  }

  function initHeroStudio(){
    const host = document.getElementById("hero-waterfall");
    if (!host) return;

    const stage = document.createElement("div");
    stage.className = "wf-stage";
    stage.innerHTML = '<span class="wf-ring" aria-hidden="true"></span>';

    const drift = document.createElement("div");
    drift.className = "wf-drift";
    const orbit = document.createElement("div");
    orbit.className = "wf-orbit";

    const mobCount = ORBIT.filter(o => o.mob).length;
    let mobIndex = 0;
    ORBIT.forEach((it, k) => {
      const d = point(k, ORBIT.length);
      let vars = `--x:${d[0].toFixed(2)}%;--y:${d[1].toFixed(2)}%;`;
      if (it.mob){
        const m = point(mobIndex++, mobCount);
        vars += `--mx:${m[0].toFixed(2)}%;--my:${m[1].toFixed(2)}%;`;
      }
      orbit.appendChild(buildItem(it, k + 1, it.mob ? "" : " wf-desk-only", vars));
    });
    drift.appendChild(orbit);
    stage.appendChild(drift);
    // The mug goes last in the DOM so it sits on top of the circle.
    stage.appendChild(buildItem(CENTER, 0, " wf-center", ""));
    host.appendChild(stage);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce){ stage.classList.add("is-in"); return; }

    // Play the pop-in when the hero is on screen; pause everything when it is not.
    if ("IntersectionObserver" in window){
      new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) stage.classList.add("is-in");
          stage.classList.toggle("is-paused", !e.isIntersecting);
        });
      }, { threshold: 0.05 }).observe(host);
    } else {
      stage.classList.add("is-in");
    }

    // Pointer drift: mouse / trackpad only. Phones and tablets skip it.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const hero = host.closest(".hero") || host;
    let raf = 0, nx = 0, ny = 0;
    function apply(){
      raf = 0;
      stage.style.setProperty("--px", nx.toFixed(3));
      stage.style.setProperty("--py", ny.toFixed(3));
    }
    hero.addEventListener("pointermove", e => {
      const b = host.getBoundingClientRect();
      nx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width  - 0.5) * 2));
      ny = Math.max(-1, Math.min(1, ((e.clientY - b.top)  / b.height - 0.5) * 2));
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      nx = 0; ny = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  }

  document.addEventListener("DOMContentLoaded", initHeroStudio);
})();
