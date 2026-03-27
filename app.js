// PatternPad Pro — app.js
'use strict';

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────────
function mkRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
}
function rgbToHex(r,g,b) {
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lerpColor(a, b, t) {
  const A=hexToRgb(a), B=hexToRgb(b);
  return rgbToHex(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t);
}
function paletteSample(colors, t) {
  if (!colors || !colors.length) return '#888';
  if (colors.length === 1) return colors[0];
  t = Math.max(0, Math.min(1, t));
  const n = colors.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  return lerpColor(colors[i], colors[i+1], t * n - i);
}
function randomColor(rng) {
  return rgbToHex(rng()*255, rng()*255, rng()*255);
}

// ── Shape Definitions ─────────────────────────────────────────────────────────
// (x,y,s) = top-left of cell, cell size; f=fill, st=stroke, sw=strokeWidth
const SHAPES = {
  circle: (x,y,s,f,st,sw) =>
    `<circle cx="${fx(x+s/2)}" cy="${fx(y+s/2)}" r="${fx(s*.43)}" fill="${f}"${str(st,sw)}/>`,

  square: (x,y,s,f,st,sw) =>
    `<rect x="${fx(x+s*.05)}" y="${fx(y+s*.05)}" width="${fx(s*.9)}" height="${fx(s*.9)}" fill="${f}"${str(st,sw)}/>`,

  rounded: (x,y,s,f,st,sw) =>
    `<rect x="${fx(x+s*.05)}" y="${fx(y+s*.05)}" width="${fx(s*.9)}" height="${fx(s*.9)}" rx="${fx(s*.22)}" fill="${f}"${str(st,sw)}/>`,

  'tri-up': (x,y,s,f,st,sw) => {
    const cx=x+s/2, m=s*.06;
    return `<polygon points="${fx(cx)},${fx(y+m)} ${fx(x+s-m)},${fx(y+s-m)} ${fx(x+m)},${fx(y+s-m)}" fill="${f}"${str(st,sw)}/>`;
  },

  'tri-down': (x,y,s,f,st,sw) => {
    const cx=x+s/2, m=s*.06;
    return `<polygon points="${fx(x+m)},${fx(y+m)} ${fx(x+s-m)},${fx(y+m)} ${fx(cx)},${fx(y+s-m)}" fill="${f}"${str(st,sw)}/>`;
  },

  'tri-right': (x,y,s,f,st,sw) => {
    const cy=y+s/2, m=s*.06;
    return `<polygon points="${fx(x+m)},${fx(y+m)} ${fx(x+s-m)},${fx(cy)} ${fx(x+m)},${fx(y+s-m)}" fill="${f}"${str(st,sw)}/>`;
  },

  diamond: (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, m=s*.05;
    return `<polygon points="${fx(cx)},${fx(y+m)} ${fx(x+s-m)},${fx(cy)} ${fx(cx)},${fx(y+s-m)} ${fx(x+m)},${fx(cy)}" fill="${f}"${str(st,sw)}/>`;
  },

  hexagon: (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, r=s*.44;
    const pts=Array.from({length:6},(_,i)=>{
      const a=Math.PI/180*(60*i-30);
      return `${fx(cx+r*Math.cos(a))},${fx(cy+r*Math.sin(a))}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${f}"${str(st,sw)}/>`;
  },

  cross: (x,y,s,f,st,sw) => {
    const t=s*.26, cx=x+s/2-t/2, cy=y+s/2-t/2, h=s*.45-t/2;
    return `<rect x="${fx(cx)}" y="${fx(y+s*.05)}" width="${fx(t)}" height="${fx(s*.9)}" fill="${f}"/>` +
           `<rect x="${fx(x+s*.05)}" y="${fx(cy)}" width="${fx(s*.9)}" height="${fx(t)}" fill="${f}"/>`;
  },

  star: (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, R=s*.43, r=s*.18;
    const pts=Array.from({length:10},(_,i)=>{
      const a=Math.PI/180*(36*i-90), rad=i%2===0?R:r;
      return `${fx(cx+rad*Math.cos(a))},${fx(cy+rad*Math.sin(a))}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${f}"${str(st,sw)}/>`;
  },

  ring: (x,y,s,f) => {
    const cx=x+s/2, cy=y+s/2, R=s*.42, r=s*.23;
    return `<circle cx="${fx(cx)}" cy="${fx(cy)}" r="${fx(R)}" fill="none" stroke="${f}" stroke-width="${fx(R-r)}"/>`;
  },

  'half-circle': (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, r=s*.43;
    return `<path d="M${fx(cx-r)},${fx(cy)} A${fx(r)},${fx(r)},0,0,1,${fx(cx+r)},${fx(cy)}Z" fill="${f}"${str(st,sw)}/>`;
  },

  dot: (x,y,s,f) =>
    `<circle cx="${fx(x+s/2)}" cy="${fx(y+s/2)}" r="${fx(s*.18)}" fill="${f}"/>`,

  'lines-h': (x,y,s,f) => {
    const lw=s*.1, n=4;
    return Array.from({length:n},(_,i)=>{
      const yy=y+s*(i+.5)/n;
      return `<line x1="${fx(x+s*.08)}" y1="${fx(yy)}" x2="${fx(x+s*.92)}" y2="${fx(yy)}" stroke="${f}" stroke-width="${fx(lw)}" stroke-linecap="round"/>`;
    }).join('');
  },

  'lines-v': (x,y,s,f) => {
    const lw=s*.1, n=4;
    return Array.from({length:n},(_,i)=>{
      const xx=x+s*(i+.5)/n;
      return `<line x1="${fx(xx)}" y1="${fx(y+s*.08)}" x2="${fx(xx)}" y2="${fx(y+s*.92)}" stroke="${f}" stroke-width="${fx(lw)}" stroke-linecap="round"/>`;
    }).join('');
  },

  'lines-d': (x,y,s,f) => {
    const lw=s*.1;
    return `<line x1="${fx(x)}" y1="${fx(y)}" x2="${fx(x+s)}" y2="${fx(y+s)}" stroke="${f}" stroke-width="${fx(lw)}"/>` +
           `<line x1="${fx(x+s)}" y1="${fx(y)}" x2="${fx(x)}" y2="${fx(y+s)}" stroke="${f}" stroke-width="${fx(lw)}"/>`;
  },

  arrow: (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, w=s*.32, h=s*.36, th=s*.14;
    const base=cy+h*.4;
    return `<polygon points="${fx(cx)},${fx(cy-h)} ${fx(cx+w)},${fx(cy)} ${fx(cx+th/2)},${fx(cy)} ${fx(cx+th/2)},${fx(base)} ${fx(cx-th/2)},${fx(base)} ${fx(cx-th/2)},${fx(cy)} ${fx(cx-w)},${fx(cy)}" fill="${f}"${str(st,sw)}/>`;
  },

  chevron: (x,y,s,f) => {
    const cx=x+s/2, w=s*.38, h=s*.28, lw=s*.13;
    return `<polyline points="${fx(cx-w)},${fx(y+s/2+h)} ${fx(cx)},${fx(y+s/2-h)} ${fx(cx+w)},${fx(y+s/2+h)}" fill="none" stroke="${f}" stroke-width="${fx(lw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  },

  heart: (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, sc=s*.038;
    return `<path d="M${fx(cx)},${fx(cy+5*sc)} C${fx(cx-14*sc)},${fx(cy-2*sc)} ${fx(cx-14*sc)},${fx(cy-12*sc)} ${fx(cx)},${fx(cy-4*sc)} C${fx(cx+14*sc)},${fx(cy-12*sc)} ${fx(cx+14*sc)},${fx(cy-2*sc)} ${fx(cx)},${fx(cy+5*sc)}Z" fill="${f}"${str(st,sw)}/>`;
  },

  leaf: (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, r=s*.4;
    return `<path d="M${fx(cx)},${fx(cy-r)} Q${fx(cx+r)},${fx(cy)} ${fx(cx)},${fx(cy+r)} Q${fx(cx-r)},${fx(cy)} ${fx(cx)},${fx(cy-r)}Z" fill="${f}"${str(st,sw)}/>`;
  },

  drop: (x,y,s,f,st,sw) => {
    const cx=x+s/2, cy=y+s/2, r=s*.3;
    return `<path d="M${fx(cx)},${fx(y+s*.08)} Q${fx(cx+r)},${fx(cy)} ${fx(cx)},${fx(y+s*.88)} Q${fx(cx-r)},${fx(cy)} ${fx(cx)},${fx(y+s*.08)}Z" fill="${f}"${str(st,sw)}/>`;
  },

  zigzag: (x,y,s,f) => {
    const n=5, h=s*.28, lw=s*.1, cy=y+s/2;
    const pts=Array.from({length:n*2+1},(_,i)=>`${fx(x+s*i/(n*2))},${fx(i%2===0?cy-h/2:cy+h/2)}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${f}" stroke-width="${fx(lw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  },

  wave: (x,y,s,f) => {
    const cy=y+s/2, amp=s*.22, lw=s*.1;
    return `<path d="M${fx(x+s*.05)},${fx(cy)} C${fx(x+s*.2)},${fx(cy-amp)} ${fx(x+s*.35)},${fx(cy-amp)} ${fx(x+s*.5)},${fx(cy)} S${fx(x+s*.8)},${fx(cy+amp)} ${fx(x+s*.95)},${fx(cy)}" fill="none" stroke="${f}" stroke-width="${fx(lw)}" stroke-linecap="round"/>`;
  },

  flower: (x,y,s,f) => {
    const cx=x+s/2, cy=y+s/2, pr=s*.22, cr=s*.11;
    return Array.from({length:6},(_,i)=>{
      const a=Math.PI/3*i, px=cx+pr*Math.cos(a), py=cy+pr*Math.sin(a);
      return `<ellipse cx="${fx(px)}" cy="${fx(py)}" rx="${fx(s*.18)}" ry="${fx(s*.1)}" transform="rotate(${i*60+90},${fx(px)},${fx(py)})" fill="${f}"/>`;
    }).join('')+`<circle cx="${fx(cx)}" cy="${fx(cy)}" r="${fx(cr)}" fill="${f}"/>`;
  },
};

function fx(n) { return Math.round(n*100)/100; }
function str(st,sw) { return st ? ` stroke="${st}" stroke-width="${sw}"` : ''; }

const SHAPE_KEYS = Object.keys(SHAPES);

const SHAPE_LABELS = {
  circle:'Circle', square:'Square', rounded:'Rounded', 'tri-up':'Tri ↑',
  'tri-down':'Tri ↓', 'tri-right':'Tri →', diamond:'Diamond', hexagon:'Hex',
  cross:'Cross', star:'Star', ring:'Ring', 'half-circle':'Half ◑',
  dot:'Dot', 'lines-h':'Lines —', 'lines-v':'Lines |', 'lines-d':'Lines ✕',
  arrow:'Arrow', chevron:'Chevron', heart:'Heart', leaf:'Leaf',
  drop:'Drop', zigzag:'Zigzag', wave:'Wave', flower:'Flower',
};

// ── Color Palettes (ColorBrewer + Custom) ─────────────────────────────────────
const PALETTE_COLORS = {
  // Sequential
  Blues:     ['#eff3ff','#bdd7e7','#6baed6','#2171b5','#084594'],
  Greens:    ['#edf8e9','#bae4b3','#74c476','#238b45','#005a32'],
  Reds:      ['#fee5d9','#fcae91','#fb6a4a','#de2d26','#a50f15'],
  Purples:   ['#f2f0f7','#cbc9e2','#9e9ac8','#756bb1','#54278f'],
  Oranges:   ['#feedde','#fdbe85','#fd8d3c','#e6550d','#a63603'],
  Greys:     ['#f7f7f7','#cccccc','#969696','#636363','#252525'],
  YlOrRd:    ['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'],
  YlOrBr:    ['#ffffd4','#fed98e','#fe9929','#d95f0e','#993404'],
  YlGnBu:    ['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494'],
  YlGn:      ['#ffffcc','#c2e699','#78c679','#31a354','#006837'],
  BuGn:      ['#edf8fb','#b2e2e2','#66c2a4','#2ca25f','#006d2c'],
  BuPu:      ['#edf8fb','#b3cde3','#8c96c6','#8856a7','#810f7c'],
  GnBu:      ['#f0f9e8','#bae4bc','#7bccc4','#43a2ca','#0868ac'],
  OrRd:      ['#fef0d9','#fdcc8a','#fc8d59','#e34a33','#b30000'],
  PuBu:      ['#f1eef6','#bdc9e1','#74a9cf','#2b8cbe','#045a8d'],
  PuBuGn:    ['#f6eff7','#bdc9e1','#67a9cf','#1c9099','#016c59'],
  PuRd:      ['#f1eef6','#d7b5d8','#df65b0','#dd1c77','#980043'],
  RdPu:      ['#feebe2','#fbb4b9','#f768a1','#c51b8a','#7a0177'],
  // Diverging
  RdYlGn:    ['#d73027','#fc8d59','#ffffbf','#91cf60','#1a9850'],
  RdYlBu:    ['#d73027','#fc8d59','#ffffbf','#91bfdb','#4575b4'],
  RdGy:      ['#ca0020','#f4a582','#ffffff','#bababa','#404040'],
  RdBu:      ['#ca0020','#f4a582','#f7f7f7','#92c5de','#0571b0'],
  PiYG:      ['#c51b7d','#e9a3c9','#f7f7f7','#a1d76a','#4d9221'],
  PRGn:      ['#762a83','#af8dc3','#f7f7f7','#7fbf7b','#1b7837'],
  PuOr:      ['#b35806','#f1a340','#f7f7f7','#998ec3','#542788'],
  BrBG:      ['#8c510a','#d8b365','#f5f5f5','#5ab4ac','#01665e'],
  Spectral:  ['#d53e4f','#fc8d59','#ffffbf','#99d594','#3288bd'],
  // Qualitative
  Set1:      ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#a65628'],
  Set2:      ['#66c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854','#ffd92f'],
  Set3:      ['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462'],
  Paired:    ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c'],
  Pastel1:   ['#fbb4ae','#b3cde3','#ccebc5','#decbe4','#fed9a6','#ffffcc'],
  Pastel2:   ['#b3e2cd','#fdcdac','#cbd5e8','#f4cae4','#e6f5c9','#fff2ae'],
  Dark2:     ['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02'],
  Accent:    ['#7fc97f','#beaed4','#fdc086','#ffff99','#386cb0','#f0027f'],
  // Custom
  Neon:      ['#ff00ff','#00ffff','#ff6600','#ffff00','#00ff88','#ff0066'],
  Sunset:    ['#ff6b6b','#ffa07a','#ffd700','#ff8c00','#dc143c','#ff69b4'],
  Ocean:     ['#003d5b','#006994','#0099cc','#00bfff','#87ceeb','#e0f4ff'],
  Forest:    ['#1a3d1a','#228b22','#32cd32','#90ee90','#8fbc8f','#a8d5a2'],
  Rose:      ['#8b2252','#c9497a','#ff6b9d','#ff9eb5','#ffb6c1','#ffe4e8'],
  Monochrome:['#111111','#333333','#666666','#999999','#cccccc','#eeeeee'],
  Pastel:    ['#ffb3ba','#ffdfba','#ffffba','#baffc9','#bae1ff','#e8baff'],
  Earth:     ['#6b3a2a','#8b4513','#cd853f','#deb887','#d2b48c','#f5deb3'],
};

// ── Application State ─────────────────────────────────────────────────────────
const state = {
  colors: {
    front: ['#3f51b5','#e91e63'],
    back: '#ffffff',
    backTransparent: false,
    outline: null,
  },
  palette: 'custom',
  grid: { cols: 16, rows: 9, cell: 50, seed: 42 },
  style: {
    space: 0,
    density: 100,
    split: 50,
    bgPerBlock: true,
    fade: false,
    fadeDir: 'h',
    rotation: 'random',
    shapes: ['circle','square','diamond','hexagon','tri-up','tri-down','star'],
  },
};

// ── SVG Pattern Generator ─────────────────────────────────────────────────────
function buildPattern(cfg) {
  const {cols, rows, cell, seed} = cfg.grid;
  const {space, density, split, bgPerBlock, fade, fadeDir, rotation, shapes} = cfg.style;
  const palette = cfg.palette;
  const frontColors = cfg.colors.front;
  const backColor = cfg.colors.backTransparent ? 'none' : cfg.colors.back;
  const outlineColor = cfg.colors.outline;
  const ow = outlineColor ? cell * 0.04 : 0;

  const W = cols * cell;
  const H = rows * cell;
  const rng = mkRng(seed);
  const palColors = (palette !== 'custom') ? (PALETTE_COLORS[palette] || frontColors) : null;
  const activeShapes = shapes && shapes.length ? shapes : ['circle'];

  let cells = '';
  let bgRects = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell;
      const y = r * cell;
      const s = cell - space;
      const ox = x + space / 2;
      const oy = y + space / 2;

      // Position factor for gradient/fade (0..1)
      const tx = c / Math.max(cols - 1, 1);
      const ty = r / Math.max(rows - 1, 1);
      let t;
      if (fadeDir === 'h') t = tx;
      else if (fadeDir === 'v') t = ty;
      else if (fadeDir === 'd') t = (tx + ty) / 2;
      else t = Math.sqrt((tx-.5)**2+(ty-.5)**2) / Math.SQRT2; // radial

      // Background per block
      if (bgPerBlock && backColor !== 'none') {
        bgRects += `<rect x="${fx(ox)}" y="${oy}" width="${fx(s)}" height="${fx(s)}" fill="${backColor}"/>`;
      }

      // Density check
      if (rng() * 100 > density) continue;

      // Pick fill color
      let fill;
      if (palColors) {
        fill = paletteSample(palColors, t);
      } else {
        // split: 0=all color0, 100=all last color; in between proportional
        const n = frontColors.length;
        if (n === 1) {
          fill = frontColors[0];
        } else {
          // Use position + split to map cell to color index
          const posT = (tx * (split / 100) + ty * (1 - split / 100));
          fill = frontColors[Math.min(Math.floor(posT * n), n - 1)];
        }
      }

      // Pick shape
      const shape = activeShapes[Math.floor(rng() * activeShapes.length)];
      const fn = SHAPES[shape];
      if (!fn) continue;

      // Pick rotation
      let rot = 0;
      if (rotation === 'random') rot = Math.floor(rng() * 4) * 90;
      else rot = parseInt(rotation) || 0;

      const cx = ox + s/2, cy = oy + s/2;
      const shapeStr = fn(ox, oy, s, fill, outlineColor, ow);

      if (rot !== 0) {
        cells += `<g transform="rotate(${rot},${fx(cx)},${fx(cy)})">${shapeStr}</g>`;
      } else {
        cells += shapeStr;
      }
    }
  }

  // Fade gradient overlay
  let defs = '';
  let fadeOverlay = '';
  if (fade) {
    const fadeCols = palColors || frontColors;
    const c0 = fadeCols[0] || '#000';
    const c1 = fadeCols[fadeCols.length-1] || '#fff';
    let x1='0%',y1='0%',x2='100%',y2='0%';
    if (fadeDir==='v'){x2='0%';y2='100%';}
    else if (fadeDir==='d'){x2='100%';y2='100%';}
    else if (fadeDir==='r'){x1='50%';y1='50%';}
    const gradId = 'fg'+seed;
    if (fadeDir==='r') {
      defs = `<defs><radialGradient id="${gradId}" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${c0}" stop-opacity=".55"/><stop offset="100%" stop-color="${c1}" stop-opacity=".0"/></radialGradient></defs>`;
    } else {
      defs = `<defs><linearGradient id="${gradId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${c0}" stop-opacity=".55"/><stop offset="100%" stop-color="${c1}" stop-opacity=".0"/></linearGradient></defs>`;
    }
    fadeOverlay = `<rect width="${W}" height="${H}" fill="url(#${gradId})" pointer-events="none"/>`;
  }

  const bgFill = backColor === 'none' ? 'transparent' : backColor;
  const bgMain = bgPerBlock ? '' : `<rect width="${W}" height="${H}" fill="${bgFill}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${bgMain}${bgRects}${cells}${fadeOverlay}</svg>`;
}

// ── Render Live Preview ───────────────────────────────────────────────────────
function render() {
  const svg = buildPattern(state);
  const W = state.grid.cols * state.grid.cell;
  const H = state.grid.rows * state.grid.cell;
  const el = document.getElementById('pattern-svg');
  el.setAttribute('width', W);
  el.setAttribute('height', H);
  el.innerHTML = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

// ── Mini Thumbnail Generator ──────────────────────────────────────────────────
function buildThumb(preset) {
  const thumbCfg = {
    grid: { cols: 10, rows: 6, cell: 12, seed: preset.seed || 42 },
    style: {
      space: Math.min(preset.space || 0, 2),
      density: preset.density || 100,
      split: preset.split !== undefined ? preset.split : 50,
      bgPerBlock: preset.bgPerBlock !== undefined ? preset.bgPerBlock : true,
      fade: preset.fade || false,
      fadeDir: preset.fadeDir || 'h',
      rotation: preset.rotation || 'random',
      shapes: preset.shapes || ['circle'],
    },
    palette: preset.palette || 'custom',
    colors: {
      front: preset.colors || ['#3f51b5','#e91e63'],
      back: preset.back || '#ffffff',
      backTransparent: false,
      outline: null,
    },
  };
  return buildPattern(thumbCfg);
}

// ── Preset Definitions ────────────────────────────────────────────────────────
const PRESETS = [
  { id:'circles',    name:'Circles',      shapes:['circle'],                           space:2,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'0',      palette:'Blues',    seed:7   },
  { id:'squares',    name:'Squares',      shapes:['square'],                           space:3,  density:100, split:50,  bgPerBlock:false, fade:false, rotation:'random', palette:'Greens',   seed:12  },
  { id:'hexgrid',    name:'Hex Grid',     shapes:['hexagon'],                          space:2,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'0',      palette:'YlGnBu',  seed:5   },
  { id:'triangles',  name:'Triangles',    shapes:['tri-up','tri-down'],                space:0,  density:100, split:50,  bgPerBlock:false, fade:false, rotation:'0',      palette:'RdYlBu',  seed:33  },
  { id:'mixed-geo',  name:'Mixed Geo',    shapes:['circle','square','diamond','hexagon'], space:2, density:100, split:50, bgPerBlock:true, fade:false, rotation:'random', palette:'Spectral', seed:88  },
  { id:'polka',      name:'Polka Dots',   shapes:['circle'],                           space:12, density:100, split:0,   bgPerBlock:false, fade:false, rotation:'0',      palette:'custom',  colors:['#e91e63'], back:'#fff3f7', seed:1 },
  { id:'stars',      name:'Stars',        shapes:['star'],                             space:4,  density:75,  split:50,  bgPerBlock:false, fade:false, rotation:'0',      palette:'Purples',  seed:44  },
  { id:'diamonds',   name:'Diamonds',     shapes:['diamond'],                          space:2,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'0',      palette:'PuOr',    seed:19  },
  { id:'neon-geo',   name:'Neon Geo',     shapes:['circle','hexagon','star'],          space:3,  density:80,  split:50,  bgPerBlock:false, fade:false, rotation:'random', palette:'Neon',    back:'#111111', seed:55 },
  { id:'mosaic',     name:'Mosaic',       shapes:['square','rounded','circle'],        space:2,  density:100, split:33,  bgPerBlock:true,  fade:false, rotation:'0',      palette:'Set1',    seed:77  },
  { id:'hearts',     name:'Hearts',       shapes:['heart'],                            space:4,  density:80,  split:50,  bgPerBlock:false, fade:false, rotation:'0',      palette:'RdPu',    seed:22  },
  { id:'nature',     name:'Nature',       shapes:['leaf','flower','heart'],            space:4,  density:80,  split:50,  bgPerBlock:false, fade:false, rotation:'random', palette:'Forest',  seed:66  },
  { id:'waves',      name:'Waves',        shapes:['wave','zigzag'],                    space:0,  density:100, split:50,  bgPerBlock:false, fade:false, rotation:'0',      palette:'Ocean',   seed:14  },
  { id:'lines',      name:'Lines',        shapes:['lines-h','lines-v','lines-d'],      space:0,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'0',      palette:'Blues',   seed:3   },
  { id:'chevrons',   name:'Chevrons',     shapes:['chevron'],                          space:2,  density:100, split:50,  bgPerBlock:false, fade:false, rotation:'0',      palette:'Set2',    seed:9   },
  { id:'arrows',     name:'Arrows',       shapes:['arrow'],                            space:4,  density:75,  split:50,  bgPerBlock:false, fade:false, rotation:'random', palette:'YlOrRd',  seed:31  },
  { id:'retro',      name:'Retro',        shapes:['circle','square','tri-up','cross'], space:4,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'random', palette:'Pastel1', seed:41  },
  { id:'dark-geo',   name:'Dark Geo',     shapes:['hexagon','diamond','circle'],       space:2,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'0',      palette:'Dark2',   back:'#0a0a0a', seed:17 },
  { id:'sunset',     name:'Sunset',       shapes:['circle','drop','leaf'],             space:2,  density:100, split:50,  bgPerBlock:true,  fade:true,  fadeDir:'v',       palette:'Sunset',  seed:28  },
  { id:'pastel',     name:'Pastel Dream', shapes:['circle','rounded','diamond'],       space:4,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'random', palette:'Pastel',  seed:52  },
  { id:'monochrome', name:'Monochrome',   shapes:['circle','square','diamond'],        space:2,  density:100, split:50,  bgPerBlock:false, fade:false, rotation:'random', palette:'Greys',   seed:60  },
  { id:'earth',      name:'Earthy',       shapes:['hexagon','leaf','circle'],          space:2,  density:100, split:50,  bgPerBlock:true,  fade:false, rotation:'random', palette:'Earth',   seed:73  },
  { id:'minimal',    name:'Minimal',      shapes:['circle','dot'],                     space:8,  density:50,  split:0,   bgPerBlock:false, fade:false, rotation:'0',      palette:'custom',  colors:['#1a73e8'], back:'#f8f8f8', seed:2 },
  { id:'abstract',   name:'Abstract',     shapes:SHAPE_KEYS.slice(),                   space:2,  density:100, split:50,  bgPerBlock:false, fade:false, rotation:'random', palette:'Spectral', seed:99 },
];

function applyPreset(preset) {
  // Colors
  if (preset.colors) state.colors.front = [...preset.colors];
  if (preset.back) state.colors.back = preset.back;
  state.colors.backTransparent = false;
  state.colors.outline = null;
  // Palette
  state.palette = preset.palette || 'custom';
  document.getElementById('palette-select').value = state.palette;
  // Grid seed
  state.grid.seed = preset.seed || 42;
  document.getElementById('seed-input').value = state.grid.seed;
  // Style
  state.style.space = preset.space !== undefined ? preset.space : 0;
  state.style.density = preset.density || 100;
  state.style.split = preset.split !== undefined ? preset.split : 50;
  state.style.bgPerBlock = preset.bgPerBlock !== undefined ? preset.bgPerBlock : true;
  state.style.fade = preset.fade || false;
  state.style.fadeDir = preset.fadeDir || 'h';
  state.style.rotation = preset.rotation || 'random';
  state.style.shapes = [...(preset.shapes || ['circle'])];

  syncControls();
  rebuildSwatches();
  syncShapeGrid();
  render();
}

// ── Sync UI to state ──────────────────────────────────────────────────────────
function syncControls() {
  document.getElementById('ctrl-space').value = state.style.space;
  document.getElementById('ctrl-density').value = state.style.density;
  document.getElementById('ctrl-rotation').value = state.style.rotation;
  document.getElementById('ctrl-fade-dir').value = state.style.fadeDir;

  // Split
  document.querySelectorAll('.split-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.split) === state.style.split);
  });

  // BG per block
  document.getElementById('bg-block-on').classList.toggle('active', state.style.bgPerBlock);
  document.getElementById('bg-block-off').classList.toggle('active', !state.style.bgPerBlock);

  // Fade
  document.getElementById('fade-on').classList.toggle('active', state.style.fade);
  document.getElementById('fade-off').classList.toggle('active', !state.style.fade);
  document.getElementById('fade-dir-row').style.display = state.style.fade ? '' : 'none';

  // Outline
  const hasOutline = !!state.colors.outline;
  document.getElementById('outline-none').classList.toggle('active', !hasOutline);
  document.getElementById('outline-color').classList.toggle('active', hasOutline);
  document.getElementById('swatch-outline').style.display = hasOutline ? '' : 'none';
  if (hasOutline) {
    document.getElementById('color-outline').value = state.colors.outline;
    document.getElementById('swatch-outline').style.background = state.colors.outline;
  }

  // Back swatch
  const backSwatch = document.getElementById('swatch-back');
  if (state.colors.backTransparent) {
    backSwatch.classList.add('swatch-empty');
    backSwatch.style.background = '';
  } else {
    backSwatch.classList.remove('swatch-empty');
    backSwatch.style.background = state.colors.back;
    document.getElementById('color-back').value = state.colors.back;
  }
}

function syncShapeGrid() {
  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.classList.toggle('active', state.style.shapes.includes(btn.dataset.shape));
  });
}

// ── Build Swatch Row ──────────────────────────────────────────────────────────
function rebuildSwatches() {
  const row = document.getElementById('swatch-front-row');
  row.innerHTML = '';

  // Minus button
  const minusBtn = document.getElementById('front-minus');
  minusBtn.style.display = state.colors.front.length > 1 ? '' : 'none';

  state.colors.front.forEach((col, i) => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = col;
    sw.title = `Front color ${i+1}`;
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = col;
    inp.addEventListener('input', e => {
      state.colors.front[i] = e.target.value;
      sw.style.background = e.target.value;
      state.palette = 'custom';
      document.getElementById('palette-select').value = 'custom';
      render();
    });
    sw.appendChild(inp);
    row.appendChild(sw);
  });
}

// ── Render Preset Grid ────────────────────────────────────────────────────────
let activePresetId = null;
function renderPresetGrid() {
  const grid = document.getElementById('preset-grid');
  grid.innerHTML = '';
  PRESETS.forEach(preset => {
    const card = document.createElement('div');
    card.className = 'preset-card' + (activePresetId === preset.id ? ' active' : '');
    card.dataset.id = preset.id;

    const thumb = document.createElement('div');
    thumb.className = 'preset-thumb';
    const thumbSvg = buildThumb(preset);
    thumb.innerHTML = thumbSvg;
    const innerSvg = thumb.querySelector('svg');
    if (innerSvg) {
      innerSvg.style.width = '100%';
      innerSvg.style.height = '100%';
      innerSvg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    }

    const check = document.createElement('div');
    check.className = 'preset-check';
    check.textContent = '✓';

    const name = document.createElement('div');
    name.className = 'preset-name';
    name.textContent = preset.name;

    card.appendChild(thumb);
    card.appendChild(check);
    card.appendChild(name);
    card.addEventListener('click', () => {
      activePresetId = preset.id;
      document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      applyPreset(preset);
    });
    grid.appendChild(card);
  });
}

// ── Render Shape Grid ─────────────────────────────────────────────────────────
function renderShapeGrid() {
  const grid = document.getElementById('shape-grid');
  grid.innerHTML = '';
  SHAPE_KEYS.forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'shape-btn' + (state.style.shapes.includes(key) ? ' active' : '');
    btn.dataset.shape = key;
    btn.title = SHAPE_LABELS[key] || key;

    // Mini SVG preview
    const s = 24;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${s} ${s}`);
    svg.setAttribute('width',s);
    svg.setAttribute('height',s);
    const fn = SHAPES[key];
    const shapeStr = fn(0,0,s,'currentColor',null,0);
    svg.innerHTML = shapeStr;
    btn.appendChild(svg);

    btn.addEventListener('click', () => {
      const idx = state.style.shapes.indexOf(key);
      if (idx >= 0) {
        if (state.style.shapes.length > 1) {
          state.style.shapes.splice(idx,1);
          btn.classList.remove('active');
        }
      } else {
        state.style.shapes.push(key);
        btn.classList.add('active');
      }
      activePresetId = null;
      document.querySelectorAll('.preset-card').forEach(c=>c.classList.remove('active'));
      render();
    });
    grid.appendChild(btn);
  });
}

// ── Palette Panel (dynamic) ───────────────────────────────────────────────────
function buildPalettePanel() {
  if (document.getElementById('palette-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'palette-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h3>🎨 Color Palettes</h3>
      <button class="panel-close" id="pp-close">✕</button>
    </div>
    <div style="padding:10px 12px 0">
      <input class="palette-search" id="pp-search" type="text" placeholder="Search palettes…">
    </div>
    <div class="palette-list" id="pp-list"></div>
  `;
  document.body.appendChild(panel);

  const GROUPS = [
    { label:'Sequential', keys:['Blues','Greens','Reds','Purples','Oranges','Greys','YlOrRd','YlOrBr','YlGnBu','YlGn','BuGn','BuPu','GnBu','OrRd','PuBu','PuBuGn','PuRd','RdPu'] },
    { label:'Diverging',  keys:['RdYlGn','RdYlBu','RdGy','RdBu','PiYG','PRGn','PuOr','BrBG','Spectral'] },
    { label:'Qualitative',keys:['Set1','Set2','Set3','Paired','Pastel1','Pastel2','Dark2','Accent'] },
    { label:'Custom',     keys:['Neon','Sunset','Ocean','Forest','Rose','Monochrome','Pastel','Earth'] },
  ];

  function renderPaletteList(filter) {
    const list = document.getElementById('pp-list');
    list.innerHTML = '';
    GROUPS.forEach(g => {
      const keys = g.keys.filter(k => !filter || k.toLowerCase().includes(filter.toLowerCase()));
      if (!keys.length) return;
      const gl = document.createElement('div');
      gl.className = 'palette-group-label';
      gl.textContent = g.label;
      list.appendChild(gl);
      keys.forEach(key => {
        const colors = PALETTE_COLORS[key] || [];
        const row = document.createElement('div');
        row.className = 'palette-row' + (state.palette === key ? ' active' : '');
        row.dataset.key = key;
        const swatches = document.createElement('div');
        swatches.className = 'palette-swatches';
        colors.slice(0,6).forEach(c => {
          const sw = document.createElement('div');
          sw.className = 'palette-sw';
          sw.style.background = c;
          swatches.appendChild(sw);
        });
        const name = document.createElement('div');
        name.className = 'palette-name';
        name.textContent = key;
        row.appendChild(swatches);
        row.appendChild(name);
        row.addEventListener('click', () => {
          state.palette = key;
          document.getElementById('palette-select').value = key;
          document.querySelectorAll('.palette-row').forEach(r=>r.classList.remove('active'));
          row.classList.add('active');
          render();
          closeOverlay();
        });
        list.appendChild(row);
      });
    });
  }

  renderPaletteList('');

  document.getElementById('pp-search').addEventListener('input', e => renderPaletteList(e.target.value));
  document.getElementById('pp-close').addEventListener('click', closeOverlay);
}

function openPalettePanel() {
  buildPalettePanel();
  document.getElementById('palette-panel').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function closeOverlay() {
  document.getElementById('overlay').classList.remove('open');
  const pp = document.getElementById('palette-panel');
  if (pp) pp.classList.remove('open');
  document.getElementById('batch-modal').classList.remove('open');
}

// ── Batch Generation ──────────────────────────────────────────────────────────
let jsZipLoaded = false;
function loadJSZip(cb) {
  if (window.JSZip) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  s.onload = () => { jsZipLoaded = true; cb(); };
  s.onerror = () => alert('Failed to load JSZip. Check your internet connection.');
  document.head.appendChild(s);
}

function generateBatch(opts) {
  const { count, vary, startSeed, W, H, prefix, format, colorMode, shapeMode, gridMode, onProgress } = opts;
  const results = [];
  const allPaletteKeys = Object.keys(PALETTE_COLORS);

  for (let i = 0; i < count; i++) {
    const seed = startSeed + i;
    const rng = mkRng(seed * 9973);

    // Build config from current state + variations
    const cfg = JSON.parse(JSON.stringify(state));
    cfg.grid.seed = seed;

    // Canvas size
    cfg.grid.cols = Math.round(W / cfg.grid.cell) || 16;
    cfg.grid.rows = Math.round(H / cfg.grid.cell) || 9;

    if (vary === 'full' || vary === 'colors' || colorMode === 'random-palette' || colorMode === 'random-color') {
      if (colorMode === 'random-color' || vary === 'colors') {
        cfg.colors.front = [randomColor(rng), randomColor(rng)];
        cfg.palette = 'custom';
      } else if (colorMode === 'random-palette' || vary === 'full') {
        cfg.palette = allPaletteKeys[Math.floor(rng() * allPaletteKeys.length)];
      } else if (colorMode === 'cycle-palette') {
        cfg.palette = allPaletteKeys[i % allPaletteKeys.length];
      }
    }

    if (vary === 'full' || vary === 'shapes' || shapeMode === 'random-preset' || shapeMode === 'random-random') {
      if (shapeMode === 'random-preset' || vary === 'full') {
        const preset = PRESETS[Math.floor(rng() * PRESETS.length)];
        cfg.style.shapes = [...preset.shapes];
      } else if (shapeMode === 'random-random' || vary === 'shapes') {
        const n = 1 + Math.floor(rng() * 4);
        cfg.style.shapes = Array.from({length:n}, () => SHAPE_KEYS[Math.floor(rng()*SHAPE_KEYS.length)]);
      }
    }

    if (gridMode === 'random' || vary === 'full') {
      cfg.grid.cols = 8 + Math.floor(rng() * 16);
      cfg.grid.rows = 4 + Math.floor(rng() * 10);
    }

    const svg = buildPattern(cfg).replace('<?xml','<?xml').replace(
      '<svg ',
      `<svg xmlns="http://www.w3.org/2000/svg" `
    );
    results.push({ svg, seed, cfg, name: `${prefix}_${String(i+1).padStart(4,'0')}` });
    if (onProgress) onProgress(i+1, count);
  }
  return results;
}

function buildCSV(results) {
  const header = 'filename,seed,palette,shapes,cols,rows,cell,space,density,rotation\n';
  const rows = results.map(r =>
    `${r.name}.svg,${r.cfg.grid.seed},${r.cfg.palette},"${r.cfg.style.shapes.join('|')}",${r.cfg.grid.cols},${r.cfg.grid.rows},${r.cfg.grid.cell},${r.cfg.style.space},${r.cfg.style.density},${r.cfg.style.rotation}`
  );
  return header + rows.join('\n');
}

async function exportZip(results, withCsv) {
  return new Promise(resolve => {
    loadJSZip(() => {
      const zip = new window.JSZip();
      results.forEach(r => zip.file(r.name+'.svg', r.svg));
      if (withCsv) zip.file('manifest.csv', buildCSV(results));
      zip.generateAsync({type:'blob'}).then(resolve);
    });
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadText(text, filename) {
  downloadBlob(new Blob([text],{type:'text/plain'}), filename);
}

// ── Quick Batch (sidebar) ─────────────────────────────────────────────────────
async function runQuickBatch(asCSV) {
  const count = parseInt(document.getElementById('batch-count').value) || 12;
  const vary  = document.getElementById('batch-vary').value;
  const W     = parseInt(document.getElementById('batch-w').value) || 800;
  const H     = parseInt(document.getElementById('batch-h').value) || 500;

  const results = generateBatch({ count, vary, startSeed: state.grid.seed, W, H, prefix:'pattern', format:'zip', colorMode:'current', shapeMode:'current', gridMode:'current' });

  if (asCSV) {
    downloadText(buildCSV(results), 'patterns.csv');
  } else {
    const blob = await exportZip(results, true);
    downloadBlob(blob, 'patterns.zip');
  }
}

// ── Batch Modal Logic ─────────────────────────────────────────────────────────
async function runBatchModal() {
  const count     = parseInt(document.getElementById('m-count').value) || 24;
  const vary      = document.getElementById('m-vary').value;
  const startSeed = parseInt(document.getElementById('m-seed').value) || 1;
  const format    = document.getElementById('m-format').value;
  const prefix    = document.getElementById('m-prefix').value || 'pattern';
  const colorMode = document.getElementById('m-color-mode').value;
  const shapeMode = document.getElementById('m-shape-mode').value;
  const gridMode  = document.getElementById('m-grid-mode').value;

  let W=800, H=500;
  const sizePreset = document.getElementById('m-size-preset').value;
  if (sizePreset === 'custom') {
    W = parseInt(document.getElementById('m-custom-w').value) || 800;
    H = parseInt(document.getElementById('m-custom-h').value) || 500;
  } else if (sizePreset !== 'custom') {
    [W,H] = sizePreset.split('x').map(Number);
  }

  const bar = document.getElementById('m-progress-bar');
  const fill = document.getElementById('m-progress-fill');
  const text = document.getElementById('m-progress-text');
  bar.style.display = 'block';
  fill.style.width = '0%';
  text.textContent = 'Generating…';

  const results = generateBatch({
    count, vary, startSeed, W, H, prefix, format, colorMode, shapeMode, gridMode,
    onProgress: (done, total) => {
      const pct = Math.round(done/total*100);
      fill.style.width = pct+'%';
      text.textContent = `${done} / ${total} patterns…`;
    }
  });

  text.textContent = 'Packaging…';

  if (format === 'csv') {
    downloadText(buildCSV(results), prefix+'_manifest.csv');
  } else if (format === 'sheet') {
    const margin = 10;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const tw = W + margin, th = H + margin;
    const SW = cols*tw+margin, SH = rows*th+margin;
    let inner = '';
    results.forEach((r,i) => {
      const cx = (i%cols)*tw+margin;
      const cy = Math.floor(i/cols)*th+margin;
      inner += `<g transform="translate(${cx},${cy})">${r.svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;
    });
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"><rect width="${SW}" height="${SH}" fill="#eee"/>${inner}</svg>`;
    downloadText(sheet, prefix+'_sheet.svg');
  } else {
    const blob = await exportZip(results, format === 'zipcsv');
    downloadBlob(blob, prefix+'_batch.zip');
  }

  bar.style.display = 'none';
  fill.style.width = '0%';
  text.textContent = '';
}

// ── SVG Download ──────────────────────────────────────────────────────────────
function downloadSVG() {
  const svg = buildPattern(state);
  downloadBlob(new Blob([svg], {type:'image/svg+xml'}), 'pattern.svg');
}

// ── Spinner Helper ────────────────────────────────────────────────────────────
function initSpinners() {
  document.querySelectorAll('.spin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.spin;
      const dir = parseInt(btn.dataset.dir);
      const inp = document.getElementById(`val-${key}`);
      const min = parseInt(inp.min), max = parseInt(inp.max);
      let val = parseInt(inp.value) + dir;
      val = Math.max(min, Math.min(max, val));
      inp.value = val;
      if (key === 'cols') state.grid.cols = val;
      if (key === 'rows') state.grid.rows = val;
      if (key === 'cell') state.grid.cell = val;
      render();
    });
  });
  ['cols','rows','cell'].forEach(key => {
    const inp = document.getElementById(`val-${key}`);
    inp.addEventListener('change', () => {
      const val = Math.max(parseInt(inp.min), Math.min(parseInt(inp.max), parseInt(inp.value)||1));
      inp.value = val;
      state.grid[key] = val;
      render();
    });
  });
}

// ── Main Event Bindings ───────────────────────────────────────────────────────
function initEvents() {
  // Refresh
  document.getElementById('refresh-btn').addEventListener('click', () => {
    state.grid.seed = Math.floor(Math.random() * 999999);
    document.getElementById('seed-input').value = state.grid.seed;
    render();
  });

  // Download
  document.getElementById('download-btn').addEventListener('click', downloadSVG);

  // Seed
  document.getElementById('seed-input').addEventListener('change', e => {
    state.grid.seed = parseInt(e.target.value) || 0;
    render();
  });
  document.getElementById('seed-random-btn').addEventListener('click', () => {
    state.grid.seed = Math.floor(Math.random() * 999999);
    document.getElementById('seed-input').value = state.grid.seed;
    render();
  });

  // Back color
  document.getElementById('color-back').addEventListener('input', e => {
    state.colors.back = e.target.value;
    state.colors.backTransparent = false;
    document.getElementById('swatch-back').style.background = e.target.value;
    document.getElementById('swatch-back').classList.remove('swatch-empty');
    render();
  });
  document.getElementById('clear-back').addEventListener('click', () => {
    state.colors.backTransparent = !state.colors.backTransparent;
    const sw = document.getElementById('swatch-back');
    sw.classList.toggle('swatch-empty', state.colors.backTransparent);
    sw.style.background = state.colors.backTransparent ? '' : state.colors.back;
    render();
  });

  // Outline
  document.getElementById('outline-none').addEventListener('click', () => {
    state.colors.outline = null;
    document.getElementById('outline-none').classList.add('active');
    document.getElementById('outline-color').classList.remove('active');
    document.getElementById('swatch-outline').style.display = 'none';
    render();
  });
  document.getElementById('outline-color').addEventListener('click', () => {
    state.colors.outline = state.colors.outline || '#1a1a2e';
    document.getElementById('outline-none').classList.remove('active');
    document.getElementById('outline-color').classList.add('active');
    document.getElementById('swatch-outline').style.display = '';
    document.getElementById('swatch-outline').style.background = state.colors.outline;
    document.getElementById('color-outline').value = state.colors.outline;
    render();
  });
  document.getElementById('color-outline').addEventListener('input', e => {
    state.colors.outline = e.target.value;
    document.getElementById('swatch-outline').style.background = e.target.value;
    render();
  });

  // Front color add/remove
  document.getElementById('front-plus').addEventListener('click', () => {
    if (state.colors.front.length < 6) {
      const last = state.colors.front[state.colors.front.length-1];
      state.colors.front.push(last);
      state.palette = 'custom';
      document.getElementById('palette-select').value = 'custom';
      rebuildSwatches();
      render();
    }
  });
  document.getElementById('front-minus').addEventListener('click', () => {
    if (state.colors.front.length > 1) {
      state.colors.front.pop();
      state.palette = 'custom';
      document.getElementById('palette-select').value = 'custom';
      rebuildSwatches();
      render();
    }
  });

  // Palette select dropdown
  document.getElementById('palette-select').addEventListener('change', e => {
    state.palette = e.target.value;
    if (state.palette !== 'custom') {
      const cols = PALETTE_COLORS[state.palette];
      if (cols) state.colors.front = [...cols];
      rebuildSwatches();
    }
    render();
  });

  // Random palette button
  document.getElementById('random-palette-btn').addEventListener('click', () => {
    const keys = Object.keys(PALETTE_COLORS);
    state.palette = keys[Math.floor(Math.random() * keys.length)];
    document.getElementById('palette-select').value = state.palette;
    const cols = PALETTE_COLORS[state.palette];
    if (cols) state.colors.front = [...cols];
    rebuildSwatches();
    render();
  });

  // Open palette panel
  document.getElementById('open-palette-btn').addEventListener('click', openPalettePanel);

  // Style controls
  document.getElementById('ctrl-space').addEventListener('change', e => {
    state.style.space = parseInt(e.target.value);
    render();
  });
  document.getElementById('ctrl-density').addEventListener('change', e => {
    state.style.density = parseInt(e.target.value);
    render();
  });
  document.getElementById('ctrl-rotation').addEventListener('change', e => {
    state.style.rotation = e.target.value;
    render();
  });
  document.getElementById('ctrl-fade-dir').addEventListener('change', e => {
    state.style.fadeDir = e.target.value;
    render();
  });

  // Split buttons
  document.querySelectorAll('.split-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.split-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.style.split = parseInt(btn.dataset.split);
      render();
    });
  });

  // BG per block
  document.getElementById('bg-block-on').addEventListener('click', () => {
    state.style.bgPerBlock = true;
    document.getElementById('bg-block-on').classList.add('active');
    document.getElementById('bg-block-off').classList.remove('active');
    render();
  });
  document.getElementById('bg-block-off').addEventListener('click', () => {
    state.style.bgPerBlock = false;
    document.getElementById('bg-block-off').classList.add('active');
    document.getElementById('bg-block-on').classList.remove('active');
    render();
  });

  // Fade
  document.getElementById('fade-on').addEventListener('click', () => {
    state.style.fade = true;
    document.getElementById('fade-on').classList.add('active');
    document.getElementById('fade-off').classList.remove('active');
    document.getElementById('fade-dir-row').style.display = '';
    render();
  });
  document.getElementById('fade-off').addEventListener('click', () => {
    state.style.fade = false;
    document.getElementById('fade-off').classList.add('active');
    document.getElementById('fade-on').classList.remove('active');
    document.getElementById('fade-dir-row').style.display = 'none';
    render();
  });

  // Shape all/none/random
  document.getElementById('shapes-all-btn').addEventListener('click', () => {
    state.style.shapes = [...SHAPE_KEYS];
    syncShapeGrid();
    render();
  });
  document.getElementById('shapes-none-btn').addEventListener('click', () => {
    state.style.shapes = [SHAPE_KEYS[0]];
    syncShapeGrid();
    render();
  });
  document.getElementById('shapes-random-btn').addEventListener('click', () => {
    const n = 1 + Math.floor(Math.random() * 5);
    const shuffled = [...SHAPE_KEYS].sort(() => Math.random()-.5);
    state.style.shapes = shuffled.slice(0, n);
    syncShapeGrid();
    render();
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-'+panel).classList.add('active');
    });
  });

  // Overlay close
  document.getElementById('overlay').addEventListener('click', closeOverlay);

  // Batch modal open
  document.getElementById('open-batch-btn').addEventListener('click', () => {
    document.getElementById('batch-modal').classList.add('open');
    document.getElementById('overlay').classList.add('open');
  });
  document.getElementById('batch-modal-close').addEventListener('click', closeOverlay);
  document.getElementById('batch-modal-close2').addEventListener('click', closeOverlay);

  // Batch modal size preset
  document.getElementById('m-size-preset').addEventListener('change', e => {
    document.getElementById('m-custom-size').style.display = e.target.value === 'custom' ? '' : 'none';
  });

  // Batch run
  document.getElementById('batch-run-btn').addEventListener('click', runBatchModal);

  // Quick batch sidebar
  document.getElementById('quick-batch-btn').addEventListener('click', () => runQuickBatch(false));
  document.getElementById('csv-batch-btn').addEventListener('click', () => runQuickBatch(true));

  // Banner button
  document.querySelector('.banner-btn').addEventListener('click', () => {
    document.getElementById('open-batch-btn').click();
  });

  // Coffee button (no-op / placeholder)
  document.querySelector('.hbtn-coffee').addEventListener('click', () => {
    window.open('https://www.buymeacoffee.com', '_blank');
  });
}

// ── Initialize ────────────────────────────────────────────────────────────────
function init() {
  // Replace static front swatches with dynamic row
  const s1 = document.getElementById('swatch-front1');
  const s2 = document.getElementById('swatch-front2');
  const colorRow = s1 ? s1.closest('.color-row') : null;
  if (colorRow) {
    const swatchRow = document.createElement('div');
    swatchRow.id = 'swatch-front-row';
    swatchRow.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap';
    colorRow.insertBefore(swatchRow, s1);
    s1.remove();
    if (s2) s2.remove();
  }

  renderShapeGrid();
  renderPresetGrid();
  rebuildSwatches();
  syncControls();
  initSpinners();
  initEvents();
  render();
}

document.addEventListener('DOMContentLoaded', init);
