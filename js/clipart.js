/* =========================================================
   GfxPrints - Clipart & Sticker Library
   40 original vector designs (inline SVG, no external files).
   Adds the "Clipart" drawer panel to the Design Studio. Clicking an item
   places it on the canvas through customize.js's placeImageOnCanvas().
   To add your own: push a new entry into ITEMS (100x100 viewBox; use
   "currentColor" for parts that should follow the icon-colour picker and
   set mono:true).
   ========================================================= */
(function(){
  const H = "M50 88C20 64 8 46 8 30a21 21 0 0 1 42-6 21 21 0 0 1 42 6c0 16-12 34-42 58z";
  function star(n, ro, ri){
    let p = [];
    for (let i = 0; i < n * 2; i++){
      const r = i % 2 ? ri : ro, a = Math.PI * i / n - Math.PI / 2;
      p.push((50 + r * Math.cos(a)).toFixed(1) + "," + (50 + r * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }
  const SP = "M50 6C54 34 66 46 94 50 66 54 54 66 50 94 46 66 34 54 6 50 34 46 46 34 50 6z";
  const st = (c, w) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

  // [id, name, category, tags, mono, svg]
  const ITEMS = [
    ["heart","Heart","Love","love valentine",0,`<path d="${H}" fill="#E5384F"/><path d="M20 28a12 12 0 0 1 12-12" ${st("#fff",5)} opacity=".55"/>`],
    ["two-hearts","Two hearts","Love","love couple",0,`<path d="${H}" fill="#F58CA9" transform="translate(0 12) scale(.74)"/><path d="${H}" fill="#E5384F" transform="translate(44 2) scale(.52)"/>`],
    ["cupid","Cupid heart","Love","love arrow valentine",0,`<path d="${H}" fill="#FF5E7E"/><path d="M10 90L90 10" ${st("#6B4226",4)}/><polygon points="90,10 74,14 86,26" fill="#6B4226"/><path d="M10 90l-2-12M10 90l12 2" ${st("#6B4226",4)}/>`],
    ["star","Star","Shapes","star favorite",0,`<polygon points="${star(5,46,19)}" fill="#FFC83D" stroke="#E8A100" stroke-width="4" stroke-linejoin="round"/>`],
    ["burst","Starburst","Shapes","sale badge burst",0,`<polygon points="${star(12,46,36)}" fill="#FF6B3D"/>`],
    ["sparkles","Sparkles","Shapes","shine magic glitter",0,`<path d="${SP}" fill="#FFD84D" transform="translate(-6 8) scale(.8)"/><path d="${SP}" fill="#FFB020" transform="translate(62 0) scale(.3)"/><path d="${SP}" fill="#FFE9A0" transform="translate(66 64) scale(.28)"/>`],
    ["diamond","Diamond","Shapes","gem jewel",0,`<polygon points="50,6 92,50 50,94 8,50" fill="#3BB3E8"/><path d="M8 50h84M50 6L32 50l18 44 18-44z" ${st("#fff",3)} opacity=".6"/>`],
    ["hexagon","Hexagon","Shapes","shape",0,`<polygon points="50,6 89,28 89,72 50,94 11,72 11,28" fill="#7B5CFA"/>`],
    ["bolt","Lightning bolt","Shapes","energy power",0,`<polygon points="58,4 18,56 44,56 36,96 82,40 54,40" fill="#FFD21F" stroke="#E0A800" stroke-width="3" stroke-linejoin="round"/>`],
    ["sun","Sun","Nature","summer sunny",0,`<circle cx="50" cy="50" r="20" fill="#FFC83D"/><path d="M50 8v12M50 80v12M8 50h12M80 50h12M20 20l9 9M71 71l9 9M80 20l-9 9M29 71l-9 9" ${st("#FFC83D",7)}/>`],
    ["moon","Crescent moon","Nature","night sky",0,`<path d="M62 8A42 42 0 1 0 92 66 34 34 0 0 1 62 8z" fill="#F6D46B"/>`],
    ["cloud","Cloud","Nature","sky weather",0,`<path d="M28 76a18 18 0 0 1-2-36 24 24 0 0 1 46-4 20 20 0 0 1 4 40z" fill="#BFE3F7" stroke="#86C5E8" stroke-width="3" stroke-linejoin="round"/>`],
    ["rainbow","Rainbow","Nature","pride sky",0,`<path d="M10 80A40 40 0 0 1 90 80" ${st("#E5384F",8)}/><path d="M18 80A32 32 0 0 1 82 80" ${st("#FF9A2E",8)}/><path d="M26 80A24 24 0 0 1 74 80" ${st("#FFD23F",8)}/><path d="M34 80A16 16 0 0 1 66 80" ${st("#3BB3E8",8)}/>`],
    ["flower","Flower","Nature","floral spring bloom",0,`<g fill="#FF7BAC"><circle cx="50" cy="25" r="16"/><circle cx="74" cy="43" r="16"/><circle cx="65" cy="72" r="16"/><circle cx="35" cy="72" r="16"/><circle cx="26" cy="43" r="16"/></g><circle cx="50" cy="52" r="12" fill="#FFC83D"/>`],
    ["leaf","Leaf","Nature","plant eco green",0,`<path d="M14 86C10 40 40 12 88 12 90 60 62 90 14 86z" fill="#3FAE5A"/><path d="M18 82C40 58 60 38 80 20" ${st("#2A7F40",4)}/>`],
    ["mountain","Mountains","Nature","adventure hike",0,`<polygon points="4,86 38,28 56,56 68,40 96,86" fill="#5A6B8C"/><polygon points="38,28 29,43 38,39 47,45" fill="#fff"/>`],
    ["tree","Pine tree","Nature","forest christmas",0,`<rect x="44" y="78" width="12" height="16" fill="#8B5A2B"/><polygon points="50,6 78,40 64,40 86,70 14,70 36,40 22,40" fill="#2E8B57"/>`],
    ["drop","Water drop","Nature","water rain",0,`<path d="M50 8C66 32 80 46 80 62a30 30 0 0 1-60 0C20 46 34 32 50 8z" fill="#3BB3E8"/><path d="M34 62a16 16 0 0 0 12 16" ${st("#fff",5)} opacity=".6"/>`],
    ["smiley","Smiley","Stickers","happy face emoji",0,`<circle cx="50" cy="50" r="42" fill="#FFD23F" stroke="#E8A100" stroke-width="3"/><circle cx="36" cy="40" r="5" fill="#3b2a10"/><circle cx="64" cy="40" r="5" fill="#3b2a10"/><path d="M30 60Q50 82 70 60" ${st("#3b2a10",5)}/>`],
    ["cool","Cool face","Stickers","sunglasses emoji",0,`<circle cx="50" cy="50" r="42" fill="#FFD23F" stroke="#E8A100" stroke-width="3"/><rect x="18" y="34" width="28" height="20" rx="7" fill="#222"/><rect x="54" y="34" width="28" height="20" rx="7" fill="#222"/><path d="M46 40h8" ${st("#222",4)}/><path d="M32 66Q50 80 68 66" ${st("#3b2a10",5)}/>`],
    ["cat","Cat","Stickers","pet kitty animal",0,`<path d="M16 14l20 14a40 34 0 0 1 28 0l20-14v44a34 30 0 0 1-68 0z" fill="#F2A65A"/><circle cx="36" cy="50" r="4.5" fill="#2b2b2b"/><circle cx="64" cy="50" r="4.5" fill="#2b2b2b"/><polygon points="46,60 54,60 50,65" fill="#E5384F"/><path d="M44 69q6 5 12 0M14 58l16 3M14 68l16-3M86 58L70 61M86 68L70 65" ${st("#5a3a1a",2.5)}/>`],
    ["rocket","Rocket","Stickers","space launch",0,`<polygon points="34,56 16,78 34,72" fill="#E5384F"/><polygon points="66,56 84,78 66,72" fill="#E5384F"/><path d="M50 6C68 20 72 48 66 72H34C28 48 32 20 50 6z" fill="#E8EEF7" stroke="#9AA7BD" stroke-width="3"/><circle cx="50" cy="38" r="9" fill="#3BB3E8"/><polygon points="42,76 58,76 50,98" fill="#FFB020"/>`],
    ["flame","Flame","Stickers","fire hot",0,`<path d="M50 6C54 30 78 40 78 64a28 28 0 0 1-56 0c0-14 8-22 14-30 2 8 6 12 10 12 0-14 0-28 4-40z" fill="#FF6B2C"/><path d="M50 90a14 14 0 0 1-14-14c0-10 8-14 14-24 6 10 14 14 14 24a14 14 0 0 1-14 14z" fill="#FFC83D"/>`],
    ["bubble","Speech bubble","Stickers","chat quote text",0,`<path d="M14 18h72a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H48L28 90V70H14a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8z" fill="#fff" stroke="#222" stroke-width="4" stroke-linejoin="round"/>`],
    ["banner","Ribbon banner","Stickers","label name text",0,`<path d="M4 30h16v40H4l10-20zM96 30H80v40h16L86 50z" fill="#B8283F"/><rect x="16" y="24" width="68" height="44" fill="#E5384F"/><path d="M16 68l4 8V68zM84 68l-4 8V68z" fill="#8a1d2f"/>`],
    ["badge","Star badge","Stickers","award seal",0,`<circle cx="50" cy="50" r="44" fill="#2438E0"/><circle cx="50" cy="50" r="37" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 4"/><polygon points="${star(5,24,10)}" fill="#FFD23F"/>`],
    ["check","Check mark","Stickers","tick done",0,`<circle cx="50" cy="50" r="44" fill="#2FB36B"/><path d="M28 52l16 16 30-34" ${st("#fff",9)}/>`],
    ["balloon","Balloon","Fun","party birthday",0,`<ellipse cx="50" cy="40" rx="28" ry="34" fill="#FF4F6D"/><ellipse cx="38" cy="26" rx="6" ry="9" fill="#fff" opacity=".4"/><polygon points="46,74 54,74 50,80" fill="#D93A57"/><path d="M50 80q-8 8 0 14t0 6" ${st("#888",2.5)}/>`],
    ["gift","Gift box","Fun","present birthday christmas",0,`<rect x="14" y="40" width="72" height="50" fill="#FF5E7E"/><rect x="10" y="28" width="80" height="16" fill="#FF3D63"/><rect x="44" y="28" width="12" height="62" fill="#FFD23F"/><path d="M50 28C30 6 16 22 34 28M50 28C70 6 84 22 66 28" ${st("#FFD23F",6)}/>`],
    ["icecream","Ice cream","Fun","dessert sweet summer",0,`<polygon points="30,50 70,50 50,94" fill="#E0A458"/><path d="M38 58l16 30M52 52l-12 22M62 54L48 84" ${st("#B97B35",2.5)}/><circle cx="50" cy="36" r="22" fill="#FF9BC2"/><circle cx="50" cy="12" r="6" fill="#E5384F"/>`],
    ["pizza","Pizza slice","Fun","food",0,`<path d="M50 92L10 20Q50 2 90 20z" fill="#FFC95C" stroke="#E39B2D" stroke-width="3" stroke-linejoin="round"/><path d="M10 20Q50 2 90 20" ${st("#D9822B",8)}/><g fill="#D9382F"><circle cx="40" cy="38" r="7"/><circle cx="62" cy="38" r="7"/><circle cx="51" cy="62" r="7"/></g>`],
    ["coffee","Coffee cup","Fun","drink cafe",0,`<path d="M72 44h6a10 10 0 0 1 0 20h-8" ${st("#6B4226",5)}/><path d="M16 38h56v26a24 24 0 0 1-24 24h-8a24 24 0 0 1-24-24z" fill="#F4E3CF" stroke="#6B4226" stroke-width="5" stroke-linejoin="round"/><path d="M32 28q-6-8 0-14M48 28q-6-8 0-14M64 28q-6-8 0-14" ${st("#aaa",3.5)}/>`],
    ["heart-line","Heart outline","Icons","love line",1,`<path d="${H}" ${st("currentColor",6)}/>`],
    ["ring","Ring","Icons","circle frame",1,`<circle cx="50" cy="50" r="40" ${st("currentColor",8)}/>`],
    ["triangle","Triangle","Icons","shape line",1,`<polygon points="50,12 90,84 10,84" ${st("currentColor",7)}/>`],
    ["crown","Crown","Icons","king queen royal",1,`<polygon points="10,78 12,26 34,50 50,16 66,50 88,26 90,78" fill="currentColor"/><rect x="10" y="80" width="80" height="8" rx="2" fill="currentColor"/>`],
    ["paw","Paw print","Icons","pet dog cat animal",1,`<g fill="currentColor"><circle cx="22" cy="42" r="9"/><circle cx="40" cy="22" r="9"/><circle cx="60" cy="22" r="9"/><circle cx="78" cy="42" r="9"/><path d="M50 46C34 46 22 66 26 78s20 8 24 6 20 4 24-6C78 66 66 46 50 46z"/></g>`],
    ["note","Music note","Icons","music song",1,`<path d="M38 74V20l44-10v52" ${st("currentColor",7)}/><ellipse cx="27" cy="76" rx="12" ry="9" fill="currentColor"/><ellipse cx="71" cy="64" rx="12" ry="9" fill="currentColor"/>`],
    ["peace","Peace sign","Icons","hippie",1,`<circle cx="50" cy="50" r="40" ${st("currentColor",7)}/><path d="M50 10v80M50 50L22 78M50 50l28 28" ${st("currentColor",7)}/>`],
    ["arrow","Arrow","Icons","right direction",1,`<path d="M10 50h72M58 26l26 24-26 24" ${st("currentColor",9)}/>`]
  ].map(a => ({ id: a[0], name: a[1], cat: a[2], tags: a[3], mono: !!a[4], svg: a[5] }));

  const CATS = ["All", "Stickers", "Love", "Nature", "Fun", "Shapes", "Icons"];
  const state = { cat: "All", q: "", outline: "", color: "#15171b" };
  const $ = (id) => document.getElementById(id);

  // Full-size SVG string for the canvas, with optional die-cut sticker outline.
  function build(item){
    const inner = item.mono ? item.svg.replace(/currentColor/g, state.color) : item.svg;
    const ns = 'xmlns="http://www.w3.org/2000/svg" width="2000" height="2000"';
    if (!state.outline) return `<svg ${ns} viewBox="0 0 100 100">${inner}</svg>`;
    return `<svg ${ns} viewBox="-10 -10 120 120"><filter id="o" filterUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/><feGaussianBlur in="d" stdDeviation="1" result="s"/><feFlood flood-color="${state.outline}"/><feComposite in2="s" operator="in" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#o)">${inner}</g></svg>`;
  }

  function render(){
    const grid = $("clipart-grid"), empty = $("clipart-empty");
    if (!grid) return;
    const q = state.q.trim().toLowerCase();
    const list = ITEMS.filter(i => (state.cat === "All" || i.cat === state.cat) &&
      (!q || (i.name + " " + i.tags + " " + i.cat).toLowerCase().includes(q)));
    empty.hidden = list.length > 0;
    grid.innerHTML = list.map(i => `<button type="button" class="clip-item" data-id="${i.id}" title="${i.name}" aria-label="Add ${i.name} to your design"><svg viewBox="0 0 100 100" aria-hidden="true"${i.mono ? ` style="color:${state.color}"` : ""}>${i.svg}</svg><span>${i.name}</span></button>`).join("");
  }

  function init(){
    const grid = $("clipart-grid");
    if (!grid) return;
    $("clipart-cats").innerHTML = CATS.map(c => `<button type="button" class="clip-chip${c === state.cat ? " active" : ""}" data-cat="${c}">${c}</button>`).join("");
    $("clipart-cats").addEventListener("click", (e) => {
      const b = e.target.closest(".clip-chip"); if (!b) return;
      state.cat = b.dataset.cat;
      document.querySelectorAll(".clip-chip").forEach(x => x.classList.toggle("active", x === b));
      render();
    });
    $("clipart-search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    $("clipart-outline").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state.outline = b.dataset.outline;
      document.querySelectorAll("#clipart-outline button").forEach(x => x.classList.toggle("active", x === b));
    });
    $("clipart-color").addEventListener("input", (e) => { state.color = e.target.value; render(); });
    grid.addEventListener("click", (e) => {
      const b = e.target.closest(".clip-item"); if (!b) return;
      const item = ITEMS.find(i => i.id === b.dataset.id);
      if (!item || typeof placeImageOnCanvas !== "function") return;
      placeImageOnCanvas("data:image/svg+xml;charset=utf-8," + encodeURIComponent(build(item)), { vector: true });
    });
    render();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
