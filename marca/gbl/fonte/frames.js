// Geometria das marcas GBL em moldura (hexágono, escudo) e cubo isométrico.
// Tudo é forma preenchida (sem traços), construída com operações booleanas do paper.js.
const paper = require('paper');
paper.setup(new paper.Size(4000, 4000));

const K = Math.sqrt(3) / 2;
const BIG = 2000;
const pt = (x, y) => new paper.Point(x, y);
function poly(pts) { const p = new paper.Path(pts.map(([x, y]) => pt(x, y))); p.closed = true; return p; }
function rect(x0, y0, x1, y1) { return poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); }
const U = (a, b) => { const r = a.unite(b); a.remove(); b.remove(); return r; };
const D = (a, b) => { const r = a.subtract(b); a.remove(); b.remove(); return r; };
const X = (a, b) => { const r = a.intersect(b); a.remove(); b.remove(); return r; };
const r2 = (n) => Math.round(n * 100) / 100;
const clean = (d) => d.replace(/-?\d*\.?\d+(e-?\d+)?/g, (m) => String(r2(parseFloat(m))));
const dOf = (p) => { const d = clean(p.pathData); return d; };

// ─── Molduras: f(d) devolve a forma recuada d para dentro (recuo exato, paralelo às bordas)
function hexFrame(R = 100) {
  return {
    kind: 'hex',
    f: (d) => { const r = R - d / K; return poly([0, 1, 2, 3, 4, 5].map((i) => [r * Math.cos(i * Math.PI / 3), r * Math.sin(i * Math.PI / 3)])); },
    halfW: (d) => R - d / K,
    top: (d) => -(R * K - d),
    bottom: (d) => R * K - d,
  };
}

// Escudo: topo reto, laterais retas até y0, base em arco ogival (dois arcos tangentes às laterais)
function shieldFrame({ W = 80, top = -100, y0 = 12, yb = 104 } = {}) {
  const h = yb - y0;
  const r = (W * W + h * h) / (2 * W);
  const cxR = W - r; // centro do arco da direita (fica à esquerda do eixo)
  const f = (d) => {
    const rr = r - d, xs = W - d, yt = top + d;
    const ybd = y0 + Math.sqrt(rr * rr - cxR * cxR);
    const p = new paper.Path();
    p.moveTo(pt(-xs, yt)); p.lineTo(pt(xs, yt)); p.lineTo(pt(xs, y0));
    const a1 = Math.atan2(ybd - y0, -cxR);
    p.arcTo(pt(cxR + rr * Math.cos(a1 / 2), y0 + rr * Math.sin(a1 / 2)), pt(0, ybd));
    const cxL = -cxR;
    const b1 = Math.atan2(ybd - y0, -cxL);
    const bm = (b1 + Math.PI) / 2;
    p.arcTo(pt(cxL + rr * Math.cos(bm), y0 + rr * Math.sin(bm)), pt(-xs, y0));
    p.closePath();
    return p;
  };
  return { kind: 'shield', f, halfW: (d) => W - d, top: (d) => top + d, bottom: null, W, r, y0, yb };
}

// Semiplano {q : (q - p)·n <= 0} (n aponta para fora). Recuar s = deslocar p para dentro.
function HP(px, py, nx, ny) {
  const L = Math.hypot(nx, ny); nx /= L; ny /= L;
  const tx = -ny, ty = nx, B = BIG;
  return poly([[px + tx * B, py + ty * B], [px - tx * B, py - ty * B], [px - tx * B - nx * B, py - ty * B - ny * B], [px + tx * B - nx * B, py + ty * B - ny * B]]);
}
const inter = (...ps) => ps.reduce((a, b) => X(a, b));

// Hexágono com laterais retas (ponta para cima), como na referência
function hexPointy(R = 100) {
  return {
    kind: 'hexp', R,
    f: (d) => { const r = R - d / K; return poly([0, 1, 2, 3, 4, 5].map((i) => [r * Math.cos(i * Math.PI / 3 - Math.PI / 2), r * Math.sin(i * Math.PI / 3 - Math.PI / 2)])); },
    halfW: (d) => R * K - d,
    apothem: (d) => R * K - d,
  };
}

// ─── Monograma GBL dentro da moldura: as letras seguem as bordas com a mesma espessura
function monogram(frame, o = {}) {
  const so = o.ring ?? 8, g = o.gap ?? 6, s = o.stroke ?? 13;
  const d2 = so + g, d3 = d2 + s;
  const F = (d) => frame.f(d);
  const hw = frame.halfW(d2);
  const w = (2 * hw - 2 * g) / 3;
  const cols = [[-hw, -hw + w], [-w / 2, w / 2], [hw - w, hw]];

  // G: contorno seguindo a moldura, abertura à direita e barra (esporão) no meio
  let [x0, x1] = cols[0];
  let G = X(F(d2), rect(x0 - BIG, -BIG, x1, BIG));
  G = D(G, X(F(d3), rect(x0 - BIG, -BIG, x1 - s, BIG)));
  const gb = G.bounds;
  const ySp = gb.top + (gb.bottom - gb.top) * (o.spurY ?? 0.5);
  G = D(G, X(F(d3), rect(x1 - s - 0.01, -BIG, x1 + 1, ySp - s / 2)));
  const xSp = x0 + (x1 - x0) * (o.spurX ?? 0.42);
  G = U(G, X(F(d2), rect(xSp, ySp - s / 2, x1, ySp + s / 2)));

  // B: duas "barrigas" com o canto direito cortado no ângulo da moldura (espessura sempre igual)
  [x0, x1] = cols[1];
  const probe = X(F(d2), rect(x0, -BIG, x1, BIG)); const bb = probe.bounds; probe.remove();
  const yMid = bb.top + (bb.bottom - bb.top) * (o.bMid ?? 0.5);
  const a = (o.bAngle ?? 30) * Math.PI / 180, cn = o.bNotch ?? s;
  const sa = Math.sin(a), ca = Math.cos(a);
  const yUB = yMid + s / 2, yLT = yMid - s / 2; // base da barriga de cima / topo da de baixo
  const bowl = (dd, sh) => {
    // sh = 0 (externo) ou s (interno)
    const up = inter(F(dd), HP(x0 + sh, 0, -1, 0), HP(x1 - sh, 0, 1, 0), HP(0, yUB - sh, 0, 1), HP(x1 - cn - sh * 0, yUB, sa, ca),
      ...(o.bTop ? [HP(x1 - o.bTop, bb.top, sa2(o.bTopAngle), -ca2(o.bTopAngle))] : []));
    const lo = inter(F(dd), HP(x0 + sh, 0, -1, 0), HP(x1 - sh, 0, 1, 0), HP(0, yLT + sh, 0, -1), HP(x1 - cn, yLT, sa, -ca),
      ...(o.bBot ? [HP(x1 - o.bBot, bb.bottom, sa2(o.bTopAngle), ca2(o.bTopAngle))] : []));
    return [up, lo];
  };
  const sa2 = (deg = 45) => Math.sin(deg * Math.PI / 180), ca2 = (deg = 45) => Math.cos(deg * Math.PI / 180);
  const [UO, LO] = bowl(d2, 0);
  // internos: mesmas linhas recuadas s para dentro
  const UI = inter(F(d3), HP(x0 + s, 0, -1, 0), HP(x1 - s, 0, 1, 0), HP(0, yUB - s, 0, 1),
    HP(x1 - cn - s * sa, yUB - s * ca, sa, ca),
    ...(o.bTop ? [HP(x1 - o.bTop - s * sa2(o.bTopAngle), bb.top + s * ca2(o.bTopAngle), sa2(o.bTopAngle), -ca2(o.bTopAngle))] : []));
  const LI = inter(F(d3), HP(x0 + s, 0, -1, 0), HP(x1 - s, 0, 1, 0), HP(0, yLT + s, 0, -1),
    HP(x1 - cn - s * sa, yLT + s * ca, sa, -ca),
    ...(o.bBot ? [HP(x1 - o.bBot - s * sa2(o.bTopAngle), bb.bottom - s * ca2(o.bTopAngle), sa2(o.bTopAngle), ca2(o.bTopAngle))] : []));
  let B = D(U(UO, LO), U(UI, LI));

  // L
  [x0, x1] = cols[2];
  let L = X(F(d2), rect(x0, -BIG, x0 + s, BIG));
  let foot;
  if (frame.kind === 'hexp') {
    // faixa ao longo da borda inferior direita (normal a 60°)
    const nx = Math.cos(Math.PI / 6 + Math.PI / 6), ny = Math.sin(Math.PI / 6 + Math.PI / 6); // (0.5, 0.866)
    const ap = frame.apothem(d2);
    foot = inter(F(d2), rect(x0, -BIG, x1, BIG), HP(nx * (ap - s), ny * (ap - s), -nx, -ny));
  } else if (frame.kind === 'hex') {
    foot = X(F(d2), rect(x0, frame.bottom(d3), x1, BIG));
  } else if (o.footMode === 'flat') {
    const yf = o.footTop ?? 60;
    foot = inter(F(d2), rect(x0, yf, x1, BIG));
  } else {
    foot = X(D(F(d2), F(d3)), rect(x0, o.footCut ?? 40, x1, BIG));
  }
  L = U(L, foot);

  const letters = U(U(G, B), L);
  const ring = D(F(0), F(so));
  const out = { letters: dOf(letters), ring: dOf(ring), outer: dOf(F(0)), solid: null, bounds: F(0).bounds };
  const solid = D(F(0), letters.clone());
  out.solid = dOf(solid);
  solid.remove(); letters.remove(); ring.remove();
  return out;
}

// ─── Louros e estrela (para a versão emblema)
function leaf(len, wid) {
  const k = (len * len) / (2 * wid);
  const rho = (k + wid / 2) / 2, e = (k - wid / 2) / 2;
  const a = new paper.Path.Circle(pt(0, -e), rho);
  const b = new paper.Path.Circle(pt(0, e), rho);
  return X(a, b); // lente apontando no eixo x, centrada na origem
}
function laurel({ cx = 0, cy = -6, R = 120, f0 = 16, f1 = 128, n = 7, len = 27, wid = 9.5, beta = 38, stemW = 2.6, shrink = 0.04 } = {}) {
  let all = null;
  const add = (p) => { all = all ? U(all, p) : p; };
  const rad = (x) => x * Math.PI / 180;
  for (const side of [1, -1]) {
    // haste: faixa fina de arco entre f0 e f1
    const ring = D(new paper.Path.Circle(pt(cx, cy), R + stemW / 2), new paper.Path.Circle(pt(cx, cy), R - stemW / 2));
    const sec = [[cx, cy]];
    for (let i = 0; i <= 40; i++) { const f = rad(f0 + (f1 - f0) * i / 40); sec.push([cx + side * 1000 * Math.sin(f), cy + 1000 * Math.cos(f)]); }
    add(X(ring, poly(sec)));
    const place = (f, outward, k) => {
      const F = rad(f);
      const px = cx + side * R * Math.sin(F), py = cy + R * Math.cos(F);
      const tx = side * Math.cos(F), ty = -Math.sin(F);      // tangente (subindo o ramo)
      const nx = side * Math.sin(F), ny = Math.cos(F);       // normal para fora
      const b = rad(beta) * (outward ? 1 : -1);
      const dx = tx * Math.cos(b) + nx * Math.sin(b), dy = ty * Math.cos(b) + ny * Math.sin(b);
      const L = len * (1 - k * shrink), Wd = wid * (1 - k * shrink * 0.8);
      const lf = leaf(L, Wd);
      lf.rotate(Math.atan2(dy, dx) * 180 / Math.PI, pt(0, 0));
      lf.translate(pt(px + dx * L * 0.5, py + dy * L * 0.5));
      add(lf);
    };
    const step = (f1 - f0) / n;
    for (let i = 0; i < n; i++) {
      place(f0 + step * (i + 0.2), true, i);
      place(f0 + step * (i + 0.2), false, i);
    }
    // folha da ponta, na direção do ramo
    const Fe = rad(f1);
    const ex = cx + side * R * Math.sin(Fe), ey = cy + R * Math.cos(Fe);
    const tx = side * Math.cos(Fe), ty = -Math.sin(Fe);
    const Lt = len * (1 - n * shrink);
    const tip = leaf(Lt, wid * (1 - n * shrink * 0.8));
    tip.rotate(Math.atan2(ty, tx) * 180 / Math.PI, pt(0, 0));
    tip.translate(pt(ex + tx * Lt * 0.45, ey + ty * Lt * 0.45));
    add(tip);
  }
  const d = dOf(all); all.remove();
  return d;
}
function star(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r : R;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  const p = poly(pts); const d = dOf(p); p.remove(); return d;
}

// ─── Cubo isométrico com uma letra em cada face
const GLYPH = {
  G: [[0, 0, 1, 0.2], [0, 0, 0.2, 1], [0, 0.8, 1, 1], [0.8, 0.44, 1, 1], [0.44, 0.44, 1, 0.64]],
  B: [[0, 0, 0.2, 1], [0, 0, 0.8, 0.2], [0, 0.4, 0.8, 0.6], [0, 0.8, 0.8, 1], [0.8, 0.2, 1, 0.4], [0.8, 0.6, 1, 0.8]],
  L: [[0, 0, 0.22, 1], [0, 0.78, 1, 1]],
};
function cube({ gap = 6, view = 'top', faces = { left: 'G', right: 'B', top: 'L' } } = {}) {
  const R = 100, c = R * K;
  const UL = [-c, -R / 2];
  const maps = view === 'top' ? {
    left: (u, v) => [UL[0] + u * c, UL[1] + u * R / 2 + v * R],
    right: (u, v) => [u * c, -u * R / 2 + v * R],
    top: (u, v) => [UL[0] + u * c + v * c, UL[1] - u * R / 2 + v * R / 2],
  } : {
    // visto de baixo: duas faces em cima (esq./dir.) e a face de baixo
    left: (u, v) => [UL[0] + u * c, UL[1] - u * R / 2 + v * R],
    right: (u, v) => [u * c, -R + u * R / 2 + v * R],
    top: (u, v) => [-c + u * c + v * c, R / 2 - u * R / 2 + v * R / 2],
  };
  const out = {};
  const gapLines = () => {
    const tl = (a, b, w) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
      const ex = (dx / L) * w, ey = (dy / L) * w; // estende um pouco para fora
      return poly([[a[0] + nx, a[1] + ny], [b[0] + nx + ex, b[1] + ny + ey], [b[0] - nx + ex, b[1] - ny + ey], [a[0] - nx, a[1] - ny]]);
    };
    const ends = view === 'top' ? [[-c, -R / 2], [c, -R / 2], [0, R]] : [[0, -R], [-c, R / 2], [c, R / 2]];
    let g = null;
    for (const e of ends) { const l = tl([0, 0], e, gap); g = g ? U(g, l) : l; }
    return g;
  };
  for (const [face, ch] of Object.entries(faces)) {
    let p = null;
    for (const [u0, v0, u1, v1] of GLYPH[ch]) {
      const q = poly([maps[face](u0, v0), maps[face](u1, v0), maps[face](u1, v1), maps[face](u0, v1)]);
      p = p ? U(p, q) : q;
    }
    p = D(p, gapLines());
    out[face] = dOf(p); p.remove();
  }
  const hex = poly([0, 1, 2, 3, 4, 5].map((i) => [R * Math.cos(i * Math.PI / 3 - Math.PI / 2), R * Math.sin(i * Math.PI / 3 - Math.PI / 2)]));
  out.bounds = hex.bounds; hex.remove();
  return out;
}

module.exports = { hexFrame, hexPointy, shieldFrame, monogram, laurel, star, cube, poly, rect, U, D, X, dOf, pt, paper };
