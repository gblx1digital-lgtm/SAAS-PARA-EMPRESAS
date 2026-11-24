/**
 * Busca de empresas pela API oficial do Google Maps (Places API "New").
 *
 * GOOGLE_PLACES_API_KEY: chave do Google Cloud (APIs e serviços → Credenciais), com a
 * "Places API (New)" ativada.
 *
 * - Text Search: até 20 empresas por página, no máximo 3 páginas (60) por busca.
 * - Pede TODOS os dados úteis de cada empresa: contato, endereço, horário, avaliações,
 *   fotos, serviços (delivery, retirada...), formas de pagamento, estacionamento, acessibilidade.
 * - Fotos: baixadas pelo servidor (a chave nunca vai para o navegador) e guardadas em cache.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const storage = require('./storage');
const leads = require('./leads');
const { BY_ID } = require('./segments');
const cities = require('./cities');
const intel = require('./intel');

const BASE_URL = () => (process.env.PLACES_BASE_URL || 'https://places.googleapis.com/v1').trim().replace(/\/+$/, '');
const REDO_AFTER_DAYS = 30; // depois disso, uma busca igual pode ser refeita (empresas novas)
const PHOTO_CACHE_DAYS = 30;

// Campos pedidos ao Google (sem o prefixo "places.")
const FIELDS = [
  'id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'addressComponents', 'location', 'plusCode',
  'types', 'primaryType', 'primaryTypeDisplayName', 'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteUri',
  'googleMapsUri', 'rating', 'userRatingCount', 'priceLevel', 'priceRange', 'businessStatus', 'regularOpeningHours',
  'editorialSummary', 'reviews', 'photos', 'delivery', 'dineIn', 'takeout', 'curbsidePickup', 'reservable',
  'servesBreakfast', 'servesLunch', 'servesDinner', 'servesBrunch', 'servesBeer', 'servesWine', 'servesCocktails',
  'servesDessert', 'servesCoffee', 'servesVegetarianFood', 'outdoorSeating', 'liveMusic', 'menuForChildren',
  'goodForChildren', 'goodForGroups', 'goodForWatchingSports', 'allowsDogs', 'restroom', 'paymentOptions',
  'parkingOptions', 'accessibilityOptions'
];
const SEARCH_MASK = [...FIELDS.map(f => `places.${f}`), 'nextPageToken'].join(',');
const DETAILS_MASK = FIELDS.join(',');

function apiKey() { return String(process.env.GOOGLE_PLACES_API_KEY || '').trim(); }
function isConfigured() { return apiKey().length > 10; }

async function call(url, { method = 'GET', mask, body } = {}) {
  const headers = { 'X-Goog-Api-Key': apiKey() };
  if (mask) headers['X-Goog-FieldMask'] = mask;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function searchPage(textQuery, pageToken) {
  const body = { textQuery, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20 };
  if (pageToken) body.pageToken = pageToken;
  const json = await call(`${BASE_URL()}/places:searchText`, { method: 'POST', mask: SEARCH_MASK, body });
  return { places: Array.isArray(json.places) ? json.places : [], nextPageToken: json.nextPageToken || null };
}

async function details(placeId) {
  return call(`${BASE_URL()}/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=BR`, { mask: DETAILS_MASK });
}

// ─── Conversão do formato do Google para o nosso ──────────────────────────────

function component(place, type, short = false) {
  const c = (place.addressComponents || []).find(x => (x.types || []).includes(type));
  return c ? (short ? (c.shortText || c.longText) : (c.longText || c.shortText)) || '' : '';
}

const PRICE = { PRICE_LEVEL_FREE: 'Grátis', PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$' };

function money(m) {
  if (!m || m.units == null) return null;
  return Number(m.units) + (Number(m.nanos) || 0) / 1e9;
}

/** Só os sim/não que o Google informou (campo ausente = não informado). */
function flags(obj, labels) {
  const out = [];
  for (const [key, label] of Object.entries(labels)) {
    if (obj && typeof obj[key] === 'boolean') out.push({ label, value: obj[key] });
  }
  return out;
}

const SERVICES = {
  delivery: 'Delivery', takeout: 'Retirada no local', dineIn: 'Comer no local', curbsidePickup: 'Retirada na calçada',
  reservable: 'Aceita reservas', servesBreakfast: 'Café da manhã', servesBrunch: 'Brunch', servesLunch: 'Almoço',
  servesDinner: 'Jantar', servesDessert: 'Sobremesas', servesCoffee: 'Café', servesBeer: 'Cerveja', servesWine: 'Vinho',
  servesCocktails: 'Drinks', servesVegetarianFood: 'Opções vegetarianas', outdoorSeating: 'Mesas ao ar livre',
  liveMusic: 'Música ao vivo', menuForChildren: 'Cardápio infantil', goodForChildren: 'Bom para crianças',
  goodForGroups: 'Bom para grupos', goodForWatchingSports: 'Bom para ver jogos', allowsDogs: 'Aceita cachorros', restroom: 'Banheiro'
};
const PAYMENT = {
  acceptsCreditCards: 'Cartão de crédito', acceptsDebitCards: 'Cartão de débito', acceptsCashOnly: 'Só dinheiro', acceptsNfc: 'Pagamento por aproximação'
};
const PARKING = {
  freeParkingLot: 'Estacionamento grátis', paidParkingLot: 'Estacionamento pago', freeStreetParking: 'Vaga grátis na rua',
  paidStreetParking: 'Vaga paga na rua', valetParking: 'Manobrista', freeGarageParking: 'Garagem grátis', paidGarageParking: 'Garagem paga'
};
const ACCESSIBILITY = {
  wheelchairAccessibleEntrance: 'Entrada acessível', wheelchairAccessibleParking: 'Estacionamento acessível',
  wheelchairAccessibleRestroom: 'Banheiro acessível', wheelchairAccessibleSeating: 'Assentos acessíveis'
};

/** Converte uma empresa do Google para o formato salvo no sistema. */
function toLead(place, segment) {
  const range = place.priceRange || {};
  const start = money(range.startPrice), end = money(range.endPrice);
  return {
    placeId: place.id,
    segment,
    name: place.displayName?.text || '',
    category: place.primaryTypeDisplayName?.text || '',
    types: place.types || [],
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
    phoneIntl: place.internationalPhoneNumber || '',
    address: place.formattedAddress || '',
    shortAddress: place.shortFormattedAddress || '',
    street: [component(place, 'route'), component(place, 'street_number')].filter(Boolean).join(', '),
    bairro: component(place, 'sublocality_level_1') || component(place, 'sublocality'),
    city: component(place, 'administrative_area_level_2'),
    uf: component(place, 'administrative_area_level_1', true),
    cep: component(place, 'postal_code'),
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    plusCode: place.plusCode?.globalCode || '',
    website: place.websiteUri || '',
    mapsUrl: place.googleMapsUri || '',
    rating: place.rating || null,
    ratingCount: place.userRatingCount || 0,
    priceLevel: PRICE[place.priceLevel] || '',
    priceRange: start != null || end != null ? { start, end, currency: range.startPrice?.currencyCode || range.endPrice?.currencyCode || 'BRL' } : null,
    businessStatus: place.businessStatus || '',
    hours: place.regularOpeningHours?.weekdayDescriptions || [],
    summary: place.editorialSummary?.text || '',
    services: flags(place, SERVICES),
    payment: flags(place.paymentOptions, PAYMENT),
    parking: flags(place.parkingOptions, PARKING),
    accessibility: flags(place.accessibilityOptions, ACCESSIBILITY),
    reviews: (place.reviews || []).map(r => ({
      author: r.authorAttribution?.displayName || 'Anônimo',
      authorUri: r.authorAttribution?.uri || '',
      rating: r.rating || null,
      text: r.text?.text || r.originalText?.text || '',
      when: r.relativePublishTimeDescription || '',
      at: r.publishTime || ''
    })),
    photos: (place.photos || []).slice(0, 10).map(p => ({
      name: p.name,
      width: p.widthPx || null,
      height: p.heightPx || null,
      authors: (p.authorAttributions || []).map(a => ({ name: a.displayName || '', uri: a.uri || '' }))
    })),
    fetchedAt: new Date().toISOString()
  };
}

function log() { return storage.read('google-log', {}); }

/** Quantas buscas (termo × área) uma rodada vai gerar, antes de rodar. */
function plan({ segments = [], areas = [], minPopulation = 0, redo = false }) {
  const segs = segments.filter(s => BY_ID[s]);
  const areaList = cities.expandAreas(areas.map(a => String(a || '').trim()).filter(Boolean), Number(minPopulation) || 0).slice(0, 6000);
  const history = log();
  const limit = Date.now() - REDO_AFTER_DAYS * 86400000;
  // Uma fila por nicho, cidade por cidade (todos os termos da cidade antes da próxima)
  let skippedRecent = 0;
  const queues = segs.map(seg => {
    const list = [];
    for (const area of areaList) for (const term of BY_ID[seg].terms) {
      const q = `${term} em ${area}`;
      const done = history[q];
      if (!redo && done && new Date(done.at).getTime() > limit) { skippedRecent++; continue; }
      list.push({ seg, q });
    }
    return list;
  });
  // Intercala os nichos (odontologia, pizzaria, lanchonete, odontologia...) para que toda rodada,
  // mesmo com limite baixo de consultas, traga empresas de todos os nichos escolhidos
  const pending = [];
  for (let i = 0; queues.some(l => i < l.length); i++) {
    for (const list of queues) if (i < list.length) pending.push(list[i]);
  }
  return { segs, areaList, pending, skippedRecent };
}

/**
 * Roda as buscas (termo do nicho × área) até o limite de chamadas.
 * Pode ser chamada de novo para continuar de onde parou.
 */
async function run({ segments = [], areas = [], maxCalls = 30, redo = false, minPopulation = 50000, onlyWithoutSite = true }) {
  if (!isConfigured()) throw Object.assign(new Error('Defina GOOGLE_PLACES_API_KEY nas variáveis do servidor.'), { status: 400 });
  const { segs, areaList, pending } = plan({ segments, areas, minPopulation, redo });
  if (!segs.length || !areaList.length) throw Object.assign(new Error('Escolha ao menos um nicho e uma cidade.'), { status: 400 });
  maxCalls = Math.min(Math.max(Number(maxCalls) || 30, 1), 200);

  const history = log();
  const result = { calls: 0, queriesDone: 0, queriesLeft: 0, added: 0, updated: 0, closed: 0, withSite: 0, errors: [] };
  return storage.withLock('leads', async () => {
    for (let i = 0; i < pending.length; i++) {
      const { seg, q } = pending[i];
      if (result.calls >= maxCalls) { result.queriesLeft = pending.length - i; break; }
      let token = null, found = 0;
      try {
        do {
          const page = await searchPage(q, token);
          result.calls++;
          for (const place of page.places) {
            found++;
            if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') { result.closed++; continue; }
            const lead = toLead(place, seg);
            // Quem já tem site próprio não entra como empresa nova (mas atualiza uma que já existe)
            if (onlyWithoutSite && !leads.exists(lead.placeId) && !intel.hasNoOwnSite(lead)) { result.withSite++; continue; }
            result[leads.upsert(lead)]++;
          }
          token = page.nextPageToken;
        } while (token && result.calls < maxCalls);
        history[q] = { at: new Date().toISOString(), found };
        result.queriesDone++;
      } catch (e) {
        result.errors.push(`${q}: ${e.message}`);
        if ([400, 401, 403, 429].includes(e.status)) {
          result.queriesLeft = pending.length - i; // chave inválida, sem permissão ou sem cota: para tudo
          break;
        }
      }
    }
    storage.save('leads');
    storage.save('google-log');
    return result;
  });
}

/** Busca de novo todos os dados de uma empresa (fotos e avaliações mais recentes). */
async function refresh(id) {
  if (!isConfigured()) throw Object.assign(new Error('Defina GOOGLE_PLACES_API_KEY nas variáveis do servidor.'), { status: 400 });
  const lead = leads.find(id);
  if (!lead) throw Object.assign(new Error('Empresa não encontrada.'), { status: 404 });
  const place = await details(lead.placeId);
  return storage.withLock('leads', async () => {
    leads.upsert(toLead(place, lead.segment));
    storage.save('leads');
    return leads.find(id);
  });
}

// ─── Fotos ────────────────────────────────────────────────────────────────────

const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const PHOTO_DIR = path.join(storage.DATA_DIR, 'photos');

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/**
 * Devolve { file, type } de uma foto em cache (baixa do Google se ainda não tiver).
 * width: 400 (miniatura) ou 1200 (tamanho grande).
 */
async function photo(name, width) {
  if (!PHOTO_NAME.test(String(name || ''))) throw Object.assign(new Error('Foto inválida.'), { status: 400 });
  if (!isConfigured()) throw Object.assign(new Error('Sem chave do Google.'), { status: 503 });
  const w = Number(width) >= 800 ? 1200 : 400;
  const base = path.join(PHOTO_DIR, crypto.createHash('sha1').update(`${name}|${w}`).digest('hex'));
  for (const [type, ext] of Object.entries(IMAGE_TYPES)) {
    try {
      const st = fs.statSync(`${base}.${ext}`);
      if (Date.now() - st.mtimeMs < PHOTO_CACHE_DAYS * 86400000) return { file: `${base}.${ext}`, type };
    } catch (e) { /* não está em cache */ }
  }
  const res = await fetch(`${BASE_URL()}/${name}/media?maxWidthPx=${w}`, { headers: { 'X-Goog-Api-Key': apiKey() } });
  const type = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!res.ok || !IMAGE_TYPES[type]) throw Object.assign(new Error(`Foto indisponível (HTTP ${res.status}).`), { status: 502 });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const file = `${base}.${IMAGE_TYPES[type]}`;
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, file);
  return { file, type };
}

module.exports = { run, plan, refresh, photo, isConfigured, log, toLead, FIELDS };
