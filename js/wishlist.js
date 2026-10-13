/* Wishlist page: shows the products saved in this browser (uses helpers from main.js). */
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("wishlist-grid");
  const empty = document.getElementById("wishlist-empty");
  if (!grid || typeof PRODUCTS === "undefined") return;
  function render(){
    const ids = getWishlist();
    const items = PRODUCTS.filter(p => ids.includes(p.id));
    grid.innerHTML = items.map(productCardHTML).join("");
    grid.hidden = !items.length;
    if (empty) empty.hidden = items.length > 0;
    bindWishlistButtons(grid);
    // After the heart is toggled (and the item removed from the saved list), redraw the list
    grid.querySelectorAll(".pc-wishlist").forEach(b => b.addEventListener("click", () => setTimeout(render, 0)));
    grid.querySelectorAll(".reveal").forEach(el => el.classList.add("visible", "in", "is-visible"));
  }
  render();
});
