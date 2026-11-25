// Folha com as 3 opções no estilo da referência (marca + nome + slogan), versão escura e perfil do WhatsApp
const fs = require('fs');
const sharp = require('sharp');
const F = require('./frames');
const { setText } = require('./type');
const C = { navy: '#0A1630', navy2: '#1B3478', cobalt: '#3D6BFF', paper: '#F3F5FA', white: '#FFFFFF' };
const cfg = JSON.parse(process.argv[2] || '{}');

const hexO = { ring: 7.5, gap: 6, stroke: 13, spurY: 0.52, spurX: 0.42, bMid: 0.5, bNotch: 22, bAngle: 30, ...(cfg.hex || {}) };
const shO = { ring: 7, gap: 5.5, stroke: 12.5, spurY: 0.47, spurX: 0.42, bMid: 0.44, bNotch: 21, bAngle: 30, bTop: 7, bTopAngle: 45, footMode: 'band', footCut: 56, ...(cfg.shield || {}) };
const HX = F.monogram(F.hexPointy(100), hexO);
const SH = F.monogram(F.shieldFrame({}), shO);
const LAU = F.laurel({ R: 124, cy: -4, f0: 14, f1: 126, n: 8, len: 30, wid: 11, beta: 42, ...(cfg.laurel || {}) });
const STAR = F.star(0, 140, 10, 4.2);

// cada marca: peças {d, fill(cor)} e caixa
const marks = {
  hex: { box: [-100, -100, 200, 200], parts: (c1, c2) => [[HX.ring, c1], [HX.letters, c2]], solid: HX.solid, outer: HX.outer },
  escudo: { box: [-80, -100, 160, 210], parts: (c1, c2) => [[SH.ring, c1], [SH.letters, c2]], solid: SH.solid, outer: SH.outer },
  louros: { box: [-152, -112, 304, 264], parts: (c1, c2) => [[LAU, c1], [STAR, c1], [SH.ring, c1], [SH.letters, c2]], solid: SH.solid, outer: SH.outer },
};
const n = (v) => Math.round(v * 100) / 100;
function placed(box, parts, cx, cy, h) {
  const [bx, by, bw, bh] = box; const s = h / bh;
  const tx = cx - (bx + bw / 2) * s, ty = cy - (by + bh / 2) * s;
  return `<g transform="translate(${n(tx)} ${n(ty)}) scale(${n(s * 1e4) / 1e4})">` + parts.map(([d, f]) => `<path fill="${f}" d="${d}"/>`).join('') + '</g>';
}
function text(str, cx, y, size, weight, tracking, fill, slug = 'sora') {
  const t = setText(str, { slug, weight, size, x: 0, y, tracking });
  const w = t.bb.x2 - t.bb.x1;
  return `<g transform="translate(${n(cx - w / 2 - t.bb.x1)} 0)"><path fill="${fill}" d="${t.d}"/></g>`;
}
let clip = 0;
function avatar(key, cx, cy, D, variant) {
  const id = 'c' + clip++;
  const m = marks[key];
  let inner;
  if (variant === 'solid') {
    // fundo azul (gradiente), moldura sólida branca com as letras vazadas
    const box = key === 'louros' ? marks.escudo.box : m.box;
    const h = key === 'hex' ? D * 0.82 : D * 0.72;
    inner = placed(box, [[m.solid, C.white]], cx, cy + (key === 'hex' ? 0 : D * 0.012), h);
  } else {
    inner = placed(m.box, m.parts(C.white, C.white), cx, cy, D * 0.62);
  }
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${D / 2}"/></clipPath><g clip-path="url(#${id})"><rect x="${cx - D / 2}" y="${cy - D / 2}" width="${D}" height="${D}" fill="url(#g)"/>${inner}</g>`;
}

const W = 2400, H = 1500, colW = 800;
const opts = [['hex', '1 · HEXÁGONO'], ['escudo', '2 · ESCUDO'], ['louros', '3 · ESCUDO COM LOUROS']];
const P = [`<rect width="${W}" height="${H}" fill="${C.white}"/>`, `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy2}"/><stop offset="0.62" stop-color="${C.navy}"/></linearGradient></defs>`];
opts.forEach(([key, title], i) => {
  const cx = colW * i + colW / 2;
  if (i) P.push(`<rect x="${colW * i}" y="0" width="1" height="${H}" fill="#E3E8F2"/>`);
  P.push(text(title, cx, 80, 22, 700, 0.16, '#8A95AD', 'manrope'));
  // lockup no branco
  const m = marks[key];
  const mh = key === 'louros' ? 430 : 360;
  const mcy = key === 'louros' ? 395 : 380;
  P.push(placed(m.box, m.parts(C.navy, key === 'hex' ? C.cobalt : C.navy), cx, mcy, mh));
  P.push(text('GBL', cx, 690, 64, 800, 0.14, C.navy));
  P.push(text('SITES & MARKETING', cx, 738, 22, 600, 0.36, C.cobalt));
  // parte de baixo: cartão escuro com a versão branca + fotos de perfil sobre fundo claro
  P.push(`<rect x="${colW * i}" y="820" width="${colW}" height="${H - 820}" fill="${C.paper}"/>`);
  const cardX = colW * i + 48, cardW = 380;
  P.push(`<rect x="${cardX}" y="868" width="${cardW}" height="${H - 868 - 48}" rx="18" fill="${C.navy}"/>`);
  P.push(placed(m.box, m.parts(C.white, C.white), cardX + cardW / 2, 868 + (H - 868 - 48) / 2, key === 'louros' ? 330 : 300));
  const ax = colW * i + 48 + cardW + (colW - 48 - cardW) / 2;
  P.push(avatar(key, ax, 1040, 220, 'solid'));
  P.push(avatar(key, ax - 50, 1290, 48, 'solid'));
  P.push(avatar(key, ax + 40, 1290, 36, 'solid'));
  P.push(text('48 PX', ax - 50, 1346, 13, 700, 0.12, '#8A95AD', 'manrope'));
  P.push(text('36 PX', ax + 40, 1346, 13, 700, 0.12, '#8A95AD', 'manrope'));
  P.push(text('FOTO DE PERFIL', ax, 1184, 13, 700, 0.14, '#8A95AD', 'manrope'));
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${P.join('')}</svg>`;
fs.writeFileSync('opcoes.svg', svg);
sharp(Buffer.from(svg), { density: 72 }).png().toFile(cfg.out || 'opcoes.png').then(() => console.log('ok'));
