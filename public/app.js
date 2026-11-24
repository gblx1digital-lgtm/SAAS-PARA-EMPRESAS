/* Prospecção de Sites — tela principal */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';

let CONFIG = null;
let PAGE = 1;
let STATS = null;
const LEVEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Faça login.'); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
  return json;
}

function formatPhone(d) {
  if (!d) return '';
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}
const photoUrl = (name, w = 400) => `/api/photo?name=${encodeURIComponent(name)}&w=${w}`;
const segLabel = (id) => CONFIG.segments.find(s => s.id === id)?.label || id;
const stars = (r) => r ? `★ ${Number(r).toFixed(1).replace('.', ',')}` : 'sem nota';
const instaSearch = (l) => `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com "${l.name}" ${l.city || ''}`)}`;

// ─── Abas ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `tab-${t.dataset.tab}`));
  if (t.dataset.tab === 'empresas') loadLeads();
  else updatePlan();
}));

$('#btn-logout').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); window.location.href = '/login'; });

// ─── Empresas ─────────────────────────────────────────────────────────────────
const FILTERS = ['q', 'segment', 'state', 'city', 'site', 'rating', 'status', 'sort'];
const CHECKS = ['complaints', 'mobile', 'photos'];

function currentQuery() {
  const p = new URLSearchParams();
  for (const f of FILTERS) {
    const v = $(`#f-${f}`).value;
    if (!v) continue;
    if (f === 'rating') { const [kind, n] = v.split(':'); p.set(kind === 'max' ? 'maxRating' : 'minRating', n); }
    else p.set(f, v);
  }
  for (const c of CHECKS) if ($(`#f-${c}`).checked) p.set(c, '1');
  return p;
}

function renderKpis(s) {
  const k = (label, value, cls = '') => `<div class="kpi ${cls}"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
  $('#kpis').innerHTML = [
    k('Empresas', s.total),
    k('Sem site próprio', s.noSite, 'good'),
    ...CONFIG.segments.map(seg => k(seg.label, s.bySegment[seg.id] || 0)),
    k('Com celular', s.mobile),
    k('Com fotos', s.withPhotos)
  ].join('');
}

function fillStateCity(s) {
  const st = $('#f-state'), ct = $('#f-city');
  const curS = st.value, curC = ct.value;
  const ufs = Object.keys(s.byState).sort();
  st.innerHTML = '<option value="">Todos os estados</option>' + ufs.map(uf => `<option value="${esc(uf)}">${esc(uf)} (${s.byState[uf]})</option>`).join('');
  st.value = ufs.includes(curS) ? curS : '';
  const list = st.value ? (s.cities[st.value] || []) : [...new Set(Object.values(s.cities).flat())].sort();
  ct.innerHTML = '<option value="">Todas as cidades</option>' + list.map(c => `<option>${esc(c)}</option>`).join('');
  ct.value = list.includes(curC) ? curC : '';
}

function card(l) {
  const site = l.intel.site;
  const img = l.photo
    ? `<img loading="lazy" src="${photoUrl(l.photo)}" alt="Foto de ${esc(l.name)}">`
    : `<div class="no-photo">${esc(segLabel(l.segment))}</div>`;
  const wa = l.mobile ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/55${esc(l.phone)}">WhatsApp</a>` : '';
  return `<article class="emp" data-id="${esc(l.id)}">
    <div class="emp-photo">${img}${l.photoCount > 1 ? `<span class="photo-count">${l.photoCount} fotos</span>` : ''}</div>
    <div class="emp-body">
      <div class="emp-tags">
        <span class="tag seg-${esc(l.segment)}">${esc(segLabel(l.segment))}</span>
        <span class="tag site-${esc(site.kind)}">${esc(site.label)}</span>
        <span class="tag lvl-${esc(l.intel.level)}">Prioridade ${LEVEL[l.intel.level]}</span>
        ${l.complaintCount ? `<span class="tag complaint">${l.complaintCount} reclamaç${l.complaintCount > 1 ? 'ões' : 'ão'}</span>` : ''}
        ${l.status !== 'novo' ? `<span class="tag">${esc(CONFIG.statuses[l.status] || l.status)}</span>` : ''}
      </div>
      <h3 class="emp-name">${esc(l.name)}</h3>
      <div class="emp-meta">${esc([l.bairro, l.city, l.uf].filter(Boolean).join(' · '))}</div>
      <div class="emp-meta"><span class="rating">${stars(l.rating)}</span> ${l.ratingCount ? `(${l.ratingCount} avaliações)` : ''} ${l.priceLevel ? `· ${esc(l.priceLevel)}` : ''}</div>
      <div class="emp-meta phone">${l.phone ? esc(formatPhone(l.phone)) + (l.mobile ? ' <span class="badge">celular</span>' : '') : '<span class="muted">sem telefone</span>'}</div>
      ${l.notes ? `<div class="emp-notes">${esc(l.notes)}</div>` : ''}
      <div class="emp-actions">
        <button class="btn btn-primary btn-sm" data-open="${esc(l.id)}">Ver tudo</button>
        ${wa}
        ${safeUrl(l.mapsUrl) ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(l.mapsUrl)}">Maps</a>` : ''}
        ${safeUrl(l.instagram) ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(l.instagram)}">Instagram</a>` : ''}
      </div>
    </div>
  </article>`;
}

async function loadLeads() {
  const q = currentQuery();
  q.set('page', PAGE);
  $('#btn-csv').href = `/api/leads.csv?${currentQuery()}`;
  let data;
  try { data = await api(`/api/leads?${q}`); } catch (e) { $('#lead-list').innerHTML = `<p class="error">${esc(e.message)}</p>`; return; }
  STATS = data.stats;
  renderKpis(data.stats);
  fillStateCity(data.stats);
  $('#list-count').textContent = `${data.total} empresa(s) encontradas com esses filtros.`;
  $('#lead-list').innerHTML = data.items.length ? data.items.map(card).join('')
    : `<div class="empty card"><h3>Nenhuma empresa aqui ainda</h3><p class="muted">Vá em <strong>Buscar no Google</strong>, escolha os nichos e as cidades e clique em Buscar.</p></div>`;
  const pages = Math.ceil(data.total / data.pageSize);
  $('#pager').innerHTML = pages > 1
    ? `<button class="btn btn-ghost btn-sm" ${PAGE <= 1 ? 'disabled' : ''} data-page="${PAGE - 1}">‹ Anterior</button>
       <span class="muted">Página ${PAGE} de ${pages}</span>
       <button class="btn btn-ghost btn-sm" ${PAGE >= pages ? 'disabled' : ''} data-page="${PAGE + 1}">Próxima ›</button>`
    : '';
}

let typing;
for (const f of FILTERS) {
  $(`#f-${f}`).addEventListener(f === 'q' ? 'input' : 'change', () => {
    clearTimeout(typing);
    typing = setTimeout(() => { PAGE = 1; loadLeads(); }, f === 'q' ? 300 : 0);
  });
}
$('#f-state').addEventListener('change', () => { $('#f-city').value = ''; });
for (const c of CHECKS) $(`#f-${c}`).addEventListener('change', () => { PAGE = 1; loadLeads(); });

// Atalho: sem site + nota baixa + reclamações (quem mais precisa melhorar a imagem)
function setFilters(values) {
  for (const f of FILTERS) $(`#f-${f}`).value = values[f] ?? (f === 'site' ? 'sem' : f === 'sort' ? 'prioridade' : '');
  for (const c of CHECKS) $(`#f-${c}`).checked = Boolean(values[c]);
  PAGE = 1;
  loadLeads();
}
$('#preset-bad').addEventListener('click', () => setFilters({
  site: 'sem', rating: 'max:4.3', complaints: true, sort: 'nota_baixa', segment: $('#f-segment').value, state: $('#f-state').value, city: $('#f-city').value
}));
$('#preset-clear').addEventListener('click', () => setFilters({}));
$('#pager').addEventListener('click', (e) => {
  const b = e.target.closest('[data-page]');
  if (b) { PAGE = Number(b.dataset.page); loadLeads(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
$('#lead-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (b) openDetail(b.dataset.open);
  else if (e.target.closest('.emp-photo')) openDetail(e.target.closest('.emp').dataset.id);
});

// ─── Ficha completa ───────────────────────────────────────────────────────────
let CURRENT = null;

function yesNo(list) {
  if (!list || !list.length) return '<span class="muted">Não informado pelo Google</span>';
  return `<div class="flags">${list.map(x => `<span class="flag ${x.value ? 'yes' : 'no'}">${x.value ? '✓' : '✕'} ${esc(x.label)}</span>`).join('')}</div>`;
}

function section(title, body) { return `<section class="d-sec"><h3>${esc(title)}</h3>${body}</section>`; }

function renderDetail(l) {
  CURRENT = l;
  $('#d-name').textContent = l.name;
  $('#d-sub').textContent = [segLabel(l.segment), l.category !== segLabel(l.segment) ? l.category : '', [l.city, l.uf].filter(Boolean).join(' - ')].filter(Boolean).join(' · ');
  const i = l.intel;
  const photos = l.photos || [];
  const gallery = photos.length
    ? `<div class="gallery">${photos.map((p, idx) => `<button class="thumb" data-photo="${idx}"><img loading="lazy" src="${photoUrl(p.name)}" alt="Foto ${idx + 1} de ${esc(l.name)}"></button>`).join('')}</div>
       <p class="muted small">Fotos do Google Maps. Clique para ampliar. Para usar no site do cliente, peça autorização ou use as fotos que ele mesmo enviar.</p>`
    : '<p class="muted">O Google não tem fotos desta empresa.</p>';

  const contact = `<dl class="info">
    <dt>Telefone</dt><dd>${l.phone ? `<strong>${esc(l.phoneFormatted)}</strong> ${l.mobile ? '<span class="badge">celular</span>' : '<span class="badge">fixo</span>'}` : '<span class="muted">não informado</span>'}</dd>
    ${l.phoneIntl ? `<dt>Internacional</dt><dd>${esc(l.phoneIntl)}</dd>` : ''}
    <dt>Site no Google</dt><dd>${safeUrl(l.website) ? `<a target="_blank" rel="noopener" href="${esc(l.website)}">${esc(l.website)}</a>` : '<span class="muted">nenhum</span>'} <span class="tag site-${esc(i.site.kind)}">${esc(i.site.label)}</span></dd>
    <dt>Instagram</dt><dd>${l.instagramFromGoogle
      ? `<a target="_blank" rel="noopener" href="${esc(l.instagramFromGoogle)}">${esc(l.instagramFromGoogle)}</a> <span class="muted small">(do Google)</span>`
      : `${safeUrl(l.instagram) ? `<a target="_blank" rel="noopener" href="${esc(l.instagram)}">${esc(l.instagram)}</a> <span class="muted small">(salvo por você)</span><br>` : ''}
        <div class="insta-edit">
          <input id="d-insta" placeholder="@perfil ou link do Instagram" value="${esc(l.instagramManual ? `@${l.instagramManual.split('/')[3]}` : '')}">
          <button class="btn btn-ghost btn-sm" id="d-insta-save">Salvar</button>
        </div>
        <a class="small" target="_blank" rel="noopener" href="${esc(instaSearch(l))}">Procurar no Google ›</a> <span class="muted small" id="d-insta-msg"></span>`}</dd>
  </dl>
  <div class="actions">
    ${l.mobile ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/55${esc(l.phone)}">Abrir WhatsApp</a>` : ''}
    ${l.phone ? `<a class="btn btn-ghost" href="tel:+55${esc(l.phone)}">Ligar</a>` : ''}
    ${safeUrl(l.mapsUrl) ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(l.mapsUrl)}">Ver no Google Maps</a>` : ''}
  </div>`;

  const address = `<dl class="info">
    <dt>Endereço</dt><dd>${esc(l.address || '—')}</dd>
    ${l.bairro ? `<dt>Bairro</dt><dd>${esc(l.bairro)}</dd>` : ''}
    <dt>Cidade</dt><dd>${esc([l.city, l.stateName].filter(Boolean).join(' - ') || '—')}</dd>
    ${l.cep ? `<dt>CEP</dt><dd>${esc(l.cep)}</dd>` : ''}
    ${l.lat != null ? `<dt>Coordenadas</dt><dd>${esc(Number(l.lat).toFixed(6))}, ${esc(Number(l.lng).toFixed(6))}</dd>` : ''}
    ${l.plusCode ? `<dt>Plus Code</dt><dd>${esc(l.plusCode)}</dd>` : ''}
  </dl>`;

  const price = l.priceRange
    ? `R$ ${l.priceRange.start ?? '?'} a R$ ${l.priceRange.end ?? '?'} por pessoa`
    : (l.priceLevel || '');
  const google = `<dl class="info">
    <dt>Nota</dt><dd><span class="rating big">${stars(l.rating)}</span> ${l.ratingCount ? `de ${l.ratingCount} avaliações` : ''}</dd>
    ${l.category ? `<dt>Categoria</dt><dd>${esc(l.category)}</dd>` : ''}
    ${price ? `<dt>Preço</dt><dd>${esc(price)}</dd>` : ''}
    ${l.summary ? `<dt>Descrição</dt><dd>${esc(l.summary)}</dd>` : ''}
    <dt>Dados do Google de</dt><dd>${l.fetchedAt ? new Date(l.fetchedAt).toLocaleString('pt-BR') : '—'}</dd>
  </dl>`;

  const hours = l.hours && l.hours.length
    ? `<ul class="hours">${l.hours.map(h => `<li>${esc(h)}</li>`).join('')}</ul>`
    : '<p class="muted">Horário não informado no Google.</p>';

  const reviews = l.reviews && l.reviews.length
    ? [...l.reviews].sort((a, b) => Number(b.complaint) - Number(a.complaint)).map(r => `<blockquote class="review${r.complaint ? ' complaint' : ''}">
        <div><strong>${esc(r.author)}</strong> <span class="rating">${r.rating ? '★'.repeat(Math.round(r.rating)) : ''}</span> <span class="muted small">${esc(r.when)}</span>${r.complaint ? ' <span class="tag complaint">reclamação</span>' : ''}</div>
        <p>${esc(r.text) || '<span class="muted">(sem texto)</span>'}</p>
      </blockquote>`).join('') + '<p class="muted small">O Google mostra no máximo 5 avaliações por empresa (as mais relevantes), então pode haver outras reclamações no Google Maps. Use as boas como depoimentos no site e as reclamações como argumento na conversa.</p>'
    : '<p class="muted">Sem avaliações com texto.</p>';

  const notes = `<div class="row">
      <label>Status
        <select id="d-status">${Object.entries(CONFIG.statuses).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      </label>
    </div>
    <label class="block">Anotações<textarea id="d-notes" rows="3" placeholder="Ex.: falei com o dono, pediu proposta">${esc(l.notes)}</textarea></label>
    <div class="actions">
      <button class="btn btn-primary btn-sm" id="d-save">Salvar</button>
      <button class="btn btn-ghost btn-sm" id="d-refresh">Atualizar dados do Google</button>
      <button class="btn btn-ghost btn-sm danger" id="d-delete">Excluir empresa</button>
      <span class="muted small" id="d-msg"></span>
    </div>`;

  $('#d-body').innerHTML = `
    <div class="score">
      <div class="score-num lvl-${esc(i.level)}">${i.score}<small>pontos</small></div>
      <div><strong>Prioridade ${LEVEL[i.level]}</strong><div class="muted small">${esc(i.reasons.join(' · '))}</div></div>
    </div>
    ${section(`Fotos (${photos.length})`, gallery)}
    <div class="d-cols">
      ${section('Contato', contact)}
      ${section('Endereço', address)}
    </div>
    <div class="d-cols">
      ${section('No Google', google)}
      ${section('Horário de funcionamento', hours)}
    </div>
    ${section('Serviços', yesNo(l.services))}
    <div class="d-cols">
      ${section('Formas de pagamento', yesNo(l.payment))}
      ${section('Estacionamento', yesNo(l.parking))}
    </div>
    ${section('Acessibilidade', yesNo(l.accessibility))}
    ${section(`Avaliações (${(l.reviews || []).length})${l.complaintCount ? ` · ${l.complaintCount} com reclamação` : ''}`, reviews)}
    ${section('Suas anotações', notes)}`;
}

async function openDetail(id) {
  try {
    renderDetail(await api(`/api/leads/${encodeURIComponent(id)}`));
    $('#detail').showModal();
    $('#d-body').scrollTop = 0;
  } catch (e) { alert(e.message); }
}

$('#d-close').addEventListener('click', () => $('#detail').close());
$('#detail').addEventListener('close', () => loadLeads());
$('#d-body').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t || !CURRENT) return;
  const msg = (s) => { const m = $('#d-msg'); if (m) m.textContent = s; };
  if (t.dataset.photo) return openViewer(Number(t.dataset.photo));
  if (t.id === 'd-insta-save') {
    try {
      renderDetail(await api(`/api/leads/${CURRENT.id}`, { method: 'PATCH', body: { instagram: $('#d-insta').value } }));
      $('#d-insta-msg').textContent = 'Salvo ✓';
    } catch (err) { $('#d-insta-msg').textContent = err.message; }
  }
  if (t.id === 'd-save') {
    try {
      renderDetail(await api(`/api/leads/${CURRENT.id}`, { method: 'PATCH', body: { status: $('#d-status').value, notes: $('#d-notes').value } }));
      msg('Salvo ✓');
    } catch (err) { msg(err.message); }
  }
  if (t.id === 'd-refresh') {
    t.disabled = true; msg('Buscando no Google...');
    try { renderDetail(await api(`/api/leads/${CURRENT.id}/refresh`, { method: 'POST' })); msg('Dados atualizados ✓'); }
    catch (err) { msg(err.message); t.disabled = false; }
  }
  if (t.id === 'd-delete') {
    if (!confirm(`Excluir "${CURRENT.name}" da lista?`)) return;
    try { await api(`/api/leads/${CURRENT.id}`, { method: 'DELETE' }); $('#detail').close(); }
    catch (err) { msg(err.message); }
  }
});

// Visualizador de fotos
let VIEW = 0;
function showPhoto() {
  const p = CURRENT.photos[VIEW];
  $('#viewer-img').src = photoUrl(p.name, 1200);
  $('#viewer-img').alt = `Foto ${VIEW + 1} de ${CURRENT.name}`;
  const authors = (p.authors || []).map(a => a.name).filter(Boolean).join(', ');
  $('#viewer-credit').textContent = `${VIEW + 1} de ${CURRENT.photos.length}${authors ? ` · Foto: ${authors}` : ''} · Google Maps`;
}
function openViewer(i) { VIEW = i; showPhoto(); $('#viewer').showModal(); }
$('#viewer-prev').addEventListener('click', () => { VIEW = (VIEW - 1 + CURRENT.photos.length) % CURRENT.photos.length; showPhoto(); });
$('#viewer-next').addEventListener('click', () => { VIEW = (VIEW + 1) % CURRENT.photos.length; showPhoto(); });
$('#viewer-close').addEventListener('click', () => $('#viewer').close());

// ─── Buscar no Google ─────────────────────────────────────────────────────────
function searchBody() {
  return {
    segments: [...document.querySelectorAll('#g-segments input:checked')].map(x => x.value),
    areas: $('#g-areas').value.split('\n').map(s => s.trim()).filter(Boolean),
    maxCalls: Number($('#g-max').value) || 30,
    onlyWithoutSite: $('#g-nosite').checked,
    redo: $('#g-redo').checked,
    minPopulation: Number($('#g-minpop').value) || 0
  };
}

let planTimer;
function updatePlan() {
  clearTimeout(planTimer);
  planTimer = setTimeout(async () => {
    const b = searchBody();
    if (!b.segments.length || !b.areas.length) { $('#g-plan').textContent = 'Escolha ao menos um nicho e uma cidade.'; return; }
    try {
      const p = await api('/api/google/plan', { method: 'POST', body: b });
      $('#g-plan').textContent = `${p.queries} busca(s) a fazer (${p.segments} nicho(s) × ${p.areas} lugar(es))` +
        (p.skippedRecent ? `, ${p.skippedRecent} já feita(s) nos últimos 30 dias` : '') +
        `. Cada busca usa de 1 a 3 consultas; esta rodada para em ${b.maxCalls} consultas.`;
    } catch (e) { $('#g-plan').textContent = e.message; }
  }, 250);
}

$('#g-segments').addEventListener('change', updatePlan);
$('#g-areas').addEventListener('input', updatePlan);
$('#g-max').addEventListener('input', updatePlan);
$('#g-redo').addEventListener('change', updatePlan);
$('#g-minpop').addEventListener('change', updatePlan);

$('#btn-fill-state').addEventListener('click', async () => {
  try {
    const d = await api(`/api/cities?uf=${encodeURIComponent($('#g-uf').value)}&min=${$('#g-minpop').value}`);
    const cur = $('#g-areas').value.split('\n').map(s => s.trim()).filter(Boolean);
    const add = d.cities.map(c => `${c.name}, ${d.uf}`).filter(c => !cur.includes(c));
    $('#g-areas').value = [...cur, ...add].join('\n');
    updatePlan();
  } catch (e) { alert(e.message); }
});

$('#btn-save-areas').addEventListener('click', async () => {
  await api('/api/settings', { method: 'PUT', body: { areas: $('#g-areas').value } });
  $('#btn-save-areas').textContent = 'Salvo ✓';
  setTimeout(() => { $('#btn-save-areas').textContent = 'Salvar lista de cidades'; }, 1500);
});

$('#btn-search').addEventListener('click', async () => {
  const btn = $('#btn-search'), out = $('#g-result');
  btn.disabled = true; btn.textContent = 'Buscando... (pode levar alguns minutos)';
  out.hidden = true;
  try {
    await api('/api/settings', { method: 'PUT', body: { areas: $('#g-areas').value } });
    const r = await api('/api/google/search', { method: 'POST', body: searchBody() });
    out.className = 'result ok';
    out.innerHTML = `<strong>${r.added} empresa(s) nova(s)</strong> sem site próprio, ${r.updated} atualizada(s).
      <div class="muted small">${r.calls} consulta(s) ao Google · ${r.queriesDone} busca(s) concluída(s) · ${r.withSite} ignorada(s) por já terem site · ${r.closed} fechada(s)</div>
      ${r.queriesLeft ? `<div class="small">Faltam ${r.queriesLeft} busca(s). Clique em <strong>Buscar</strong> de novo para continuar.</div>` : ''}
      ${r.errors.length ? `<div class="error small">${r.errors.map(esc).join('<br>')}</div>` : ''}
      <div class="actions"><button class="btn btn-primary btn-sm" id="go-list">Ver empresas</button></div>`;
  } catch (e) {
    out.className = 'result error';
    out.textContent = e.message;
  }
  out.hidden = false;
  btn.disabled = false; btn.textContent = 'Buscar';
  updatePlan();
});
$('#g-result').addEventListener('click', (e) => {
  if (e.target.id === 'go-list') document.querySelector('.tab[data-tab="empresas"]').click();
});

// ─── Início ───────────────────────────────────────────────────────────────────
(async function init() {
  CONFIG = await api('/api/config');
  $('#f-segment').innerHTML += CONFIG.segments.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
  $('#f-status').innerHTML += Object.entries(CONFIG.statuses).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('#g-segments').innerHTML = CONFIG.segments.map(s =>
    `<label class="chip"><input type="checkbox" value="${s.id}" checked> ${esc(s.label)} <span class="muted small">(${s.terms.map(esc).join(', ')})</span></label>`).join('');
  $('#g-areas').value = CONFIG.settings.areas.join('\n');
  $('#g-uf').innerHTML = CONFIG.states.map(s => `<option value="${s.uf}" ${s.uf === 'SC' ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  $('#google-off').hidden = CONFIG.googleConfigured;
  loadLeads();
})();
