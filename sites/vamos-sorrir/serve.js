/** Servidor local só para ver o site: node serve.js → http://localhost:4000 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(process.env.DIST_DIR || path.join(__dirname, 'dist'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const PORT = Number(process.env.PORT) || 4000;
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(DIST, path.normalize(p));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    return res.end(fs.readFileSync(path.join(DIST, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Site em http://localhost:${PORT}`));
