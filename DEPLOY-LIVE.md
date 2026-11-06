# GfxPrints - Website live karne ka checklist (GitHub Pages + gfxprints.com)

## 1. Upload
1. GitHub repo ke root mein is folder ki **saari files** upload karein (index.html, css/, js/, assets/, CNAME, robots.txt, sitemap.xml ...).
2. Repo > Settings > Pages > Source: `main` branch, `/ (root)`.
3. Custom domain: `gfxprints.com` (CNAME file pehle se maujood hai) aur **Enforce HTTPS** on karein.
4. DNS (domain provider): A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` aur `www` ka CNAME `<username>.github.io`.

## 2. Live hone ke baad 10 minute ki check
- [ ] Home page, Shop, Design Gallery, About, Contact khulen (mobile + desktop)
- [ ] Customize page: text add karein, image upload karein, Add to Cart
- [ ] Checkout par test order dein (COD) - Google Sheet mein entry aur WhatsApp message aaye
- [ ] Contact form bhej kar dekhein (Gmail mein message aaye)
- [ ] https://gfxprints.com/sitemap.xml aur /robots.txt khulen
- [ ] Ghalat URL (e.g. /abc) par 404 page aaye
- [ ] Google Search Console mein sitemap submit karein

## 3. Aage code badalna ho to
`css/style.css` ya `js/*.js` edit karne ke baad `sh tools/build.sh` chalayen (Node.js chahiye) taake `.min` files update hon. Phir HTML mein `?v=` number badal dein taake browser cache purani file na dikhaye.
