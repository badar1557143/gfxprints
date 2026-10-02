/* =========================================================
   GfxPrints - Customer reviews (index.html)
   Real reviews only. How it works:
   1. A customer fills in the "Share your experience" form.
      - If REVIEW_FORM_ENDPOINT is set (a Formspree / Getform / Basin
        form URL), the review is emailed to you.
      - If it is empty, the review opens as a pre-written WhatsApp
        message to your WhatsApp number (see main.js).
   2. You read it, and if it is genuine, copy it into
      APPROVED_REVIEWS below. Only reviews listed there are shown.
   ========================================================= */

// e.g. "https://formspree.io/f/xxxxxxxx" - leave "" to use WhatsApp instead.
const REVIEW_FORM_ENDPOINT = "";

// Paste approved, genuine reviews here, one per line, for example:
// { name: "Customer name", rating: 5, product: "Personalized Ceramic Mug", date: "2026-10-12", text: "What the customer wrote." },
const APPROVED_REVIEWS = [
];

(function(){
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function stars(n){
    n = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return "★".repeat(n) + "☆".repeat(5 - n);
  }
  function initials(name){
    const parts = String(name || "?").trim().split(/\s+/);
    return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  // Genuine, approved reviews first, then the featured quotes from products.js.
  function renderReviews(){
    const grid = document.getElementById("reviews-grid");
    if (!grid) return;
    const featured = (typeof TESTIMONIALS !== "undefined") ? TESTIMONIALS : [];
    const all = APPROVED_REVIEWS.concat(featured);

    grid.innerHTML = all.map(r => `
      <figure class="rv-card">
        <div class="rv-card-stars" aria-label="${esc(r.rating)} out of 5 stars">${stars(r.rating)}</div>
        <blockquote>${esc(r.text)}</blockquote>
        <figcaption>
          <span class="rv-avatar" aria-hidden="true">${esc(initials(r.name))}</span>
          <span><strong>${esc(r.name)}</strong>${r.product ? `<em>${esc(r.product)}</em>` : ""}</span>
        </figcaption>
      </figure>`).join("");

    // Rating summary is calculated only from approved reviews.
    const stat = document.getElementById("reviews-summary");
    if (stat && APPROVED_REVIEWS.length){
      const avg = APPROVED_REVIEWS.reduce((s, r) => s + (Number(r.rating) || 0), 0) / APPROVED_REVIEWS.length;
      document.getElementById("rv-avg").textContent = avg.toFixed(1);
      document.getElementById("rv-avg-stars").textContent = stars(avg);
      document.getElementById("rv-count").textContent =
        `from ${APPROVED_REVIEWS.length} review${APPROVED_REVIEWS.length === 1 ? "" : "s"}`;
      stat.hidden = false;
    }
  }

  function initReviewForm(){
    const form = document.getElementById("review-form");
    if (!form) return;
    const sel = document.getElementById("rv-product");
    if (sel && typeof PRODUCTS !== "undefined"){
      sel.innerHTML = `<option value="">Select a product</option>` +
        PRODUCTS.map(p => `<option>${esc(p.name)}</option>`).join("") +
        `<option>Other</option>`;
    }
    const msg = document.getElementById("rv-msg");
    const btn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.website && form.website.value) return; // spam trap
      const review = {
        name: form.name.value.trim(),
        rating: Number(form.rating.value),
        product: form.product.value,
        text: form.text.value.trim()
      };
      if (!review.name || !review.rating || !review.text){
        msg.textContent = "Please add your name, a star rating and your comment.";
        return;
      }
      btn.disabled = true;

      if (REVIEW_FORM_ENDPOINT){
        try {
          const res = await fetch(REVIEW_FORM_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(review)
          });
          if (!res.ok) throw new Error("bad response");
          form.reset();
          msg.textContent = "Thank you! Your review was sent and will appear here once our team approves it.";
        } catch (err){
          msg.textContent = "Sorry, we couldn't send your review. Please try again, or message us on WhatsApp.";
        }
      } else {
        const text =
          `New review for GfxPrints\n` +
          `Name: ${review.name}\n` +
          `Rating: ${review.rating}/5\n` +
          (review.product ? `Product: ${review.product}\n` : "") +
          `Comment: ${review.text}`;
        window.open(whatsappLink(text), "_blank", "noopener");
        form.reset();
        msg.textContent = "WhatsApp is opening so you can send your review to our team. It appears here once approved.";
      }
      btn.disabled = false;
    });
  }

  document.addEventListener("DOMContentLoaded", () => { renderReviews(); initReviewForm(); });
})();
