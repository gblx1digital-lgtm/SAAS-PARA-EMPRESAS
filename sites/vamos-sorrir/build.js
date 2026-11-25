/**
 * Gera o site na pasta dist/ a partir do conteudo.json e das fotos em fotos/.
 *   npm run build
 *
 * - Fotos: convertidas para WebP em 3 tamanhos (480, 960, 1600 px) com srcset.
 * - Gera index.html, politica-de-privacidade/, 404.html, sitemap.xml, robots.txt,
 *   favicon, imagem de compartilhamento (Open Graph) e cabeçalhos de segurança.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const opentype = require('opentype.js');
const tpl = require('./src/templates');

const ROOT = __dirname;
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const FOTOS = path.resolve(process.env.FOTOS_DIR || path.join(ROOT, 'fotos'));
const WIDTHS = [480, 960, 1600];

function hash(buf) { return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8); }

function loadContent() {
  const c = JSON.parse(fs.readFileSync(process.env.CONTEUDO_FILE || path.join(ROOT, 'conteudo.json'), 'utf8'));
  const avisos = [];
  const cl = c.clinica;
  if (!/^55\d{10,11}$/.test(String(cl.whatsapp))) throw new Error('clinica.whatsapp deve ter só números, com 55 + DDD (ex.: 5547988251098).');
  if (!/^https:\/\/[^/]+$/.test(c.site.url.replace(/\/+$/, ''))) throw new Error('site.url deve ser o domínio com https://, sem caminho (ex.: https://www.exemplo.com.br).');
  if (!cl.responsavelTecnico || !cl.croResponsavel) avisos.push('Falta o responsável técnico e o CRO (obrigatórios na divulgação odontológica).');
  if (!cl.googleMapsUrl) avisos.push('Falta o link exato do Google Maps (usando busca por nome e endereço).');
  if (!c.previa && avisos.length) {
    // Site publicado de verdade não pode sair sem o CRO
    if (!cl.responsavelTecnico || !cl.croResponsavel) throw new Error('Para publicar (previa: false), preencha clinica.responsavelTecnico e clinica.croResponsavel.');
  }
  return { c, avisos };
}

/** Acha a foto pelo nome, aceitando outra extensão (fachada.jpg, fachada.png, fachada.webp...). */
function findPhoto(file) {
  const exact = path.join(FOTOS, file);
  if (fs.existsSync(exact)) return exact;
  const base = path.parse(file).name.toLowerCase();
  const found = fs.existsSync(FOTOS) && fs.readdirSync(FOTOS).find(f => path.parse(f).name.toLowerCase() === base && /\.(jpe?g|png|webp|avif|heic)$/i.test(f));
  return found ? path.join(FOTOS, found) : null;
}

async function processImages(c) {
  const wanted = new Set([c.hero.foto, c.hero.fotoSecundaria, ...c.sobre.fotos, ...c.galeria.fotos.map(f => f.arquivo),
    ...(c.sobre.equipe || []).map(p => p.foto)].filter(Boolean));
  const images = {};
  const faltando = [];
  fs.mkdirSync(path.join(DIST, 'img'), { recursive: true });
  for (const file of wanted) {
    const src = findPhoto(file);
    if (!src) { faltando.push(file); continue; }
    const input = fs.readFileSync(src);
    const meta = await sharp(input).rotate().metadata();
    const origW = meta.autoOrient?.width || meta.width;
    const origH = meta.autoOrient?.height || meta.height;
    const base = `${path.parse(file).name}-${hash(input)}`;
    const variants = [];
    for (const w of WIDTHS) {
      const width = Math.min(w, origW);
      if (variants.some(v => v.width === width)) continue;
      const out = `img/${base}-${width}.webp`;
      const dest = path.join(DIST, out);
      if (!fs.existsSync(dest)) await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
      variants.push({ width, url: `/${out}` });
    }
    const mid = variants.find(v => v.width >= 960) || variants[variants.length - 1];
    images[file] = {
      src: mid.url,
      big: variants[variants.length - 1].url,
      srcset: variants.map(v => `${v.url} ${v.width}w`).join(', '),
      width: mid.width,
      height: Math.round(mid.width * origH / origW)
    };
  }
  return { images, faltando };
}

// ─── Logo em vetor: "Vamos" + "Sorrir" (vermelho) com o traço de sorriso e "ODONTOLOGIA", como na fachada.
// Texto convertido em curvas (não depende de fonte). Para usar o logo oficial, troque por um SVG da clínica.
function loadFont(file) {
  const buf = fs.readFileSync(path.join(ROOT, 'node_modules', '@fontsource', ...file.split('/')));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
// Converte os comandos da letra em texto de <path> (o toPathData do opentype.js 2 às vezes escreve "NaN")
function cmdsToD(cmds) {
  const f = (n) => String(Math.round(n * 100) / 100);
  let d = '';
  for (const c of cmds) {
    if (c.type === 'M' || c.type === 'L') d += c.type + f(c.x) + ' ' + f(c.y);
    else if (c.type === 'Q') d += 'Q' + f(c.x1) + ' ' + f(c.y1) + ' ' + f(c.x) + ' ' + f(c.y);
    else if (c.type === 'C') d += 'C' + f(c.x1) + ' ' + f(c.y1) + ' ' + f(c.x2) + ' ' + f(c.y2) + ' ' + f(c.x) + ' ' + f(c.y);
    else if (c.type === 'Z') d += 'Z';
  }
  return d;
}
function setText(font, str, x, y, size, tracking = 0) {
  const glyphs = [...str].map((ch) => font.charToGlyph(ch));
  const scale = size / font.unitsPerEm;
  let cx = x; const parts = []; const bb = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  glyphs.forEach((g, i) => {
    const p = g.getPath(cx, y, size);
    parts.push(cmdsToD(p.commands));
    // caixa calculada lendo os pontos (getBoundingBox/extend do opentype.js 2 alteram o cache da letra)
    for (const cmd of p.commands) for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
      if (typeof cmd[kx] === 'number') { bb.x1 = Math.min(bb.x1, cmd[kx]); bb.x2 = Math.max(bb.x2, cmd[kx]); bb.y1 = Math.min(bb.y1, cmd[ky]); bb.y2 = Math.max(bb.y2, cmd[ky]); }
    }
    let adv = g.advanceWidth * scale;
    if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * scale + tracking * size;
    cx += adv;
  });
  const d = parts.join('');
  if (/NaN/.test(d)) throw new Error(`Logo: desenho inválido em "${str}"`);
  return { d, bb };
}
function makeLogo(nome) {
  const heavy = loadFont('nunito/files/nunito-latin-900-normal.woff');
  const bold = loadFont('nunito/files/nunito-latin-800-normal.woff');
  const words = String(nome).trim().split(/\s+/);
  const last = words.pop(); const first = words.join(' ');
  const S = 40, base = 40;
  const a = setText(heavy, first, 0, base, S, -0.01);
  const gap = S * 0.24;
  const b = setText(heavy, last, a.bb.x2 + gap, base, S, -0.01);
  // traço de sorriso embaixo da primeira palavra
  const sx0 = a.bb.x1 + 2, sx1 = a.bb.x2 - 2, sy = base + 7;
  const arc = `M${sx0.toFixed(1)} ${sy}Q${((sx0 + sx1) / 2).toFixed(1)} ${sy + 13} ${sx1.toFixed(1)} ${sy}`;
  const sub = setText(bold, 'ODONTOLOGIA', b.bb.x1 + 1, base + 15, 8.6, 0.28);
  const x1 = Math.min(a.bb.x1, sub.bb.x1) - 1, y1 = Math.min(a.bb.y1, b.bb.y1) - 1;
  const x2 = Math.max(b.bb.x2, sub.bb.x2) + 1, y2 = Math.max(sy + 9, sub.bb.y2) + 1;
  const vb = `${x1.toFixed(1)} ${y1.toFixed(1)} ${(x2 - x1).toFixed(1)} ${(y2 - y1).toFixed(1)}`;
  const svg = (ink, red, subc) => `<svg class="logo-svg" viewBox="${vb}" role="img" aria-hidden="true" focusable="false"><path fill="${ink}" d="${a.d}"/><path fill="${red}" d="${b.d}"/><path d="${arc}" fill="none" stroke="${red}" stroke-width="3.2" stroke-linecap="round"/><path fill="${subc}" d="${sub.d}"/></svg>`;
  return { cor: svg('#2B2620', '#D9382B', '#6E675B'), claro: svg('#FFFFFF', '#FF7A6B', 'rgba(255,255,255,.7)') };
}

async function brandAssets(c, images) {
  // Favicon (SVG) e ícone para celular (PNG): sorriso vermelho no quadrado amarelo da fachada
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#F7C531"/><circle cx="14" cy="16" r="2.3" fill="#2B2620"/><circle cx="26" cy="16" r="2.3" fill="#2B2620"/><path d="M11 22.5Q20 32 29 22.5" fill="none" stroke="#D9382B" stroke-width="3.2" stroke-linecap="round"/></svg>`;
  fs.writeFileSync(path.join(DIST, 'favicon.svg'), svg);
  await sharp(Buffer.from(svg)).resize(180, 180).png().toFile(path.join(DIST, 'apple-touch-icon.png'));

  // Imagem de compartilhamento 1200×630: foto da fachada (se houver) + faixa com nome e endereço
  const W = 1200, H = 630;
  const e = c.clinica.endereco;
  const texto = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="0" y="${H - 210}" width="${W}" height="210" fill="#FFFFFF"/>
    <rect x="0" y="${H - 210}" width="12" height="210" fill="#F5C518"/>
    <text x="64" y="${H - 122}" font-family="Plus Jakarta Sans, DejaVu Sans, sans-serif" font-size="58" font-weight="700" fill="#211C14">${tpl.esc(c.clinica.nome)}</text>
    <text x="64" y="${H - 62}" font-family="Plus Jakarta Sans, DejaVu Sans, sans-serif" font-size="30" fill="#5C5446">Clínica odontológica · ${tpl.esc(`${e.rua}, ${e.numero} · ${e.bairro}, ${e.cidade} - ${e.uf}`)}</text>
  </svg>`);
  const hero = c.hero.foto ? findPhoto(c.hero.foto) : null;
  const fundo = hero
    ? sharp(hero).rotate().resize(W, H, { fit: 'cover', position: 'attention' })
    : sharp({ create: { width: W, height: H, channels: 3, background: '#FBF4DF' } });
  const og = await fundo.composite([{ input: texto, top: 0, left: 0 }]).jpeg({ quality: 82 }).toBuffer();
  const ogName = `og-${hash(og)}.jpg`;
  fs.writeFileSync(path.join(DIST, ogName), og);
  return ogName;
}

function copyStatic() {
  const fonts = path.join(DIST, 'fonts');
  fs.mkdirSync(fonts, { recursive: true });
  const fsrc = path.join(ROOT, 'node_modules', '@fontsource', 'plus-jakarta-sans', 'files');
  for (const w of [400, 500, 600, 700]) fs.copyFileSync(path.join(fsrc, `plus-jakarta-sans-latin-${w}-normal.woff2`), path.join(fonts, `jakarta-${w}.woff2`));
  const fr = path.join(ROOT, 'node_modules', '@fontsource', 'fraunces', 'files');
  fs.copyFileSync(path.join(fr, 'fraunces-latin-600-normal.woff2'), path.join(fonts, 'fraunces-600.woff2'));
  fs.copyFileSync(path.join(fr, 'fraunces-latin-600-italic.woff2'), path.join(fonts, 'fraunces-600-italic.woff2'));
  const out = {};
  for (const [name, ext] of [['styles', 'css'], ['main', 'js']]) {
    const buf = fs.readFileSync(path.join(ROOT, 'src', `${name}.${ext}`));
    out[ext] = `${name}-${hash(buf)}.${ext}`;
    fs.writeFileSync(path.join(DIST, out[ext]), buf);
  }
  return out;
}

function seoFiles(c) {
  const url = c.site.url.replace(/\/+$/, '');
  const hoje = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${url}/</loc><lastmod>${hoje}</lastmod><priority>1.0</priority></url>
  <url><loc>${url}/politica-de-privacidade/</loc><lastmod>${hoje}</lastmod><priority>0.2</priority></url>
</urlset>
`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), c.previa
    ? '# Prévia: o site ainda não deve aparecer no Google\nUser-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`);
}

function headers(c) {
  // Cabeçalhos de segurança (Netlify e Cloudflare Pages leem o arquivo _headers)
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com",
    "font-src 'self'",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    'frame-src https://www.google.com https://maps.google.com',
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'"
  ].join('; ');
  fs.writeFileSync(path.join(DIST, '_headers'), `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
${c.previa ? '  X-Robots-Tag: noindex, nofollow\n' : ''}
/img/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/*.css
  Cache-Control: public, max-age=31536000, immutable
/*.js
  Cache-Control: public, max-age=31536000, immutable
`);
}

async function main() {
  const { c, avisos } = loadContent();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const { images, faltando } = await processImages(c);
  const og = await brandAssets(c, images);
  const files = copyStatic();
  const assets = { images, og, css: files.css, js: files.js, logo: makeLogo(c.clinica.nome) };

  fs.writeFileSync(path.join(DIST, 'index.html'), tpl.home(c, assets));
  fs.mkdirSync(path.join(DIST, 'politica-de-privacidade'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'politica-de-privacidade', 'index.html'), tpl.privacidade(c, assets));
  fs.writeFileSync(path.join(DIST, '404.html'), tpl.naoEncontrada(c, assets));
  seoFiles(c);
  headers(c);

  console.log(`✅ Site gerado em dist/ (${c.previa ? 'PRÉVIA: fora do Google' : 'versão final'})`);
  console.log(`   Fotos otimizadas: ${Object.keys(images).length}`);
  if (faltando.length) console.log(`   ⚠️  Fotos ainda não enviadas (aparecem como espaço reservado): ${faltando.join(', ')}`);
  for (const a of avisos) console.log(`   ⚠️  ${a}`);
}

main().catch(e => { console.error('❌', e.message); process.exitCode = 1; });
