// Generate the source icon + splash images that @capacitor/assets consumes
// to produce all the iOS app-icon and launch-screen sizes.
// Run: node scripts/generate-app-assets.mjs && npx @capacitor/assets generate --ios
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const logo = readFileSync(join(root, 'public', 'tender-logo.svg'));

const NAVY = '#1B3B5B';
const assetsDir = join(root, 'assets');
mkdirSync(assetsDir, { recursive: true });

// App icon: 1024x1024, logo on navy with padding. @capacitor/assets will
// derive every required iOS size from this.
async function makeIcon() {
  const size = 1024;
  const pad = 180;
  const inner = size - pad * 2;
  const logoPng = await sharp(logo).resize(inner, inner, { fit: 'contain' }).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: logoPng, top: pad, left: pad }])
    .png()
    .toFile(join(assetsDir, 'icon.png'));
  console.log('wrote assets/icon.png (1024x1024)');
}

// Splash: 2732x2732 (covers all device sizes), logo centred on navy.
async function makeSplash(name) {
  const size = 2732;
  const logoW = 720;
  const logoPng = await sharp(logo).resize(logoW, logoW, { fit: 'contain' }).png().toBuffer();
  const offset = Math.round((size - logoW) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: logoPng, top: offset, left: offset }])
    .png()
    .toFile(join(assetsDir, name));
  console.log(`wrote assets/${name} (2732x2732)`);
}

await makeIcon();
await makeSplash('splash.png');
await makeSplash('splash-dark.png');
