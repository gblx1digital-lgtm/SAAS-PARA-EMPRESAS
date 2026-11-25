/**
 * Páginas do site da Vamos Sorrir, geradas a partir do conteudo.json.
 * Todo texto passa por esc(): o conteúdo pode ser editado sem risco de quebrar o HTML.
 */
const { icon } = require('./icons');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** "08:00" → "8h", "08:30" → "8h30" */
function hora(hhmm) {
  const [h, m] = String(hhmm).split(':');
  return `${Number(h)}h${m && m !== '00' ? m : ''}`;
}

/** Traço de sorriso (como o da fachada) desenhado embaixo de uma palavra. */
function sorriso(palavra) {
  return `<span class="sorriso">${esc(palavra)}<svg class="sorriso-arco" viewBox="0 0 120 22" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M4 6 Q60 30 116 6" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg></span>`;
}

/** Mostrar a nota e as avaliações do Google? Controlado por "mostrarAvaliacoes" no conteudo.json. */
const mostrarAv = (c) => c.mostrarAvaliacoes === true;

function helpers(c, assets) {
  const cl = c.clinica;
  const e = cl.endereco;
  const enderecoCompleto = `${e.rua}, ${e.numero} - ${e.bairro}, ${e.cidade} - ${e.uf}, ${e.cep}`;
  const busca = `${cl.nome}, ${enderecoCompleto}`;
  const mapsUrl = cl.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
  const rotaUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(busca)}${cl.googlePlaceId ? `&destination_place_id=${encodeURIComponent(cl.googlePlaceId)}` : ''}`;
  const wazeUrl = `https://waze.com/ul?ll=${e.latitude},${e.longitude}&navigate=yes`;
  const avaliarUrl = cl.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(cl.googlePlaceId)}` : '';
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(busca)}&z=16&hl=pt-BR&output=embed`;
  const wa = (texto) => `https://wa.me/${cl.whatsapp}?text=${encodeURIComponent(texto)}`;
  const msg = c.whatsappMensagens;
  const telLink = `tel:+${cl.whatsapp}`;
  const nota = Number(cl.nota).toFixed(1).replace('.', ',');
  const abertos = cl.horarios.filter((h) => !h.fechado);
  const horarioCurto = abertos.map((h) => `${h.curto} ${hora(h.abre)}–${hora(h.fecha)}`).join(' · ');

  /** Link de WhatsApp com a mensagem da seção de origem. */
  function waLink(origem, label, cls = 'btn btn-sol', texto = msg[origem] || msg.geral, extra = '') {
    return `<a class="${cls}" href="${esc(wa(texto))}" target="_blank" rel="noopener" data-wa="${esc(origem)}"${extra}>${icon('whatsapp')}<span>${label}</span></a>`;
  }
  function telBtn(label, cls = 'btn btn-claro') {
    return `<a class="${cls}" href="${esc(telLink)}" data-evento="ligar">${icon('telefone')}<span>${label}</span></a>`;
  }

  /** <img> em WebP com vários tamanhos, ou espaço reservado se a foto não existir. */
  function foto(arquivo, alt, { sizes = '100vw', cls = '', eager = false, legenda = '', posicao = '' } = {}) {
    const a = arquivo && assets.images[arquivo];
    if (!a) {
      return `<div class="ph ${cls}" role="img" aria-label="${esc(`Espaço reservado para foto: ${legenda || alt}`)}">${icon('dente', 'ph-ico')}<span>${esc(legenda || 'Foto da clínica')}</span><small>foto real enviada pela clínica</small></div>`;
    }
    const pos = /^[a-z0-9%. ]{1,30}$/i.test(posicao || '') ? ` style="object-position:${posicao}"` : '';
    return `<img class="${cls}" src="${a.src}" srcset="${a.srcset}" sizes="${sizes}" width="${a.width}" height="${a.height}" alt="${esc(alt)}"${pos} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  return { cl, e, enderecoCompleto, mapsUrl, rotaUrl, wazeUrl, avaliarUrl, embedUrl, wa, msg, telLink, nota, horarioCurto, waLink, telBtn, foto };
}

function head(c, h, { titulo, descricao, caminho, assets, noindex }) {
  const base = c.site.url.replace(/\/+$/, '');
  const url = base + caminho;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#FFF8E7">
<meta name="format-detection" content="telephone=no">
${c.site.googleSearchConsole ? `<meta name="google-site-verification" content="${esc(c.site.googleSearchConsole)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(h.cl.nome)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(`${base}/${assets.og}`)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${h.cl.nome}: clínica odontológica no Centro de Joinville`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/jakarta-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/fraunces-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/${assets.css}">
</head>`;
}

function logo(assets, variante = 'cor') {
  return assets.logo[variante];
}

function header(c, h, assets, { home = true } = {}) {
  const base = home ? '' : '/';
  const nav = [['a-clinica', 'A clínica'], ['como-funciona', 'Como funciona'], ['atendimento', 'Atendimento'],
    ...(mostrarAv(c) ? [['avaliacoes', 'Avaliações'], ['localizacao', 'Localização']] : [['localizacao', 'Localização'], ['galeria', 'Fotos']])];
  return `${c.previa ? `<div class="previa" role="note">Prévia do site da ${esc(h.cl.nome)}. Conteúdo em validação pela clínica.</div>` : ''}
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<div class="faixa-topo">
  <div class="wrap faixa-in">
    <span>${icon('local')}${esc(h.e.rua)}, ${esc(h.e.numero)} · ${esc(h.e.bairro)}, ${esc(h.e.cidade)}</span>
    <span>${icon('relogio')}${esc(h.horarioCurto)}</span>
    <a href="${esc(h.telLink)}" data-evento="ligar">${icon('telefone')}${esc(h.cl.telefone)}</a>
  </div>
</div>
<header class="topo" id="topo">
  <div class="wrap topo-in">
    <a class="logo" href="${base}#inicio" aria-label="${esc(h.cl.nome)} Odontologia, página inicial">${logo(assets)}</a>
    <nav class="nav" id="nav" aria-label="Menu principal">
      <ul>${nav.map(([id, label]) => `<li><a href="${base}#${id}">${label}</a></li>`).join('')}</ul>
      ${h.waLink('avaliacao', 'Agendar avaliação', 'btn btn-sol nav-cta')}
    </nav>
    <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu">${icon('menu', 'ico i-abrir')}${icon('fechar', 'ico i-fechar')}</button>
  </div>
</header>`;
}

function horariosTabela(cl) {
  return `<dl class="horarios">${cl.horarios.map((hr) => `<div data-dias="${esc((hr.diasSemana || []).join(','))}"><dt>${esc(hr.dias)}<span class="hoje-tag">hoje</span></dt><dd>${hr.fechado ? 'Fechado' : `${esc(hora(hr.abre))} às ${esc(hora(hr.fecha))}`}</dd></div>`).join('')}</dl>`;
}

function estrelas(nota) {
  const pct = Math.max(0, Math.min(100, (Number(nota) / 5) * 100));
  const linha = Array.from({ length: 5 }, () => icon('estrela', 'est')).join('');
  return `<span class="estrelas" role="img" aria-label="Nota ${String(nota).replace('.', ',')} de 5"><span class="est-base">${linha}</span><span class="est-cheia" style="width:${pct.toFixed(1)}%">${linha}</span></span>`;
}

function footer(c, h, assets, { home = true } = {}) {
  const cl = h.cl;
  const base = home ? '' : '/';
  const rt = cl.responsavelTecnico && cl.croResponsavel
    ? `Responsável técnica: ${esc(cl.responsavelTecnico)}, ${esc(cl.croResponsavel)}`
    : 'Responsável técnico: [nome do dentista], CRO-SC [número]';
  const cred = c.credito && c.credito.texto
    ? (c.credito.url ? `<a href="${esc(c.credito.url)}" target="_blank" rel="noopener">${esc(c.credito.texto)}</a>` : esc(c.credito.texto))
    : '';
  return `<footer class="rodape">
  <div class="wrap rodape-grid">
    <div class="rodape-marca">
      <a class="logo" href="${base}#inicio" aria-label="${esc(cl.nome)}, página inicial">${logo(assets, 'claro')}</a>
      <p>${esc(cl.segmento)} no Centro de Joinville (SC). Agende sua avaliação pelo WhatsApp.</p>
      ${cl.instagram ? `<p><a class="link-ico" href="${esc(cl.instagram)}" target="_blank" rel="noopener">${icon('instagram')}Instagram</a></p>` : ''}
    </div>
    <div>
      <h2 class="rodape-tit">Endereço</h2>
      <address>${esc(h.e.rua)}, ${esc(h.e.numero)}<br>${esc(h.e.bairro)}, ${esc(h.e.cidade)}/${esc(h.e.uf)}<br>CEP ${esc(h.e.cep)}</address>
      <p><a class="link-ico" href="${esc(h.mapsUrl)}" target="_blank" rel="noopener">${icon('mapa')}Ver no Google Maps</a></p>
    </div>
    <div>
      <h2 class="rodape-tit">Contato</h2>
      <p><a class="link-ico" href="${esc(h.telLink)}" data-evento="ligar">${icon('telefone')}${esc(cl.telefone)}</a></p>
      <p>${h.waLink('geral', 'WhatsApp', 'link-ico')}</p>
      ${cl.email ? `<p><a href="mailto:${esc(cl.email)}">${esc(cl.email)}</a></p>` : ''}
    </div>
    <div>
      <h2 class="rodape-tit">Horários</h2>
      ${horariosTabela(cl)}
    </div>
  </div>
  <div class="wrap"><div class="rodape-legal">
    <p class="${cl.responsavelTecnico ? '' : 'pendente'}">${rt}${cl.inscricaoClinicaCro ? ` · Inscrição da clínica no CRO: ${esc(cl.inscricaoClinicaCro)}` : ''}</p>
    <p>© ${new Date().getFullYear()} ${esc(cl.razaoSocial || cl.nome)}${cl.cnpj ? ` · CNPJ ${esc(cl.cnpj)}` : ''} · <a href="/politica-de-privacidade/">Política de privacidade</a>${cred ? ` · <span class="credito">${cred}</span>` : ''}</p>
  </div></div>
</footer>
${h.waLink('geral', 'Falar com a clínica pelo WhatsApp', 'wa-flutuante', h.msg.geral, ' aria-label="Falar com a clínica pelo WhatsApp"')}
<nav class="barra-mobile" aria-label="Contato rápido">
  ${h.waLink('avaliacao', 'WhatsApp', 'barra-wa')}
  ${h.telBtn('Ligar', 'barra-tel')}
</nav>`;
}

function scripts(c, assets) {
  const cfg = { ga: c.site.googleAnalyticsId || '', whatsapp: c.clinica.whatsapp, horarios: c.clinica.horarios.map((x) => ({ d: x.diasSemana || [], a: x.abre || null, f: x.fecha || null })) };
  return `<script type="application/json" id="config">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
${c.site.googleAnalyticsId ? `<div class="cookies" id="cookies" hidden role="dialog" aria-live="polite" aria-label="Aviso de cookies">
  <p>Usamos cookies de medição (Google Analytics) para entender como o site é usado. <a href="/politica-de-privacidade/">Saiba mais</a>.</p>
  <div><button class="btn btn-claro btn-sm" data-cookies="nao">Recusar</button><button class="btn btn-sol btn-sm" data-cookies="sim">Aceitar</button></div>
</div>` : ''}
<script src="/${assets.js}" defer></script>`;
}

function jsonLd(c, h, assets) {
  const url = c.site.url.replace(/\/+$/, '');
  const clinica = {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    '@id': `${url}/#clinica`,
    name: h.cl.nome,
    url: `${url}/`,
    telephone: `+${h.cl.whatsapp}`,
    image: [`${url}/${assets.og}`, ...(assets.images[c.hero.foto] ? [`${url}${assets.images[c.hero.foto].big}`] : [])],
    logo: `${url}/apple-touch-icon.png`,
    address: { '@type': 'PostalAddress', streetAddress: `${h.e.rua}, ${h.e.numero}`, addressLocality: h.e.cidade, addressRegion: h.e.uf, postalCode: h.e.cep, addressCountry: 'BR' },
    geo: { '@type': 'GeoCoordinates', latitude: h.e.latitude, longitude: h.e.longitude },
    hasMap: h.mapsUrl,
    areaServed: { '@type': 'City', name: 'Joinville' },
    openingHoursSpecification: c.clinica.horarios.filter((x) => !x.fechado).map((x) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: x.schema, opens: x.abre, closes: x.fecha })),
  };
  if (h.cl.instagram) clinica.sameAs = [h.cl.instagram];
  if (h.cl.email) clinica.email = h.cl.email;
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.pergunta, acceptedAnswer: { '@type': 'Answer', text: f.resposta } })) };
  const site = { '@context': 'https://schema.org', '@type': 'WebSite', name: h.cl.nome, url: `${url}/`, inLanguage: 'pt-BR' };
  return [clinica, site, faq].map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
}

/** Depoimentos reais (com autorização), usados na seção de avaliações ou em "A clínica". */
function depoimentosLista(c, cls = 'depo-grid') {
  const lista = c.depoimentos || [];
  if (!lista.length) return '';
  return `<ul class="${cls}">${lista.map((d) => `<li><blockquote><p>“${esc(d.texto)}”</p><footer>${esc(d.autor)}</footer></blockquote></li>`).join('')}</ul>`;
}

/** "Vamos sorrir?" → a palavra "sorrir" ganha o traço de sorriso (se existir no título). */
function tituloFinal(t) {
  const m = String(t).match(/^(.*?)(sorrir|sorriso)(.*)$/i);
  return m ? `${esc(m[1])}${sorriso(m[2])}${esc(m[3])}` : esc(t);
}

// ─── Página inicial ───────────────────────────────────────────────────────────
function home(c, assets) {
  const h = helpers(c, assets);
  const cl = h.cl;
  const [t1, t2, t3] = c.hero.titulo;

  const hero = `<section class="hero" id="inicio" aria-labelledby="hero-tit">
  <div class="wrap hero-grid">
    <div class="hero-txt">
      <p class="status" data-status><span class="status-ponto" aria-hidden="true"></span><span class="status-txt">${esc(h.horarioCurto)}</span></p>
      <h1 id="hero-tit">${esc(t1)}${sorriso(t2)}${esc(t3)}</h1>
      <p class="lead">${esc(c.hero.texto)}</p>
      <div class="acoes">
        ${h.waLink('avaliacao', 'Agendar avaliação', 'btn btn-sol btn-lg')}
        ${h.telBtn(`Ligar ${esc(cl.telefone)}`, 'btn btn-claro btn-lg')}
      </div>
      <ul class="confianca">
        ${mostrarAv(c)
          ? `<li><a href="${esc(h.mapsUrl)}" target="_blank" rel="noopener" data-evento="ver_avaliacoes">${estrelas(cl.nota)}<strong>${h.nota}</strong> · ${cl.avaliacoes} avaliações no Google</a></li>`
          : `<li>${icon('relogio')}${esc(h.horarioCurto)}</li>`}
        <li>${icon('local')}${esc(h.e.rua)}, ${esc(h.e.numero)} · ${esc(h.e.bairro)}</li>
      </ul>
    </div>
    <div class="hero-fotos">
      ${h.foto(c.hero.foto, c.hero.fotoAlt, { sizes: '(min-width: 1024px) 540px, 100vw', eager: true, cls: 'hero-foto-1', legenda: 'Recepção', posicao: c.hero.fotoPosicao })}
      ${c.hero.fotoSecundaria ? h.foto(c.hero.fotoSecundaria, c.hero.fotoSecundariaAlt, { sizes: '(min-width: 1024px) 220px, 40vw', cls: 'hero-foto-2', legenda: 'Fachada', posicao: c.hero.fotoSecundariaPosicao }) : ''}
      ${cl.responsavelTecnico ? `<div class="hero-selo">${icon('escudo')}<span><small>Responsável técnica</small><strong>${esc(cl.responsavelTecnico)}</strong><small>${esc(cl.croResponsavel)}</small></span></div>` : ''}
    </div>
  </div>
</section>`;

  const passos = `<section class="secao" id="como-funciona" aria-labelledby="passos-tit">
  <div class="wrap">
    <div class="cab cab-centro"><p class="rotulo">Como funciona</p><h2 id="passos-tit">${esc(c.passos.titulo)}</h2><p>${esc(c.passos.texto)}</p></div>
    <ol class="passos">
      ${c.passos.itens.map((p, i) => `<li class="passo"><span class="passo-num">${String(i + 1).padStart(2, '0')}</span><span class="passo-ico">${icon(p.icone)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></li>`).join('')}
    </ol>
    <div class="acoes centro">${h.waLink('passos', 'Começar pelo WhatsApp', 'btn btn-sol')}</div>
  </div>
</section>`;

  const it = c.intencoes;
  const intencoes = `<section class="secao secao-creme" id="atendimento" aria-labelledby="int-tit">
  <div class="wrap">
    <div class="cab"><p class="rotulo">Atendimento</p><h2 id="int-tit">${esc(it.titulo)}</h2><p>${esc(it.texto)}</p></div>
    <ul class="intencoes">
      ${it.itens.map((x) => `<li><a class="intencao" href="${esc(h.wa(x.mensagem))}" target="_blank" rel="noopener" data-wa="${esc(`intencao:${x.titulo}`)}">
        <span class="intencao-ico">${icon(x.icone)}</span>
        <h3>${esc(x.titulo)}</h3>
        <p>${esc(x.texto)}</p>
        <span class="intencao-link">${icon('whatsapp')}Conversar sobre isso${icon('seta', 'ico seta')}</span>
      </a></li>`).join('')}
    </ul>
    <p class="nota-rodape">${esc(it.nota)}</p>
  </div>
</section>`;

  const destaques = [
    ['local', `${h.e.rua}, ${h.e.numero}`, `${h.e.bairro}, ${h.e.cidade}`],
    ['relogio', 'Segunda a sábado', h.horarioCurto],
    ['conversa', 'Agendamento pelo WhatsApp', cl.telefone],
    ...(cl.responsavelTecnico ? [['escudo', `Responsável técnica: ${cl.responsavelTecnico}`, `${cl.croResponsavel}${cl.inscricaoClinicaCro ? ` · Clínica ${cl.inscricaoClinicaCro}` : ''}`]] : []),
    ...(c.sobre.destaques || []).map((d) => ['check', d, '']),
  ];
  const fotosSobre = c.sobre.fotos.map((f, i) => {
    const g = c.galeria.fotos.find((x) => x.arquivo === f);
    return h.foto(f, g ? g.alt : `Ambiente da clínica ${cl.nome}`, { sizes: '(min-width: 1024px) 300px, 50vw', cls: `mosaico-${i + 1}`, legenda: g ? g.legenda : 'Ambiente da clínica' });
  }).join('');
  const equipe = (c.sobre.equipe || []).length ? `<div class="equipe"><h3>Nossa equipe</h3><ul class="equipe-grid">${c.sobre.equipe.map((p) => `<li>${h.foto(p.foto, `Foto de ${p.nome}`, { sizes: '180px', cls: 'equipe-foto', legenda: p.nome })}<strong>${esc(p.nome)}</strong>${p.especialidade ? `<span>${esc(p.especialidade)}</span>` : ''}${p.cro ? `<small>${esc(p.cro)}</small>` : ''}</li>`).join('')}</ul></div>` : '';
  const sobre = `<section class="secao" id="a-clinica" aria-labelledby="sobre-tit">
  <div class="wrap sobre-grid">
    <div class="mosaico">${fotosSobre}</div>
    <div class="sobre-txt">
      <p class="rotulo">A clínica</p>
      <h2 id="sobre-tit">${esc(c.sobre.titulo)}</h2>
      ${c.sobre.paragrafos.map((p) => `<p>${esc(p)}</p>`).join('')}
      <ul class="fatos">${destaques.map(([ic, t, s]) => `<li>${icon(ic)}<span><strong>${esc(t)}</strong>${s ? `<small>${esc(s)}</small>` : ''}</span></li>`).join('')}</ul>
      <div class="acoes">${h.waLink('geral', 'Falar com a equipe', 'btn btn-sol')}<a class="btn btn-link" href="#galeria">Ver fotos da clínica ${icon('seta')}</a></div>
    </div>
  </div>
  ${equipe ? `<div class="wrap">${equipe}</div>` : ''}
  ${!mostrarAv(c) && (c.depoimentos || []).length ? `<div class="wrap depoimentos-claro"><h3>O que dizem nossos pacientes</h3>${depoimentosLista(c, 'depo-grid depo-claro')}</div>` : ''}
</section>`;

  const depo = depoimentosLista(c);
  const avaliacoes = `<section class="secao secao-escura" id="avaliacoes" aria-labelledby="av-tit">
  <div class="wrap av-grid">
    <div class="av-nota-box">
      <span class="av-nota">${h.nota}</span>
      ${estrelas(cl.nota)}
      <p><strong>${cl.avaliacoes} avaliações</strong> no Google</p>
    </div>
    <div>
      <p class="rotulo">Avaliações</p>
      <h2 id="av-tit">${esc(c.avaliacoesSecao.titulo)}</h2>
      <p>${esc(c.avaliacoesSecao.texto)}</p>
      <div class="acoes">
        <a class="btn btn-sol" href="${esc(h.mapsUrl)}" target="_blank" rel="noopener" data-evento="ver_avaliacoes">${icon('estrela')}<span>Ler avaliações no Google</span></a>
        ${h.avaliarUrl ? `<a class="btn btn-contorno" href="${esc(h.avaliarUrl)}" target="_blank" rel="noopener" data-evento="avaliar">${icon('lapis')}<span>Já é paciente? Avalie a clínica</span></a>` : ''}
      </div>
    </div>
  </div>
  ${depo ? `<div class="wrap">${depo}</div>` : ''}
</section>`;

  const galeria = `<section class="secao" id="galeria" aria-labelledby="gal-tit">
  <div class="wrap">
    <div class="cab"><p class="rotulo">Galeria</p><h2 id="gal-tit">${esc(c.galeria.titulo)}</h2><p>${esc(c.galeria.texto)}</p></div>
    <ul class="gal-grid">
      ${c.galeria.fotos.map((f) => {
        const a = assets.images[f.arquivo];
        if (!a) return `<li class="gal-item">${h.foto(null, f.alt, { legenda: f.legenda })}</li>`;
        return `<li class="gal-item"><button class="gal-btn" data-full="${a.big}" data-legenda="${esc(f.legenda)}" data-alt="${esc(f.alt)}" aria-label="${esc(`Ampliar foto: ${f.legenda}`)}">
          ${h.foto(f.arquivo, f.alt, { sizes: '(min-width: 1024px) 380px, (min-width: 640px) 33vw, 50vw', posicao: f.posicao })}
          <span class="gal-leg">${esc(f.legenda)}${icon('ampliar')}</span></button></li>`;
      }).join('')}
    </ul>
    <div class="acoes centro">${h.waLink('galeria', 'Agendar uma avaliação', 'btn btn-sol')}</div>
  </div>
  <dialog class="lightbox" id="lightbox" aria-label="Foto ampliada">
    <img id="lb-img" alt="">
    <div class="lb-barra"><span id="lb-leg"></span><div>
      <button class="lb-btn" id="lb-ant" aria-label="Foto anterior">‹</button>
      <button class="lb-btn" id="lb-prox" aria-label="Próxima foto">›</button>
      <button class="lb-btn" id="lb-fechar" aria-label="Fechar">${icon('fechar')}</button>
    </div></div>
  </dialog>
</section>`;

  const L = c.localizacao;
  const localizacao = `<section class="secao secao-creme" id="localizacao" aria-labelledby="loc-tit">
  <div class="wrap loc-grid">
    <div class="loc-card">
      <p class="rotulo">Localização</p>
      <h2 id="loc-tit">${esc(L.titulo)}</h2>
      <address class="loc-end">${icon('local')}<span><strong>${esc(h.e.rua)}, ${esc(h.e.numero)}</strong>${esc(h.e.bairro)}, ${esc(h.e.cidade)} - ${esc(h.e.uf)} · CEP ${esc(h.e.cep)}</span></address>
      <h3 class="h-peq">${icon('relogio')}Horário de funcionamento</h3>
      ${horariosTabela(cl)}
      <p class="nota-feriado">${esc(L.notaFeriados)}</p>
      <div class="acoes acoes-loc">
        <a class="btn btn-sol" href="${esc(h.rotaUrl)}" target="_blank" rel="noopener" data-evento="como_chegar">${icon('mapa')}<span>Google Maps</span></a>
        <a class="btn btn-claro" href="${esc(h.wazeUrl)}" target="_blank" rel="noopener" data-evento="waze">${icon('navegar')}<span>Waze</span></a>
        ${h.waLink('localizacao', 'WhatsApp', 'btn btn-claro')}
      </div>
    </div>
    <div class="mapa" id="mapa" data-src="${esc(h.embedUrl)}">
      <div class="mapa-ph">${icon('mapa', 'ph-ico')}<p>Mapa da clínica no Google Maps</p><button class="btn btn-claro btn-sm" id="mapa-carregar">Carregar mapa</button></div>
    </div>
  </div>
</section>`;

  const faq = `<section class="secao${mostrarAv(c) ? '' : ' secao-creme'}" id="duvidas" aria-labelledby="faq-tit">
  <div class="wrap faq-grid">
    <div class="faq-cab">
      <p class="rotulo">Dúvidas</p>
      <h2 id="faq-tit">Perguntas frequentes</h2>
      <p>Não encontrou o que procurava? Fale com a nossa equipe.</p>
      <div class="acoes">${h.waLink('duvida', 'Tirar dúvida no WhatsApp', 'btn btn-sol')}</div>
    </div>
    <div class="faq">${c.faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.pergunta)}</summary><p>${esc(f.resposta)}</p></details>`).join('')}</div>
  </div>
</section>`;

  const ag = c.agendamento;
  const formulario = `<form class="form" id="form-agendar" novalidate aria-labelledby="ag-tit">
      <h3 id="ag-tit">${esc(ag.titulo)}</h3>
      <p class="form-sub">${esc(ag.texto)}</p>
      <div class="campo"><label for="f-nome">Nome</label><input id="f-nome" name="nome" autocomplete="name" required maxlength="80"><p class="erro" id="e-nome" hidden>Informe seu nome.</p></div>
      <div class="campo"><label for="f-tel">Telefone / WhatsApp</label><input id="f-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(47) 90000-0000" required maxlength="16"><p class="erro" id="e-tel" hidden>Informe um telefone com DDD.</p></div>
      <div class="campo"><label for="f-motivo">Motivo do contato</label><select id="f-motivo" name="motivo" required><option value="">Selecione</option>${ag.motivos.map((m) => `<option>${esc(m)}</option>`).join('')}</select><p class="erro" id="e-motivo" hidden>Escolha o motivo.</p></div>
      <div class="campo-duplo">
        <div class="campo"><label for="f-dia">Melhor dia</label><select id="f-dia" name="dia"><option value="">Qualquer dia</option>${['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((d) => `<option>${d}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-periodo">Período</label><select id="f-periodo" name="periodo">${ag.periodos.map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
      </div>
      <div class="campo"><label for="f-obs">Observações <span class="opcional">(opcional)</span></label><textarea id="f-obs" name="obs" rows="2" maxlength="300"></textarea></div>
      <button class="btn btn-escuro btn-bloco" type="submit">${icon('whatsapp')}<span>Enviar pelo WhatsApp</span></button>
      <p class="form-nota">O horário só fica marcado depois da confirmação da nossa equipe. Seus dados vão direto para o WhatsApp da clínica e não ficam guardados neste site. <a href="/politica-de-privacidade/">Privacidade</a>.</p>
      <p class="form-ok" id="form-ok" role="status" hidden>Abrimos o WhatsApp com a sua solicitação. É só tocar em enviar. Se não abriu, <a id="form-link" href="#" target="_blank" rel="noopener">toque aqui</a>.</p>
    </form>`;

  const final = `<section class="secao final" id="agendar" aria-labelledby="final-tit">
  <div class="wrap final-grid">
    <div class="final-txt">
      <h2 id="final-tit">${tituloFinal(c.chamadaFinal.titulo)}</h2>
      <p class="lead">${esc(c.chamadaFinal.texto)}</p>
      <div class="acoes">
        ${h.waLink('avaliacao', 'Agendar pelo WhatsApp', 'btn btn-escuro btn-lg')}
        ${h.telBtn(esc(cl.telefone), 'btn btn-claro btn-lg')}
      </div>
      <p class="final-info">${icon('relogio')}${esc(h.horarioCurto)}</p>
    </div>
    ${formulario}
  </div>
</section>`;

  return `${head(c, h, { titulo: c.site.titulo, descricao: c.site.descricao, caminho: '/', assets, noindex: c.previa })}
${jsonLd(c, h, assets)}
<body>
${header(c, h, assets)}
<main id="conteudo">
${hero}
${passos}
${intencoes}
${sobre}
${mostrarAv(c) ? `${avaliacoes}\n${galeria}\n${localizacao}` : `${localizacao}\n${galeria}`}
${faq}
${final}
</main>
${footer(c, h, assets)}
${scripts(c, assets)}
</body>
</html>
`;
}

// ─── Política de privacidade ──────────────────────────────────────────────────
function privacidade(c, assets) {
  const h = helpers(c, assets);
  const cl = h.cl;
  const controlador = `${cl.razaoSocial || cl.nome}${cl.cnpj ? `, CNPJ ${cl.cnpj}` : ''}`;
  const ga = Boolean(c.site.googleAnalyticsId);
  return `${head(c, h, { titulo: `Política de privacidade | ${cl.nome}`, descricao: `Como a ${cl.nome} trata os dados pessoais de quem visita o site e entra em contato com a clínica.`, caminho: '/politica-de-privacidade/', assets, noindex: c.previa })}
<body>
${header(c, h, assets, { home: false })}
<main id="conteudo" class="secao pagina-texto">
  <div class="wrap estreito">
    <p class="rotulo">Privacidade</p>
    <h1>Política de privacidade</h1>
    <p class="muted">Última atualização: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>

    <h2>Quem somos</h2>
    <p>Este site pertence à ${esc(controlador)}, clínica odontológica localizada na ${esc(h.enderecoCompleto)}. Somos a responsável (controladora) pelos dados pessoais tratados por meio deste site, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).</p>

    <h2>Quais dados coletamos e para quê</h2>
    <ul>
      <li><strong>Formulário de agendamento:</strong> nome, telefone, motivo do contato, preferência de dia e período e observações. Esses dados <strong>não são armazenados neste site</strong>: o formulário apenas monta uma mensagem e abre o WhatsApp no seu aparelho, para que você mesmo a envie à clínica. Usamos essas informações para responder à sua solicitação e agendar o atendimento.</li>
      <li><strong>Conversas pelo WhatsApp e telefone:</strong> usamos os dados que você nos envia para atendê-lo, agendar consultas e tirar dúvidas.</li>
      ${ga ? '<li><strong>Dados de navegação:</strong> se você aceitar os cookies de medição, usamos o Google Analytics para saber, de forma estatística, quantas pessoas visitam o site e quais páginas acessam. Sem o seu aceite, o Google Analytics não é carregado.</li>' : '<li><strong>Dados de navegação:</strong> este site não usa ferramentas de análise de visitantes nem cookies de publicidade.</li>'}
    </ul>
    <p>Informações de saúde são compartilhadas somente se você optar por descrevê-las. Pedimos que envie apenas o necessário para o agendamento; os detalhes clínicos são tratados na consulta, com sigilo profissional.</p>

    <h2>Serviços de terceiros</h2>
    <ul>
      <li><strong>WhatsApp (Meta):</strong> as mensagens trocadas seguem também a política de privacidade do WhatsApp.</li>
      <li><strong>Google Maps e Waze:</strong> o mapa e os botões de rota são fornecidos por esses serviços e podem usar cookies próprios quando abertos.</li>
      ${ga ? '<li><strong>Google Analytics:</strong> usado apenas com o seu consentimento, que pode ser retirado a qualquer momento pelo botão abaixo.</li>' : ''}
    </ul>

    <h2>Por quanto tempo guardamos os dados</h2>
    <p>Pelo tempo necessário para atender à sua solicitação e cumprir obrigações legais e regulatórias, incluindo as regras de guarda de prontuário odontológico, quando houver atendimento.</p>

    <h2>Seus direitos</h2>
    <p>Você pode solicitar a qualquer momento: confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, informação sobre compartilhamento e revogação de consentimento, conforme o artigo 18 da LGPD.</p>

    <h2>Como falar com a gente</h2>
    <p>Pelo WhatsApp ou telefone <a href="${esc(h.telLink)}">${esc(cl.telefone)}</a>${cl.email ? `, pelo e-mail <a href="mailto:${esc(cl.email)}">${esc(cl.email)}</a>` : ''} ou pessoalmente na clínica, no horário de funcionamento.</p>
    ${ga ? '<p><button class="btn btn-claro btn-sm" data-cookies="revogar">Revogar consentimento de cookies</button></p>' : ''}

    <p><a class="btn btn-link voltar" href="/">${icon('seta')} Voltar para o início</a></p>
  </div>
</main>
${footer(c, h, assets, { home: false })}
${scripts(c, assets)}
</body>
</html>
`;
}

function naoEncontrada(c, assets) {
  const h = helpers(c, assets);
  return `${head(c, h, { titulo: `Página não encontrada | ${h.cl.nome}`, descricao: c.site.descricao, caminho: '/404.html', assets, noindex: true })}
<body>
${header(c, h, assets, { home: false })}
<main id="conteudo" class="secao pagina-texto"><div class="wrap estreito">
  <h1>Página não encontrada</h1>
  <p>O endereço que você abriu não existe ou mudou de lugar.</p>
  <div class="acoes"><a class="btn btn-sol" href="/">Ir para o início</a>${h.waLink('geral', 'Falar pelo WhatsApp', 'btn btn-claro')}</div>
</div></main>
${footer(c, h, assets, { home: false })}
${scripts(c, assets)}
</body>
</html>
`;
}

module.exports = { home, privacidade, naoEncontrada, esc, helpers, hora };
