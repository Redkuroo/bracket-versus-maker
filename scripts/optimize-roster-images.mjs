import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROSTER_DIR = path.join(ROOT, 'assets/images/roster');
const MAX_DIMENSION = 128;

const files = fs.readdirSync(ROSTER_DIR).filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name));

for (const filename of files) {
  const filePath = path.join(ROSTER_DIR, filename);
  const before = fs.statSync(filePath).size;
  const inputBuffer = fs.readFileSync(filePath);
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const needsResize =
    (metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION;

  if (!needsResize && before < 80 * 1024) {
    console.log('skip', filename);
    continue;
  }

  const ext = path.extname(filename).toLowerCase();
  const pipeline = image.resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const buffer =
    ext === '.jpg' || ext === '.jpeg'
      ? await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
      : await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();

  fs.writeFileSync(filePath, buffer);
  const after = fs.statSync(filePath).size;
  console.log(
    filename,
    `${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB`,
  );
}
