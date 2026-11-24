/**
 * Empresas encontradas: cadastro, atualização, filtros, anotações e exportação.
 */
const crypto = require('crypto');
const storage = require('./storage');
const { BY_ID } = require('./segments');
const intel = require('./intel');
const { STATE_NAMES } = require('./cities');

const STATUSES = {
  novo: 'Nova',
  contatado: 'Já contatei',
  negociando: 'Negociando',
  cliente: 'Virou cliente',
  descartado: 'Descartada'
};

// Campos que vêm do Google (são atualizados a cada busca); o resto (status, notas) é seu
const GOOGLE_FIELDS = [
  'name', 'category', 'types', 'phone', 'phoneIntl', 'address', 'shortAddress', 'street', 'bairro', 'city', 'uf', 'cep',
  'lat', 'lng', 'plusCode', 'website', 'mapsUrl', 'rating', 'ratingCount', 'priceLevel', 'priceRange', 'businessStatus',
  'hours', 'summary', 'services', 'payment', 'parking', 'accessibility', 'reviews', 'photos', 'fetchedAt'
];

function all() { return storage.read('leads', []); }

/** Só dígitos, sem o 55 do país e sem zero à esquerda: "(48) 99999-8888" -> "48999998888". */
function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  d = d.replace(/^0+/, '');
  return d.length >= 10 && d.length <= 11 ? d : '';
}

/** Celular (DDD + 9 + 8 dígitos): provavelmente tem WhatsApp. */
function isMobile(digits) { return /^\d{2}9\d{8}$/.test(String(digits || '')); }

function formatPhone(d) {
  if (!d) return '';
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

function newId() { return `emp-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`; }

function byPlace(placeId) { return placeId ? all().find(l => l.placeId === placeId) || null : null; }
function exists(placeId) { return Boolean(byPlace(placeId)); }
function find(id) { return all().find(l => l.id === id) || null; }

/**
 * Inclui uma empresa nova ou atualiza os dados do Google de uma que já existe
 * (mesmo placeId). Nunca apaga suas anotações. Devolve 'added' | 'updated'.
 */
function upsert(input) {
  const phone = normalizePhone(input.phone);
  const data = { ...input, phone, mobile: isMobile(phone) };
  const existing = byPlace(input.placeId);
  if (existing) {
    for (const f of [...GOOGLE_FIELDS, 'mobile']) if (data[f] !== undefined) existing[f] = data[f];
    existing.updatedAt = new Date().toISOString();
    return 'updated';
  }
  const now = new Date().toISOString();
  const lead = { id: newId(), placeId: input.placeId, segment: BY_ID[input.segment] ? input.segment : 'odontologia' };
  for (const f of [...GOOGLE_FIELDS, 'mobile']) lead[f] = data[f] !== undefined ? data[f] : null;
  Object.assign(lead, { status: 'novo', notes: '', createdAt: now, updatedAt: now });
  all().push(lead);
  return 'added';
}

function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function siteMatches(lead, wanted) {
  const kind = intel.classifySite(lead).kind;
  if (wanted === 'sem') return kind !== 'proprio';
  return kind === wanted;
}

function filter(q = {}) {
  const text = norm(q.q).trim();
  const digits = String(q.q || '').replace(/\D/g, '');
  const minRating = Number(q.minRating) || 0;
  const maxRating = Number(q.maxRating) || 0;
  return all().filter(l =>
    (!q.segment || l.segment === q.segment) &&
    (!q.status || l.status === q.status) &&
    (!q.state || String(l.uf || '').toUpperCase() === String(q.state).toUpperCase()) &&
    (!q.city || norm(l.city) === norm(q.city)) &&
    (!q.mobile || l.mobile) &&
    (!q.photos || (l.photos || []).length > 0) &&
    (!minRating || Number(l.rating) >= minRating) &&
    (!maxRating || (Number(l.rating) > 0 && Number(l.rating) <= maxRating)) &&
    (!q.complaints || intel.complaints(l).length > 0) &&
    (!q.site || siteMatches(l, q.site)) &&
    (!q.priority || intel.score(l).level === q.priority) &&
    (!text || norm(l.name).includes(text) || norm(l.bairro).includes(text) || norm(l.city).includes(text) ||
      norm(l.notes).includes(text) || (digits.length >= 4 && String(l.phone).includes(digits)))
  );
}

/** Versão resumida para a lista (sem avaliações completas). */
function summary(l, i) {
  return {
    id: l.id, name: l.name, segment: l.segment, category: l.category, phone: l.phone, mobile: l.mobile,
    bairro: l.bairro, city: l.city, uf: l.uf, address: l.shortAddress || l.address, website: l.website, mapsUrl: l.mapsUrl,
    rating: l.rating, ratingCount: l.ratingCount, priceLevel: l.priceLevel, status: l.status, notes: l.notes,
    photo: (l.photos || [])[0]?.name || '', photoCount: (l.photos || []).length, reviewCount: (l.reviews || []).length,
    instagram: intel.instagramOf(l), complaintCount: intel.complaints(l).length, intel: i
  };
}

const SORTS = {
  prioridade: (a, b) => b.i.score - a.i.score || (b.l.ratingCount || 0) - (a.l.ratingCount || 0),
  nota_baixa: (a, b) => (Number(a.l.rating) || 9) - (Number(b.l.rating) || 9) || (b.l.ratingCount || 0) - (a.l.ratingCount || 0),
  nota: (a, b) => (Number(b.l.rating) || 0) - (Number(a.l.rating) || 0) || (b.l.ratingCount || 0) - (a.l.ratingCount || 0),
  avaliacoes: (a, b) => (b.l.ratingCount || 0) - (a.l.ratingCount || 0),
  recentes: (a, b) => String(b.l.createdAt).localeCompare(String(a.l.createdAt)),
  nome: (a, b) => a.l.name.localeCompare(b.l.name)
};

function query(q = {}) {
  const items = filter(q).map(l => ({ l, i: intel.score(l) }));
  items.sort((a, b) => (SORTS[q.sort] || SORTS.prioridade)(a, b) || a.l.name.localeCompare(b.l.name));
  const pageSize = Math.min(Math.max(Number(q.pageSize) || 30, 10), 200);
  const page = Math.max(Number(q.page) || 1, 1);
  return {
    total: items.length, page, pageSize,
    items: items.slice((page - 1) * pageSize, page * pageSize).map(({ l, i }) => summary(l, i))
  };
}

function stats() {
  const list = all();
  const bySegment = {}, byState = {}, bySite = { nenhum: 0, social: 0, plataforma: 0, proprio: 0 };
  const citiesByState = {};
  let mobile = 0, withPhotos = 0;
  for (const l of list) {
    bySegment[l.segment] = (bySegment[l.segment] || 0) + 1;
    bySite[intel.classifySite(l).kind]++;
    if (l.uf) {
      byState[l.uf] = (byState[l.uf] || 0) + 1;
      if (l.city) (citiesByState[l.uf] = citiesByState[l.uf] || new Set()).add(l.city);
    }
    if (l.mobile) mobile++;
    if ((l.photos || []).length) withPhotos++;
  }
  const cities = Object.fromEntries(Object.entries(citiesByState).map(([uf, s]) => [uf, [...s].sort()]));
  return { total: list.length, noSite: list.length - bySite.proprio, mobile, withPhotos, bySegment, bySite, byState, cities };
}

/** Ficha completa de uma empresa. */
function full(id) {
  const l = find(id);
  if (!l) return null;
  const bad = new Set(intel.complaints(l));
  return { ...l, reviews: (l.reviews || []).map(r => ({ ...r, complaint: bad.has(r) })), complaintCount: bad.size,
    phoneFormatted: formatPhone(l.phone), instagram: intel.instagramOf(l), intel: intel.score(l), stateName: STATE_NAMES[l.uf] || l.uf };
}

function update(id, changes) {
  const lead = find(id);
  if (!lead) return null;
  if (changes.status && STATUSES[changes.status]) lead.status = changes.status;
  if (typeof changes.notes === 'string') lead.notes = changes.notes.slice(0, 4000);
  lead.updatedAt = new Date().toISOString();
  storage.save('leads');
  return lead;
}

function remove(id) {
  const list = all();
  const i = list.findIndex(l => l.id === id);
  if (i < 0) return false;
  list.splice(i, 1);
  storage.save('leads');
  return true;
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  // Evita fórmula quando o arquivo é aberto no Excel/Sheets
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(q = {}) {
  const LEVEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  const yes = list => (list || []).filter(x => x.value).map(x => x.label).join(', ');
  const head = ['Prioridade', 'Pontos', 'Situação do site', 'Nome', 'Nicho', 'Categoria no Google', 'Telefone', 'Celular',
    'WhatsApp', 'Instagram', 'Site/link no Google', 'Endereço', 'Bairro', 'Cidade', 'UF', 'CEP', 'Latitude', 'Longitude',
    'Nota Google', 'Avaliações', 'Reclamações', 'Faixa de preço', 'Horário', 'Descrição', 'Serviços', 'Pagamento', 'Fotos no Google',
    'Status', 'Anotações', 'Google Maps'];
  const rows = filter(q).map(l => ({ l, i: intel.score(l) })).sort(SORTS.prioridade).map(({ l, i }) => [
    LEVEL[i.level], i.score, i.site.label, l.name, BY_ID[l.segment]?.label || l.segment, l.category,
    formatPhone(l.phone), l.mobile ? 'sim' : 'não', l.mobile ? `https://wa.me/55${l.phone}` : '', intel.instagramOf(l),
    l.website, l.address, l.bairro, l.city, l.uf, l.cep, l.lat, l.lng, l.rating || '', l.ratingCount || '',
    intel.complaints(l).map(r => `${r.rating}★ ${r.author}: ${r.text}`).join(' | '),
    l.priceLevel || (l.priceRange ? `R$ ${l.priceRange.start ?? ''}–${l.priceRange.end ?? ''}` : ''),
    (l.hours || []).join(' | '), l.summary, yes(l.services), yes(l.payment), (l.photos || []).length,
    STATUSES[l.status] || l.status, l.notes, l.mapsUrl
  ].map(csvCell).join(';'));
  return '﻿' + [head.map(csvCell).join(';'), ...rows].join('\r\n');
}

module.exports = { STATUSES, all, upsert, exists, find, full, query, stats, update, remove, toCsv, normalizePhone, isMobile, formatPhone };
