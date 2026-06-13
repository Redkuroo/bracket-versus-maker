import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'assets/images/Gemini_Generated_Image_5tm17j5tm17j5tm1.png');
const OUT_DIR = path.join(ROOT, 'assets/images');

/** Dark navy from the logo artwork. */
const BACKGROUND = { r: 11, g: 21, b: 32, alpha: 1 };

async function writeSolidBackground(filePath, size) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(filePath);
}

async function main() {
  const source = sharp(SOURCE);

  await source
    .clone()
    .resize(1024, 1024, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon.png'));

  await source
    .clone()
    .resize(1024, 1024, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'android-icon-foreground.png'));

  await writeSolidBackground(path.join(OUT_DIR, 'android-icon-background.png'), 1024);

  await source
    .clone()
    .resize(1024, 1024, { fit: 'cover' })
    .grayscale()
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'android-icon-monochrome.png'));

  await source
    .clone()
    .resize(48, 48, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'favicon.png'));

  await source
    .clone()
    .resize(128, 128, { fit: 'contain', background: BACKGROUND })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'splash-icon.png'));

  console.log('Generated app icons from Gemini artwork.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
