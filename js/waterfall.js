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

  /* x, y = centre of the product, in % of the stage
     w     = width, in % of the stage width
     r     = tilt in degrees
     d     = parallax depth (bigger = moves more)
     mx, my, mw = the same position and size on phones/tablets
     mob   = false hides the product on phones/tablets            */
  const ITEMS = [
    { f:"hoodie-blue",            alt:"Light blue hoodie with a custom printed front design",                         x:50, y:50, w:36, r:-2, d:1.0, mx:50, my:50, mw:40, mob:true  },
    { f:"tee-skyblue-brush",      alt:"Light blue t-shirt with a custom printed front design",                        x:22, y:27, w:26, r:-6, d:1.5, mx:20, my:24, mw:28, mob:true  },
    { f:"hero-frame-umrah",          alt:"Wooden framed poster with a custom printed Umrah Mubarak design",              x:79, y:24, w:25, r: 5, d:1.7, mx:79, my:23, mw:28, mob:true  },
    { f:"mug-valentine",          alt:"Personalized photo mug with a couple and a Happy Valentine's Day message",     x:21, y:72, w:25, r: 4, d:1.3, mx:19, my:76, mw:28, mob:true  },
    { f:"tote-canvas",            alt:"Natural canvas tote bag, ready for your custom print",                         x:80, y:74, w:23, r:-4, d:1.2, mx:82, my:69, mw:24, mob:true  },
    { f:"hero-gift-box",             alt:"Gift box with a red ribbon, for personalized gifts",                           x:50, y:16, w:14, r: 3, d:0.7, mx:52, my:16, mw:15, mob:true  },
    { f:"tee-lucky-green",        alt:"Forest green t-shirt printed with a 'Lucky, good things take time' design",    x:50, y:88, w:19, r: 5, d:0.8, mob:false },
    { f:"tee-black-loudvoices",   alt:"Black t-shirt printed with a bold 'Loud Voices' design",                       x:90, y:48, w:15, r: 6, d:0.6, mob:false }
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
    el.style.cssText =
      `--x:${it.x}%;--y:${it.y}%;--w:${it.w};--r:${it.r}deg;--d:${it.d};` +
      `--mx:${it.mx != null ? it.mx : it.x}%;--my:${it.my != null ? it.my : it.y}%;--mw:${it.mw != null ? it.mw : it.w};` +
      `--i:${i};--fy:${rand(i + 1, 7, 13).toFixed(1)}px;--fdur:${rand(i + 2, 5.5, 8.5).toFixed(1)}s;` +
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
