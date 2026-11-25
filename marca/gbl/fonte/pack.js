/**
 * Gera a logo da GBL: emblema branco (escudo com o monograma GBL, louros e estrela)
 * sobre fundo azul, num arquivo quadrado que serve como logo e como foto de perfil.
 *   npm run gerar        (grava gbl-logo.svg e gbl-logo.png em ../)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const F = require('./frames');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const C = { navy: '#0A1630', navy2: '#1B3478', white: '#FFFFFF' };

// Desenho aprovado
const SH = F.monogram(F.shieldFrame({}), { ring: 7, gap: 5.5, stroke: 12.5, spurY: 0.47, spurX: 0.42, bMid: 0.44, bNotch: 21, bAngle: 30, bTop: 7, bTopAngle: 45, footMode: 'band', footCut: 56 });
const LAU = F.laurel({ R: 124, cy: -4, f0: 14, f1: 126, n: 8, len: 30, wid: 11, beta: 42 });
const STAR = F.star(0, 140, 10, 4.2);
const PARTS = [LAU, STAR, SH.ring, SH.letters];

// Centro e maior distância do desenho ao centro: o emblema fica o maior possível sem ser cortado no círculo do perfil
const pts = [];
let bounds = null;
for (const d of PARTS) {
  const p = new F.paper.CompoundPath(d);
  bounds = bounds ? bounds.unite(p.bounds) : p.bounds.clone();
  p.flatten(0.5);
  for (const child of p.children) for (const s of child.segments) pts.push([s.point.x, s.point.y]);
  p.remove();
}
const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
const maxR = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));

const S = 1080;
const scale = (S * 0.45) / maxR; // 0,45 do lado = 90% do raio do círculo
const n = (v) => Math.round(v * 1e4) / 1e4;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy2}"/><stop offset="0.62" stop-color="${C.navy}"/></linearGradient></defs>` +
  `<rect width="${S}" height="${S}" fill="url(#g)"/>` +
  `<g transform="translate(${n(S / 2 - cx * scale)} ${n(S / 2 - cy * scale)}) scale(${n(scale)})">` +
  PARTS.map((d) => `<path fill="${C.white}" d="${d}"/>`).join('') + '</g></svg>\n';

fs.writeFileSync(path.join(OUT, 'gbl-logo.svg'), svg);
sharp(Buffer.from(svg), { density: 216 }).resize(S, S).flatten({ background: C.navy }).png({ compressionLevel: 9 })
  .toFile(path.join(OUT, 'gbl-logo.png'))
  .then(() => console.log(`ok: gbl-logo.png ${S}x${S} (emblema ocupa ${Math.round(90)}% do raio do círculo)`));
