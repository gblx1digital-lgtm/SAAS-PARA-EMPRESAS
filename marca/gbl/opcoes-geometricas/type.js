// Text -> outlined paths with tracking + kerning (opentype.js)
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const cache = {};
const fm = (n) => String(Math.round(n * 100) / 100);
function cmdsToD(cmds) {
  let d = '';
  let open = false;
  let lx = null, ly = null;
  for (const c of cmds) {
    if (c.type === 'L' && fm(c.x) === lx && fm(c.y) === ly) continue;
    if (c.x !== undefined) { lx = fm(c.x); ly = fm(c.y); }
    if (c.type === 'M') { if (open) d += 'Z'; open = true; }
    if (c.type === 'Z') { if (!open) continue; open = false; }
    if (c.type === 'M' || c.type === 'L') d += c.type + fm(c.x) + ' ' + fm(c.y);
    else if (c.type === 'Q') d += 'Q' + fm(c.x1) + ' ' + fm(c.y1) + ' ' + fm(c.x) + ' ' + fm(c.y);
    else if (c.type === 'C') d += 'C' + fm(c.x1) + ' ' + fm(c.y1) + ' ' + fm(c.x2) + ' ' + fm(c.y2) + ' ' + fm(c.x) + ' ' + fm(c.y);
    else if (c.type === 'Z') d += 'Z';
  }
  if (open) d += 'Z';
  return d;
}
function font(slug, weight) {
  const key = slug + weight;
  if (!cache[key]) {
    const buf = fs.readFileSync(path.join(__dirname, `node_modules/@fontsource/${slug}/files/${slug}-latin-${weight}-normal.woff`));
    cache[key] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return cache[key];
}
// returns {d, width, capH} with the baseline at y, starting at x; tracking in em
function setText(text, { slug, weight, size, x = 0, y = 0, tracking = 0 }) {
  const f = font(slug, weight);
  const scale = size / f.unitsPerEm;
  let cx = x;
  const parts = [];
  const glyphs = [...text].map((ch) => f.charToGlyph(ch));
  glyphs.forEach((g, i) => {
    const p = g.getPath(cx, y, size);
    parts.push(cmdsToD(p.commands));
    let adv = g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      adv += f.getKerningValue(g, glyphs[i + 1]) * scale;
      adv += tracking * size;
    }
    cx += adv;
  });
  // ink bounds
  const full = new opentype.Path();
  cx = x;
  glyphs.forEach((g, i) => {
    const p = g.getPath(cx, y, size);
    full.extend(p);
    let adv = g.advanceWidth * scale;
    if (i < glyphs.length - 1) adv += f.getKerningValue(g, glyphs[i + 1]) * scale + tracking * size;
    cx += adv;
  });
  const bb = full.getBoundingBox();
  const capH = (f.tables.os2.sCapHeight || f.charToGlyph('H').getBoundingBox().y2) * scale;
  return { d: parts.join(''), bb, capH, adv: cx - x };
}
// size such that cap height == capH
function sizeForCap(slug, weight, capH) {
  const f = font(slug, weight);
  const ch = f.tables.os2.sCapHeight || f.charToGlyph('H').getBoundingBox().y2;
  return (capH * f.unitsPerEm) / ch;
}
module.exports = { setText, sizeForCap, font };
