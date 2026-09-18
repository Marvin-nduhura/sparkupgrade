/**
 * Run this script once to generate PWA icons from an SVG source.
 * Usage: node scripts/generate-icons.js
 * Requires: sharp (npm install sharp)
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, "../public/icons");

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Create an SVG icon for BuildSpark
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316"/>
      <stop offset="100%" style="stop-color:#c2410c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#g)"/>
  <text x="256" y="340" font-family="Arial,sans-serif" font-size="280" font-weight="900"
    text-anchor="middle" fill="white">⚡</text>
  <text x="256" y="460" font-family="Arial,sans-serif" font-size="72" font-weight="700"
    text-anchor="middle" fill="rgba(255,255,255,0.9)">SPARK</text>
</svg>`;

const svgPath = path.join(iconsDir, "source.svg");
fs.writeFileSync(svgPath, svgContent);

async function generateIcons() {
  for (const size of sizes) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }

  // Also generate favicon
  await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, "../public/favicon.ico"));
  console.log("✅ Generated favicon.ico");

  console.log("\n🎉 All PWA icons generated successfully!");
}

generateIcons().catch(console.error);
