/**
 * Deterministic Neo-brutalist generators for avatars and banners.
 * Uses stark contrasts, thick black borders, hard shadows, and basic geometry
 * to create a trendy, high-impact "Neubrutalism" aesthetic.
 */

// Shared hash function
export function hashSeed(seed) {
  let hash = 0;
  const s = seed || 'default';
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Neo-brutalist palettes: [Background, Accent 1, Accent 2]
export const PALETTES = [
  ['#FBE54D', '#FF7E67', '#74E291'], // Yellow, Orange, Green
  ['#A7EDE7', '#FFB3FD', '#FBE54D'], // Blue, Pink, Yellow
  ['#74E291', '#FBE54D', '#FF7E67'], // Green, Yellow, Orange
  ['#FFA1F5', '#A7EDE7', '#FBE54D'], // Bright Pink, Blue, Yellow
  ['#FF7E67', '#74E291', '#A7EDE7'], // Orange, Green, Blue
  ['#E2F0CB', '#FF9AA2', '#C7CEEA'], // Pale Green, Pink, Periwinkle
  ['#C7CEEA', '#B5EAD7', '#FFDFD3'], // Periwinkle, Mint, Peach
  ['#FFD166', '#EF476F', '#118AB2'], // Gold, Rose, Deep Blue
  ['#06D6A0', '#EF476F', '#FFD166'], // Emerald, Rose, Gold
  ['#FCFCFC', '#FF7E67', '#A7EDE7'], // White, Orange, Blue
  ['#FCA311', '#E5E5E5', '#14213D'], // Vibrant Orange, Light Gray, Navy
  ['#FFBE0B', '#FF006E', '#8338EC'], // Mango, Neon Pink, Purple
];

/**
 * Generate a Neo-brutalist shape with hard shadow and thick border.
 */
function drawBrutalistShape(type, x, y, size, fill, hash) {
  const shadowOffset = 8;
  const sw = 6; // stroke width
  
  if (type === 0) { // Circle
    return `
      <circle cx="${x + shadowOffset}" cy="${y + shadowOffset}" r="${size}" fill="#000000" />
      <circle cx="${x}" cy="${y}" r="${size}" fill="${fill}" stroke="#000000" stroke-width="${sw}" />
    `;
  } else if (type === 1) { // Rectangle
    return `
      <rect x="${x - size + shadowOffset}" y="${y - size + shadowOffset}" width="${size*2}" height="${size*2}" fill="#000000" />
      <rect x="${x - size}" y="${y - size}" width="${size*2}" height="${size*2}" fill="${fill}" stroke="#000000" stroke-width="${sw}" />
    `;
  } else if (type === 2) { // Pill
    return `
      <rect x="${x - size*1.5 + shadowOffset}" y="${y - size*0.5 + shadowOffset}" width="${size*3}" height="${size}" rx="${size/2}" fill="#000000" />
      <rect x="${x - size*1.5}" y="${y - size*0.5}" width="${size*3}" height="${size}" rx="${size/2}" fill="${fill}" stroke="#000000" stroke-width="${sw}" />
    `;
  } else { // Polygon/Star-ish
    const points = [
      `${x},${y-size}`, `${x+size},${y}`, `${x},${y+size}`, `${x-size},${y}`
    ].join(' ');
    const shadowPoints = [
      `${x+shadowOffset},${y-size+shadowOffset}`, `${x+size+shadowOffset},${y+shadowOffset}`, 
      `${x+shadowOffset},${y+size+shadowOffset}`, `${x-size+shadowOffset},${y+shadowOffset}`
    ].join(' ');
    
    return `
      <polygon points="${shadowPoints}" fill="#000000" />
      <polygon points="${points}" fill="${fill}" stroke="#000000" stroke-width="${sw}" stroke-linejoin="round" />
    `;
  }
}

/**
 * Generate a deterministic Neo-brutalist avatar SVG data URL.
 */
export function generatePixelAvatar(seed) {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length];
  const [bg, c1, c2] = palette;
  const SIZE = 240;

  // Grid background
  const grid = `
    <pattern id="grid_${h}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000000" stroke-width="2" opacity="0.15"/>
    </pattern>
    <rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#grid_${h})"/>
  `;

  // Draw 2 deterministic shapes
  let shapes = '';
  for(let i=0; i<2; i++) {
     const type = (h + i*7) % 4;
     const cx = 60 + ((h * (i*13 + 7)) % 120);
     const cy = 60 + ((h * (i*17 + 11)) % 120);
     const size = 40 + ((h * (i*19 + 23)) % 40);
     const fill = i === 0 ? c1 : c2;
     shapes += drawBrutalistShape(type, cx, cy, size, fill, h);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
    ${grid}
    ${shapes}
    <rect width="${SIZE}" height="${SIZE}" fill="none" stroke="#000000" stroke-width="12"/>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a deterministic Neo-brutalist profile banner SVG data URL (1056×160).
 */
export function generateProfileBanner(seed, tintSeed) {
  const h = hashSeed(seed);
  const paletteHash = tintSeed ? hashSeed(tintSeed) : h;
  const palette = PALETTES[paletteHash % PALETTES.length];
  const [bg, c1, c2] = palette;

  const W = 1056;
  const H = 160;

  const grid = `
    <pattern id="grid_pb_${h}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000000" stroke-width="2" opacity="0.15"/>
    </pattern>
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect width="${W}" height="${H}" fill="url(#grid_pb_${h})"/>
  `;

  let shapes = '';
  for(let i=0; i<4; i++) {
     const type = (h + i*11) % 4;
     const cx = 100 + ((h * (i*13 + 7)) % (W - 200));
     const cy = ((h * (i*17 + 11)) % H);
     const size = 50 + ((h * (i*19 + 23)) % 70);
     const fill = i % 2 === 0 ? c1 : c2;
     shapes += drawBrutalistShape(type, cx, cy, size, fill, h);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    ${grid}
    ${shapes}
    <rect width="${W}" height="${H}" fill="none" stroke="#000000" stroke-width="12"/>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a deterministic Neo-brutalist blog banner SVG data URL (720x240).
 */
export function generateBlogBanner(seed) {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length];
  const [bg, c1, c2] = palette;

  const W = 720;
  const H = 240;

  const grid = `
    <pattern id="grid_bb_${h}" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="2" fill="#000000" opacity="0.3"/>
    </pattern>
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect width="${W}" height="${H}" fill="url(#grid_bb_${h})"/>
  `;

  let shapes = '';
  for(let i=0; i<4; i++) {
     const type = (h + i*13) % 4;
     const cx = 100 + ((h * (i*7 + 11)) % (W - 200));
     const cy = 40 + ((h * (i*17 + 23)) % (H - 80));
     const size = 60 + ((h * (i*19 + 31)) % 80);
     const fill = i % 2 === 0 ? c1 : c2;
     shapes += drawBrutalistShape(type, cx, cy, size, fill, h);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    ${grid}
    ${shapes}
    <rect width="${W}" height="${H}" fill="none" stroke="#000000" stroke-width="12"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate the square companion for a default blog banner (240x240).
 */
export function generateBlogThumbnail(seed) {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length];
  const [bg, c1, c2] = palette;

  const SIZE = 240;
  
  const grid = `
    <pattern id="grid_tb_${h}" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="2" fill="#000000" opacity="0.3"/>
    </pattern>
    <rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#grid_tb_${h})"/>
  `;

  let shapes = '';
  for(let i=0; i<2; i++) {
     const type = (h + i*5) % 4;
     const cx = 60 + ((h * (i*13 + 7)) % (SIZE - 120));
     const cy = 60 + ((h * (i*17 + 11)) % (SIZE - 120));
     const size = 40 + ((h * (i*19 + 23)) % 50);
     const fill = i === 0 ? c1 : c2;
     shapes += drawBrutalistShape(type, cx, cy, size, fill, h);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
    ${grid}
    ${shapes}
    <rect width="${SIZE}" height="${SIZE}" fill="none" stroke="#000000" stroke-width="12"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
