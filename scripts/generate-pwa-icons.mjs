// Generate PWA icons (and the iOS apple-touch-icon) from public/tender-logo.svg.
// Run once whenever the logo changes:  node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = readFileSync(join(root, 'public', 'tender-logo.svg'));

// Pad the logo on a navy square so home-screen icons aren't a tiny mark in
// the centre. Tender navy = #1B3B5B (matches --tender-navy in globals.css).
const BG = '#1B3B5B';

async function render(size, padding, outName) {
  const inner = size - padding * 2;
  const logo = await sharp(src).resize(inner, inner, { fit: 'contain' }).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, top: padding, left: padding }])
    .png()
    .toFile(join(root, 'public', outName));
  console.log(`wrote public/${outName} (${size}x${size})`);
}

await Promise.all([
  // Android / general PWA — generous padding so it looks like a proper app icon
  render(192, 28, 'icon-192.png'),
  render(512, 76, 'icon-512.png'),
  // iOS home-screen icon
  render(180, 26, 'apple-touch-icon.png'),
  // Maskable icon: extra safe-zone padding so the OS can crop into a circle
  // (Android adaptive icons) without clipping the logo.
  render(512, 128, 'icon-maskable-512.png'),
]);
