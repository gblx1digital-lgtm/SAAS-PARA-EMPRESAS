/**
 * Acesso só para você: uma senha (ADMIN_PASSWORD) e um cookie de sessão assinado.
 */
const crypto = require('crypto');

const COOKIE = 'sites_sessao';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

function password() { return String(process.env.ADMIN_PASSWORD || ''); }

// Segredo das sessões: SESSION_SECRET ou derivado da senha (trocar a senha encerra as sessões)
function secret() {
  return process.env.SESSION_SECRET || crypto.createHash('sha256').update(`sites:${password()}`).digest('hex');
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function checkPassword(given) {
  return password().length >= 8 && safeEqual(given || '', password());
}

function issue(res) {
  const exp = String(Date.now() + MAX_AGE_MS);
  res.cookie(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
    path: '/'
  });
}

function clear(res) { res.clearCookie(COOKIE, { path: '/' }); }

function readCookie(req) {
  const raw = String(req.headers.cookie || '');
  const part = raw.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`));
  return part ? decodeURIComponent(part.slice(COOKIE.length + 1)) : '';
}

function isLoggedIn(req) {
  const [exp, sig] = readCookie(req).split('.');
  if (!exp || !sig || !password()) return false;
  if (!(Number(exp) > Date.now())) return false;
  return safeEqual(sig, sign(exp));
}

function requireLogin(req, res, next) {
  if (isLoggedIn(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Faça login.' });
  return res.redirect('/login');
}

module.exports = { checkPassword, issue, clear, isLoggedIn, requireLogin };
