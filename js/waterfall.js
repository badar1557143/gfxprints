/* =========================================================
   GfxPrints - Hero "floating studio"
   Real product photos (transparent cut-outs) pop in one by
   one, then float gently inside #hero-waterfall on the
   homepage. On desktop with a mouse, the products also drift
   a little with the pointer (each at its own depth).
   Layout (x, y, w, tilt) lives here; look and motion live in
   css/style.css under "Hero floating studio".
   ========================================================= */

(function(){
  const DIR = "assets/products/";

  /* The stage is a fixed-shape box, 100 units wide. Desktop is 106 units
     tall, phones/tablets 90 (keep in sync with the aspect-ratio in
     css/style.css). Every product is placed in these units, so the gaps are
     the same on every screen and nothing can overlap when the window resizes.

     x, y, w   = left, top and width on desktop
     mx, my, mw = the same on phones/tablets (mob:false = hidden there)
     r = tilt in degrees, d = how far it drifts with the pointer
     h = photo height / width (only used here to check the layout)          */
  const STAGE = { W:100, H:106, mH:90 };
  const ITEMS = [
    { f:"hoodie-blue",           alt:"Light blue hoodie with a custom printed front design",                       x:31, y:28, w:38, mx:31, my:29, mw:40, r:-2, d:1.0, mob:true  },
    { f:"tee-skyblue-brush",     alt:"Light blue t-shirt with a custom printed front design",                      x: 3, y: 4, w:27, mx: 2, my: 2, mw:28, r:-6, d:1.5, mob:true  },
    { f:"hero-frame-umrah",      alt:"Wooden framed poster with a custom printed Umrah Mubarak design",            x:69, y: 6, w:28, mx:67, my: 5, mw:30, r: 5, d:1.7, mob:true  },
    { f:"mug-valentine",         alt:"Personalized photo mug with a couple and a Happy Valentine's Day message",   x: 2, y:52, w:27, mx: 2, my:62, mw:28, r: 4, d:1.3, mob:true  },
    { f:"tote-canvas",           alt:"Natural canvas tote bag, ready for your custom print",                       x:73, y:54, w:24, mx:74, my:40, mw:24, r:-4, d:1.2, mob:true  },
    { f:"hero-mug-umrah-orange", alt:"White mug with an orange handle, printed with an Umrah Mubarak design",      x:37.5, y:1, w:25, mx:36.5, my:1, mw:27, r: 3, d:0.7, mob:true },
    { f:"tee-lucky-green",       alt:"Forest green t-shirt printed with a 'Lucky, good things take time' design",  x:39, y:80, w:22, r: 5, d:0.8, mob:false },
    { f:"tee-black-loudvoices",  alt:"Black t-shirt printed with a bold 'Loud Voices' design",                     x:79, y:31, w:17, r: 6, d:0.6, mob:false }
  ];

  // Small deterministic pseudo-random: the layout is the same on every
  // load, but each product still gets its own float speed and timing.
  function rand(seed, min, max){
    const x = Math.sin(seed * 999.7) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  }

  function buildItem(it, i){
    const el = document.createElement("div");
    el.className = "wf-item" + (it.mob ? "" : " wf-desk-only");
    const pc = (v, of) => (v / of * 100).toFixed(2) + "%";
    el.style.cssText =
      `--x:${pc(it.x, STAGE.W)};--y:${pc(it.y, STAGE.H)};--w:${pc(it.w, STAGE.W)};--r:${it.r}deg;--d:${it.d};` +
      (it.mob ? `--mx:${pc(it.mx, STAGE.W)};--my:${pc(it.my, STAGE.mH)};--mw:${pc(it.mw, STAGE.W)};` : "") +
      `--i:${i};--fy:${rand(i + 1, 6, 11).toFixed(1)}px;--fdur:${rand(i + 2, 5.5, 8.5).toFixed(1)}s;` +
      `--fdelay:${(-rand(i + 3, 0, 6)).toFixed(1)}s`;
    // The first three products load right away; the rest wait their turn.
    const eager = i < 3 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    el.innerHTML =
      `<div class="wf-pop"><div class="wf-float"><div class="wf-tilt">` +
      `<img class="wf-photo" src="${DIR}${it.f}.webp" alt="${it.alt}" ${eager} decoding="async" draggable="false">` +
      `</div></div></div>`;
    return el;
  }

  function initHeroStudio(){
    const host = document.getElementById("hero-waterfall");
    if (!host) return;

    const stage = document.createElement("div");
    stage.className = "wf-stage";
    stage.innerHTML = '<span class="wf-ring" aria-hidden="true"></span>';
    ITEMS.forEach((it, i) => stage.appendChild(buildItem(it, i)));
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
