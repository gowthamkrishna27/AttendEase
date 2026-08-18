import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputImage = path.join(__dirname, 'public', 'app_icon.jpeg');

if (!fs.existsSync(inputImage)) {
  console.error('Source icon not found at:', inputImage);
  process.exit(1);
}

const androidResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const densities = [
  { name: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { name: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { name: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { name: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { name: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
];

async function createCircularMask(size) {
  const radius = size / 2;
  const svg = `<svg width="${size}" height="${size}">
    <circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff" />
  </svg>`;
  return Buffer.from(svg);
}

async function generateIcons() {
  console.log('Generating Android & Web Icons from:', inputImage);

  for (const d of densities) {
    const targetDir = path.join(androidResDir, d.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Standard ic_launcher.png (square / rounded rect)
    await sharp(inputImage)
      .resize(d.iconSize, d.iconSize, { fit: 'cover' })
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. Circular ic_launcher_round.png
    const circleMask = await createCircularMask(d.iconSize);
    await sharp(inputImage)
      .resize(d.iconSize, d.iconSize, { fit: 'cover' })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. Adaptive ic_launcher_foreground.png (inner icon in safe zone ~72% size)
    const innerSize = Math.round(d.fgSize * 0.72);
    const innerIcon = await sharp(inputImage)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: d.fgSize,
        height: d.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: innerIcon, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated ${d.name} icons (${d.iconSize}x${d.iconSize})`);
  }

  // Generate web assets
  const publicDir = path.join(__dirname, 'public');
  await sharp(inputImage).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.png'));
  await sharp(inputImage).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(inputImage).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(inputImage).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));

  const assetsDir = path.join(__dirname, 'src', 'assets');
  if (fs.existsSync(assetsDir)) {
    await sharp(inputImage).resize(512, 512).png().toFile(path.join(assetsDir, 'app_icon.png'));
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
