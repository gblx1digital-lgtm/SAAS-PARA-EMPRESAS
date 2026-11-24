/**
 * Teste de ponta a ponta com um Google Places SIMULADO (não usa internet nem gasta cota).
 *   npm test
 */
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert/strict');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

function place(id, name, extra = {}) {
  return {
    id, displayName: { text: name }, formattedAddress: `Rua A, 10 - Centro, Joinville - SC, 89201-000, Brasil`,
    shortFormattedAddress: 'Rua A, 10 - Centro',
    addressComponents: [
      { longText: 'Rua A', types: ['route'] }, { longText: '10', types: ['street_number'] },
      { longText: 'Centro', types: ['sublocality_level_1', 'sublocality'] },
      { longText: 'Joinville', types: ['administrative_area_level_2'] },
      { longText: 'Santa Catarina', shortText: 'SC', types: ['administrative_area_level_1'] },
      { longText: '89201-000', types: ['postal_code'] }
    ],
    location: { latitude: -26.3, longitude: -48.8 },
    nationalPhoneNumber: '(47) 99999-0001', internationalPhoneNumber: '+55 47 99999-0001',
    googleMapsUri: `https://maps.google.com/?cid=${id}`, rating: 4.7, userRatingCount: 120, businessStatus: 'OPERATIONAL',
    primaryTypeDisplayName: { text: 'Pizzaria' }, priceLevel: 'PRICE_LEVEL_MODERATE',
    priceRange: { startPrice: { currencyCode: 'BRL', units: '40' }, endPrice: { currencyCode: 'BRL', units: '60' } },
    regularOpeningHours: { weekdayDescriptions: ['segunda-feira: 18:00–23:00', 'terça-feira: Fechado'] },
    editorialSummary: { text: 'Pizzas artesanais no forno a lenha.' },
    delivery: true, takeout: true, dineIn: false,
    paymentOptions: { acceptsCreditCards: true, acceptsNfc: true },
    reviews: [{ authorAttribution: { displayName: 'Ana' }, rating: 5, text: { text: 'Melhor pizza da cidade!' }, relativePublishTimeDescription: 'há 2 semanas' }],
    photos: [{ name: `places/${id}/photos/F1`, widthPx: 800, heightPx: 600, authorAttributions: [{ displayName: 'Dono' }] },
      { name: `places/${id}/photos/F2`, widthPx: 800, heightPx: 600 }, { name: `places/${id}/photos/F3`, widthPx: 800, heightPx: 600 }],
    ...extra
  };
}

const calls = { search: [], details: 0, photo: 0, masks: [] };
const google = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    if (req.headers['x-goog-api-key'] !== 'chave-de-teste-123') { res.writeHead(403); return res.end('{"error":{"message":"bad key"}}'); }
    if (req.url === '/places:searchText') {
      const b = JSON.parse(body);
      calls.search.push(b);
      calls.masks.push(req.headers['x-goog-fieldmask']);
      res.setHeader('Content-Type', 'application/json');
      if (!b.textQuery.startsWith('pizzaria')) return res.end('{}');
      if (!b.pageToken) {
        return res.end(JSON.stringify({
          places: [
            place('P1', 'Pizzaria Sem Site'),
            place('P2', 'Pizzaria do Insta', { websiteUri: 'https://instagram.com/pizzadoinsta', nationalPhoneNumber: '(47) 3333-4444' }),
            place('P3', 'Pizzaria Com Site', { websiteUri: 'https://www.pizzariacomsite.com.br' })
          ],
          nextPageToken: 'PAGE2'
        }));
      }
      return res.end(JSON.stringify({ places: [place('P4', 'Pizzaria Fechada', { businessStatus: 'CLOSED_PERMANENTLY' }), place('P5', 'Pizzaria iFood', { websiteUri: 'https://www.ifood.com.br/delivery/x', rating: 4.2, reviews: [{ authorAttribution: { displayName: 'Rui' }, rating: 2, text: { text: 'Pizza chegou fria e demorou 2 horas.' } }, { authorAttribution: { displayName: 'Lia' }, rating: 4, text: { text: 'Gostosa, mas o atendimento no telefone foi ruim.' } }, { authorAttribution: { displayName: 'Bia' }, rating: 5, text: { text: 'Atendimento excelente!' } }] })] }));
    }
    if (req.url.startsWith('/places/P1?')) {
      calls.details++;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(place('P1', 'Pizzaria Sem Site', { rating: 4.9, userRatingCount: 130 })));
    }
    if (/^\/places\/\w+\/photos\/\w+\/media\?maxWidthPx=\d+$/.test(req.url)) {
      calls.photo++;
      res.setHeader('Content-Type', 'image/png');
      return res.end(PNG);
    }
    res.writeHead(404); res.end('{}');
  });
});

let app, base, cookie = '';
async function req(method, url, body) {
  const res = await fetch(base + url, {
    method, redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, type, data };
}

async function main() {
  await new Promise(r => google.listen(0, r));
  const gPort = google.address().port;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prosp-sites-'));
  const port = 3900 + Math.floor(Math.random() * 90);
  base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_PASSWORD: 'senha-de-teste', GOOGLE_PLACES_API_KEY: 'chave-de-teste-123',
      PLACES_BASE_URL: `http://127.0.0.1:${gPort}`, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  await new Promise((resolve, reject) => {
    app.stdout.on('data', d => { if (String(d).includes('rodando')) resolve(); });
    app.on('exit', c => reject(new Error(`servidor saiu (${c})`)));
  });

  let r = await req('GET', '/api/leads');
  assert.equal(r.status, 401, 'sem login deve bloquear');
  r = await req('POST', '/api/login', { password: 'errada' });
  assert.equal(r.status, 401);
  r = await req('POST', '/api/login', { password: 'senha-de-teste' });
  assert.equal(r.status, 200);

  r = await req('GET', '/api/config');
  assert.deepEqual(r.data.segments.map(s => s.id), ['odontologia', 'pizzaria', 'lanchonete']);
  assert.equal(r.data.googleConfigured, true);

  r = await req('POST', '/api/google/plan', { segments: ['pizzaria', 'lanchonete'], areas: ['Joinville, SC'] });
  assert.equal(r.data.queries, 3, 'pizzaria + lanchonete + hamburgueria em Joinville');

  r = await req('POST', '/api/google/search', { segments: ['pizzaria'], areas: ['Joinville, SC'], maxCalls: 10 });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.calls, 2, 'duas páginas');
  assert.equal(r.data.added, 3, 'sem site + Instagram + iFood');
  assert.equal(r.data.withSite, 1, 'site próprio fica de fora');
  assert.equal(r.data.closed, 1);
  for (const f of ['places.photos', 'places.reviews', 'places.regularOpeningHours', 'places.paymentOptions', 'places.websiteUri', 'nextPageToken']) {
    assert.ok(calls.masks[0].split(',').includes(f), `máscara pede ${f}`);
  }
  assert.equal(calls.search[0].languageCode, 'pt-BR');

  // Mesma busca não é repetida (não paga duas vezes)
  r = await req('POST', '/api/google/search', { segments: ['pizzaria'], areas: ['Joinville, SC'], maxCalls: 10 });
  assert.equal(r.data.calls, 0);

  r = await req('GET', '/api/leads');
  assert.equal(r.data.total, 3);
  assert.equal(r.data.stats.noSite, 3);
  const names = r.data.items.map(i => i.name);
  assert.equal(names[0], 'Pizzaria Sem Site', 'sem site + celular vem primeiro');
  const p1 = r.data.items[0];
  assert.equal(p1.mobile, true);
  assert.equal(p1.city, 'Joinville');
  assert.equal(p1.uf, 'SC');
  assert.equal(p1.photo, 'places/P1/photos/F1');
  const insta = r.data.items.find(i => i.name === 'Pizzaria do Insta');
  assert.equal(insta.instagram, 'https://instagram.com/pizzadoinsta');
  assert.equal(insta.intel.site.kind, 'social');
  assert.equal(insta.mobile, false);
  assert.equal(r.data.items.find(i => i.name === 'Pizzaria iFood').intel.site.label, 'Só iFood');

  // Filtros
  assert.equal((await req('GET', '/api/leads?site=nenhum')).data.total, 1);
  assert.equal((await req('GET', '/api/leads?mobile=1')).data.total, 2);
  assert.equal((await req('GET', '/api/leads?segment=odontologia')).data.total, 0);
  assert.equal((await req('GET', '/api/leads?state=SC&city=Joinville&minRating=4.5')).data.total, 2);
  // Nota baixa + reclamações
  r = await req('GET', '/api/leads?site=sem&maxRating=4.3&complaints=1&sort=nota_baixa');
  assert.deepEqual(r.data.items.map(i => [i.name, i.complaintCount]), [['Pizzaria iFood', 2]]);
  assert.equal((await req('GET', '/api/leads?complaints=1')).data.total, 1, 'elogio não conta como reclamação');
  const ifood = (await req('GET', `/api/leads/${r.data.items[0].id}`)).data;
  assert.deepEqual(ifood.reviews.map(x => x.complaint), [true, true, false]);
  assert.equal((await req('GET', '/api/leads?q=insta')).data.total, 1);

  // Ficha completa
  r = await req('GET', `/api/leads/${p1.id}`);
  const d = r.data;
  assert.equal(d.phoneFormatted, '(47) 99999-0001');
  assert.equal(d.cep, '89201-000');
  assert.equal(d.street, 'Rua A, 10');
  assert.equal(d.bairro, 'Centro');
  assert.equal(d.stateName, 'Santa Catarina');
  assert.equal(d.lat, -26.3);
  assert.equal(d.summary, 'Pizzas artesanais no forno a lenha.');
  assert.equal(d.priceLevel, '$$');
  assert.deepEqual(d.priceRange, { start: 40, end: 60, currency: 'BRL' });
  assert.equal(d.hours.length, 2);
  assert.equal(d.reviews[0].text, 'Melhor pizza da cidade!');
  assert.equal(d.photos.length, 3);
  assert.equal(d.photos[0].authors[0].name, 'Dono');
  assert.deepEqual(d.services.map(s => [s.label, s.value]), [['Delivery', true], ['Retirada no local', true], ['Comer no local', false]]);
  assert.deepEqual(d.payment.map(s => s.label), ['Cartão de crédito', 'Pagamento por aproximação']);

  // Fotos: baixadas uma vez e guardadas em cache; nomes inválidos são recusados
  r = await req('GET', `/api/photo?name=${encodeURIComponent('places/P1/photos/F1')}&w=400`);
  assert.equal(r.status, 200);
  assert.equal(r.type, 'image/png');
  assert.ok(r.data.equals(PNG));
  await req('GET', `/api/photo?name=${encodeURIComponent('places/P1/photos/F1')}&w=400`);
  assert.equal(calls.photo, 1, 'segunda vez vem do cache');
  r = await req('GET', `/api/photo?name=${encodeURIComponent('../../etc/passwd')}`);
  assert.equal(r.status, 400);

  // Anotações e status
  r = await req('PATCH', `/api/leads/${p1.id}`, { status: 'contatado', notes: 'Falei com o dono' });
  assert.equal(r.data.status, 'contatado');
  assert.equal((await req('GET', '/api/leads?status=contatado')).data.total, 1);

  // Atualizar do Google mantém anotações
  r = await req('POST', `/api/leads/${p1.id}/refresh`);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.rating, 4.9);
  assert.equal(r.data.notes, 'Falei com o dono');
  assert.equal(r.data.status, 'contatado');
  assert.equal(calls.details, 1);

  // Planilha
  r = await req('GET', '/api/leads.csv');
  const csv = r.data.toString('utf8');
  assert.ok(csv.includes('"Pizzaria Sem Site"'));
  assert.ok(csv.includes('https://wa.me/5547999990001'));
  assert.ok(csv.includes('Pizzas artesanais'));
  assert.ok(csv.includes('2★ Rui: Pizza chegou fria'));
  assert.ok(csv.split('\r\n').length === 4, 'cabeçalho + 3 empresas');

  // Excluir
  r = await req('DELETE', `/api/leads/${insta.id}`);
  assert.equal(r.status, 200);
  assert.equal((await req('GET', '/api/leads')).data.total, 2);

  // Estado inteiro: "SC" vira as cidades de SC
  r = await req('POST', '/api/google/plan', { segments: ['odontologia'], areas: ['SC'], minPopulation: 200000 });
  assert.ok(r.data.areas >= 3 && r.data.areas <= 10, `cidades grandes de SC: ${r.data.areas}`);

  // Nichos intercalados: mesmo com limite baixo, a rodada passa por todos os nichos
  calls.search.length = 0;
  r = await req('POST', '/api/google/search', { segments: ['odontologia', 'pizzaria', 'lanchonete'], areas: ['Blumenau, SC', 'Itajaí, SC'], maxCalls: 4 });
  assert.deepEqual(calls.search.map(s => s.textQuery), [
    'dentista em Blumenau, SC', 'pizzaria em Blumenau, SC', 'pizzaria em Blumenau, SC', 'lanchonete em Blumenau, SC'
  ]);
  assert.ok(r.data.queriesLeft > 0, 'avisa que faltam buscas');

  console.log('✅ Todos os testes passaram.');
}

main().catch(e => { console.error('❌', e); process.exitCode = 1; }).finally(() => { if (app) app.kill(); google.close(); });
