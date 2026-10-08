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

    let openName = null;

    function showPanel(name){
      panels.forEach(p => { p.hidden = p.id !== ("panel-" + name); });
      drawer.classList.add("open");
      openName = name;
      railBtns.forEach(b => b.classList.toggle("active", b.dataset.opens === name));
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

    // Rail: Text -> customize.js's own click handler on #tool-add-text adds
    // the layer; we just also make sure the Edit/Properties panel is visible.
    const railText = document.getElementById("tool-add-text");
    if (railText){
      railText.addEventListener("click", () => {
        showPanel("edit");
        const propsTab = document.querySelector('.studio-tab[data-tab="properties"]');
        if (propsTab) propsTab.click();
      });
    }

    // Uploads: after a file is chosen, customize.js adds + selects the image
    // layer; flip to the Edit/Properties panel so the opacity control is visible.
    const uploadInput = document.getElementById("tool-upload-image");
    if (uploadInput){
      uploadInput.addEventListener("change", () => {
        setTimeout(() => {
          showPanel("edit");
          const propsTab = document.querySelector('.studio-tab[data-tab="properties"]');
          if (propsTab) propsTab.click();
        }, 50);
      });
    }

    const libGrid = document.getElementById("upload-library-grid");
    if (libGrid){
      libGrid.addEventListener("click", (e) => {
        if (e.target.closest(".upload-lib-remove")) return;
        if (!e.target.closest(".upload-lib-item")) return;
        setTimeout(() => {
          showPanel("edit");
          const propsTab = document.querySelector('.studio-tab[data-tab="properties"]');
          if (propsTab) propsTab.click();
        }, 50);
      });
    }

    const closeBtn = document.getElementById("drawer-close");
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    // Selecting any layer directly on the canvas should also surface the
    // Edit panel - customize.js toggles #props-empty's display, so watch it.
    const propsEmpty = document.getElementById("props-empty");
    if (propsEmpty){
      const obs = new MutationObserver(() => {
        if (propsEmpty.style.display === "none") showPanel("edit");
      });
      obs.observe(propsEmpty, { attributes: true, attributeFilter: ["style"] });
    }

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
      v = Math.max(50, Math.min(150, Math.round(Number(v) / 5) * 5));
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
