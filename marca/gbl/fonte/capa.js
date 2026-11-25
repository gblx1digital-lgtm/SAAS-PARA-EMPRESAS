/**
 * Capa do WhatsApp Business (16:9, 1920x1080): emblema + GBL + slogan + frase do serviço.
 * O conteúdo fica na parte de cima e no meio: a faixa de baixo fica livre porque a foto
 * de perfil aparece por cima dela.
 *   node capa.js        (grava ../gbl-capa-whatsapp.png)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const F = require('./frames');
const { setText, sizeForCap } = require('./type');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const C = { navy: '#0A1630', navy2: '#1B3478', cobalt: '#3D6BFF', sky: '#A9BCFF', white: '#FFFFFF' };
const W = 1920, H = 1080;

const SH = F.monogram(F.shieldFrame({}), { ring: 7, gap: 5.5, stroke: 12.5, spurY: 0.47, spurX: 0.42, bMid: 0.44, bNotch: 21, bAngle: 30, bTop: 7, bTopAngle: 45, footMode: 'band', footCut: 56 });
const LAU = F.laurel({ R: 124, cy: -4, f0: 14, f1: 126, n: 8, len: 30, wid: 11, beta: 42 });
const STAR = F.star(0, 140, 10, 4.2);
const PARTS = [LAU, STAR, SH.ring, SH.letters];

let b = null;
for (const d of PARTS) { const p = new F.paper.CompoundPath(d); b = b ? b.unite(p.bounds) : p.bounds.clone(); p.remove(); }
const n = (v) => Math.round(v * 1e4) / 1e4;

function text(str, { cap, weight, tracking, slug = 'sora', x, y, fill, opacity = 1 }) {
  const size = sizeForCap(slug, weight, cap);
  const probe = setText(str, { slug, weight, size, x: 0, y, tracking });
  const t = setText(str, { slug, weight, size, x: x - probe.bb.x1, y, tracking });
  return { svg: `<path fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''} d="${t.d}"/>`, w: t.bb.x2 - t.bb.x1 };
}

// medidas do bloco: emblema à esquerda, textos à direita
const EH = 500;                       // altura do emblema
const s = EH / b.height;
const EW = b.width * s;
const gap = 90;
const capG = 150, capT = 34, capL = 30, capL2 = 26;
const probeW = (str, o) => text(str, { ...o, x: 0, y: 0, fill: '#000' }).w;
const textW = Math.max(
  probeW('GBL', { cap: capG, weight: 800, tracking: 0.12 }),
  probeW('SITES & MARKETING', { cap: capT, weight: 600, tracking: 0.34 }),
  probeW('Sites profissionais para clínicas e comércios', { cap: capL, weight: 600, tracking: 0, slug: 'manrope' }),
);
const groupW = EW + gap + textW;
const x0 = (W - groupW) / 2;
const cy = 470;                       // um pouco acima do meio: a foto de perfil cobre a parte de baixo
const ex = x0, ey = cy - EH / 2;
const tx = x0 + EW + gap;
// bloco de texto centralizado verticalmente no emblema
const lines = [
  { str: 'GBL', cap: capG, weight: 800, tracking: 0.12, fill: C.white, gapAfter: 46 },
  { str: 'SITES & MARKETING', cap: capT, weight: 600, tracking: 0.34, fill: C.sky, gapAfter: 74 },
  { str: 'Sites profissionais para clínicas e comércios', cap: capL, weight: 600, tracking: 0, slug: 'manrope', fill: C.white, gapAfter: 26 },
  { str: 'Atendimento online em todo o Brasil', cap: capL2, weight: 500, tracking: 0, slug: 'manrope', fill: C.white, opacity: 0.72, gapAfter: 0 },
];
const blockH = lines.reduce((a, l) => a + l.cap + l.gapAfter, 0);
let y = cy - blockH / 2;
const textSvg = [];
// filete fino entre o slogan e a frase
let ruleY = 0;
for (const l of lines) {
  y += l.cap;
  textSvg.push(text(l.str, { ...l, x: tx, y }).svg);
  if (l.str === 'SITES & MARKETING') ruleY = y + l.gapAfter / 2;
  y += l.gapAfter;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy2}"/><stop offset="0.62" stop-color="${C.navy}"/></linearGradient>
  <radialGradient id="luz" cx="0.3" cy="0.25" r="0.75"><stop offset="0" stop-color="#3D6BFF" stop-opacity="0.22"/><stop offset="1" stop-color="#3D6BFF" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<rect width="${W}" height="${H}" fill="url(#luz)"/>
<g transform="translate(${n(ex - b.x * s)} ${n(ey - b.y * s)}) scale(${n(s)})">${PARTS.map((d) => `<path fill="${C.white}" d="${d}"/>`).join('')}</g>
<rect x="${n(tx)}" y="${n(ruleY - 1)}" width="120" height="3" fill="${C.cobalt}"/>
${textSvg.join('\n')}
</svg>`;

fs.writeFileSync(path.join(OUT, 'gbl-capa-whatsapp.svg'), svg);
sharp(Buffer.from(svg), { density: 72 }).resize(W, H).flatten({ background: C.navy }).png({ compressionLevel: 9 })
  .toFile(path.join(OUT, 'gbl-capa-whatsapp.png'))
  .then(() => console.log(`ok: gbl-capa-whatsapp.png ${W}x${H}`));
