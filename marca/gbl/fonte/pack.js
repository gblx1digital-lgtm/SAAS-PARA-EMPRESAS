/**
 * Gera o pacote da marca GBL — emblema: escudo com o monograma GBL, louros e estrela.
 *   npm run gerar        (grava em ../, ou: node pack.js <pasta>)
 * Todo texto vira <path>; PNGs exportados com sharp.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const F = require('./frames');
const { setText, sizeForCap } = require('./type');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
fs.mkdirSync(OUT, { recursive: true });

const C = {
  navy: '#0A1630',   // Azul-noite (principal)
  navy2: '#1B3478',  // Azul-profundo (gradiente das fotos de perfil)
  cobalt: '#3D6BFF', // Azul-cobalto (slogan e destaques)
  paper: '#F3F5FA',  // Névoa (fundos claros)
  white: '#FFFFFF',
};

// ─── Desenho (mesmos parâmetros da opção 3 aprovada)
const SH = F.monogram(F.shieldFrame({}), { ring: 7, gap: 5.5, stroke: 12.5, spurY: 0.47, spurX: 0.42, bMid: 0.44, bNotch: 21, bAngle: 30, bTop: 7, bTopAngle: 45, footMode: 'band', footCut: 56 });
const LAU = F.laurel({ R: 124, cy: -4, f0: 14, f1: 126, n: 8, len: 30, wid: 11, beta: 42 });
const STAR = F.star(0, 140, 10, 4.2);

const n = (v) => Math.round(v * 100) / 100;
function boundsOf(ds) {
  let b = null;
  for (const d of ds) {
    const p = new F.paper.CompoundPath(d);
    b = b ? b.unite(p.bounds) : p.bounds.clone();
    p.remove();
  }
  return { x: b.x, y: b.y, w: b.width, h: b.height, x2: b.x + b.width, y2: b.y + b.height };
}
const EMB = [LAU, STAR, SH.ring, SH.letters];
const eb = boundsOf(EMB);
const sb = boundsOf([SH.outer]);

/** Texto centralizado em cx (ou alinhado à esquerda em x), com a altura das maiúsculas = cap. */
function txt(str, { cap, weight, tracking, slug = 'sora', y, cx = null, x = null }) {
  const size = sizeForCap(slug, weight, cap);
  const probe = setText(str, { slug, weight, size, x: 0, y, tracking });
  const w = probe.bb.x2 - probe.bb.x1;
  const x0 = cx != null ? cx - w / 2 - probe.bb.x1 : x - probe.bb.x1;
  const t = setText(str, { slug, weight, size, x: x0, y, tracking });
  return { d: t.d, bb: t.bb };
}
function svgOf(vb, pieces, pad) {
  const x = n(vb.x - pad), y = n(vb.y - pad), w = n(vb.w + 2 * pad), h = n(vb.h + 2 * pad);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">` +
    pieces.filter((p) => p.d).map((p) => `<path fill="${p.fill}" d="${p.d}"/>`).join('') + '</svg>\n';
}
const union = (...bs) => {
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  const x2 = Math.max(...bs.map((b) => b.x2)), y2 = Math.max(...bs.map((b) => b.y2));
  return { x, y, w: x2 - x, h: y2 - y, x2, y2 };
};
const bbBox = (bb) => ({ x: bb.x1, y: bb.y1, w: bb.x2 - bb.x1, h: bb.y2 - bb.y1, x2: bb.x2, y2: bb.y2 });

// ─── Lockup vertical: emblema + GBL + slogan (como na apresentação das opções)
const Hm = eb.h;
const capG = 0.105 * Hm, capT = 0.037 * Hm;
const yG = eb.y2 + 0.12 * Hm + capG;
const yT = yG + 0.075 * Hm + capT;
const tG = txt('GBL', { cap: capG, weight: 800, tracking: 0.14, y: yG, cx: 0 });
const tT = txt('SITES & MARKETING', { cap: capT, weight: 600, tracking: 0.36, y: yT, cx: 0 });
const vVB = union(eb, bbBox(tG.bb), bbBox(tT.bb));

// ─── Lockup horizontal: escudo (sem louros, mais legível pequeno) + GBL + slogan
const Hs = sb.h;
const hx = sb.x2 + 0.17 * Hs;
const hCapG = 0.3 * Hs, hCapT = 0.074 * Hs, hGap = 0.12 * Hs;
const blockH = hCapG + hGap + hCapT;
const hTop = sb.y + (sb.h - blockH) / 2 - 0.02 * Hs;
const hG = txt('GBL', { cap: hCapG, weight: 800, tracking: 0.12, y: hTop + hCapG, x: hx });
const hT = txt('SITES & MARKETING', { cap: hCapT, weight: 600, tracking: 0.3, y: hTop + hCapG + hGap + hCapT, x: hx });
const hVB = union(sb, bbBox(hG.bb), bbBox(hT.bb));

const emb = (c1, c2 = c1) => [{ d: LAU, fill: c1 }, { d: STAR, fill: c1 }, { d: SH.ring, fill: c1 }, { d: SH.letters, fill: c2 }];
const shield = (c1, c2 = c1) => [{ d: SH.ring, fill: c1 }, { d: SH.letters, fill: c2 }];
const P = Math.round(Hm * 0.04);

const files = {
  'gbl-emblema.svg': svgOf(eb, emb(C.navy), P),
  'gbl-emblema-branco.svg': svgOf(eb, emb(C.white), P),
  'gbl-escudo.svg': svgOf(sb, shield(C.navy), P / 2),
  'gbl-escudo-branco.svg': svgOf(sb, shield(C.white), P / 2),
  'gbl-logo-vertical.svg': svgOf(vVB, [...emb(C.navy), { d: tG.d, fill: C.navy }, { d: tT.d, fill: C.cobalt }], P),
  'gbl-logo-vertical-branco.svg': svgOf(vVB, [...emb(C.white), { d: tG.d, fill: C.white }, { d: tT.d, fill: C.white }], P),
  'gbl-logo-horizontal.svg': svgOf(hVB, [...shield(C.navy), { d: hG.d, fill: C.navy }, { d: hT.d, fill: C.cobalt }], P / 2),
  'gbl-logo-horizontal-branco.svg': svgOf(hVB, [...shield(C.white), { d: hG.d, fill: C.white }, { d: hT.d, fill: C.white }], P / 2),
};

// ─── Fotos de perfil e favicon (fundo em gradiente azul, seguras para o corte em círculo)
const GRAD = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy2}"/><stop offset="0.62" stop-color="${C.navy}"/></linearGradient>`;
function placed(box, pieces, cx, cy, h) {
  const s = h / box.h;
  const tx = cx - (box.x + box.w / 2) * s, ty = cy - (box.y + box.h / 2) * s;
  return `<g transform="translate(${n(tx)} ${n(ty)}) scale(${n(s * 1e5) / 1e5})">` + pieces.map((p) => `<path fill="${p.fill}" d="${p.d}"/>`).join('') + '</g>';
}
const S = 512;
function profileSVG(kind, { radius = 0 } = {}) {
  const bg = `<rect width="${S}" height="${S}"${radius ? ` rx="${radius}"` : ''} fill="url(#g)"/>`;
  let inner;
  if (kind === 'escudo') inner = placed(sb, [{ d: SH.solid, fill: C.white }], S / 2, S / 2 + S * 0.012, S * 0.72);
  else if (kind === 'favicon') inner = placed(sb, [{ d: SH.solid, fill: C.white }], S / 2, S / 2 + S * 0.01, S * 0.8);
  else inner = placed(eb, emb(C.white), S / 2, S / 2 + S * 0.01, S * 0.66);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs>${GRAD('g')}</defs>${bg}${inner}</svg>\n`;
}
files['gbl-perfil.svg'] = profileSVG('escudo');
files['gbl-perfil-louros.svg'] = profileSVG('louros');
files['favicon.svg'] = profileSVG('favicon', { radius: 112 });

for (const [name, svg] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), svg);

// ─── Folha de apresentação
function label(str, x, y, color, size = 18, weight = 700, tracking = 0.14) {
  const t = setText(str, { slug: 'manrope', weight, size, x, y, tracking });
  return { svg: `<path fill="${color}" d="${t.d}"/>`, w: t.bb.x2 - t.bb.x1, bb: t.bb };
}
let clipN = 0;
function avatar(kind, cx, cy, d) {
  const id = `c${clipN++}`;
  const svg = profileSVG(kind).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<defs>.*?<\/defs>/, '');
  const s = d / S;
  return `<clipPath id="${id}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(d / 2)}"/></clipPath>` +
    `<g clip-path="url(#${id})"><g transform="translate(${n(cx - d / 2)} ${n(cy - d / 2)}) scale(${n(s * 1e5) / 1e5})">${svg}</g></g>`;
}
function sheet() {
  const W = 2400, H = 1560, R1 = 860;
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="${C.white}"/>`);
  p.push(`<rect x="1200" width="1200" height="${R1}" fill="${C.navy}"/>`);
  p.push(`<rect y="${R1}" width="800" height="${H - R1}" fill="${C.paper}"/>`);
  p.push(`<rect x="1600" y="${R1}" width="800" height="${H - R1}" fill="${C.paper}"/>`);
  p.push(`<rect y="${R1}" width="${W}" height="1" fill="#E2E7F1"/>`);
  p.push(label('EMBLEMA COMPLETO', 64, 84, '#8A95AD').svg);
  p.push(label('VERSÃO HORIZONTAL · FUNDO ESCURO', 1264, 84, '#7F8DB4').svg);
  p.push(label('FOTO DE PERFIL', 64, R1 + 84, '#8A95AD').svg);
  p.push(label('NO WHATSAPP', 864, R1 + 84, '#8A95AD').svg);
  p.push(label('CORES', 1664, R1 + 84, '#8A95AD').svg);

  const vb = vVB;
  p.push(placed(vb, [...emb(C.navy), { d: tG.d, fill: C.navy }, { d: tT.d, fill: C.cobalt }], 600, 470, 680));
  const hb = hVB;
  p.push(placed(hb, [...shield(C.white), { d: hG.d, fill: C.white }, { d: hT.d, fill: C.white }], 1800, 470, 300));

  // perfis: escudo (recomendado) e com louros, mais tamanhos reais
  const AC = R1 + 330;
  p.push(avatar('escudo', 190, AC, 250));
  p.push(avatar('louros', 470, AC, 250));
  p.push(label('RECOMENDADA', 190 - label('RECOMENDADA', 0, 0, '#000', 13, 700, 0.12).w / 2, AC + 160, '#3D6BFF', 13, 700, 0.12).svg);
  p.push(label('COM LOUROS', 470 - label('COM LOUROS', 0, 0, '#000', 13, 700, 0.12).w / 2, AC + 160, '#8A95AD', 13, 700, 0.12).svg);
  let sx = 120;
  for (const d of [96, 48, 36]) {
    const cy = R1 + 600;
    p.push(avatar('escudo', sx + d / 2, cy, d));
    const l = label(`${d} PX`, 0, 0, '#8A95AD', 13, 700, 0.12);
    p.push(`<g transform="translate(${n(sx + d / 2 - l.w / 2 - l.bb.x1)} ${n(cy + 48 + 24)})">${l.svg}</g>`);
    sx += d + 60;
  }

  // mock do WhatsApp
  const bx = 864, by = R1 + 140, bw = 672, bh = 470;
  p.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="22" fill="#EFEAE2"/>`);
  p.push(`<rect x="${bx}" y="${by}" width="${bw}" height="108" rx="22" fill="${C.white}"/><rect x="${bx}" y="${by + 86}" width="${bw}" height="22" fill="${C.white}"/>`);
  p.push(`<rect x="${bx}" y="${by + 108}" width="${bw}" height="1" fill="#DAD5CC"/>`);
  p.push(`<rect x="${bx + 0.5}" y="${by + 0.5}" width="${bw - 1}" height="${bh - 1}" rx="22" fill="none" stroke="#D9DFEA"/>`);
  p.push(avatar('escudo', bx + 64, by + 54, 60));
  p.push(label('GBL Sites & Marketing', bx + 110, by + 50, '#111B21', 24, 700, 0).svg);
  p.push(label('Conta comercial', bx + 110, by + 82, '#667781', 18, 500, 0).svg);
  p.push(`<rect x="${bx + 40}" y="${by + 160}" width="470" height="118" rx="14" fill="${C.white}"/>`);
  p.push(label('Olá! Montei uma prévia de site', bx + 64, by + 206, '#111B21', 21, 500, 0).svg);
  p.push(label('para a sua clínica. Posso te mostrar?', bx + 64, by + 238, '#111B21', 21, 500, 0).svg);
  p.push(label('10:24', bx + 452, by + 266, '#667781', 14, 500, 0).svg);
  p.push(`<rect x="${bx + bw - 300}" y="${by + 310}" width="260" height="64" rx="14" fill="#D9FDD3"/>`);
  p.push(label('Claro, pode mandar!', bx + bw - 278, by + 350, '#111B21', 21, 500, 0).svg);

  // cores e fontes
  const sw = [['Azul-noite', C.navy], ['Azul-profundo', C.navy2], ['Azul-cobalto', C.cobalt], ['Névoa', C.paper]];
  let cy = R1 + 140;
  for (const [nome, hex] of sw) {
    p.push(`<rect x="1664" y="${cy}" width="120" height="84" rx="12" fill="${hex}" stroke="${hex === C.paper ? '#D5DCEA' : hex}"/>`);
    p.push(label(nome, 1810, cy + 36, C.navy, 22, 700, 0).svg);
    p.push(label(hex.toUpperCase(), 1810, cy + 66, '#6B7690', 18, 600, 0.06).svg);
    cy += 108;
  }
  p.push(label('Monograma GBL desenhado sob medida', 1664, cy + 40, C.navy, 19, 700, 0).svg);
  p.push(label('Textos: Sora ExtraBold e SemiBold', 1664, cy + 70, '#6B7690', 18, 600, 0).svg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${GRAD('g')}</defs>${p.join('')}</svg>`;
}

(async () => {
  const png = async (svgFile, out, width, height, density = 1200) => {
    const svg = fs.readFileSync(path.join(OUT, svgFile));
    await sharp(svg, { density }).resize(width, height || null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, out));
  };
  await png('gbl-emblema.svg', 'gbl-emblema.png', 1600);
  await png('gbl-emblema-branco.svg', 'gbl-emblema-branco.png', 1600);
  await png('gbl-escudo.svg', 'gbl-escudo.png', 1000);
  await png('gbl-escudo-branco.svg', 'gbl-escudo-branco.png', 1000);
  await png('gbl-logo-vertical.svg', 'gbl-logo-vertical.png', 1400);
  await png('gbl-logo-vertical-branco.svg', 'gbl-logo-vertical-branco.png', 1400);
  await png('gbl-logo-horizontal.svg', 'gbl-logo-horizontal.png', 2000);
  await png('gbl-logo-horizontal-branco.svg', 'gbl-logo-horizontal-branco.png', 2000);
  // perfis: fundo opaco (sem transparência), para o WhatsApp não preencher de preto
  const flat = async (svgFile, out, size, density) => {
    const svg = fs.readFileSync(path.join(OUT, svgFile));
    await sharp(svg, { density }).resize(size, size).flatten({ background: C.navy }).png({ compressionLevel: 9 }).toFile(path.join(OUT, out));
  };
  await flat('gbl-perfil.svg', 'gbl-perfil-whatsapp.png', 640, 200);
  await flat('gbl-perfil.svg', 'gbl-perfil-instagram.png', 1080, 300);
  await flat('gbl-perfil-louros.svg', 'gbl-perfil-whatsapp-louros.png', 640, 200);
  await flat('gbl-perfil-louros.svg', 'gbl-perfil-instagram-louros.png', 1080, 300);
  await png('favicon.svg', 'favicon-512.png', 512, 512, 144);
  await sharp(Buffer.from(sheet()), { density: 72 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'apresentacao.png'));
  console.log('ok', fs.readdirSync(OUT).filter((f) => /\.(png|svg)$/.test(f)).length, 'arquivos');
})();
