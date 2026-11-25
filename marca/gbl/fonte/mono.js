// GBL monogram — one construction: cap height 100, a single circle module for G,
// half-module bowls for B, shared midline band (G crossbar == B waist), shared stroke.
const paper = require('paper');
paper.setup(new paper.Size(2000, 2000));

const r2 = (n) => Math.round(n * 100) / 100;
function clean(d) {
  // round numbers in paper's pathData
  return d.replace(/-?\d*\.?\d+(e-?\d+)?/g, (m) => String(r2(parseFloat(m))));
}
const unite = (a, b) => { const r = a.unite(b); a.remove(); b.remove(); return r; };
const minus = (a, b) => { const r = a.subtract(b); a.remove(); b.remove(); return r; };
const inter = (a, b) => { const r = a.intersect(b); a.remove(); b.remove(); return r; };
const Rect = (x, y, w, h) => new paper.Path.Rectangle(new paper.Rectangle(x, y, w, h));
const Ell = (cx, cy, rx, ry) => new paper.Path.Ellipse(new paper.Rectangle(cx - rx, cy - ry, 2 * rx, 2 * ry));
const Poly = (pts) => { const p = new paper.Path(pts.map((q) => new paper.Point(q[0], q[1]))); p.closed = true; return p; };

// "D" shape: rectangle from x0 to (x1 - r) plus a half-ellipse of rx at the right end
function D(x0, y0, x1, y1, rx) {
  const ry = (y1 - y0) / 2;
  const cx = x1 - rx;
  return unite(Rect(x0, y0, cx - x0 + 0.01, y1 - y0), inter(Ell(cx, y0 + ry, rx, ry), Rect(cx, y0 - 1, rx + 2, y1 - y0 + 2)));
}

function build(o = {}) {
  const sV = o.sV ?? 17, sH = o.sH ?? 15.5, sC = o.sC ?? 17.8; // vertical, horizontal, curve max
  const ov = o.ov ?? 1.6; // overshoot of round forms
  const mid = o.mid ?? 50; // midline (G bar / B waist centre)
  const gap1 = o.gap1 ?? 15, gap2 = o.gap2 ?? 14;
  const bwT = o.bwT ?? 51, bwB = o.bwB ?? 55, wL = o.wL ?? 44;
  const aTerm = o.aTerm ?? -42;
  const bandT = mid - sH / 2, bandB = mid + sH / 2;

  // ---- G
  const R = 50 + ov, cx = R, cy = 50;
  let g = minus(Ell(cx, cy, R, R), Ell(cx, cy, R - sC, R - sH - ov * 0.4));
  // opening wedge: from terminal angle round to the top of the crossbar band (upper-right)
  const a = (aTerm * Math.PI) / 180, far = 400;
  const wedge = Poly([[cx, cy], [cx + far * Math.cos(a), cy + far * Math.sin(a)], [cx + far, cy - far], [cx + far, bandT], [cx, bandT]]);
  g = minus(g, wedge);
  // crossbar
  const barX0 = cx + (o.barIn ?? 3);
  g = unite(g, inter(Rect(barX0, bandT, 2 * R, sH), Ell(cx, cy, R, R)));
  // ---- B
  const xb = 2 * R + gap1;
  if (o.bridge) g = unite(g, Rect(barX0, bandT, xb - barX0 + 1, sH));
  const topO = D(xb, 0, xb + bwT, bandB, (bandB) / 2);
  const rT = bandB / 2;
  const topI = D(xb + sV, sH, xb + bwT - sC, bandT, rT - sC);
  const rB = (100 - bandT) / 2;
  const botO = D(xb, bandT, xb + bwB, 100, rB);
  const botI = D(xb + sV, bandB, xb + bwB - sC, 100 - sH, rB - sC);
  let b = unite(minus(topO, topI), minus(botO, botI));
  // ---- L
  const xl = xb + bwB + gap2;
  let l = unite(Rect(xl, 0, sV, 100), Rect(xl, 100 - sH, wL, sH));

  let all = unite(unite(g, b), l);
  const bounds = all.bounds;
  const out = { d: clean(all.pathData), w: r2(bounds.right), x0: r2(bounds.left), top: r2(bounds.top), bottom: r2(bounds.bottom), xl, xb };
  all.remove();
  return out;
}
module.exports = { build, clean };
