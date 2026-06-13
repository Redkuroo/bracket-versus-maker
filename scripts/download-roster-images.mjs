import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROSTER_FILE = path.join(ROOT, 'src/data/preset-roster.ts');
const OUT_DIR = path.join(ROOT, 'assets/images/roster');
const IMAGES_TS = path.join(ROOT, 'src/data/roster-images.ts');

const rosterSource = fs.readFileSync(ROSTER_FILE, 'utf8');
const entryRegex = /\{\s*name:\s*'((?:\\'|[^'])*)',\s*imageUri:\s*'([^']+)'/g;

const players = [];
let match;
while ((match = entryRegex.exec(rosterSource)) !== null) {
  players.push({
    name: match[1].replace(/\\'/g, "'"),
    url: match[2],
  });
}

function slugFromUrl(url) {
  const filePart = url.split('/images/')[1]?.split('/revision/')[0] ?? '';
  const basename = filePart.split('/').pop() ?? 'image';
  const decoded = decodeURIComponent(basename).replace(/\.(png|jpg|jpeg|webp)$/i, '');
  return decoded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extFromUrl(url) {
  const filePart = url.split('/images/')[1]?.split('/revision/')[0] ?? '';
  const basename = filePart.split('/').pop() ?? 'image.png';
  const ext = path.extname(decodeURIComponent(basename)).toLowerCase();
  return ext || '.png';
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const urlToKey = new Map();
const entries = [];

for (const player of players) {
  let key = urlToKey.get(player.url);
  if (!key) {
    key = slugFromUrl(player.url);
    let candidate = key;
    let suffix = 2;
    while (entries.some((e) => e.key === candidate)) {
      candidate = `${key}-${suffix}`;
      suffix += 1;
    }
    key = candidate;
    urlToKey.set(player.url, key);
    entries.push({ key, url: player.url, ext: extFromUrl(player.url) });
  }
  player.imageKey = key;
}

async function downloadFile(url, dest) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

for (const entry of entries) {
  const filename = `${entry.key}${entry.ext}`;
  const dest = path.join(OUT_DIR, filename);
  if (fs.existsSync(dest)) {
    console.log('skip', filename);
    continue;
  }
  console.log('download', filename);
  await downloadFile(entry.url, dest);
}

const requireLines = entries
  .map((e) => `  ${JSON.stringify(e.key)}: require('@/assets/images/roster/${e.key}${e.ext}'),`)
  .join('\n');

const imagesTs = `import type { ImageSource } from 'expo-image';

/** Bundled roster portraits keyed by slug. */
export const ROSTER_IMAGES = {
${requireLines}
} as const satisfies Record<string, ImageSource>;

export type RosterImageKey = keyof typeof ROSTER_IMAGES;

export function isRosterImageKey(value: string): value is RosterImageKey {
  return value in ROSTER_IMAGES;
}

export function resolveRosterImageSource(imageUri: string | null): ImageSource | null {
  if (!imageUri) return null;
  if (isRosterImageKey(imageUri)) return ROSTER_IMAGES[imageUri];
  return { uri: imageUri };
}
`;

fs.writeFileSync(IMAGES_TS, imagesTs);

const playerLines = players.map((p) => {
  const escapedName = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `    { name: '${escapedName}', imageUri: '${p.imageKey}' },`;
});

const presetTs = `import type { PresetRoster } from '@/types/roster';

/**
 * Hardcode tournament participants here.
 * - \`players.length\` sets how many bracket slots are created.
 * - \`name\` is shown on cards and in setup.
 * - \`imageUri\` is a roster image key (see roster-images.ts) or null for initials.
 */
export const PRESET_ROSTER: PresetRoster = {
  label: 'Naruto Shippuden Ultimate Ninja Storm 4 Road to Boruto',
  players: [
${playerLines.join('\n')}
  ],
};
`;

fs.writeFileSync(ROSTER_FILE, presetTs);
console.log(`Done: ${entries.length} unique images, ${players.length} players`);
