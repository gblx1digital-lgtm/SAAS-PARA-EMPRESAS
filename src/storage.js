/**
 * Armazenamento simples em arquivos JSON (no volume persistente DATA_DIR).
 *  leads.json     empresas encontradas (dados do Google) e suas anotações
 *  settings.json  cidades/bairros usados na busca
 *  google-log.json buscas já feitas no Google (para não pagar duas vezes)
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true });

const cache = new Map();
const locks = new Map();
const timers = new Map();

function file(name) { return path.join(DATA_DIR, `${name}.json`); }

function read(name, fallback) {
  if (cache.has(name)) return cache.get(name);
  let data = fallback;
  try {
    data = JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      // Arquivo corrompido: guarda uma cópia e começa do padrão, sem apagar o original
      try { fs.copyFileSync(file(name), `${file(name)}.corrompido-${Date.now()}`); } catch (err) { /* ignore */ }
    }
  }
  cache.set(name, data);
  return data;
}

function writeNow(name) {
  const data = cache.get(name);
  const tmp = `${file(name)}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file(name));
}

/** Grava em até 1 s (agrupa muitas alterações seguidas, como numa importação). */
function save(name) {
  if (timers.has(name)) return;
  timers.set(name, setTimeout(() => {
    timers.delete(name);
    try { writeNow(name); } catch (e) { console.error(`[storage] falha ao gravar ${name}:`, e.message); }
  }, 1000));
}

function flush() {
  for (const [name, t] of timers) { clearTimeout(t); timers.delete(name); writeNow(name); }
}

/** Executa alterações uma de cada vez (evita duas alterações simultâneas se atropelarem). */
function withLock(name, fn) {
  const prev = locks.get(name) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(name, next.catch(() => {}));
  return next;
}

process.on('SIGTERM', () => { try { flush(); } catch (e) { /* ignore */ } process.exit(0); });
process.on('SIGINT', () => { try { flush(); } catch (e) { /* ignore */ } process.exit(0); });

module.exports = { DATA_DIR, read, save, flush, withLock };
