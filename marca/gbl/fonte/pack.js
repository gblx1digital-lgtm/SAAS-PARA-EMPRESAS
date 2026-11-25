/**
 * Gera o pacote final da marca GBL a partir do monograma "Linha de Conexão".
 *   node pack.js <pasta-de-saida>
 * Todo texto vira <path> (sem fontes externas). PNGs exportados com sharp.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const paper = require('paper');
const { build, clean } = require('./mono');
const { lockup, MONO } = require('./lockup');
const { setText } = require('./type');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
fs.mkdirSync(OUT, { recursive: true });

const C = {
  navy: '#0A1630',   // Azul-noite (principal)
  navy2: '#1B3478',  // Azul-profundo (gradiente do ícone)
  cobalt: '#3D6BFF', // Azul-cobalto (destaque)
  paper: '#F3F5FA',  // Névoa (fundos claros)
  rule: '#C9D2E6',   // Linha (divisória)
  white: '#FFFFFF',
};

const TAG = { slug: 'manrope', weight: 700 };
const SIDE = lockup('side', { mono: MONO, tag: TAG, cap: 15.5, tracking: 0.24, lead: MONO.sH, gapRule: 26, gapText: 24, ruleTop: 18, ruleBot: 82, ruleW: 1.4 });
const UNDER = lockup('under', { mono: MONO, tag: TAG, cap: 10.5, gapUnder: 20 });
const M = build(MONO);

const n = (v) => +(+v).toFixed(2);

/** SVG a partir de peças {d, fill}; viewBox com margem. */
function svgOf(vb, pieces, pad = 8, bg = null) {
  const x = n(vb.x - pad), y = n(vb.y - pad), w = n(vb.w + 2 * pad), h = n(vb.h + 2 * pad);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">` +
    (bg ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>` : '') +
    pieces.filter((p) => p.d).map((p) => `<path fill="${p.fill}" d="${p.d}"/>`).join('') + '</svg>\n';
}

const monoVB = { x: M.x0, y: M.top, w: M.w - M.x0, h: M.bottom - M.top };

const files = {
  'gbl-logo.svg': svgOf(SIDE.vb, [{ d: SIDE.parts.mono, fill: C.navy }, { d: SIDE.parts.rule, fill: C.rule }, { d: SIDE.parts.tag, fill: C.cobalt }]),
  'gbl-logo-branco.svg': svgOf(SIDE.vb, [{ d: SIDE.parts.mono, fill: C.white }, { d: SIDE.parts.rule, fill: C.white }, { d: SIDE.parts.tag, fill: C.white }]),
  'gbl-logo-vertical.svg': svgOf(UNDER.vb, [{ d: UNDER.parts.mono, fill: C.navy }, { d: UNDER.parts.tag, fill: C.cobalt }]),
  'gbl-logo-vertical-branco.svg': svgOf(UNDER.vb, [{ d: UNDER.parts.mono, fill: C.white }, { d: UNDER.parts.tag, fill: C.white }]),
  'gbl-letras.svg': svgOf(monoVB, [{ d: M.d, fill: C.navy }]),
  'gbl-letras-branco.svg': svgOf(monoVB, [{ d: M.d, fill: C.white }]),
};

// ─── Ícone: monograma branco centralizado sobre gradiente azul (seguro para corte em círculo)
function bakedMono(sc, tx, ty) {
  const p = new paper.CompoundPath(M.d);
  p.transform(new paper.Matrix(sc, 0, 0, sc, tx, ty));
  const d = clean(p.pathData);
  p.remove();
  return d;
}
function iconInner({ fill = 0.66, dx = 0.008, S = 512, gradId = 'g', fg = C.white } = {}) {
  const w = M.w - M.x0, h = M.bottom - M.top;
  const sc = (S * fill) / w;
  const tx = S / 2 - (M.x0 + w / 2) * sc + dx * S;
  const ty = S / 2 - (M.top + h / 2) * sc;
  return { bg: `url(#${gradId})`, d: bakedMono(sc, tx, ty), fg };
}
const GRAD = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy2}"/><stop offset="0.62" stop-color="${C.navy}"/></linearGradient>`;
function iconSVG({ fill = 0.66, radius = 0 } = {}) {
  const i = iconInner({ fill });
  const rect = radius ? `<rect width="512" height="512" rx="${radius}" fill="${i.bg}"/>` : `<rect width="512" height="512" fill="${i.bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>${GRAD('g')}</defs>${rect}<path fill="${i.fg}" d="${i.d}"/></svg>\n`;
}
files['gbl-icone.svg'] = iconSVG({ fill: 0.66 });
// Favicon: só o "G" (o GBL inteiro fica ilegível com 16-32 px na aba do navegador)
function faviconSVG() {
  const all = new paper.CompoundPath(M.d);
  const box = new paper.Path.Rectangle(new paper.Rectangle(M.x0 - 2, M.top - 2, M.xb - M.x0 + 2, M.bottom - M.top + 4));
  const g = all.intersect(box);
  all.remove(); box.remove();
  const b = g.bounds;
  const S = 512, target = 0.62 * S;
  const sc = target / Math.max(b.width, b.height);
  g.transform(new paper.Matrix(sc, 0, 0, sc, S / 2 - (b.x + b.width / 2) * sc, S / 2 - (b.y + b.height / 2) * sc));
  const d = clean(g.pathData);
  g.remove();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>${GRAD('g')}</defs><rect width="512" height="512" rx="112" fill="url(#g)"/><path fill="${C.white}" d="${d}"/></svg>\n`;
}
files['favicon.svg'] = faviconSVG();

for (const [name, svg] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), svg);

// ─── Folha de apresentação (vetorial, renderizada uma vez)
function label(text, x, y, color, size = 18, weight = 700, tracking = 0.14) {
  const t = setText(text, { slug: 'manrope', weight, size, x, y, tracking });
  return { svg: `<path fill="${color}" d="${t.d}"/>`, w: t.bb.x2 - t.bb.x1, bb: t.bb };
}
/** Coloca um conjunto de peças (coordenadas do logo) numa caixa: largura alvo, centro (cx, cy). */
function place(vb, pieces, cx, cy, width) {
  const s = width / vb.w;
  const tx = cx - (vb.x + vb.w / 2) * s, ty = cy - (vb.y + vb.h / 2) * s;
  return `<g transform="translate(${n(tx)} ${n(ty)}) scale(${n(s * 10000) / 10000})">` +
    pieces.filter((p) => p.d).map((p) => `<path fill="${p.fill}" d="${p.d}"/>`).join('') + '</g>';
}
let clipN = 0;
function avatar(cx, cy, d) {
  const id = `c${clipN++}`;
  const i = iconInner({ fill: 0.66 });
  const s = d / 512;
  return `<clipPath id="${id}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(d / 2)}"/></clipPath>` +
    `<g clip-path="url(#${id})"><g transform="translate(${n(cx - d / 2)} ${n(cy - d / 2)}) scale(${n(s * 100000) / 100000})">` +
    `<rect width="512" height="512" fill="url(#g)"/><path fill="${i.fg}" d="${i.d}"/></g></g>`;
}

function sheet() {
  const W = 2400, H = 1560, R1 = 820;
  const parts = [];
  // painéis
  parts.push(`<rect width="${W}" height="${H}" fill="${C.white}"/>`);
  parts.push(`<rect x="1440" width="960" height="${R1}" fill="${C.navy}"/>`);
  parts.push(`<rect y="${R1}" width="800" height="${H - R1}" fill="${C.paper}"/>`);
  parts.push(`<rect x="1600" y="${R1}" width="800" height="${H - R1}" fill="${C.paper}"/>`);
  parts.push(`<rect y="${R1}" width="${W}" height="1" fill="#E2E7F1"/>`);

  // rótulos
  parts.push(label('LOGO PRINCIPAL', 64, 84, '#8A95AD').svg);
  parts.push(label('VERSÃO VERTICAL · FUNDO ESCURO', 1504, 84, '#7F8DB4').svg);
  parts.push(label('ÍCONE / FOTO DE PERFIL', 64, R1 + 84, '#8A95AD').svg);
  parts.push(label('NO WHATSAPP', 864, R1 + 84, '#8A95AD').svg);
  parts.push(label('CORES', 1664, R1 + 84, '#8A95AD').svg);

  // logo principal (horizontal)
  parts.push(place(SIDE.vb, [{ d: SIDE.parts.mono, fill: C.navy }, { d: SIDE.parts.rule, fill: C.rule }, { d: SIDE.parts.tag, fill: C.cobalt }], 720, 440, 1060));
  // vertical branco no escuro
  parts.push(place(UNDER.vb, [{ d: UNDER.parts.mono, fill: C.white }, { d: UNDER.parts.tag, fill: C.white }], 1920, 450, 520));

  // ícone grande + tamanhos reais
  const AC = R1 + 400; // centro vertical da linha de ícones
  parts.push(avatar(64 + 165, AC, 330));
  const sizes = [[96], [48], [32]];
  let sx = 446;
  for (const [d] of sizes) {
    const cy = AC;
    parts.push(avatar(sx + d / 2, cy, d));
    const l = label(`${d} PX`, 0, 0, '#8A95AD', 14, 700, 0.12);
    parts.push(`<g transform="translate(${n(sx + d / 2 - l.w / 2 - l.bb.x1)} ${n(cy + 48 + 26)})">${l.svg}</g>`);
    sx += d + 36;
  }

  // mock do WhatsApp
  const bx = 864, by = R1 + 140, bw = 672;
  parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="470" rx="22" fill="#EFEAE2"/>`);
  parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="108" rx="22" fill="${C.white}"/><rect x="${bx}" y="${by + 86}" width="${bw}" height="22" fill="${C.white}"/>`);
  parts.push(`<rect x="${bx}" y="${by + 108}" width="${bw}" height="1" fill="#DAD5CC"/>`);
  parts.push(`<rect x="${bx + 0.5}" y="${by + 0.5}" width="${bw - 1}" height="469" rx="22" fill="none" stroke="#D9DFEA"/>`);
  parts.push(avatar(bx + 64, by + 54, 60));
  parts.push(label('GBL Sites & Marketing', bx + 110, by + 50, '#111B21', 24, 700, 0).svg);
  parts.push(label('Conta comercial', bx + 110, by + 82, '#667781', 18, 500, 0).svg);
  // balão
  const msg1 = 'Olá! Montei uma prévia de site';
  const msg2 = 'para a sua clínica. Posso te mostrar?';
  parts.push(`<rect x="${bx + 40}" y="${by + 160}" width="470" height="118" rx="14" fill="${C.white}"/>`);
  parts.push(label(msg1, bx + 64, by + 206, '#111B21', 21, 500, 0).svg);
  parts.push(label(msg2, bx + 64, by + 238, '#111B21', 21, 500, 0).svg);
  parts.push(label('10:24', bx + 452, by + 266, '#667781', 14, 500, 0).svg);
  // resposta
  parts.push(`<rect x="${bx + bw - 300}" y="${by + 310}" width="260" height="64" rx="14" fill="#D9FDD3"/>`);
  parts.push(label('Claro, pode mandar!', bx + bw - 278, by + 350, '#111B21', 21, 500, 0).svg);

  // cores
  const sw = [['Azul-noite', C.navy], ['Azul-profundo', C.navy2], ['Azul-cobalto', C.cobalt], ['Névoa', C.paper]];
  let cy = R1 + 140;
  for (const [nome, hex] of sw) {
    parts.push(`<rect x="1664" y="${cy}" width="120" height="84" rx="12" fill="${hex}" stroke="${hex === C.paper ? '#D5DCEA' : hex}"/>`);
    parts.push(label(nome, 1810, cy + 36, C.navy, 22, 700, 0).svg);
    parts.push(label(hex.toUpperCase(), 1810, cy + 66, '#6B7690', 18, 600, 0.06).svg);
    cy += 112;
  }
  parts.push(label('Letras GBL desenhadas sob medida', 1664, cy + 44, C.navy, 19, 700, 0).svg);
  parts.push(label('Slogan: Manrope Bold', 1664, cy + 74, '#6B7690', 18, 600, 0).svg);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${GRAD('g')}</defs>${parts.join('')}</svg>`;
}

(async () => {
  const png = async (svgFile, out, width, height, opts = {}) => {
    const svg = fs.readFileSync(path.join(OUT, svgFile));
    let img = sharp(svg, { density: opts.density || 1200 }).resize(width, height || null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    await img.png({ compressionLevel: 9 }).toFile(path.join(OUT, out));
  };
  await png('gbl-logo.svg', 'gbl-logo.png', 2000);
  await png('gbl-logo-branco.svg', 'gbl-logo-branco.png', 2000);
  await png('gbl-logo-vertical.svg', 'gbl-logo-vertical.png', 1400);
  await png('gbl-logo-vertical-branco.svg', 'gbl-logo-vertical-branco.png', 1400);
  await png('gbl-letras.svg', 'gbl-letras.png', 1600);
  await png('gbl-letras-branco.svg', 'gbl-letras-branco.png', 1600);
  await png('gbl-icone.svg', 'gbl-icone-1024.png', 1024, 1024, { density: 300 });
  await png('gbl-icone.svg', 'gbl-perfil-whatsapp.png', 640, 640, { density: 200 });
  await png('gbl-icone.svg', 'gbl-perfil-instagram.png', 1080, 1080, { density: 300 });
  await png('favicon.svg', 'favicon-512.png', 512, 512, { density: 144 });
  await sharp(Buffer.from(sheet()), { density: 72 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'apresentacao.png'));
  console.log('ok', fs.readdirSync(OUT).join(', '));
})();
