/**
 * Generates PWA icons as SVG files converted to PNG using canvas
 * Run: node scripts/generate-icons.mjs
 */
import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = join(process.cwd(), "public", "icons");

mkdirSync(OUTPUT_DIR, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const r = size * 0.22; // corner radius

  // Background gradient (orange)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#f97316");
  grad.addColorStop(1, "#c2410c");

  // Rounded rect
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Hard hat shape
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.55;

  // Brim
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.22, s * 0.52, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dome
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.04, s * 0.38, Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();

  // Band
  ctx.fillStyle = "rgba(249,115,22,0.7)";
  ctx.beginPath();
  ctx.rect(cx - s * 0.38, cy + s * 0.07, s * 0.76, s * 0.1);
  ctx.fill();

  // "B" letter for BuildSpark
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `bold ${size * 0.16}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BS", cx, cy + s * 0.42);

  return canvas.toBuffer("image/png");
}

for (const size of SIZES) {
  try {
    const buf = drawIcon(size);
    const outPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    writeFileSync(outPath, buf);
    console.log(`✅ ${size}x${size}`);
  } catch (e) {
    // canvas not available - create SVG placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#c2410c"/></linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${size*0.22}" fill="url(#g)"/>
  <text x="50%" y="54%" font-family="Arial" font-weight="900" font-size="${size*0.36}" fill="white" text-anchor="middle" dominant-baseline="middle">BS</text>
</svg>`;
    writeFileSync(join(OUTPUT_DIR, `icon-${size}x${size}.svg`), svg);
    // Also write a minimal valid PNG (1px transparent) as placeholder
    // Real icons will be generated when canvas is available
    console.log(`📐 ${size}x${size} (SVG placeholder - install 'canvas' for PNG)`);
  }
}

console.log("\n✨ Icons generated in public/icons/");
