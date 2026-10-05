#!/bin/sh
# Rebuilds the minified files the HTML pages load (css/style.min.css and js/*.min.js).
# Edit the normal files (css/style.css, js/*.js), then run:  sh tools/build.sh
# Needs Node.js. Commit the .min files together with your changes.
set -e
cd "$(dirname "$0")/.."
ESB="npx --yes esbuild@0.28.2"
$ESB css/style.css --minify --outfile=css/style.min.css --log-level=warning
for f in products main cart product customize customize-ui shortcuts clipart bgremove reviews waterfall; do
  $ESB js/$f.js --minify --target=es2018 --outfile=js/$f.min.js --log-level=warning
done
echo "Minified files rebuilt."
