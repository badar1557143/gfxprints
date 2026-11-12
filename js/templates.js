/* =========================================================
   GfxPrints - Design Studio Templates
   Ready-made designs (like Canva's Templates). The customer taps one and
   it lands on the product as separate, editable layers: the text is real
   text (tap to change it) and the artwork is vector, so it stays sharp in
   the print file.

   HOW TO ADD YOUR OWN TEMPLATE
   Copy one entry in TEMPLATES below and change it. Every template is drawn
   on a 100 x 100 box; x and y are the CENTRE of a layer in that box.
     T(text, x, y, size, font, colour, extras)   a line of editable text
     S(svgMarkup, x, y, width, vbW, vbH, extras) vector artwork (drawn on a vbW x vbH grid)
     C(clipartId, x, y, width, colour, extras)   a drawing from the Clipart library
     R(file, x, y, width, aspect, extras)        a ready-made picture file (transparent WebP in assets/templates/);
                                                 aspect = picture height / width. Pictures keep their own colours,
                                                 so only offer them on products where they stay visible.
   Colours: "@ink" is the main text colour (dark on light products, white on
   dark ones), "@soft" is a calmer second ink, and "@blue", "@brown", "@green" are
   accents that brighten on dark products. Any normal hex colour also works.
   extras: bold:true, sp (letter spacing), angle, op (opacity), stroke, sw (outline width),
           lh (line height, for text with several lines: put \n between the lines)
   ========================================================= */
(function(){
  "use strict";

  const F = {
    anton: "'Anton', sans-serif", bebas: "'Bebas Neue', sans-serif", mont: "'Montserrat', sans-serif",
    pop: "'Poppins', sans-serif", play: "'Playfair Display', serif", abril: "'Abril Fatface', serif",
    pacifico: "'Pacifico', cursive", lobster: "'Lobster', cursive", dance: "'Dancing Script', cursive",
    vibes: "'Great Vibes', cursive", satisfy: "'Satisfy', cursive", caveat: "'Caveat', cursive",
    bangers: "'Bangers', cursive", marker: "'Permanent Marker', cursive", urdu: "'Noto Nastaliq Urdu', serif"
  };

  const T = (text, x, y, size, font, fill, o) => Object.assign({ k: "t", text: text, x: x, y: y, size: size, font: font, fill: fill }, o || {});
  const S = (svg, x, y, w, vbW, vbH, o) => Object.assign({ k: "s", svg: svg, x: x, y: y, w: w, vbW: vbW || 100, vbH: vbH || 100 }, o || {});
  const R = (src, x, y, w, ar, o) => Object.assign({ k: "r", src: src, x: x, y: y, w: w, ar: ar }, o || {});
  const C = (id, x, y, w, color, o) => Object.assign({ k: "s", clip: id, color: color, x: x, y: y, w: w, vbW: 100, vbH: 100 }, o || {});

  /* ---- A few drawings made for the templates (100 x 100 grid unless noted) ---- */
  const CUP = '<path d="M72 46h5a11 11 0 0 1 0 22h-8" fill="none" stroke="#C8643B" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M18 40h56v24a26 26 0 0 1-26 26h-4a26 26 0 0 1-26-26z" fill="#C8643B"/>' +
    '<ellipse cx="46" cy="40" rx="28" ry="5.5" fill="#6B3F26"/>' +
    '<path d="M34 28q-6-8 0-16M48 28q-6-8 0-16M62 28q-6-8 0-16" fill="none" stroke="@soft" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M14 95h64" stroke="@soft" stroke-width="3.5" stroke-linecap="round"/>';
  const DIV = '<path d="M0 10h40M60 10h40" stroke="@ink" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M50 2.5l7 7.5-7 7.5-7-7.5z" fill="#C8643B"/>';
  const RING = '<circle cx="50" cy="50" r="46" fill="none" stroke="@ink" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="none" stroke="#C8643B" stroke-width="1.6" stroke-dasharray="2 4"/>';
  const LANTERN = '<path d="M50 2v10" stroke="@soft" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M38 12h24l5 9H33z" fill="#F5B301"/>' +
    '<path d="M33 21h34l3 46a20 16 0 0 1-40 0z" fill="#E5384F"/>' +
    '<path d="M33 21l9 62M67 21l-9 62M50 21v66" stroke="#F5B301" stroke-width="2.4" fill="none"/>' +
    '<path d="M36 70h28" stroke="#F5B301" stroke-width="2.4"/>' +
    '<path d="M42 85h16l-3 10H45z" fill="#F5B301"/>';
  const HEX = '<polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="@blue"/>';
  const WAVE = '<path d="M2 8q8-8 16 0t16 0 16 0 16 0 16 0 16 0" fill="none" stroke="#C8643B" stroke-width="3" stroke-linecap="round"/>';

  /* Pastel Birthday mug wrap: small drawings (pink hearts, crown, brush stroke, torn photo spot) */
  const PINK = "#FF5FA2", PINK_SOFT = "#FFA3BF";
  const HEART_D = "M50 90C20 68 6 50 6 33 6 20 16 10 29 10c9 0 17 5 21 13 4-8 12-13 21-13 13 0 23 10 23 23 0 17-14 35-44 57z";
  const PINK_HEART = '<path d="' + HEART_D + '" fill="' + PINK + '" stroke="#15171b" stroke-width="7" stroke-linejoin="round"/>';
  const LINE_HEART = '<path d="' + HEART_D + '" fill="none" stroke="@ink" stroke-width="8" stroke-linejoin="round"/>';
  const PINK_CROWN = '<path d="M8 82L4 32l26 22L50 12l20 42 26-22-4 50z" fill="' + PINK_SOFT + '" stroke="#15171b" stroke-width="6" stroke-linejoin="round"/>' +
    '<circle cx="4" cy="30" r="5" fill="' + PINK_SOFT + '" stroke="#15171b" stroke-width="4"/><circle cx="50" cy="12" r="5" fill="' + PINK_SOFT + '" stroke="#15171b" stroke-width="4"/><circle cx="96" cy="30" r="5" fill="' + PINK_SOFT + '" stroke="#15171b" stroke-width="4"/>';
  const UNDERLINE = '<path d="M2 12q48-10 96-3" fill="none" stroke="@ink" stroke-width="3.2" stroke-linecap="round"/>';
  const HEART_RULE = '<path d="M2 10h34M64 10h34" stroke="@ink" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
    '<g transform="translate(40 0) scale(.2)"><path d="' + HEART_D + '" fill="' + PINK + '" stroke="#15171b" stroke-width="9" stroke-linejoin="round"/></g>';
  const BRUSH = '<path d="M6 8L22 2l22 3 30-3 22 4 8 4-7 6 9 6-8 5 6 6-10 5 4 6-18 3-26-2-28 2-12-5 6-6-8-5 6-6-7-5z" fill="' + PINK_SOFT + '"/>';
  const TAPE = '<path d="M2 6l8-3 10 3 12-3 14 3 12-3 12 3 8 3-3 12 4 9-8 4-12-3-12 3-14-3-12 3-10-3-8-3 3-11z" fill="' + PINK_SOFT + '"/>';
  // Torn-edge photo spot. Light grey, so it never looks like part of the print. The customer puts their own photo on top.
  const PHOTO_SPOT = (function(){
    const w = 100, h = 123, n = 16, pts = [], r = (i) => ((i * 37) % 7) / 7 * 1.6;
    for (let i = 0; i <= n; i++) pts.push((i * w / n).toFixed(1) + "," + (1 + r(i)).toFixed(1));
    for (let i = 1; i <= n; i++) pts.push((w - 1 - r(i + 3)).toFixed(1) + "," + (i * h / n).toFixed(1));
    for (let i = n - 1; i >= 0; i--) pts.push((i * w / n).toFixed(1) + "," + (h - 1 - r(i + 5)).toFixed(1));
    for (let i = n - 1; i > 0; i--) pts.push((1 + r(i + 8)).toFixed(1) + "," + (i * h / n).toFixed(1));
    return '<polygon points="' + pts.join(" ") + '" fill="#EEF1F6" stroke="#B9C2D0" stroke-width="1.4" stroke-dasharray="4 3"/>' +
      '<g transform="translate(34 42) scale(.32)" fill="none" stroke="#8C97A8" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"><path d="M8 30h18l6-10h36l6 10h18v52H8z"/><circle cx="50" cy="56" r="16"/></g>';
  })();

  /* ---- Product groups a design can be printed on (names match "category" in js/products.js) ---- */
  const TEE = "T-Shirts", HOOD = "Hoodies", TOTE = "Tote Bags", MUG = "Mugs", FRAME = "Photo Frames";
  const ALL = [TEE, HOOD, TOTE, MUG, FRAME];
  const WEAR = [TEE, HOOD, TOTE];
  const WEAR_MUG = [TEE, HOOD, TOTE, MUG];
  const LIGHT = [MUG, TOTE, FRAME];   // light surfaces: dark artwork (black Kaaba, black calligraphy) stays visible

  /* HOW TO ADD A TEMPLATE (full steps are in README.md):
     id        unique, lower-case, words joined with dashes
     name      shown on the card
     cat       one of CATS below (add a new name to CATS to create a new category)
     desc      one short sentence for the gallery card and search
     tags      extra search words
     products  product categories it can be printed on (use the groups above)
     featured  true to show it in "Featured designs" (hand-picked, not sales data)
     popular   true to show it in "Popular designs" (hand-picked, not sales data)
     added     "YYYY-MM-DD", drives "Latest designs"
     layers    the artwork (see T, S and C above) */
  const TEMPLATES = [
    /* ---- Typography ---- */
    { id: "but-first-coffee", name: "But First, Coffee", cat: "Typography", desc: "A cosy coffee quote with a steaming cup.", tags: "mug cafe morning drink quote", products: WEAR_MUG, featured: true, popular: true, added: "2026-10-21", layers: [
      T("BUT FIRST,", 50, 13, 8, F.mont, "@brown", { bold: true, sp: 480 }),
      T("Coffee", 50, 32, 25, F.pacifico, "@ink"),
      S(DIV, 50, 47, 56, 100, 20),
      S(CUP, 50, 74, 42)
    ] },
    { id: "rise-and-grind", name: "Rise and Grind", cat: "Typography", desc: "Bold morning motivation under a bright sun.", tags: "morning sun work hustle quote", products: ALL, added: "2026-10-21", layers: [
      C("sun", 50, 20, 34),
      T("RISE", 50, 49, 24, F.anton, "@ink", { sp: 120 }),
      T("& GRIND", 50, 71, 22, F.anton, "#C8643B", { sp: 80 }),
      S(WAVE, 50, 88, 56, 100, 16)
    ] },
    { id: "good-vibes-only", name: "Good Vibes Only", cat: "Typography", desc: "A happy rainbow with a friendly script quote.", tags: "positive happy rainbow quote", products: ALL, popular: true, added: "2026-10-21", layers: [
      C("rainbow", 50, 30, 62),
      T("Good Vibes", 50, 62, 18, F.pacifico, "@ink"),
      T("ONLY", 50, 80, 10, F.mont, "#7B5CFA", { bold: true, sp: 760 })
    ] },
    { id: "dream-big", name: "Dream Big", cat: "Typography", desc: "A rocket and a reminder to work hard and stay kind.", tags: "motivation rocket work hard goals quote", products: ALL, featured: true, added: "2026-10-21", layers: [
      C("rocket", 50, 29, 40, null, { angle: 22 }),
      T("DREAM BIG", 50, 62, 17, F.anton, "@ink", { sp: 60 }),
      T("WORK HARD, STAY KIND", 50, 76, 4.6, F.mont, "@brown", { bold: true, sp: 200 }),
      C("sparkles", 80, 22, 11),
      C("sparkles", 18, 50, 9)
    ] },
    { id: "make-it-happen", name: "Make It Happen", cat: "Typography", desc: "Strong condensed lettering with a hand-written accent.", tags: "motivation goals hustle quote text", products: ALL, added: "2026-11-02", layers: [
      T("MAKE IT", 50, 30, 26, F.anton, "@ink", { sp: 80 }),
      T("Happen", 50, 56, 28, F.pacifico, "#C8643B"),
      S(WAVE, 50, 76, 56, 100, 16),
      T("ONE STEP AT A TIME", 50, 88, 5, F.mont, "@soft", { bold: true, sp: 360 })
    ] },

    /* ---- Islamic & Ramadan ---- */
    { id: "ramadan-kareem", name: "Ramadan Kareem", cat: "Islamic & Ramadan", desc: "A glowing lantern, crescent and stars for the holy month.", tags: "ramzan islamic lantern fanoos moon", products: ALL, featured: true, popular: true, added: "2026-10-21", layers: [
      S(LANTERN, 50, 30, 34),
      C("moon", 18, 16, 15),
      C("star", 82, 20, 8, "#F5B301"),
      T("Ramadan", 50, 64, 20, F.lobster, "@green"),
      T("KAREEM", 50, 80, 10, F.mont, "@ink", { bold: true, sp: 640 })
    ] },
    { id: "ramadan-mubarak", name: "Ramadan Mubarak", cat: "Islamic & Ramadan", desc: "A crescent moon and stars with a warm greeting.", tags: "ramzan islamic moon greeting", products: ALL, added: "2026-11-02", layers: [
      C("moon", 50, 24, 30),
      C("star", 68, 17, 8, "#F5B301"),
      C("star", 30, 14, 6, "#F5B301"),
      T("Ramadan", 50, 54, 19, F.lobster, "@green"),
      T("MUBARAK", 50, 71, 10, F.mont, "@ink", { bold: true, sp: 620 }),
      S(WAVE, 50, 88, 50, 100, 16)
    ] },
    { id: "alhamdulillah", name: "Alhamdulillah", cat: "Islamic & Ramadan", desc: "Gratitude in calligraphy style lettering with a crescent.", tags: "islamic gratitude thankful arabic urdu", products: ALL, added: "2026-11-02", layers: [
      C("moon", 50, 18, 18),
      T("\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647", 50, 46, 20, F.urdu, "@ink"),
      S(DIV, 50, 64, 50, 100, 20),
      T("Alhamdulillah", 50, 77, 11, F.dance, "@green", { bold: true }),
      T("ALWAYS GRATEFUL", 50, 90, 4.6, F.mont, "@soft", { bold: true, sp: 420 })
    ] },
    { id: "mashaallah", name: "MashaAllah", cat: "Islamic & Ramadan", desc: "A clean, elegant MashaAllah with stars.", tags: "islamic arabic urdu blessing gift", products: ALL, added: "2026-11-02", layers: [
      C("star", 24, 22, 9, "#F5B301"),
      C("star", 78, 18, 7, "#F5B301"),
      T("\u0645\u0627 \u0634\u0627\u0621 \u0627\u0644\u0644\u0647", 50, 42, 20, F.urdu, "@ink"),
      T("MashaAllah", 50, 66, 17, F.lobster, "@green"),
      S(WAVE, 50, 82, 50, 100, 16)
    ] },

    /* ---- Eid ---- */
    { id: "eid-mubarak", name: "Eid Mubarak", cat: "Eid", desc: "Moon and sparkles with the greeting in English and Urdu.", tags: "eid islamic moon festival gift", products: ALL, featured: true, popular: true, added: "2026-10-21", layers: [
      C("moon", 50, 20, 28),
      C("star", 67, 16, 8, "#F5B301"),
      T("Eid Mubarak", 50, 45, 17, F.lobster, "@green"),
      T("\u0639\u06CC\u062F \u0645\u0628\u0627\u0631\u06A9", 50, 66, 14, F.urdu, "@ink"),
      C("sparkles", 20, 22, 9),
      C("sparkles", 82, 28, 10),
      S(WAVE, 50, 88, 50, 100, 16)
    ] },
    { id: "eidi-time", name: "Eidi Time", cat: "Eid", desc: "A playful gift design for the happiest day of Eid.", tags: "eid gift eidi kids family fun", products: WEAR_MUG, added: "2026-11-02", layers: [
      C("gift", 50, 24, 28),
      T("EIDI", 50, 52, 24, F.anton, "@ink", { sp: 160 }),
      T("time!", 50, 72, 22, F.pacifico, "@green"),
      C("sparkles", 80, 22, 11),
      C("sparkles", 20, 40, 9)
    ] },
    { id: "eid-squad", name: "Eid Squad", cat: "Eid", desc: "Matching family or friends design. Easy to edit the year.", tags: "eid family friends group matching", products: WEAR, added: "2026-11-02", layers: [
      C("moon", 50, 18, 20),
      T("EID", 50, 42, 28, F.anton, "@ink", { sp: 200 }),
      T("SQUAD", 50, 62, 22, F.anton, "@green", { sp: 160 }),
      T("2026", 50, 78, 8, F.mont, "@soft", { bold: true, sp: 600 })
    ] },

    /* ---- Birthday ---- */
    { id: "happy-birthday", name: "Happy Birthday", cat: "Birthday", desc: "Balloons and bright lettering for any birthday.", tags: "party balloons celebrate gift", products: ALL, featured: true, popular: true, added: "2026-10-21", layers: [
      C("balloon", 24, 27, 26, null, { angle: -10 }),
      C("balloon", 77, 25, 24, null, { angle: 12 }),
      T("Happy", 50, 53, 17, F.lobster, "#FF4F6D"),
      T("Birthday", 50, 72, 17, F.pacifico, "@ink"),
      C("sparkles", 50, 17, 13)
    ] },
    { id: "birthday-queen", name: "Birthday Queen", cat: "Birthday", desc: "A golden crown for the birthday girl.", tags: "crown girl her party", products: ALL, added: "2026-10-21", layers: [
      C("crown", 50, 21, 34, "#F5B301"),
      T("BIRTHDAY", 50, 48, 16, F.anton, "@ink", { sp: 130 }),
      T("Queen", 50, 70, 28, F.vibes, "#E5384F"),
      C("sparkles", 20, 16, 11),
      C("sparkles", 82, 20, 9),
      C("sparkles", 86, 84, 10)
    ] },
    { id: "birthday-king", name: "Birthday King", cat: "Birthday", desc: "A golden crown for the birthday boy.", tags: "crown boy him party", products: ALL, added: "2026-10-21", layers: [
      C("crown", 50, 21, 34, "#F5B301"),
      T("BIRTHDAY", 50, 48, 16, F.anton, "@ink", { sp: 130 }),
      T("KING", 50, 70, 26, F.anton, "@blue", { sp: 220 }),
      C("star", 20, 18, 9),
      C("star", 80, 20, 7),
      C("star", 86, 84, 8)
    ] },
    { id: "birthday-squad", name: "Birthday Squad", cat: "Birthday", desc: "For the whole party crew, with a spot for the name.", tags: "party group friends name celebrate", products: WEAR_MUG, added: "2026-11-02", layers: [
      C("balloon", 50, 18, 20),
      T("BIRTHDAY", 50, 42, 17, F.anton, "@ink", { sp: 120 }),
      T("SQUAD", 50, 62, 26, F.anton, "#FF4F6D", { sp: 140 }),
      T("YOUR NAME HERE", 50, 80, 5.5, F.mont, "@soft", { bold: true, sp: 400 })
    ] },

    /* ---- Couple & Anniversary ---- */
    { id: "love-you-always", name: "Love You Always", cat: "Couple & Anniversary", desc: "Romantic script lettering with floating hearts.", tags: "valentine couple heart romantic", products: ALL, featured: true, added: "2026-10-21", layers: [
      C("heart", 22, 24, 16, null, { angle: -16 }),
      C("heart", 80, 17, 10, null, { angle: 14 }),
      T("Love", 50, 42, 34, F.vibes, "#E5384F"),
      T("YOU ALWAYS", 50, 62, 7, F.mont, "@ink", { bold: true, sp: 360 }),
      C("two-hearts", 50, 84, 26)
    ] },
    { id: "be-mine", name: "Be Mine", cat: "Couple & Anniversary", desc: "A big heart with a sweet message inside.", tags: "valentine heart romantic gift", products: WEAR_MUG, popular: true, added: "2026-10-21", layers: [
      C("heart", 50, 50, 88),
      T("Be Mine", 50, 45, 18, F.lobster, "#ffffff"),
      T("XOXO", 50, 60, 6.5, F.mont, "#ffffff", { bold: true, sp: 420 }),
      C("sparkles", 86, 14, 18),
      C("sparkles", 14, 86, 14)
    ] },
    { id: "couple-names", name: "Couple Names", cat: "Couple & Anniversary", desc: "Replace the names and year for a wedding or anniversary gift.", tags: "wedding anniversary names together mr mrs", products: ALL, added: "2026-10-21", layers: [
      T("Ali & Sara", 50, 31, 21, F.vibes, "#E5384F"),
      S(DIV, 50, 47, 60, 100, 20),
      T("TOGETHER FOREVER", 50, 60, 5.6, F.mont, "@ink", { bold: true, sp: 220 }),
      T("EST. 2026", 50, 70, 5.5, F.mont, "@soft", { sp: 400 }),
      C("two-hearts", 50, 86, 20)
    ] },
    { id: "happy-anniversary", name: "Happy Anniversary", cat: "Couple & Anniversary", desc: "Elegant lettering with a ring for the big day.", tags: "wedding marriage ring years love", products: ALL, added: "2026-11-02", layers: [
      C("ring", 50, 20, 22),
      T("Happy", 50, 42, 22, F.vibes, "#E5384F"),
      T("ANNIVERSARY", 50, 60, 10, F.mont, "@ink", { bold: true, sp: 300 }),
      S(DIV, 50, 72, 50, 100, 20),
      T("YEAR 1 TOGETHER", 50, 84, 5, F.mont, "@soft", { bold: true, sp: 360 })
    ] },

    /* ---- Funny ---- */
    { id: "stay-weird", name: "Stay Weird", cat: "Funny", desc: "Comic book burst lettering with a lightning bolt.", tags: "fun cool crazy sticker", products: WEAR_MUG, featured: true, added: "2026-10-21", layers: [
      C("burst", 50, 50, 92),
      T("STAY", 50, 39, 24, F.bangers, "#ffffff", { stroke: "#15171b", sw: 1.4, sp: 60 }),
      T("WEIRD", 50, 62, 24, F.bangers, "#ffffff", { stroke: "#15171b", sw: 1.4, sp: 60 }),
      C("bolt", 86, 15, 12, null, { angle: 14 })
    ] },
    { id: "not-morning-person", name: "Not a Morning Person", cat: "Funny", desc: "For anyone who needs a few more hours of sleep.", tags: "sleep tired night lazy", products: ALL, popular: true, added: "2026-10-21", layers: [
      C("moon", 50, 20, 22),
      C("star", 24, 30, 7),
      C("star", 78, 27, 9),
      T("NOT A", 50, 44, 9, F.mont, "@ink", { bold: true, sp: 560 }),
      T("MORNING", 50, 60, 20, F.anton, "@ink", { sp: 90 }),
      T("PERSON", 50, 78, 20, F.anton, "#7B5CFA", { sp: 90 })
    ] },
    { id: "chai-first", name: "Chai First", cat: "Funny", desc: "Chai first, talking later.", tags: "tea chai coffee morning lazy mug", products: WEAR_MUG, added: "2026-11-02", layers: [
      C("coffee", 50, 22, 26),
      T("CHAI", 50, 50, 28, F.anton, "@ink", { sp: 160 }),
      T("first, talk later", 50, 70, 12, F.dance, "#C8643B", { bold: true }),
      C("sparkles", 82, 18, 10)
    ] },
    { id: "pizza-is-life", name: "Pizza Is Life", cat: "Funny", desc: "A slice of fun for pizza lovers.", tags: "pizza food hungry snack", products: WEAR_MUG, added: "2026-11-02", layers: [
      C("pizza", 50, 30, 38),
      T("PIZZA", 50, 62, 22, F.anton, "@ink", { sp: 140 }),
      T("is my love language", 50, 78, 9, F.dance, "#E5384F", { bold: true })
    ] },

    /* ---- Business & Logo ---- */
    { id: "brand-logo", name: "Brand Logo", cat: "Business & Logo", desc: "A bold hexagon mark. Swap the letter, name and tagline.", tags: "business company shop logo team", products: [TEE, HOOD, TOTE, MUG], featured: true, added: "2026-10-21", layers: [
      S(HEX, 50, 33, 40),
      T("B", 50, 33, 26, F.anton, "#ffffff"),
      T("YOUR BRAND", 50, 68, 9, F.mont, "@ink", { bold: true, sp: 160 }),
      T("Your tagline goes here", 50, 80, 5.4, F.mont, "@soft", { sp: 120 })
    ] },
    { id: "team-crest", name: "Team Crest", cat: "Business & Logo", desc: "A round crest for teams, clubs and small businesses.", tags: "team club staff uniform company circle", products: WEAR_MUG, added: "2026-11-02", layers: [
      S(RING, 50, 40, 60),
      T("TM", 50, 40, 26, F.anton, "@ink", { sp: 80 }),
      T("YOUR TEAM NAME", 50, 78, 8, F.mont, "@ink", { bold: true, sp: 260 }),
      T("EST. 2026", 50, 89, 5, F.mont, "@brown", { sp: 420 })
    ] },
    { id: "shop-wordmark", name: "Shop Wordmark", cat: "Business & Logo", desc: "A simple two line name with a divider for shops and brands.", tags: "business shop brand name company text", products: [TEE, HOOD, TOTE, MUG], added: "2026-11-02", layers: [
      T("YOUR", 50, 32, 10, F.mont, "@brown", { bold: true, sp: 700 }),
      T("Business", 50, 52, 24, F.abril, "@ink"),
      S(DIV, 50, 68, 56, 100, 20),
      T("Add your tagline here", 50, 80, 5.6, F.mont, "@soft", { sp: 160 })
    ] },

    /* ---- Minimalist ---- */
    { id: "less-is-more", name: "Less Is More", cat: "Minimalist", desc: "Quiet, centred type with plenty of space.", tags: "simple clean quote text modern", products: ALL, popular: true, added: "2026-11-02", layers: [
      T("less is more", 50, 48, 13, F.play, "@ink"),
      S(WAVE, 50, 60, 30, 100, 16)
    ] },
    { id: "simple-sun", name: "Simple Sun", cat: "Minimalist", desc: "A single sun and a soft line of text.", tags: "sun simple clean nature small", products: ALL, added: "2026-11-02", layers: [
      C("sun", 50, 38, 36),
      T("GOOD DAYS AHEAD", 50, 70, 6, F.mont, "@ink", { bold: true, sp: 440 })
    ] },
    { id: "mountain-calling", name: "Mountain Calling", cat: "Minimalist", desc: "A single mountain with a travel quote.", tags: "mountain travel hiking adventure nature", products: ALL, added: "2026-11-02", layers: [
      C("mountain", 50, 38, 44),
      T("THE MOUNTAINS", 50, 68, 8, F.mont, "@ink", { bold: true, sp: 420 }),
      T("ARE CALLING", 50, 79, 8, F.mont, "@ink", { bold: true, sp: 420 })
    ] },
    { id: "good-things", name: "Good Things", cat: "Minimalist", desc: "A calm line of script for everyday wear.", tags: "simple script quote small chest pocket", products: ALL, added: "2026-11-02", layers: [
      T("good things", 50, 46, 15, F.dance, "@ink", { bold: true }),
      T("TAKE TIME", 50, 62, 5.6, F.mont, "@soft", { bold: true, sp: 560 })
    ] },

    /* ---- Kids ---- */
    { id: "little-rocket", name: "Little Rocket", cat: "Kids", desc: "A rocket for little explorers. Add a name underneath.", tags: "kids boy girl space child name", products: WEAR_MUG, popular: true, added: "2026-11-02", layers: [
      C("rocket", 50, 28, 40, null, { angle: 18 }),
      C("star", 20, 18, 9),
      C("star", 82, 40, 8),
      T("LITTLE", 50, 60, 12, F.mont, "@ink", { bold: true, sp: 420 }),
      T("Explorer", 50, 76, 20, F.pacifico, "#7B5CFA")
    ] },
    { id: "super-kid", name: "Super Kid", cat: "Kids", desc: "Comic style lettering with a lightning bolt.", tags: "kids hero superhero boy girl child", products: WEAR_MUG, added: "2026-11-02", layers: [
      C("burst", 50, 46, 70),
      T("SUPER", 50, 40, 20, F.bangers, "#ffffff", { stroke: "#15171b", sw: 1.2, sp: 60 }),
      T("KID", 50, 58, 22, F.bangers, "#ffffff", { stroke: "#15171b", sw: 1.2, sp: 60 }),
      C("bolt", 84, 16, 13, null, { angle: 14 })
    ] },
    { id: "sweet-cutie", name: "Sweet Cutie", cat: "Kids", desc: "A cheerful ice cream treat for sweet little ones.", tags: "kids girl cute ice cream child", products: WEAR_MUG, added: "2026-11-02", layers: [
      C("icecream", 50, 30, 36),
      T("Sweet", 50, 62, 20, F.pacifico, "#FF4F6D"),
      T("CUTIE", 50, 80, 14, F.anton, "@ink", { sp: 200 })
    ] },

    /* ---- Personalized ---- */
    { id: "monogram", name: "Monogram", cat: "Personalized", desc: "Replace the letter and name with your own.", tags: "initial letter name personalised gift", products: ALL, featured: true, added: "2026-10-21", layers: [
      S(RING, 50, 38, 56),
      T("A", 50, 38, 44, F.play, "@ink", { bold: true }),
      T("YOUR NAME", 50, 76, 8, F.mont, "@ink", { bold: true, sp: 360 }),
      T("EST. 2026", 50, 88, 5.5, F.mont, "@brown", { sp: 420 })
    ] },
    { id: "best-dad", name: "Best Dad Ever", cat: "Personalized", desc: "A gift for Dad that you can change to any name or title.", tags: "father fathers day papa family gift", products: WEAR_MUG, added: "2026-10-21", layers: [
      T("WORLD'S", 50, 17, 8, F.mont, "@blue", { bold: true, sp: 560 }),
      T("BEST DAD", 50, 40, 20, F.anton, "@ink", { sp: 60 }),
      T("Ever", 50, 65, 24, F.pacifico, "#E5384F"),
      C("badge", 50, 87, 20)
    ] },
    { id: "best-mom", name: "World's Best Mom", cat: "Personalized", desc: "Flowers and script lettering for Mom.", tags: "mother mothers day mama mum family gift", products: ALL, added: "2026-10-21", layers: [
      T("World's Best", 50, 22, 16, F.dance, "#E5384F", { bold: true }),
      T("MOM", 50, 45, 30, F.abril, "@ink", { sp: 100 }),
      T("EVER", 50, 64, 8, F.mont, "@ink", { bold: true, sp: 620 }),
      C("flower", 22, 84, 20),
      C("heart", 50, 86, 13),
      C("flower", 78, 84, 20)
    ] },
    { id: "cat-mom", name: "Cat Mom", cat: "Personalized", desc: "For cat lovers, with a paw print.", tags: "pet cat lover kitty paw gift", products: WEAR_MUG, added: "2026-10-21", layers: [
      C("cat", 50, 33, 42),
      T("CAT MOM", 50, 64, 19, F.anton, "@ink", { sp: 80 }),
      T("purrfectly loved", 50, 79, 10, F.dance, "#C8643B", { bold: true }),
      C("paw", 50, 91, 8, "#C8643B")
    ] },
    { id: "family-name", name: "Family Name", cat: "Personalized", desc: "Put your family name and the year you started.", tags: "family name home wall gift established", products: [TOTE, MUG, FRAME, TEE], added: "2026-11-02", layers: [
      C("heart", 50, 18, 14),
      T("The Ahmed", 50, 40, 22, F.abril, "@ink"),
      T("FAMILY", 50, 58, 12, F.mont, "@brown", { bold: true, sp: 560 }),
      S(DIV, 50, 71, 56, 100, 20),
      T("EST. 2026", 50, 83, 6, F.mont, "@soft", { sp: 420 })
    ] },

    /* ---- Islamic & Ramadan: Hajj and Umrah (picture artwork + editable text) ---- */
    { id: "umrah-mubarak-watercolor", name: "Umrah Mubarak Watercolor", cat: "Islamic & Ramadan", desc: "Kaaba, mosque and lanterns in golden watercolor with Umrah Mubarak calligraphy.", tags: "umrah mubarak kaaba makkah mecca mosque lantern watercolor greeting islamic gift pilgrimage arabic calligraphy", products: LIGHT, added: "2026-11-05", layers: [
      R("assets/templates/umrah-mubarak-watercolor.webp", 50, 50, 100, 0.692, { thumb: "assets/templates/umrah-mubarak-watercolor-thumb.webp" })
    ] },
    { id: "hajj-mubarak-kaaba-name", name: "Hajj Mubarak with Name", cat: "Islamic & Ramadan", desc: "Kaaba and Hajj Mubarak calligraphy with your own name. Tap BABA to change it.", tags: "hajj mubarak kaaba makkah mecca name baba mama dada gift pilgrimage arabic calligraphy islamic lantern may allah accept", products: LIGHT, added: "2026-11-05", layers: [
      R("assets/templates/hajj-mubarak-kaaba.webp", 50, 50, 100, 0.722, { thumb: "assets/templates/hajj-mubarak-kaaba-thumb.webp" }),
      T("BABA", 50.46, 65.26, 12.5, F.mont, "@ink", { bold: true, sp: 30 })
    ] },

    /* ---- Birthday: photo mug wrap (every part is editable) ---- */
    { id: "pastel-birthday-photo-mug", name: "Pastel Birthday Photo Mug", cat: "Birthday", desc: "Handwritten birthday wishes with a spot for your own photo and a short message.", tags: "birthday mug photo friend wish message pink hearts crown handwritten gift picture", products: ALL, added: "2026-11-11", layers: [
      S(PHOTO_SPOT, 72.1, 46.5, 39.4, 100, 123),
      S(TAPE, 80.3, 22.4, 11.4, 100, 24, { angle: 8 }),
      S(LINE_HEART, 80.7, 22.3, 3.4, 100, 100),
      S(PINK_HEART, 87.9, 30.3, 4.4, 100, 100, { angle: 8 }),
      S(PINK_HEART, 90.4, 34.8, 3.2, 100, 100, { angle: 10 }),
      T("To my amazing friend", 71.9, 74.4, 4, F.caveat, "@ink", { bold: true }),
      S(HEART_RULE, 72.5, 78.8, 31, 100, 20),
      S(PINK_CROWN, 25.1, 21.6, 8, 100, 100),
      S(PINK_HEART, 10.3, 29.2, 3.4, 100, 100, { angle: -12 }),
      S(PINK_HEART, 44.8, 27.2, 3.8, 100, 100, { angle: 12 }),
      T("Happy", 27.3, 28.2, 9.5, F.marker, "@ink"),
      T("Birthday", 29.6, 37.6, 8.6, F.marker, "@ink"),
      S(UNDERLINE, 28.6, 42, 14.5, 100, 20),
      T("May your life be\nfilled with happiness,\nsuccess, love and\nall the beautiful\nthings you deserve!", 28.4, 54.7, 3.8, F.caveat, "@ink", { bold: true, lh: 0.92 }),
      S(HEART_RULE, 28.7, 66, 23, 100, 20),
      S(BRUSH, 29.6, 74.3, 35.2, 100, 33),
      T("Stay Happy\nAlways", 28.2, 74.6, 4.6, F.caveat, "#15171b", { bold: true, lh: 0.94 }),
      S(LINE_HEART, 39.9, 77.3, 4.6, 100, 100, { op: 1 })
    ] }
  ];

  const CATS = ["All", "Typography", "Islamic & Ramadan", "Eid", "Birthday", "Couple & Anniversary", "Funny", "Business & Logo", "Minimalist", "Kids", "Personalized"];

  /* ---- Colour helpers: "@ink" follows the product colour ---- */
  // [colour on light products, colour on dark products]
  const TONES = {
    "@ink": ["#15171b", "#ffffff"], "@soft": ["#4a4f58", "#d9dce1"],
    "@blue": ["#2438E0", "#7C93FF"], "@brown": ["#8A5A3B", "#E0B08A"], "@green": ["#1F8A5B", "#3FD08F"]
  };
  function toneColour(c, dark){
    return TONES[c] ? TONES[c][dark ? 1 : 0] : c;
  }
  function toneSvg(str, dark){
    return String(str).replace(/@[a-z]+/g, (m) => toneColour(m, dark));
  }
  function artwork(l, dark){
    if (l.clip){
      return window.GfxClipart ? window.GfxClipart.inner(l.clip, l.color || "#15171b") : "";
    }
    return toneSvg(l.svg, dark);
  }
  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  let usedTemplate = null;      // { id, name } of the last template put on the product (saved with the cart item)
  const TEXT_BASELINE = 0.33;   // baseline sits about a third of the font size below the centre of the line

  /* ---- Preview thumbnail (inline SVG built from the same layers) ---- */
  function layerPreview(l, dark){
    if (l.k === "t"){
      const fill = toneColour(l.fill, dark);
      const rot = l.angle ? ` transform="rotate(${l.angle} ${l.x} ${l.y})"` : "";
      const st = l.stroke ? ` stroke="${esc(toneColour(l.stroke, dark))}" stroke-width="${l.sw || 1}" paint-order="stroke" stroke-linejoin="round"` : "";
      // A text with line breaks ("\n") is one editable block in the studio, so draw each line here too
      const lines = String(l.text).split("\n"), dy = l.size * (l.lh || 1.16) * 1.13;
      const body = lines.length < 2 ? esc(l.text) :
        lines.map((ln, i) => `<tspan x="${l.x}" y="${(l.y + (i - (lines.length - 1) / 2) * dy + l.size * TEXT_BASELINE).toFixed(2)}">${esc(ln)}</tspan>`).join("");
      return `<text x="${l.x}" y="${(l.y + l.size * TEXT_BASELINE).toFixed(2)}" text-anchor="middle" font-family="${esc(l.font)}" font-size="${l.size}" font-weight="${l.bold ? 700 : 400}" fill="${esc(fill)}"${l.sp ? ` letter-spacing="${(l.sp / 1000 * l.size).toFixed(2)}"` : ""}${st}${rot}>${body}</text>`;
    }
    if (l.k === "r"){
      const rw = l.w, rh = l.w * l.ar;
      return `<image href="${esc(l.thumb || l.src)}" x="${(l.x - rw / 2).toFixed(2)}" y="${(l.y - rh / 2).toFixed(2)}" width="${rw}" height="${rh.toFixed(2)}" preserveAspectRatio="xMidYMid meet"${l.op ? ` opacity="${l.op}"` : ""}/>`;
    }
    const w = l.w, h = l.w * l.vbH / l.vbW;
    const rot = l.angle ? ` transform="rotate(${l.angle} ${l.x} ${l.y})"` : "";
    return `<svg x="${(l.x - w / 2).toFixed(2)}" y="${(l.y - h / 2).toFixed(2)}" width="${w}" height="${h.toFixed(2)}" viewBox="0 0 ${l.vbW} ${l.vbH}" overflow="visible"${l.op ? ` opacity="${l.op}"` : ""}><g${rot ? ` transform="rotate(${l.angle} ${l.vbW / 2} ${l.vbH / 2})"` : ""}>${artwork(l, dark)}</g></svg>`;
  }
  function previewSVG(tpl, dark){
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${tpl.layers.map(l => layerPreview(l, dark)).join("")}</svg>`;
  }

  function byId(id){ return TEMPLATES.find(t => t.id === id) || null; }
  // true when the design can be printed on this product category (e.g. "Mugs")
  function compatible(tpl, productCategory){ return !!tpl && tpl.products.indexOf(productCategory) !== -1; }

  window.GfxTemplates = { TEMPLATES: TEMPLATES, CATS: CATS, PRODUCT_GROUPS: ALL, previewSVG: previewSVG, artwork: artwork, toneColour: toneColour, TEXT_BASELINE: TEXT_BASELINE,
    byId: byId, compatible: compatible, used: function(){ return usedTemplate; } };

  /* =========================================================
     Everything below needs the Design Studio page
     ========================================================= */
  const $ = (id) => document.getElementById(id);
  if (!$ || !$("panel-templates")) return;
  const state = { cat: "All", q: "", dark: null };

  function surfaceIsDark(){
    try {
      return !!(currentProduct && currentProduct.colorImages && typeof isDarkSurface === "function" && isDarkSurface(currentProduct, selectedColor));
    } catch (e){ return false; }
  }

  function render(force){
    const grid = $("tpl-grid"), empty = $("tpl-empty");
    if (!grid) return;
    const dark = surfaceIsDark();
    const pcat = currentProduct ? currentProduct.category : "";
    if (!force && state.dark === dark && grid.dataset.cat === state.cat && grid.dataset.q === state.q && grid.dataset.p === pcat) return;
    state.dark = dark;
    grid.dataset.cat = state.cat; grid.dataset.q = state.q; grid.dataset.p = pcat;
    grid.classList.toggle("is-dark", dark);
    const q = state.q.trim().toLowerCase();
    // Only designs that suit the selected product are shown (a design is never forced onto a product it was not made for)
    const list = TEMPLATES.filter(t => (!pcat || compatible(t, pcat)) && (state.cat === "All" || t.cat === state.cat) &&
      (!q || (t.name + " " + t.tags + " " + t.cat + " " + t.desc).toLowerCase().includes(q)));
    empty.hidden = list.length > 0;
    grid.innerHTML = list.map(t =>
      `<button type="button" class="tpl-item" data-id="${t.id}" title="${esc(t.name)}" aria-label="Use the ${esc(t.name)} template">` +
      `<span class="tpl-thumb">${previewSVG(t, dark)}</span><span class="tpl-name">${esc(t.name)}</span></button>`).join("");
  }

  /* ---- Put a template on the product ---- */
  function loadFonts(layers){
    if (!(document.fonts && document.fonts.load)) return Promise.resolve();
    const jobs = [];
    layers.forEach(l => {
      if (l.k !== "t") return;
      const fam = String(l.font).split(",")[0].trim().replace(/['"]/g, "");
      jobs.push(document.fonts.load(`${l.bold ? "bold" : "normal"} 40px "${fam}"`, l.text).catch(() => {}));
    });
    // Never wait long: a slow font should not stop the template from appearing.
    return Promise.race([Promise.all(jobs), new Promise(res => setTimeout(res, 2500))]);
  }

  function loadSvgImage(markup){
    return new Promise((resolve) => {
      fabric.Image.fromURL("data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup), (img) => resolve(img));
    });
  }

  // Loads a picture file for a template. First with CORS (keeps the print export clean); if the browser
  // refuses (for example the site is opened straight from a folder, not a web server) it loads again plainly
  // so the artwork still appears.
  function loadPicture(src){
    const tryLoad = (opts) => new Promise((resolve) => {
      fabric.Image.fromURL(src, (img) => resolve(img && img.width ? img : null), opts);
    });
    return tryLoad({ crossOrigin: "anonymous" }).then((img) => img || tryLoad({}));
  }
  let failedPictures = 0;

  let placing = false;
  function applyTemplate(tpl, mode){
    if (placing) return;
    if (!designCanvas || typeof fabric === "undefined"){ showToast("Design Studio isn't ready yet"); return; }
    placing = true;
    failedPictures = 0;
    const dark = surfaceIsDark();
    const rect = (typeof sidePrintRect === "function") ? sidePrintRect(activeSideId) : { x: 0, y: 0, w: designCanvas.getWidth(), h: designCanvas.getHeight() };
    const k = Math.min(rect.w, rect.h) / 100 * 0.94;          // canvas pixels per template unit
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    // How many times bigger the 300 DPI print file is than the studio canvas (same sum the print export uses)
    const cat = currentProduct && currentProduct.category;
    const inches = (typeof IMG_PRINT_WIDTH_IN !== "undefined" && IMG_PRINT_WIDTH_IN[cat]) || 10;
    const printMult = (inches * (typeof PRINT_DPI !== "undefined" ? PRINT_DPI : 300)) / Math.max(1, designCanvas.getWidth());

    loadFonts(tpl.layers).then(() => Promise.all(tpl.layers.map(l => {
      if (l.k === "t"){
        const t = new fabric.IText(l.text, {
          left: cx + (l.x - 50) * k, top: cy + (l.y - 50) * k, originX: "center", originY: "center",
          fontFamily: l.font, fontSize: l.size * k, fill: toneColour(l.fill, dark),
          fontWeight: l.bold ? "bold" : "normal", fontStyle: "normal", textAlign: "center",
          charSpacing: l.sp || 0, angle: l.angle || 0, opacity: l.op || 1
        });
        if (l.lh){ t.set({ lineHeight: l.lh }); }
        if (l.stroke){ t.set({ stroke: toneColour(l.stroke, dark), strokeWidth: (l.sw || 1) * k, paintFirst: "stroke", strokeLineJoin: "round" }); }
        return Promise.resolve(t);
      }
      if (l.k === "r"){
        // Picture artwork (transparent WebP): placed as a normal image the customer can move, resize or delete.
        return loadPicture(l.src).then((img) => {
          if (!img){ failedPictures++; return null; }
          const s = (l.w * k) / img.width;
          img.set({ left: cx + (l.x - 50) * k, top: cy + (l.y - 50) * k, originX: "center", originY: "center",
            scaleX: s, scaleY: s, angle: l.angle || 0, opacity: l.op || 1 });
          return img;
        });
      }
      const w = l.vbW, h = l.vbH;
      // Draw the artwork at the size the 300 DPI print file needs (plus a little spare), not bigger:
      // a huge picture squeezed onto a small screen canvas looks rough, a right-sized one stays crisp.
      const px = Math.min(2400, Math.max(400, Math.round(l.w * k * printMult * 1.15)));
      const pw = px, ph = Math.round(px * h / w);
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${w} ${h}">${artwork(l, dark)}</svg>`;
      return loadSvgImage(markup).then((img) => {
        if (!img) return null;
        const s = (l.w * k) / (img.width || pw);
        img.set({ left: cx + (l.x - 50) * k, top: cy + (l.y - 50) * k, originX: "center", originY: "center",
          scaleX: s, scaleY: s, angle: l.angle || 0, opacity: l.op || 1 });
        img.gfxVector = true;      // vector artwork: redrawn sharp at print size
        return img;
      });
    }))).then((objs) => {
      if (mode === "replace"){
        designCanvas.discardActiveObject();
        designCanvas.clear();
      }
      objs.forEach(o => { if (o) designCanvas.add(o); });
      designCanvas.discardActiveObject();
      objs.forEach(o => { if (o && o.initDimensions && o.type === "i-text"){ o.initDimensions(); o.setCoords(); } });
      designCanvas.requestRenderAll();
      if (typeof refreshLayersList === "function") refreshLayersList();
      commitDesignHistory();
      placing = false;
      usedTemplate = { id: tpl.id, name: tpl.name };
      showToast(failedPictures ? `${tpl.name}: the picture could not be loaded. Please refresh and try again` : `${tpl.name} added. Tap any text to change it`);
      // Phones and tablets: close the tool sheet so the design is visible.
      if (window.matchMedia("(max-width: 900px)").matches){
        const rail = $("rail-templates");
        if (rail && rail.classList.contains("active")) rail.click();
      }
    }).catch((err) => {
      placing = false;
      console.error("Template failed", err);
      showToast("Sorry, that template could not be added. Please try again");
    });
  }

  function askMode(tpl){
    const old = $("tpl-dlg"); if (old) old.remove();
    const d = document.createElement("div");
    d.id = "tpl-dlg"; d.className = "copy-dlg";
    d.innerHTML = '<div class="copy-card" role="dialog" aria-modal="true" aria-label="Use template">' +
      '<h3>Your design already has layers</h3><p>Do you want ' + esc(tpl.name) + ' to replace them, or go on top?</p>' +
      '<button type="button" class="btn btn-primary" data-m="replace">Replace my design</button>' +
      '<button type="button" class="btn btn-outline" data-m="add">Add on top of it</button>' +
      '<button type="button" class="copy-cancel" data-m="">Cancel</button></div>';
    document.body.appendChild(d);
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-m]")){
        const b = e.target.closest("[data-m]"), m = b ? b.dataset.m : "";
        d.remove(); if (m) applyTemplate(tpl, m);
      }
    });
    const first = d.querySelector("button"); if (first) first.focus();
  }

  /* ---- Arriving from the Design Gallery: customize.html?id=<product>&template=<design> ---- */
  function openFromLink(){
    let id = null;
    try { id = new URLSearchParams(window.location.search).get("template"); } catch (e){ return; }
    if (!id) return;
    const tpl = byId(id);
    let tries = 0;
    const tick = () => {
      const ready = typeof designCanvas !== "undefined" && designCanvas && typeof fabric !== "undefined" && currentProduct && (window.gfxDraftSettled || tries > 80);
      if (!ready){
        if (++tries < 160) setTimeout(tick, 100);
        return;
      }
      // Remove ?template= so a refresh does not add the design a second time
      try {
        const u = new URL(window.location.href); u.searchParams.delete("template");
        window.history.replaceState(null, "", u.pathname.split("/").pop() + u.search);
      } catch (e){ /* harmless */ }
      if (!tpl){ showToast("That design is no longer available"); return; }
      if (!compatible(tpl, currentProduct.category)){ showToast(`${tpl.name} is not available for ${currentProduct.name}`); return; }
      if (designCanvas.getObjects().length) askMode(tpl);   // a restored draft is never overwritten without asking
      else applyTemplate(tpl, "add");
    };
    tick();
  }

  function init(){
    const grid = $("tpl-grid");
    if (!grid) return;
    $("tpl-cats").innerHTML = CATS.map(c => `<button type="button" class="clip-chip${c === state.cat ? " active" : ""}" data-cat="${c}">${c}</button>`).join("");
    $("tpl-cats").addEventListener("click", (e) => {
      const b = e.target.closest(".clip-chip"); if (!b) return;
      state.cat = b.dataset.cat;
      document.querySelectorAll("#tpl-cats .clip-chip").forEach(x => x.classList.toggle("active", x === b));
      render();
    });
    $("tpl-search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    grid.addEventListener("click", (e) => {
      const b = e.target.closest(".tpl-item"); if (!b) return;
      const tpl = TEMPLATES.find(t => t.id === b.dataset.id);
      if (!tpl) return;
      if (typeof designCanvas !== "undefined" && designCanvas && designCanvas.getObjects().length) askMode(tpl);
      else applyTemplate(tpl, "add");
    });
    // The thumbnails follow the product colour (white text on dark products), so refresh them when it changes.
    const refresh = () => setTimeout(() => render(false), 60);
    document.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest("#pd-colors, #cz-picker, #rail-templates")) refresh();
    });
    render(true);
    // The product is chosen after this script starts (and again whenever the customer switches product),
    // so redraw the list for the new product each time selectProduct() runs.
    if (typeof window.selectProduct === "function" && !window.selectProduct.gfxTpl){
      const orig = window.selectProduct;
      window.selectProduct = function(){
        const out = orig.apply(this, arguments);
        try { render(false); } catch (e){ /* never block product switching */ }
        return out;
      };
      window.selectProduct.gfxTpl = true;
    }
    openFromLink();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
