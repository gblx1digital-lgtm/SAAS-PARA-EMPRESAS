/**
 * Prospecção de Sites — encontra no Google Maps empresas SEM SITE (odontologia, pizzaria,
 * lanchonete) e reúne todas as informações delas: contato, endereço, horário, avaliações e fotos.
 */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const auth = require('./src/auth');
const storage = require('./src/storage');
const leads = require('./src/leads');
const google = require('./src/google');
const cities = require('./src/cities');
const { SEGMENTS, DEFAULT_AREAS } = require('./src/segments');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
if (IS_PROD || process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow'); next(); });

// ─── Login ────────────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/login.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.css')));
app.get('/login.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.js')));

app.post('/api/login', loginLimiter, (req, res) => {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
    return res.status(503).json({ error: 'Defina ADMIN_PASSWORD (mínimo 8 caracteres) nas variáveis do servidor.' });
  }
  if (!auth.checkPassword(req.body?.password)) return res.status(401).json({ error: 'Senha incorreta.' });
  auth.issue(res);
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => { auth.clear(res); res.json({ ok: true }); });
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Daqui para baixo, só com login
app.use(auth.requireLogin);
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// ─── Configurações ────────────────────────────────────────────────────────────
function settings() {
  const s = storage.read('settings', {});
  return { areas: Array.isArray(s.areas) && s.areas.length ? s.areas : DEFAULT_AREAS };
}

app.get('/api/config', (req, res) => {
  res.json({
    segments: SEGMENTS,
    statuses: leads.STATUSES,
    settings: settings(),
    states: cities.states(),
    googleConfigured: google.isConfigured()
  });
});

app.put('/api/settings', (req, res) => {
  const b = req.body || {};
  const cur = storage.read('settings', {});
  if (b.areas !== undefined) {
    cur.areas = (Array.isArray(b.areas) ? b.areas : String(b.areas || '').split('\n')).map(x => String(x).trim()).filter(Boolean).slice(0, 300);
  }
  storage.save('settings');
  res.json(settings());
});

app.get('/api/cities', (req, res) => {
  const uf = cities.ufFromText(req.query.uf || '');
  if (!uf) return res.status(400).json({ error: 'Estado não encontrado.' });
  const list = cities.citiesOf(uf, Number(req.query.min) || 0);
  res.json({ uf, name: cities.STATE_NAMES[uf], total: list.length, cities: list });
});

// ─── Empresas ─────────────────────────────────────────────────────────────────
app.get('/api/leads', (req, res) => res.json({ ...leads.query(req.query), stats: leads.stats() }));

app.get('/api/leads.csv', (req, res) => {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="empresas-sem-site-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(leads.toCsv(req.query));
});

app.get('/api/leads/:id', (req, res) => {
  const lead = leads.full(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Empresa não encontrada.' });
  res.json(lead);
});

app.patch('/api/leads/:id', (req, res) => {
  const lead = leads.update(req.params.id, { status: req.body?.status, notes: req.body?.notes });
  if (!lead) return res.status(404).json({ error: 'Empresa não encontrada.' });
  res.json(leads.full(lead.id));
});

app.delete('/api/leads/:id', (req, res) => {
  if (!leads.remove(req.params.id)) return res.status(404).json({ error: 'Empresa não encontrada.' });
  res.json({ ok: true });
});

app.post('/api/leads/:id/refresh', async (req, res) => {
  try {
    await google.refresh(req.params.id);
    res.json(leads.full(req.params.id));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ─── Fotos (baixadas do Google pelo servidor, a chave não vai para o navegador) ───
app.get('/api/photo', async (req, res) => {
  try {
    const { file, type } = await google.photo(String(req.query.name || ''), req.query.w);
    res.set('Cache-Control', 'private, max-age=604800');
    res.type(type);
    res.sendFile(file);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ─── Busca no Google Maps ─────────────────────────────────────────────────────
app.post('/api/google/plan', (req, res) => {
  const { segs, areaList, pending, skippedRecent } = google.plan(req.body || {});
  res.json({ segments: segs.length, areas: areaList.length, queries: pending.length, skippedRecent });
});

app.post('/api/google/search', async (req, res) => {
  try {
    res.json(await google.run(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error('[erro]', err);
  res.status(500).json({ error: 'Erro interno.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔎 Prospecção de Sites rodando na porta ${PORT}`);
  if (!process.env.ADMIN_PASSWORD) console.warn('⚠️  Defina ADMIN_PASSWORD para conseguir entrar.');
  if (!google.isConfigured()) console.warn('⚠️  Defina GOOGLE_PLACES_API_KEY para buscar empresas no Google.');
});
