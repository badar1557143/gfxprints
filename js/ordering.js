/* =========================================================
   GfxPrints - Ordering routes, bulk enquiries, design check, tracking hooks
   Route A: Customize (the Design Studio, customize.html)
   Route B: Design It for Me (WhatsApp chat, or an order flagged designHelp)
   Shared by product.html, customize.html, cart.html, checkout.html and the home page.
   Needs main.js first (whatsappLink, getCart).
   ========================================================= */
(function(){
  "use strict";

  const BULK_MESSAGE = "Hello GfxPrints, I would like to enquire about a business or bulk order.";

  /* ---- Tracking hooks. OFF until the owner supplies IDs AND sets enabled to true.
          No third-party script is loaded here, and no personal details are ever passed. ---- */
  const GFX_TRACKING = { enabled: false, ga4MeasurementId: "", metaPixelId: "" };
  const GfxTrack = {
    event: function(name, params){
      if (!GFX_TRACKING.enabled) return;
      try {
        if (GFX_TRACKING.ga4MeasurementId && typeof window.gtag === "function") window.gtag("event", name, params || {});
        if (GFX_TRACKING.metaPixelId && typeof window.fbq === "function") window.fbq("trackCustom", name, params || {});
      } catch (e){ /* tracking must never break the site */ }
    }
  };

  function lines(product, o){
    o = o || {};
    const out = [];
    out.push("Product: " + ((product && product.name) || "Custom product"));
    if (o.color) out.push("Colour: " + o.color);
    if (o.size) out.push("Size: " + o.size);
    if (o.orientation) out.push("Orientation: " + o.orientation);
    if (o.packaging) out.push("Packaging: " + o.packaging);
    if (o.qty) out.push("Quantity: " + o.qty);
    return out;
  }

  // Prefilled chat message. The customer reads it and presses send themselves; nothing is sent automatically.
  function designHelpMessage(product, o){
    return ["Hello GfxPrints, I would like help with the design for my order.", ""]
      .concat(lines(product, o))
      .concat(["", "My idea (text, colours, photos or logo):", "", "Please let me know the next steps and the design price."]).join("\n");
  }
  const designHelpLink = (product, o) => whatsappLink(designHelpMessage(product, o));
  const bulkLink = () => whatsappLink(BULK_MESSAGE);

  // A personalised order needs a saved design or an explicit Design It for Me request.
  const itemHasDesign = (item) => !!(item && ((item.customDesign && item.customDesign.id) || item.designHelp === true));

  /* ---- Dialog used when the customer tries to order without a design ---- */
  function closeDlg(){
    const d = document.getElementById("gfx-order-dlg"); if (d) d.remove();
    document.body.style.overflow = "";
  }
  function showChoice(cfg){
    closeDlg();
    const d = document.createElement("div");
    d.id = "gfx-order-dlg"; d.className = "copy-dlg";
    d.innerHTML = '<div class="copy-card" role="alertdialog" aria-modal="true" aria-labelledby="gfx-od-t" aria-describedby="gfx-od-d">' +
      '<h3 id="gfx-od-t"></h3><p id="gfx-od-d"></p>' +
      '<div class="gfx-od-actions"></div><button type="button" class="copy-cancel">Close</button></div>';
    d.querySelector("#gfx-od-t").textContent = cfg.title;
    d.querySelector("#gfx-od-d").textContent = cfg.text;
    const box = d.querySelector(".gfx-od-actions");
    cfg.actions.forEach(a => {
      const b = document.createElement(a.href ? "a" : "button");
      b.className = "btn " + (a.primary ? "btn-primary" : "btn-outline") + " btn-block";
      b.textContent = a.label;
      if (a.href){ b.href = a.href; b.target = "_blank"; b.rel = "noopener"; }
      else b.type = "button";
      b.addEventListener("click", () => { closeDlg(); if (a.run) a.run(); });
      box.appendChild(b);
    });
    d.addEventListener("click", (e) => { if (e.target === d || e.target.classList.contains("copy-cancel")) closeDlg(); });
    document.addEventListener("keydown", function esc(e){ if (e.key === "Escape"){ closeDlg(); document.removeEventListener("keydown", esc); } });
    document.body.appendChild(d);
    document.body.style.overflow = "hidden";
    const first = d.querySelector(".btn"); if (first) first.focus();
  }

  window.GfxOrder = { bulkLink: bulkLink, designHelpMessage: designHelpMessage, designHelpLink: designHelpLink, itemHasDesign: itemHasDesign, showChoice: showChoice, closeDlg: closeDlg, BULK_MESSAGE: BULK_MESSAGE };
  window.GfxTrack = GfxTrack;

  /* ---- Bulk enquiry links: any <a data-bulk-enquiry> gets the official WhatsApp link ---- */
  function wireLinks(){
    document.querySelectorAll("a[data-bulk-enquiry]").forEach(a => {
      a.href = bulkLink(); a.target = "_blank"; a.rel = "noopener";
    });
    // Footer shows the official number (set once, on every page that has the footer WhatsApp slot)
    document.querySelectorAll("[data-wa-number]").forEach(el => {
      if (el.tagName === "A"){ el.href = whatsappLink("Hello GfxPrints, I have a question."); el.target = "_blank"; el.rel = "noopener"; }
    });
  }

  /* ---- Tracking: all calls below do nothing while GFX_TRACKING.enabled is false ---- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href*='wa.me'], a[data-bulk-enquiry], #whatsapp-float");
    if (a) GfxTrack.event("whatsapp_click", { placement: a.dataset.bulkEnquiry !== undefined ? "bulk" : "link" });
  });
  if (typeof window.addToCart === "function" && !window.addToCart.gfxTrack){
    const orig = window.addToCart;
    window.addToCart = function(item){
      const r = orig.apply(this, arguments);
      GfxTrack.event("add_to_cart", { product_id: item && item.id, design_help: !!(item && item.designHelp) });
      return r;
    };
    window.addToCart.gfxTrack = true;
  }

  if (/checkout\.html$/.test(location.pathname)) GfxTrack.event("begin_checkout", {});

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireLinks); else wireLinks();
})();
