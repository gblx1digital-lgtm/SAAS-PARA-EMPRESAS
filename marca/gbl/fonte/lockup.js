const { build } = require('./mono');
const { setText, sizeForCap } = require('./type');

const MONO = { gap1: -2, bridge: true, bwT: 56, bwB: 60, gap2: 11, sV: 15, sH: 13.6, sC: 15.8, wL: 42 };
const TAG = { slug: 'manrope', weight: 600 };

// layout 'side': monogram | hairline | two-line tagline ; 'under': tagline under, justified
function lockup(layout = 'side', o = {}) {
  const m = build(o.mono || MONO);
  const W = m.w - m.x0;
  const tag = o.tag || TAG;
  const parts = { mono: m.d, tag: '', rule: '' };
  let vb;
  if (layout === 'side') {
    const cap = o.cap ?? 17;
    const size = sizeForCap(tag.slug, tag.weight, cap);
    const tr = o.tracking ?? 0.24;
    const xr = m.w + (o.gapRule ?? 26);
    const xt = xr + (o.ruleW ?? 1.6) + (o.gapText ?? 24);
    // two lines centred on midline (50): line gap so that the block spans the B bowls' counters
    const lead = o.lead ?? 16; // space between lines
    const y1 = 50 - lead / 2; // baseline of line 1
    const y2 = 50 + lead / 2 + cap; // baseline of line 2
    const t1 = setText('SITES &', { ...tag, size, x: xt, y: y1, tracking: tr });
    const t2 = setText('MARKETING', { ...tag, size, x: xt, y: y2, tracking: tr });
    // optical: shift by left side bearing so ink starts at xt
    const dx1 = xt - t1.bb.x1, dx2 = xt - t2.bb.x1;
    const tt1 = setText('SITES &', { ...tag, size, x: xt + dx1, y: y1, tracking: tr });
    const tt2 = setText('MARKETING', { ...tag, size, x: xt + dx2, y: y2, tracking: tr });
    parts.tag = tt1.d + tt2.d;
    const rTop = o.ruleTop ?? 14, rBot = o.ruleBot ?? 86;
    parts.rule = `M${xr} ${rTop}H${xr + (o.ruleW ?? 1.6)}V${rBot}H${xr}Z`;
    const right = Math.max(tt1.bb.x2, tt2.bb.x2);
    vb = { x: m.x0, y: m.top, w: right - m.x0, h: m.bottom - m.top };
  } else {
    const cap = o.cap ?? 11.5;
    const size = sizeForCap(tag.slug, tag.weight, cap);
    const yb = 100 + (o.gapUnder ?? 22) + cap;
    // solve tracking so ink width == monogram width
    const probe = setText('SITES & MARKETING', { ...tag, size, x: 0, y: yb, tracking: 0 });
    const n = 'SITES & MARKETING'.length - 1;
    const inkW0 = probe.bb.x2 - probe.bb.x1;
    const tr = (W - inkW0) / (n * size);
    const t0 = setText('SITES & MARKETING', { ...tag, size, x: 0, y: yb, tracking: tr });
    const t = setText('SITES & MARKETING', { ...tag, size, x: m.x0 - t0.bb.x1, y: yb, tracking: tr });
    parts.tag = t.d;
    parts.tr = tr;
    vb = { x: m.x0, y: m.top, w: W, h: yb - m.top };
  }
  return { parts, vb, m };
}

function svgLockup(L, colors, pad = 0) {
  const { vb, parts } = L;
  const x = +(vb.x - pad).toFixed(2), y = +(vb.y - pad).toFixed(2), w = +(vb.w + 2 * pad).toFixed(2), h = +(vb.h + 2 * pad).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">` +
    (colors.bg ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.bg}"/>` : '') +
    `<path fill="${colors.mono}" d="${parts.mono}"/>` +
    (parts.rule ? `<path fill="${colors.rule}" d="${parts.rule}"/>` : '') +
    `<path fill="${colors.tag}" d="${parts.tag}"/></svg>`;
}
module.exports = { lockup, svgLockup, MONO };
