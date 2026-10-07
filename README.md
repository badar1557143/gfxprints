# GfxPrints - Print-on-Demand E-commerce Website

A complete front-end e-commerce site (HTML5 / CSS3 / vanilla JS) for a
personalized-products brand: T-shirts, mugs, name plates, photo frames,
hoodies, tote bags, and gifts.

## How to view it

No build step needed - it's static HTML/CSS/JS.

1. Unzip the folder.
2. Open `index.html` in a browser, **or** for full functionality
   (some browsers restrict `localStorage`/fetch on `file://`), serve it
   locally, e.g.:
   ```
   cd GfxPrints
   python3 -m http.server 8080
   ```
   then visit `http://localhost:8080`.

## Structure

```
GfxPrints/
├── index.html        Home page
├── shop.html          All products, filters, search, sort
├── product.html       Product detail page (?id=…) with a "Customize This Product" button
├── customize.html     Customization page + live Design Studio (?id=… pre-selects the product)
├── cart.html          Cart (persisted in localStorage)
├── checkout.html      Checkout UI (front-end only, no payment wired up)
├── about.html         About + FAQ
├── contact.html       Contact form (front-end only)
├── css/style.css      Full design system + all page styles
├── js/products.js     Central product data array - edit this to add/change products
├── js/main.js         Shared nav, cart badge, wishlist, homepage + shop rendering
├── js/cart.js         Cart & checkout page logic
├── js/product.js      Product detail page logic
├── js/customize.js    Customization page: product picker + Design Studio (Fabric.js canvas)
└── assets/            Empty folders (images/, products/, icons/) reserved
                        for your own local photography if you want to
                        replace the Unsplash images referenced in
                        products.js
```

## Images

Product and lifestyle photography currently links to hotlinked,
license-free Unsplash photos (chosen to visually match each product
type) so the site looks real out of the box. For production, download
your own licensed photography into `assets/products/` and update the
`image` / `gallery` fields in `js/products.js` to local paths.

## What's real vs. placeholder

- **Real & working:** navigation, mobile menu, search, category/price
  filters, sorting, wishlist, the live **Design Studio** on the
  customization page (add unlimited text and uploaded-image layers, drag/resize/rotate
  each one on the product, undo/redo, layer reordering, delete/duplicate),
  cart (add/update/remove, persisted with `localStorage`, with a composed
  thumbnail of each customer's design), order summary math, and form
  validation.
- **Placeholder / not connected:** checkout does not charge a card or
  create a real order - there's no backend or payment gateway. The
  contact form and newsletter form don't send real emails. Swap these
  for real API calls when you connect a backend.

## Design saved on Add to Cart / Buy Now

The moment a customer taps **Add to Cart** or **Buy Now** on `customize.html`
with a design on the canvas, `js/customize.js` auto-downloads a JPG of every
customized side to their device (staggered ~400ms apart per file) before the
item is written to the cart. This happens whether or not they ever reach
checkout, so the design isn't only saved at the last step. It's in addition
to, not instead of, the checkout-time attach/download flow below - that one
also tags the filename with the order reference and is what actually gets
attached to the WhatsApp message.

## Checkout → WhatsApp attachments

WhatsApp's `wa.me` chat links can only pre-fill **text**, not attach files -
there's no URL parameter for that on any platform, and no webpage can push a
file straight into a specific app. The order message itself already contains
the full summary (items, totals, shipping address, payment method, and an
**Order Ref** like `PRT-482913`), so the only thing that ever needs to travel
as an actual file is a customer's **custom design JPG(s)**. `js/cart.js`
picks the best available way to get those to WhatsApp with the message when
a customer taps **"Place Order on WhatsApp"**:

1. **Phones that support sharing files** (`navigator.share` +
   `navigator.canShare({ files })` - most modern mobile browsers): tapping
   the button opens the OS's native **share sheet** with the order text and
   design file(s) already attached together as one share. The customer
   picks WhatsApp from that sheet, and everything lands in the chat as a
   single send - this is the only way to get text and a file into WhatsApp
   together from a webpage. If the customer backs out of the share sheet
   without picking anything, nothing is sent and the form stays as-is so
   they can try again.

   WhatsApp attaches a file shared this way as a **Photo** (compressed),
   not a Document. There's no reliable way to force Document mode through
   this path: Chrome's Web Share API only allows files whose MIME type is
   on its own fixed list (images, video, audio, PDF, plain text, a few
   Office formats) - giving the file a generic type like
   `application/octet-stream` to try to dodge WhatsApp's Photo handling
   doesn't work, since Chrome rejects the *share itself* for a type that
   isn't on that list, so nothing gets shared at all. Full, uncompressed
   quality is only guaranteed via the manual-attach fallback below.
2. **Everywhere else** (desktop browsers, carts with no custom design, or if
   the native share attempt fails for another reason): falls back to
   opening WhatsApp Web/desktop with the pre-filled text message, and
   auto-downloading each design JPG so it's ready for the customer to attach
   manually in the chat that just opened. Downloads are staggered ~500ms
   apart since browsers can silently block several triggered at once. The
   confirmation screen reminds the customer to attach it as a **Document**
   (not Photo) in WhatsApp for full print quality - that choice is made by
   hand here, and it's the only path where full quality is guaranteed.

## Customization page

Every product's **Customize** button (shop grid, home page, related
products) links to `customize.html?id=<product id>`, so the page opens with
that product already selected. The "Customize This Product" button on
`product.html` and the "Customization" nav / hero links use the same page
(with no `?id`, it opens on the first product).

- A product strip at the top lists every customizable product; picking another
  one swaps the preview, price, colors and sizes **without losing the design**
  the customer has built, and keeps the address bar (`?id=`) in sync.
- Unknown or missing ids fall back to the first product.
- A product with `customizable: false` in `js/products.js` shows a plain
  "View" button instead and is left out of the strip.

## Design Studio

`customize.html` loads [Fabric.js](http://fabricjs.com/) from a CDN
(`<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js">`)
to power the live customizer:

- **Add Text** / **Upload Image** add new layers to an HTML canvas that
  sits over the product photo. Each layer can be dragged, resized (drag
  the corner handle), and rotated (drag the top handle) directly on the
  product - the preview always shows exactly what's been added.
- The **Properties** tab edits whatever layer is selected (text content,
  font, color, size, bold/italic, alignment; image opacity). The
  **Layers** tab lists every layer with reorder / delete controls.
- **Undo/Redo** and **Reset** are backed by an in-memory history stack.
- On "Add to Cart" / "Buy Now", the whole layered design is saved with
  the cart line item as JSON (so it's not lost, and could later be
  re-opened for editing or sent to a backend for production), plus a
  flattened preview image composited from the product photo + the
  design layers for display in the cart. If the product photo can't be
  read back into a canvas because of CORS (only matters for remote
  stock photos, not your own local files), the preview image is skipped
  gracefully but the design itself is still saved.
- Needs an internet connection to load Fabric.js from the CDN; for a
  fully offline build, download `fabric.min.js` and reference it
  locally instead.

## Customizing

Add or edit products by editing the `PRODUCTS` array in
`js/products.js` - every page reads from that single source, so a new
product automatically appears in the shop grid, search, and (via its
`id`) on `product.html?id=<id>`.

### Per-color product photos

A product can carry one photo per color. In `js/products.js` add
`colorImages: { "Black": "assets/products/….webp", … }` (keys must match the
names in `colors`). The customization page then swaps the preview photo when a
color swatch is clicked, and the product page keeps its gallery and swatches in
sync. The Classic Custom T-Shirt uses this with 7 colors (White, Black, Navy,
Sky Blue, Mustard, Beige, Brown) - photos are in `assets/products/tee-plain-*.webp`.

Optional `printArea: "top right bottom left"` (percent insets, e.g.
`"30% 27% 26% 27%"`) positions the dashed print guide on the preview. New
swatch colors go in `colorToHex()` in `js/products.js`.

### Optional per-product flags (used by the Classic Cotton T-Shirt)

- `unavailable: { "Black": ["M", "L"] }` - sizes that cannot be ordered in a colour. They show disabled and cannot reach the cart.
- `namedSwatches: true` - colour chips with the colour name visible and a clear selected state.
- `seo.hideRatings`, `seo.hideShippingReturns`, `seo.hideSizeGuide` - hide those blocks (and rating data in the page's structured data) for a product.
- A size with no valid retail price in `variantPrices` cannot be added to the cart.

## Clipart & Sticker Library

`js/clipart.js` adds a **Clipart** tool to the Design Studio rail: ~40 original
vector designs (stickers, love, nature, fun, shapes, icons) drawn as inline SVG,
so no extra image files or network calls are needed. Customers can search,
filter by category, add a die-cut **sticker outline** (white or black) and
recolour the single-colour **Icons** set. Items are placed on the canvas like any
uploaded image (move / resize / rotate / opacity / layers / undo all work) and
are saved with the cart design as normal.

To add designs, append an entry to the `ITEMS` array in `js/clipart.js`
(`[id, name, category, search tags, mono (0/1), svg]`, 100x100 viewBox; use
`currentColor` for parts that should follow the icon-colour picker). Then run
`sh tools/build.sh` to refresh `js/clipart.min.js`.

## Keyboard shortcuts, zoom & Hand tool

`js/shortcuts.js` + `js/view.js` (Design Studio only). Press `?` in the studio for the full list.
Copy / Cut / Paste (Ctrl or Cmd + C/X/V; pasting an image from the system clipboard adds it as a layer), Duplicate (D),
Select all (A), Undo (Z) / Redo (Shift+Z or Y), Delete, Esc to deselect, arrow keys nudge 1px (Shift = 10px),
Ctrl + ] / [ reorders layers (add Shift for front / back).

**View bar** (bottom of the canvas): Hand tool, zoom out / slider / zoom in, a % menu with presets, and Fit.
Ctrl/Cmd + mouse wheel (or trackpad pinch) zooms toward the cursor (25-300%). Plain wheel scrolls the canvas when it is
bigger than the view. **Hand tool**: click it, press `H`, hold `Space`, or use the middle mouse button, then drag to move the
canvas anywhere. `F` fits to screen, `0` resets, `+` / `-` step the zoom. Shortcuts are ignored while typing or editing text.

## Minified files

The pages load `css/style.min.css` and `js/*.min.js`. Edit the normal files (`css/style.css`, `js/*.js`), then run `sh tools/build.sh` (needs Node.js) and commit the `.min` files too. If you skip this step, your changes will not show on the site.
