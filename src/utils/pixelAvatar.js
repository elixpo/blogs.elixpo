/**
 * Deterministic pixel art generators for avatars and banners.
 * Pixels cluster near corners/edges with a solid color center.
 */

// Shared hash function
function hashSeed(seed) {
  let hash = 0;
  const s = seed || 'default';
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Curated palettes: [bg, primary, accent]
const PALETTES = [
  ['#1a1040', '#c084fc', '#e9d5ff'], // purple → lavender
  ['#0f2a1a', '#4ade80', '#bbf7d0'], // green → mint
  ['#0c1a2e', '#60a5fa', '#bfdbfe'], // navy → sky blue
  ['#2a1215', '#fb7185', '#fecdd3'], // rose → pink
  ['#1a1708', '#fbbf24', '#fef08a'], // gold → amber
  ['#0f1f2e', '#22d3ee', '#a5f3fc'], // teal → cyan
  ['#1e1028', '#a78bfa', '#ddd6fe'], // indigo → violet
  ['#1a0f08', '#fb923c', '#fed7aa'], // ember → orange
  ['#0f1a1a', '#2dd4bf', '#99f6e4'], // sea → teal
  ['#1a0820', '#e879f9', '#f5d0fe'], // magenta → fuchsia
  ['#101828', '#818cf8', '#c7d2fe'], // slate → periwinkle
  ['#1a1a08', '#a3e635', '#d9f99d'], // olive → lime
];

/**
 * Generate a deterministic pixel avatar SVG data URL.
 * Pixels cluster near corners with a solid center.
 */
export function generatePixelAvatar(seed) {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length];
  const [bg, fg, fgLight] = palette;

  const SIZE = 48;
  const GRID = 6;
  const CELL = SIZE / GRID;

  // Generate pattern — higher probability near edges/corners
  const bits = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < Math.ceil(GRID / 2); x++) {
      // Distance from center (0 = center, 1 = corner)
      const cx = Math.abs(x - (GRID - 1) / 2) / ((GRID - 1) / 2);
      const cy = Math.abs(y - (GRID - 1) / 2) / ((GRID - 1) / 2);
      const edgeness = Math.max(cx, cy);

      // Higher threshold in center = fewer pixels; lower near edges = more pixels
      const threshold = 60 + (1 - edgeness) * 120;
      bits.push(((h * (y * 11 + x * 17 + 7)) & 0xFF) > threshold);
    }
  }

  let rects = '';
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const bx = x < Math.ceil(GRID / 2) ? x : GRID - 1 - x; // mirror
      if (bits[y * Math.ceil(GRID / 2) + bx]) {
        const fill = ((x + y) % 3 === 0) ? fgLight : fg;
        rects += `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${fill}" rx="1"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${bg}" rx="8"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a deterministic blog banner SVG data URL.
 * GitHub contribution-graph style — tiny square pixels, dense at corners, sparse in center.
 */
export function generateBlogBanner(seed) {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length];
  const palette2 = PALETTES[(h + 5) % PALETTES.length];
  const [bg, fg, fgLight] = palette;
  const fg2 = palette2[1];

  const W = 720;
  const H = 240;
  const PX = 6; // pixel size — small like GitHub squares
  const GAP = 1;
  const STEP = PX + GAP;
  const COLS = Math.floor(W / STEP);
  const ROWS = Math.floor(H / STEP);

  const colors = [fg, fgLight, fg2, fg, fgLight];

  let rects = '';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      // Distance from each corner (0 at corner, 1 at center)
      const nx = x / (COLS - 1);
      const ny = y / (ROWS - 1);
      const dTL = Math.sqrt(nx * nx + ny * ny);
      const dTR = Math.sqrt((1 - nx) * (1 - nx) + ny * ny);
      const dBL = Math.sqrt(nx * nx + (1 - ny) * (1 - ny));
      const dBR = Math.sqrt((1 - nx) * (1 - nx) + (1 - ny) * (1 - ny));
      const minDist = Math.min(dTL, dTR, dBL, dBR);

      // Probability: high near corners (minDist ~0), drops off toward center
      const prob = Math.max(0, 1 - minDist * 1.6);
      const rand = ((h * (y * 131 + x * 67 + 29)) & 0xFF) / 255;

      if (rand < prob) {
        // Opacity stronger near corners
        const opacity = (0.2 + prob * 0.6).toFixed(2);
        const colorIdx = ((h * (y * 7 + x * 3)) & 0xFF) % colors.length;
        const fill = colors[colorIdx];
        rects += `<rect x="${x * STEP}" y="${y * STEP}" width="${PX}" height="${PX}" fill="${fill}" opacity="${opacity}" rx="1"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${bg}" rx="12"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
