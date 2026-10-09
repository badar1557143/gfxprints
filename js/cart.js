/* =========================================================
   GfxPrints - Cart & checkout logic
   Cart persists in localStorage (see main.js for storage
   helpers: getCart, saveCart, addToCart).
   ========================================================= */

const SHIPPING_STANDARD = 250;
const SHIPPING_EXPRESS = 650;

function cartSubtotal(){
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCartPage(){
  const wrap = document.getElementById("cart-items");
  if (!wrap) return;

  const cart = getCart();
  const emptyState = document.getElementById("cart-empty");
  const layout = document.getElementById("cart-layout");

  if (cart.length === 0){
    layout.style.display = "none";
    emptyState.style.display = "block";
    return;
  }
  layout.style.display = "grid";
  emptyState.style.display = "none";

  wrap.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <img src="${item.designPreview || item.customImage || item.image}" alt="${item.name}">
      <div>
        <div class="ci-name">${item.name}</div>
        <div class="ci-opts">
          ${item.color ? "Color: " + item.color + " · " : ""}${item.size ? "Size: " + item.size : ""}${item.orientation ? " · Orientation: " + item.orientation : ""}${item.packaging ? " · Packaging: " + item.packaging : ""}
          ${item.customText ? " · " + item.customText : ""}
        </div>
        <div class="qty-row">
          <button aria-label="Decrease quantity" data-i="${i}" class="ci-minus">−</button>
          <input type="text" value="${item.qty}" readonly>
          <button aria-label="Increase quantity" data-i="${i}" class="ci-plus">+</button>
        </div>
        <button class="ci-remove" data-i="${i}">Remove</button>
      </div>
      <div class="ci-price">${formatPrice(item.price * item.qty)}</div>
    </div>`).join("");


  wrap.querySelectorAll(".ci-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const cart = getCart();
      cart.splice(Number(btn.dataset.i), 1);
      saveCart(cart);
      renderCartPage();
      updateSummary();
    });
  });
  wrap.querySelectorAll(".ci-plus").forEach(btn => {
    btn.addEventListener("click", () => {
      const cart = getCart();
      cart[Number(btn.dataset.i)].qty += 1;
      saveCart(cart);
      renderCartPage();
      updateSummary();
    });
  });
  wrap.querySelectorAll(".ci-minus").forEach(btn => {
    btn.addEventListener("click", () => {
      const cart = getCart();
      const idx = Number(btn.dataset.i);
      cart[idx].qty = Math.max(1, cart[idx].qty - 1);
      saveCart(cart);
      renderCartPage();
      updateSummary();
    });
  });

  updateSummary();
}

function updateSummary(){
  const subtotalEl = document.getElementById("cart-subtotal");
  const shippingEl = document.getElementById("cart-shipping");
  const totalEl = document.getElementById("cart-total");
  if (!subtotalEl) return;
  const subtotal = cartSubtotal();
  const shipping = subtotal > 0 ? SHIPPING_STANDARD : 0;
  subtotalEl.textContent = formatPrice(subtotal);
  shippingEl.textContent = subtotal > 0 ? formatPrice(shipping) : "-";
  totalEl.textContent = formatPrice(subtotal + shipping);
}

/* ---------- Checkout page ---------- */
function renderCheckoutSummary(){
  const wrap = document.getElementById("checkout-items");
  if (!wrap) return;
  const cart = getCart();

  if (cart.length === 0){
    window.location.href = "cart.html";
    return;
  }

  wrap.innerHTML = cart.map(item => `
    <div class="summary-row">
      <span>${item.name} × ${item.qty}</span>
      <span>${formatPrice(item.price * item.qty)}</span>
    </div>`).join("");

  const subtotal = cartSubtotal();
  const shippingMethod = document.querySelector('input[name="shipping"]:checked');
  const shipping = shippingMethod && shippingMethod.value === "express" ? SHIPPING_EXPRESS : SHIPPING_STANDARD;

  document.getElementById("checkout-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("checkout-shipping").textContent = formatPrice(shipping);
  document.getElementById("checkout-total").textContent = formatPrice(subtotal + shipping);
}

// Short human-readable order reference, shared between the WhatsApp message
// and the downloaded summary document so the two are easy to match up.
function generateOrderRef(){
  return "PRT-" + Date.now().toString().slice(-6);
}

function checkoutContactInfo(){
  const val = id => { const el = document.getElementById(id); return el && el.value.trim() ? el.value.trim() : null; };
  return {
    name: val("full-name"),
    email: val("email"),
    phone: val("phone"),
    address: val("address"),
    city: val("city"),
    postal: val("postal"),
    country: val("country")
  };
}

function checkoutPaymentLabel(){
  const paymentRadio = document.querySelector('input[name="payment"]:checked');
  const paymentLabel = { cod: "Cash on Delivery", whatsapp: "Pay on WhatsApp (bank transfer / mobile wallet)" };
  if (paymentRadio && paymentRadio.value === "wallet"){
    // Kept short: the order Sheet cuts the Payment column at 80 characters.
    const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    const tid = val("wallet-tid");
    let label = `${val("wallet-used") || "Wallet"}${tid ? " TID " + tid.slice(0, 24) : ""}`;
    if (walletShot) label += tid ? " +screenshot" : " screenshot only, no TID";
    return label;
  }
  return paymentRadio ? paymentLabel[paymentRadio.value] : paymentLabel.cod;
}

/* ---------- Easypaisa / JazzCash option ----------
   Shows the account numbers from WALLET_ACCOUNTS (main.js) and asks for the Transaction ID.
   Hidden completely until at least one wallet number is filled in. */
let walletShot = null; // { dataUrl, mime } - downscaled JPEG of the customer's payment screenshot

function currentWalletShot(){
  const sel = document.querySelector('input[name="payment"]:checked');
  return sel && sel.value === "wallet" ? walletShot : null;
}

// Shrinks a phone screenshot to max 1600px wide/tall JPEG so the order upload stays small.
function readScreenshot(file){
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error("Please choose an image file."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: c.toDataURL("image/jpeg", 0.82), mime: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("We could not read that image. Try another screenshot.")); };
    img.src = url;
  });
}

function initWalletScreenshot(){
  const input = document.getElementById("wallet-shot");
  if (!input) return;
  const preview = document.getElementById("wallet-shot-preview");
  const img = document.getElementById("wallet-shot-img");
  const msg = document.getElementById("wallet-shot-msg");
  const clear = () => { walletShot = null; input.value = ""; preview.hidden = true; img.removeAttribute("src"); };
  input.addEventListener("change", async () => {
    msg.textContent = "";
    const file = input.files && input.files[0];
    if (!file){ clear(); return; }
    try {
      walletShot = await readScreenshot(file);
      img.src = walletShot.dataUrl;
      preview.hidden = false;
      msg.textContent = "Screenshot added.";
    } catch (err){
      clear();
      msg.textContent = err.message;
    }
  });
  document.getElementById("wallet-shot-remove").addEventListener("click", () => { clear(); msg.textContent = ""; });
}

function walletConfig(){
  const wallets = [["Easypaisa", WALLET_ACCOUNTS.easypaisa], ["JazzCash", WALLET_ACCOUNTS.jazzcash]];
  return wallets.filter(w => w[1] && String(w[1].number || "").trim());
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function copyText(text, btn, idleLabel){
  const done = ok => {
    btn.textContent = ok ? "Copied" : "Press and hold to copy";
    setTimeout(() => { btn.textContent = idleLabel; }, 1800);
  };
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err){}
    document.body.removeChild(ta);
    done(ok);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done(true), fallback);
  else fallback();
}

function initWalletOption(){
  const option = document.getElementById("wallet-option");
  const panel = document.getElementById("wallet-panel");
  if (!option || !panel) return;
  const wallets = walletConfig();
  option.hidden = false;

  // Numbers not filled in yet (WALLET_ACCOUNTS in main.js): tell the customer the number comes on WhatsApp.
  if (!wallets.length){
    panel.dataset.pending = "1";
    document.getElementById("wallet-steps").hidden = true;
    document.getElementById("wallet-pending").hidden = false;
    return;
  }

  const used = document.getElementById("wallet-used");
  const tabs = document.getElementById("wallet-tabs");
  const accounts = document.getElementById("wallet-accounts");

  function show(label){
    used.value = label;
    tabs.querySelectorAll(".wallet-tab").forEach(t => t.setAttribute("aria-checked", String(t.dataset.w === label)));
    const entry = wallets.find(w => w[0] === label);
    const acc = entry[1];
    accounts.innerHTML = `
      <div class="wallet-account">
        <div class="wallet-account-copy">
          <strong>${label}</strong>
          <span class="wallet-number">${escapeHtml(acc.number)}</span>
          ${acc.name ? `<span class="radio-note">Account name: ${escapeHtml(acc.name)}</span>` : ""}
        </div>
        <button type="button" class="btn btn-outline wallet-copy" data-number="${escapeHtml(acc.number)}">Copy number</button>
      </div>`;
  }

  if (wallets.length > 1){
    tabs.innerHTML = wallets.map(([label]) => `<button type="button" class="wallet-tab" role="radio" aria-checked="false" data-w="${label}">${label}</button>`).join("");
    tabs.addEventListener("click", e => {
      const t = e.target.closest(".wallet-tab");
      if (t) show(t.dataset.w);
    });
  } else {
    document.getElementById("wallet-choose").hidden = true;
  }
  accounts.addEventListener("click", e => {
    const b = e.target.closest(".wallet-copy");
    if (b) copyText(b.dataset.number, b, "Copy number");
  });
  const amtBtn = document.getElementById("wallet-copy-amount");
  amtBtn.addEventListener("click", () => copyText(String(panel.dataset.amount || ""), amtBtn, "Copy amount"));
  show(wallets[0][0]);

  const tid = document.getElementById("wallet-tid");
  if (tid) tid.addEventListener("input", () => tid.setCustomValidity(""));
}

// Show the wallet panel only while that payment method is selected and keep the amount current.
function syncWalletPanel(){
  const panel = document.getElementById("wallet-panel");
  if (!panel) return;
  const selected = document.querySelector('input[name="payment"]:checked');
  panel.hidden = !(selected && selected.value === "wallet");
  const shippingMethod = document.querySelector('input[name="shipping"]:checked');
  const shipping = shippingMethod && shippingMethod.value === "express" ? SHIPPING_EXPRESS : SHIPPING_STANDARD;
  const total = cartSubtotal() + shipping;
  panel.dataset.amount = String(total);
  const amount = document.getElementById("wallet-amount");
  if (amount) amount.textContent = formatPrice(total);
}

// Wallet payments need a Transaction ID OR a screenshot (one is enough). Returns false and
// shows a message on the TID field when neither is given.
function walletProofOk(){
  const selected = document.querySelector('input[name="payment"]:checked');
  const panel = document.getElementById("wallet-panel");
  if (!selected || selected.value !== "wallet" || !panel || panel.dataset.pending) return true;
  const tid = document.getElementById("wallet-tid");
  if (tid.value.trim() || walletShot){ tid.setCustomValidity(""); return true; }
  tid.setCustomValidity("Enter the Transaction ID, or add a screenshot of the payment.");
  tid.reportValidity();
  return false;
}

// Builds the order message text from the cart + whatever contact/shipping
// fields the customer has filled in, plus their chosen payment method. Used
// both for the wa.me link and as the text portion of a native share.
function buildOrderMessageText(cart, subtotal, shipping, shippingMethod, orderRef, cloud){
  const contact = checkoutContactInfo();
  const itemLines = cart.map(item => {
    const opts = [item.color ? `Color: ${item.color}` : null, item.size ? `Size: ${item.size}` : null, item.orientation ? `Orientation: ${item.orientation}` : null, item.packaging ? `Packaging: ${item.packaging}` : null].filter(Boolean).join(", ");
    return `- ${item.name} × ${item.qty}${opts ? ` (${opts})` : ""}, ${formatPrice(item.price * item.qty)}${item.designFiles && item.designFiles.length ? ` [custom design: ${item.designFiles.length > 1 ? item.designFiles.length + " files" : "file"} ${cloud && cloud.ok ? "saved online" : "attached"}]` : ""}`;
  });
  const hasDesigns = cart.some(item => item.designFiles && item.designFiles.length);
  const lines = [
    "Hi! I'd like to place this order:",
    `Order Ref: ${orderRef}`,
    ...itemLines,
    `Subtotal: ${formatPrice(subtotal)}`,
    `Shipping (${shippingMethod && shippingMethod.value === "express" ? "Express" : "Standard"}): ${formatPrice(shipping)}`,
    `Total: ${formatPrice(subtotal + shipping)}`,
    `Payment: ${checkoutPaymentLabel()}`,
    "",
    contact.name ? `Name: ${contact.name}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
    contact.address ? `Address: ${[contact.address, contact.city, contact.postal, contact.country].filter(Boolean).join(", ")}` : null,
    "",
    cloud && cloud.ok ? `Order saved online, ref ${orderRef}.` : null,
    cloud && cloud.ok && (hasDesigns || currentWalletShot()) && cloud.folderUrl ? `${hasDesigns ? "Design files" : "Order files"}: ${cloud.folderUrl}` : null,
    !(cloud && cloud.ok) && hasDesigns ? `(My design file(s) are attached, ref ${orderRef}.)` : null,
    currentWalletShot() ? (cloud && cloud.ok ? "Payment screenshot saved online." : "(I will send my payment screenshot in this chat.)") : null
  ].filter(line => line !== null);
  return lines.join("\n");
}

// data: URL (as produced by the Design Studio canvas export) -> File, so it
// can be handed to navigator.share() alongside the order text. Kept as a
// real "image/png" - Chrome's Web Share API maintains its own allow-list of
// shareable MIME types (images, video, audio, PDF, plain text, a few Office
// formats) and silently rejects the whole share if the file's type isn't on
// it. An earlier version of this code set the type to
// "application/octet-stream" to try to make WhatsApp treat the file as a
// Document instead of a compressed Photo - but that type isn't on Chrome's
// list, so canShare() always came back false and every share silently fell
// through to the download fallback. Real "image/png" is what makes the
// share sheet actually open; WhatsApp will attach it as a Photo.
function dataUrlToFile(dataUrl, filename, fallbackMime){
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : (fallbackMime || "image/png");
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function designFileName(item, file, orderRef){
  const base = `${(item.name || "gfxprints-design").replace(/\s+/g, "-").toLowerCase()}-${file.label.replace(/\s+/g, "-").toLowerCase()}-${orderRef}`;
  return `${base}.${designFileExt(file)}`;
}

// Tries the device's native share sheet so the order text and design
// file(s) go to WhatsApp *together*, attached to one message - the only way
// a webpage can actually hand a file to WhatsApp alongside text, since
// wa.me links carry text only. Only works where the browser supports
// sharing files (mainly mobile) and the customer picks WhatsApp from the
// sheet that opens. Returns a Promise if it can attempt a share, or null if
// the browser can't share files at all (desktop, mostly, or a cart with no
// custom designs), so the caller knows to fall back to opening wa.me.
//
// Note: shared this way, WhatsApp attaches the image as a (compressed)
// Photo - there's no reliable way to force Document mode through Chrome's
// Web Share API (see dataUrlToFile above). Full, uncompressed quality is
// only guaranteed via the manual-attach fallback below, where the customer
// picks "Document" themselves inside WhatsApp.
function tryNativeOrderShare(cart, orderRef, messageText){
  if (!navigator.share || !navigator.canShare) return null;

  const designFiles = [];
  cart.forEach(item => (item.designFiles || []).forEach(file => {
    if (file.blob) designFiles.push(new File([file.blob], designFileName(item, file, orderRef), { type: file.blob.type || "image/png" }));
  }));
  if (!designFiles.length || !navigator.canShare({ files: designFiles })) return null;

  return navigator.share({ text: messageText, files: designFiles });
}

// "data:image/jpeg;base64,AAAA" -> { mime, data } (data = base64 only), or null.
function splitDataUrl(dataUrl){
  const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl || "");
  return m ? { mime: m[1], data: m[2] } : null;
}

// Sends the order (details + print files) to the Google Apps Script web app so it is saved in
// Drive and the Sheet. Returns { ok:true, folderUrl } on success, or null if it isn't set up or
// failed (the caller then falls back to the old WhatsApp attach/download flow).
async function uploadOrderToCloud(cart, info){
  if (!ORDER_ENDPOINT) return null;
  const contact = checkoutContactInfo();
  const slug = (s) => String(s || "item").replace(/\s+/g, "-").toLowerCase();
  let items = [];
  for (const item of cart){
    const files = [];
    for (const f of (item.designFiles || [])){
      if (!f.blob) continue;
      const p = splitDataUrl(await blobToDataUrl(f.blob));
      if (p){
        const entry = { label: f.label, name: designFileName(item, f, info.orderRef), mime: p.mime, data: p.data };
        files.push(entry);
      }
    }
    // The mockup preview image is not sent with the order, only the print files.
    items.push({ name: item.name, qty: item.qty, price: item.price, color: item.color, size: item.size, orientation: item.orientation, packaging: item.packaging, files });
  }
  const shot = currentWalletShot();
  if (shot && items.length){
    const p = splitDataUrl(shot.dataUrl);
    if (p) items[0].files.push({ label: "Payment screenshot", name: `payment-screenshot-${info.orderRef}.jpg`, mime: p.mime, data: p.data });
  }
  const size = () => items.reduce((n, it) => n + it.files.reduce((m, f) => m + f.data.length, 0), 0);
  // Print files are never shrunk: they must stay exactly 300 DPI. If the order is still too big for one upload,
  // return null and checkout falls back to the WhatsApp attach flow with the full-size files.
  if (size() > 30e6) return null;

  const payload = {
    token: ORDER_TOKEN,
    ref: info.orderRef,
    contact,
    payment: checkoutPaymentLabel(),
    subtotal: info.subtotal,
    shipping: info.shipping,
    total: info.subtotal + info.shipping,
    items
  };
  const body = JSON.stringify(payload);

  for (let attempt = 0; attempt < 2; attempt++){
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 90000);
    try {
      // text/plain keeps this a "simple" request, so the browser doesn't need a CORS preflight
      // (Apps Script web apps can't answer one).
      const res = await fetch(ORDER_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body, signal: ctl.signal });
      const out = await res.json();
      if (out && out.ok) return out;
      console.warn("Order upload refused:", out && out.error);
      return null;
    } catch (err){
      console.warn("Order upload failed", err);
      if (err && err.name === "AbortError") return null; // don't wait another 90s
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// Small spinner on the Place order button while the order is saved (can take a few seconds with design files).
function setSubmitLoading(btn, on, label){
  if (!btn) return;
  if (on){
    if (btn.classList.contains("is-loading")) return;
    btn.dataset.origHtml = btn.innerHTML;
    btn.classList.add("is-busy", "is-loading");
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span class="btn-load-text">' + (label || "Please wait...") + '</span>';
  } else {
    btn.classList.remove("is-busy", "is-loading");
    btn.removeAttribute("aria-busy");
    if (btn.dataset.origHtml != null){ btn.innerHTML = btn.dataset.origHtml; delete btn.dataset.origHtml; }
  }
}

function initCheckoutPage(){
  const form = document.getElementById("checkout-form");
  if (!form) return;

  renderCheckoutSummary();
  initWalletOption();
  initWalletScreenshot();
  syncWalletPanel();

  document.querySelectorAll('input[name="shipping"]').forEach(radio => {
    radio.addEventListener("change", () => {
      document.querySelectorAll('input[name="shipping"]').forEach(r => r.closest(".radio-card").classList.remove("selected"));
      radio.closest(".radio-card").classList.add("selected");
      renderCheckoutSummary();
      syncWalletPanel();
    });
  });
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener("change", () => {
      document.querySelectorAll(".payment-options .radio-card").forEach(card => card.classList.remove("selected"));
      radio.closest(".radio-card").classList.add("selected");
      renderCheckoutSummary();
      syncWalletPanel();
    });
  });

  // Keep the WhatsApp message in sync as the customer fills in contact/shipping details
  ["full-name", "phone", "address", "city", "postal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", renderCheckoutSummary);
  });
  const countryEl = document.getElementById("country");
  if (countryEl) countryEl.addEventListener("change", renderCheckoutSummary);

  let submitting = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!walletProofOk()) return;
    if (!form.checkValidity()){
      form.reportValidity();
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitting = true;
    setSubmitLoading(submitBtn, true, "Placing your order...");
    const stopLoading = () => { submitting = false; setSubmitLoading(submitBtn, false); };
    const cart = getCart();
    try {
      await hydrateDesignFiles(cart);
    } catch (err){
      console.error("Could not read design files", err);
      stopLoading();
      showToast("Something went wrong. Please try again");
      return;
    }
    const subtotal = cartSubtotal();
    const shippingMethod = document.querySelector('input[name="shipping"]:checked');
    const shipping = shippingMethod && shippingMethod.value === "express" ? SHIPPING_EXPRESS : SHIPPING_STANDARD;
    const orderRef = generateOrderRef();
    const hasDesigns = cart.some(item => item.designFiles && item.designFiles.length);

    // Save the order + print files online first (Google Drive / Sheet), when it's set up.
    let cloud = null;
    if (ORDER_ENDPOINT){
      let status = document.getElementById("checkout-status");
      if (!status && submitBtn){
        status = document.createElement("p");
        status.id = "checkout-status";
        status.className = "hint-sm";
        status.setAttribute("aria-live", "polite");
        status.style.marginTop = "10px";
        submitBtn.insertAdjacentElement("afterend", status);
      }
      if (status) status.textContent = hasDesigns ? "Saving your order and design files. Please keep this page open..." : "Saving your order...";
      cloud = await uploadOrderToCloud(cart, { orderRef, subtotal, shipping });
      if (status) status.textContent = "";
    }
    const messageText = buildOrderMessageText(cart, subtotal, shipping, shippingMethod, orderRef, cloud);

    const finishOrder = (viaShare, saved) => {
      stopLoading();
      const designNote = document.getElementById("confirmation-design-note");
      const heading = document.querySelector("#checkout-confirmation h2");
      const body = document.querySelector("#checkout-confirmation p");
      const waLink = document.getElementById("confirmation-wa-link");
      if (waLink){
        waLink.href = whatsappLink(messageText);
        waLink.style.display = "inline-block";
      }
      if (saved){
        if (heading) heading.textContent = "Order received";
        if (body) body.innerHTML = `Your order <strong>${orderRef}</strong>${hasDesigns ? " and design file(s) are" : " is"} saved with us. WhatsApp should have opened with your order message. Please press <strong>Send</strong> there so we can confirm the total, delivery, and payment with you. If it did not open, use the button below.`;
      } else if (viaShare){
        if (heading) heading.textContent = "Order shared";
        if (body) body.innerHTML = `Your order and design file(s) were shared as one attachment, ref <strong>${orderRef}</strong>. Our team will confirm the total, delivery, and payment with you on WhatsApp.`;
      } else if (designNote){
        designNote.textContent = hasDesigns
          ? ", then send it so we can confirm your order"
          : "";
      }
      document.getElementById("checkout-form-wrap").style.display = "none";
      document.getElementById("checkout-confirmation").style.display = "block";
      localStorage.removeItem(STORAGE_CART);
      if (window.GfxFiles) GfxFiles.clear();
      updateCartBadge();
    };

    // Fallback for devices that can't share files (mostly desktop): open
    // WhatsApp with the pre-filled message, and auto-download each custom
    // design file so it's ready to attach manually. Staggered a beat apart
    // since browsers can silently block several downloads fired at once.
    const openWhatsAppAndDownload = () => {
      window.open(whatsappLink(messageText), "_blank", "noopener");
      // No automatic download of design files; the order is placed only.
      finishOrder(false);
    };

    // Order + files are safely saved online: just open WhatsApp with the message (the folder link
    // is inside it), no attaching or downloading needed.
    if (cloud && cloud.ok){
      window.open(whatsappLink(messageText), "_blank", "noopener");
      finishOrder(false, true);
      return;
    }

    const sharePromise = tryNativeOrderShare(cart, orderRef, messageText);
    if (sharePromise){
      // The share sheet is up - text + design file(s) attached together in
      // one go, which a plain wa.me link can never do.
      sharePromise
        .then(() => finishOrder(true))
        .catch(err => {
          if (err && err.name === "AbortError"){
            // Customer closed the share sheet without picking anything -
            // don't also pop open WhatsApp behind their back.
            stopLoading();
            showToast("Order not sent. Tap Place Order to try again.");
            return;
          }
          openWhatsAppAndDownload();
        });
    } else {
      openWhatsAppAndDownload();
    }
  });
}

// Back button can restore the page with the spinner still showing.
window.addEventListener("pageshow", () => {
  document.querySelectorAll("button.is-loading").forEach(b => setSubmitLoading(b, false));
});

document.addEventListener("DOMContentLoaded", () => {
  renderCartPage();
  initCheckoutPage();
});
