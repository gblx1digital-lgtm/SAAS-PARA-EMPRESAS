/**
 * Páginas do site, geradas a partir do conteudo.json.
 * Todo texto passa por esc(): o conteúdo pode ser editado sem risco de quebrar o HTML.
 */
const { icon } = require('./icons');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function helpers(c, assets) {
  const cl = c.clinica;
  const e = cl.endereco;
  const enderecoLinha = `${e.rua}, ${e.numero} - ${e.bairro}, ${e.cidade} - ${e.uf}`;
  const enderecoCompleto = `${enderecoLinha}, ${e.cep}`;
  const busca = `${cl.nome}, ${enderecoCompleto}`;
  const mapsUrl = cl.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
  const rotaUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(busca)}`;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(busca)}&z=16&hl=pt-BR&output=embed`;
  const wa = (texto) => `https://wa.me/${cl.whatsapp}?text=${encodeURIComponent(texto)}`;
  const msg = c.whatsappMensagens;
  const telLink = `tel:+${cl.whatsapp}`;
  const nota = Number(cl.nota).toFixed(1).replace('.', ',');

  /** Botão/link de WhatsApp com a mensagem da seção de origem. */
  function waLink(origem, label, cls = 'btn btn-primary', texto = msg[origem] || msg.geral, extra = '') {
    // label já vem pronto (pode conter HTML escapado); extra = atributos adicionais
    return `<a class="${cls}" href="${esc(wa(texto))}" target="_blank" rel="noopener" data-wa="${esc(origem)}"${extra}>${icon('whatsapp')}<span>${label}</span></a>`;
  }

  /** <picture> com WebP em vários tamanhos, ou um espaço reservado elegante se a foto ainda não existe. */
  function foto(arquivo, alt, { sizes = '100vw', cls = '', eager = false, legenda = '' } = {}) {
    const a = arquivo && assets.images[arquivo];
    if (!a) {
      return `<div class="ph ${cls}" role="img" aria-label="${esc(`Espaço reservado para foto: ${legenda || alt}`)}">${icon('dente', 'ph-ico')}<span>${esc(legenda || 'Foto da clínica')}</span><small>foto real enviada pela clínica</small></div>`;
    }
    return `<img class="${cls}" src="${a.src}" srcset="${a.srcset}" sizes="${sizes}" width="${a.width}" height="${a.height}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  return { cl, e, enderecoLinha, enderecoCompleto, mapsUrl, rotaUrl, embedUrl, wa, msg, telLink, nota, waLink, foto };
}

function head(c, h, { titulo, descricao, caminho, assets, noindex }) {
  const url = c.site.url.replace(/\/+$/, '') + caminho;
  const og = c.site.url.replace(/\/+$/, '') + '/' + assets.og;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#ffffff">
<meta name="format-detection" content="telephone=no">
${c.site.googleSearchConsole ? `<meta name="google-site-verification" content="${esc(c.site.googleSearchConsole)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(h.cl.nome)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${h.cl.nome} — clínica odontológica no Centro de Joinville`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/jakarta-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jakarta-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/${assets.css}">
</head>`;
}

function header(c, h, { home = true } = {}) {
  const base = home ? '' : '/';
  const nav = [['inicio', 'Início'], ['a-clinica', 'A clínica'], ['tratamentos', 'Tratamentos'], ['avaliacoes', 'Avaliações'], ['localizacao', 'Localização']];
  return `${c.previa ? `<div class="previa" role="note">Prévia do site da ${esc(h.cl.nome)} — conteúdo em validação pela clínica.</div>` : ''}
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="topo" id="topo">
  <div class="wrap topo-in">
    <a class="logo" href="${base}#inicio" aria-label="${esc(h.cl.nome)} — página inicial">${logo(h.cl.nome)}</a>
    <nav class="nav" id="nav" aria-label="Menu principal">
      <ul>
        ${nav.map(([id, label]) => `<li><a href="${base}#${id}">${label}</a></li>`).join('')}
      </ul>
      ${h.waLink('avaliacao', 'Agendar avaliação', 'btn btn-primary nav-cta')}
    </nav>
    <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu">${icon('menu', 'ico i-abrir')}${icon('fechar', 'ico i-fechar')}</button>
  </div>
</header>`;
}

function logo(nome) {
  return `<svg class="logo-marca" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="10" fill="#F5C518"/><path d="M11 17.5c0-1.2.9-2 2-2s2 .8 2 2M25 17.5c0-1.2.9-2 2-2s2 .8 2 2" fill="none" stroke="#2A2317" stroke-width="2.2" stroke-linecap="round"/><path d="M11.5 23c2.2 3.4 5.1 5 8.5 5s6.3-1.6 8.5-5" fill="none" stroke="#2A2317" stroke-width="2.6" stroke-linecap="round"/></svg><span class="logo-txt"><strong>${esc(nome)}</strong><small>Odontologia</small></span>`;
}

function estrelas(nota) {
  const pct = Math.max(0, Math.min(100, (Number(nota) / 5) * 100));
  const linha = Array.from({ length: 5 }, () => icon('estrela', 'est')).join('');
  return `<span class="estrelas" role="img" aria-label="Nota ${String(nota).replace('.', ',')} de 5"><span class="est-base">${linha}</span><span class="est-cheia" style="width:${pct.toFixed(1)}%">${linha}</span></span>`;
}

/** "08:00" → "8h", "08:30" → "8h30" */
function hora(hhmm) {
  const [h, m] = String(hhmm).split(':');
  return `${Number(h)}h${m && m !== '00' ? m : ''}`;
}

function horariosLista(cl) {
  return `<dl class="horarios">${cl.horarios.map(hr => `<div><dt>${esc(hr.dias)}</dt><dd>${hr.fechado ? 'Fechado' : `${esc(hora(hr.abre))} às ${esc(hora(hr.fecha))}`}</dd></div>`).join('')}</dl>`;
}

function footer(c, h, { home = true } = {}) {
  const cl = h.cl;
  const base = home ? '' : '/';
  const rt = cl.responsavelTecnico && cl.croResponsavel
    ? `Responsável técnico: ${esc(cl.responsavelTecnico)} — ${esc(cl.croResponsavel)}`
    : 'Responsável técnico: [nome do dentista] — CRO-SC [número]';
  const ano = new Date().getFullYear();
  return `<footer class="rodape">
  <div class="wrap rodape-grid">
    <div>
      <a class="logo logo-rodape" href="${base}#inicio">${logo(cl.nome)}</a>
      <p class="muted">${esc(cl.segmento)} no Centro de Joinville (SC).</p>
      ${cl.instagram ? `<p><a class="link-ico" href="${esc(cl.instagram)}" target="_blank" rel="noopener">${icon('instagram')}Instagram</a></p>` : ''}
    </div>
    <div>
      <h2 class="rodape-tit">Endereço</h2>
      <address>${esc(h.e.rua)}, ${esc(h.e.numero)}<br>${esc(h.e.bairro)} — ${esc(h.e.cidade)}/${esc(h.e.uf)}<br>CEP ${esc(h.e.cep)}</address>
      <p><a class="link-ico" href="${esc(h.mapsUrl)}" target="_blank" rel="noopener">${icon('mapa')}Ver no Google Maps</a></p>
    </div>
    <div>
      <h2 class="rodape-tit">Contato</h2>
      <p><a class="link-ico" href="${esc(h.telLink)}">${icon('telefone')}${esc(cl.telefone)}</a></p>
      <p>${h.waLink('geral', `WhatsApp ${esc(cl.telefone)}`, 'link-ico')}</p>
      ${cl.email ? `<p><a href="mailto:${esc(cl.email)}">${esc(cl.email)}</a></p>` : ''}
    </div>
    <div>
      <h2 class="rodape-tit">Horários</h2>
      ${horariosLista(cl)}
    </div>
  </div>
  <div class="wrap rodape-legal"><div>
    <p class="${cl.responsavelTecnico ? '' : 'pendente'}">${rt}${cl.inscricaoClinicaCro ? ` · Clínica inscrita no CRO-SC sob nº ${esc(cl.inscricaoClinicaCro)}` : ''}</p>
    <p>© ${ano} ${esc(cl.razaoSocial || cl.nome)}${cl.cnpj ? ` · CNPJ ${esc(cl.cnpj)}` : ''}. Todos os direitos reservados. · <a href="/politica-de-privacidade/">Política de privacidade</a></p>
  </div></div>
</footer>
${h.waLink('geral', 'WhatsApp', 'wa-flutuante', h.msg.geral, ' aria-label="Falar com a clínica pelo WhatsApp"')}`;
}

function scripts(c, assets) {
  const cfg = { ga: c.site.googleAnalyticsId || '', whatsapp: c.clinica.whatsapp };
  return `<script type="application/json" id="config">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
${c.site.googleAnalyticsId ? `<div class="cookies" id="cookies" hidden role="dialog" aria-live="polite" aria-label="Aviso de cookies">
  <p>Usamos cookies de medição (Google Analytics) para entender como o site é usado. <a href="/politica-de-privacidade/">Saiba mais</a>.</p>
  <div><button class="btn btn-ghost btn-sm" data-cookies="nao">Recusar</button><button class="btn btn-primary btn-sm" data-cookies="sim">Aceitar</button></div>
</div>` : ''}
<script src="/${assets.js}" defer></script>`;
}

function jsonLd(c, h, assets) {
  const url = c.site.url.replace(/\/+$/, '');
  const dias = c.clinica.horarios.filter(x => !x.fechado).map(x => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: x.schema, opens: x.abre, closes: x.fecha
  }));
  const clinica = {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    '@id': `${url}/#clinica`,
    name: h.cl.nome,
    url: `${url}/`,
    telephone: `+${h.cl.whatsapp}`,
    image: [`${url}/${assets.og}`, ...(assets.images[c.hero.foto] ? [`${url}${assets.images[c.hero.foto].big}`] : [])],
    logo: `${url}/apple-touch-icon.png`,
    address: {
      '@type': 'PostalAddress', streetAddress: `${h.e.rua}, ${h.e.numero}`, addressLocality: h.e.cidade,
      addressRegion: h.e.uf, postalCode: h.e.cep, addressCountry: 'BR'
    },
    geo: { '@type': 'GeoCoordinates', latitude: h.e.latitude, longitude: h.e.longitude },
    hasMap: h.mapsUrl,
    areaServed: { '@type': 'City', name: 'Joinville' },
    openingHoursSpecification: dias
  };
  if (h.cl.instagram) clinica.sameAs = [h.cl.instagram];
  if (h.cl.email) clinica.email = h.cl.email;
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({ '@type': 'Question', name: f.pergunta, acceptedAnswer: { '@type': 'Answer', text: f.resposta } }))
  };
  const site = { '@context': 'https://schema.org', '@type': 'WebSite', name: h.cl.nome, url: `${url}/`, inLanguage: 'pt-BR' };
  return [clinica, site, faq].map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
}

// ─── Página inicial ───────────────────────────────────────────────────────────
function home(c, assets) {
  const h = helpers(c, assets);
  const cl = h.cl;
  const t = c.tratamentos;
  const algumConfirmado = t.lista.some(x => x.confirmado);
  const todosConfirmados = t.lista.length && t.lista.every(x => x.confirmado);

  const hero = `<section class="hero" id="inicio" aria-labelledby="hero-tit">
  <div class="wrap hero-grid">
    <div class="hero-txt">
      <h1 id="hero-tit"><span class="sobretitulo">${esc(cl.nome)} · Clínica odontológica no Centro de Joinville</span>${esc(c.hero.titulo)}</h1>
      <p class="lead">${esc(c.hero.texto)}</p>
      <div class="acoes">
        ${h.waLink('avaliacao', 'Agendar pelo WhatsApp', 'btn btn-primary btn-lg')}
        <a class="btn btn-ghost btn-lg" href="#a-clinica">Conhecer a clínica</a>
      </div>
      <ul class="confianca" aria-label="Informações da clínica">
        <li>${icon('local')}Joinville - SC</li>
        <li>${icon('estrela')}Nota ${h.nota}/5 no Google</li>
        <li>${icon('pessoa')}${cl.avaliacoes} avaliações no Google</li>
      </ul>
    </div>
    <div class="hero-foto">
      ${h.foto(c.hero.foto, c.hero.fotoAlt, { sizes: '(min-width: 960px) 520px, 100vw', eager: true, legenda: 'Fachada da clínica' })}
      <a class="hero-selo" href="#localizacao">${icon('relogio')}<span><strong>Seg. a sex. 8h–19h</strong><small>Sábado 8h–14h</small></span></a>
    </div>
  </div>
</section>`;

  const destaques = (c.sobre.destaques || []).length
    ? `<ul class="lista-check">${c.sobre.destaques.map(d => `<li>${icon('check')}${esc(d)}</li>`).join('')}</ul>` : '';
  const equipe = (c.sobre.equipe || []).length ? `<div class="equipe">
      <h3>Nossa equipe</h3>
      <ul class="equipe-grid">${c.sobre.equipe.map(p => `<li class="pessoa">
        ${h.foto(p.foto, `Foto de ${p.nome}`, { sizes: '160px', cls: 'pessoa-foto', legenda: p.nome })}
        <strong>${esc(p.nome)}</strong>${p.especialidade ? `<span>${esc(p.especialidade)}</span>` : ''}${p.cro ? `<small>${esc(p.cro)}</small>` : ''}
      </li>`).join('')}</ul>
    </div>` : '';
  const sobre = `<section class="secao" id="a-clinica" aria-labelledby="sobre-tit">
  <div class="wrap sobre-grid">
    <div class="sobre-fotos">
      ${c.sobre.fotos.map((f, i) => {
        const g = c.galeria.fotos.find(x => x.arquivo === f);
        return h.foto(f, g?.alt || `Ambiente da clínica ${cl.nome}`, { sizes: '(min-width: 960px) 280px, 50vw', cls: `sf sf-${i + 1}`, legenda: g?.legenda || 'Ambiente da clínica' });
      }).join('')}
    </div>
    <div>
      <p class="rotulo">A clínica</p>
      <h2 id="sobre-tit">${esc(c.sobre.titulo)}</h2>
      ${c.sobre.paragrafos.map(p => `<p>${esc(p)}</p>`).join('')}
      ${destaques}
      <div class="acoes">${h.waLink('geral', 'Falar com a equipe', 'btn btn-primary')}<a class="btn btn-link" href="#galeria">Ver fotos da clínica ${icon('seta')}</a></div>
    </div>
  </div>
  ${equipe ? `<div class="wrap">${equipe}</div>` : ''}
</section>`;

  const tratamentos = `<section class="secao secao-alt" id="tratamentos" aria-labelledby="trat-tit">
  <div class="wrap">
    <div class="cab-secao">
      <p class="rotulo">Tratamentos</p>
      <h2 id="trat-tit">${esc(t.titulo)} odontológicos em Joinville</h2>
      <p>${esc(todosConfirmados ? t.introducaoConfirmada : t.introducao)}</p>
    </div>
    <ul class="trat-grid">
      ${t.lista.map(x => {
        const texto = x.confirmado
          ? `Olá! Vi no site da ${cl.nome} e gostaria de agendar uma avaliação para ${x.nome.toLowerCase()}.`
          : h.msg.tratamento.replace('{tratamento}', x.nome.toLowerCase());
        return `<li class="trat">
        ${x.foto && assets.images[x.foto] ? h.foto(x.foto, x.nome, { sizes: '(min-width: 960px) 280px, 100vw', cls: 'trat-foto' }) : `<span class="trat-ico">${icon(x.icone || 'dente')}</span>`}
        <h3>${esc(x.nome)}</h3>
        <p>${esc(x.descricao)}</p>
        ${h.waLink(`tratamento:${x.nome}`, x.confirmado ? 'Agendar' : 'Consultar', 'btn btn-ghost btn-sm', texto, ` aria-label="${esc(`${x.confirmado ? 'Agendar' : 'Consultar'} ${x.nome.toLowerCase()} pelo WhatsApp`)}"`)}
      </li>`;
      }).join('')}
    </ul>
    ${algumConfirmado ? '' : '<p class="nota-rodape">Os tratamentos realizados e a indicação para cada caso são definidos na avaliação com o dentista.</p>'}
  </div>
</section>`;

  const porQue = `<section class="secao" aria-labelledby="pq-tit">
  <div class="wrap">
    <div class="cab-secao"><p class="rotulo">Por que nos conhecer</p><h2 id="pq-tit">${esc(c.porQue.titulo)}</h2></div>
    <ul class="pq-grid">
      ${c.porQue.itens.map(i => `<li><span class="pq-ico">${icon(i.icone)}</span><h3>${esc(i.titulo)}</h3><p>${esc(i.texto)}</p></li>`).join('')}
    </ul>
  </div>
</section>`;

  const depo = (c.depoimentos || []).length ? `<ul class="depo-grid">${c.depoimentos.map(d => `<li><blockquote><p>“${esc(d.texto)}”</p><footer>— ${esc(d.autor)}</footer></blockquote></li>`).join('')}</ul>` : '';
  const avaliacoes = `<section class="secao secao-escura" id="avaliacoes" aria-labelledby="av-tit">
  <div class="wrap av-grid">
    <div>
      <p class="rotulo">Avaliações</p>
      <h2 id="av-tit">A opinião de quem já conhece a clínica</h2>
      <p>As avaliações da ${esc(cl.nome)} são públicas e ficam no Google. Confira o que os pacientes dizem antes de agendar.</p>
      <div class="acoes"><a class="btn btn-claro" href="${esc(h.mapsUrl)}" target="_blank" rel="noopener" data-evento="ver_avaliacoes">${icon('estrela')}<span>Ver avaliações no Google</span></a></div>
    </div>
    <div class="av-card">
      <span class="av-nota">${h.nota}</span>
      ${estrelas(cl.nota)}
      <p><strong>${cl.avaliacoes} avaliações</strong> no Google</p>
    </div>
  </div>
  ${depo ? `<div class="wrap">${depo}</div>` : ''}
</section>`;

  const galeria = `<section class="secao" id="galeria" aria-labelledby="gal-tit">
  <div class="wrap">
    <div class="cab-secao"><p class="rotulo">Galeria</p><h2 id="gal-tit">${esc(c.galeria.titulo)}</h2><p>Fachada, recepção e consultórios da ${esc(cl.nome)}, na Rua 9 de Março.</p></div>
    <ul class="gal-grid">
      ${c.galeria.fotos.map((f, i) => {
        const a = assets.images[f.arquivo];
        if (!a) return `<li class="gal-item">${h.foto(null, f.alt, { legenda: f.legenda })}</li>`;
        return `<li class="gal-item"><button class="gal-btn" data-full="${a.big}" data-legenda="${esc(f.legenda)}" data-alt="${esc(f.alt)}" aria-label="${esc(`Ampliar foto: ${f.legenda}`)}">
          ${h.foto(f.arquivo, f.alt, { sizes: '(min-width: 960px) 380px, (min-width: 600px) 50vw, 100vw' })}
          <span class="gal-leg">${esc(f.legenda)} ${icon('ampliar')}</span></button></li>`;
      }).join('')}
    </ul>
    <div class="acoes centro">${h.waLink('galeria', 'Agendar uma visita', 'btn btn-primary')}</div>
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

  const localizacao = `<section class="secao secao-alt" id="localizacao" aria-labelledby="loc-tit">
  <div class="wrap loc-grid">
    <div class="loc-info">
      <p class="rotulo">Localização</p>
      <h2 id="loc-tit">Como chegar à clínica</h2>
      <address class="loc-end">${icon('local')}<span><strong>${esc(h.e.rua)}, ${esc(h.e.numero)}</strong><br>${esc(h.e.bairro)}, ${esc(h.e.cidade)} - ${esc(h.e.uf)} · CEP ${esc(h.e.cep)}</span></address>
      <h3 class="h-peq">${icon('relogio')}Horário de funcionamento</h3>
      ${horariosLista(cl)}
      <div class="acoes">
        <a class="btn btn-primary" href="${esc(h.rotaUrl)}" target="_blank" rel="noopener" data-evento="como_chegar">${icon('rota')}<span>Como chegar</span></a>
        ${h.waLink('localizacao', 'Agendar horário', 'btn btn-ghost')}
      </div>
    </div>
    <div class="mapa" id="mapa" data-src="${esc(h.embedUrl)}">
      <div class="mapa-ph">${icon('mapa', 'ph-ico')}<p>Mapa da clínica no Google Maps</p><button class="btn btn-ghost btn-sm" id="mapa-carregar">Carregar mapa</button></div>
    </div>
  </div>
</section>`;

  const ag = c.agendamento;
  const opcoesMotivo = [...ag.motivos.slice(0, -1), ...t.lista.filter(x => x.nome !== 'Avaliação odontológica').map(x => x.confirmado ? x.nome : `${x.nome} (consultar)`), ag.motivos[ag.motivos.length - 1]];
  const formulario = `<form class="form" id="form-agendar" novalidate aria-labelledby="ag-tit">
      <h3 id="ag-tit">${esc(ag.titulo)}</h3>
      <p class="muted">${esc(ag.texto)}</p>
      <div class="campo"><label for="f-nome">Nome</label><input id="f-nome" name="nome" autocomplete="name" required maxlength="80"><p class="erro" id="e-nome" hidden>Informe seu nome.</p></div>
      <div class="campo"><label for="f-tel">Telefone / WhatsApp</label><input id="f-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(47) 90000-0000" required maxlength="16"><p class="erro" id="e-tel" hidden>Informe um telefone com DDD.</p></div>
      <div class="campo"><label for="f-motivo">Motivo do contato</label><select id="f-motivo" name="motivo" required><option value="">Selecione</option>${opcoesMotivo.map(m => `<option>${esc(m)}</option>`).join('')}</select><p class="erro" id="e-motivo" hidden>Escolha o motivo.</p></div>
      <div class="campo-duplo">
        <div class="campo"><label for="f-dia">Melhor dia</label><select id="f-dia" name="dia"><option value="">Qualquer dia</option>${['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map(d => `<option>${d}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-periodo">Período</label><select id="f-periodo" name="periodo">${ag.periodos.map(p => `<option>${esc(p)}</option>`).join('')}</select></div>
      </div>
      <div class="campo"><label for="f-obs">Observações <span class="muted">(opcional)</span></label><textarea id="f-obs" name="obs" rows="2" maxlength="300"></textarea></div>
      <button class="btn btn-primary btn-bloco" type="submit">${icon('whatsapp')}<span>Enviar pelo WhatsApp</span></button>
      <p class="form-nota">O horário só fica marcado depois da confirmação da nossa equipe. Seus dados vão direto para o WhatsApp da clínica e não ficam guardados neste site. <a href="/politica-de-privacidade/">Privacidade</a>.</p>
      <p class="form-ok" id="form-ok" role="status" hidden>Abrimos o WhatsApp com a sua solicitação. É só tocar em enviar. Se não abriu, <a id="form-link" href="#" target="_blank" rel="noopener">toque aqui</a>.</p>
    </form>`;

  const faq = `<section class="secao" id="duvidas" aria-labelledby="faq-tit">
  <div class="wrap faq-grid">
    <div>
      <p class="rotulo">Dúvidas</p>
      <h2 id="faq-tit">Perguntas frequentes</h2>
      <p>Não encontrou o que procurava? Fale com a nossa equipe.</p>
      <div class="acoes">${h.waLink('duvida', 'Tirar dúvida no WhatsApp', 'btn btn-primary')}</div>
    </div>
    <div class="faq">
      ${c.faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.pergunta)}</summary><p>${esc(f.resposta)}</p></details>`).join('')}
    </div>
  </div>
</section>`;

  const final = `<section class="secao final" id="agendar" aria-labelledby="final-tit">
  <div class="wrap final-grid">
    <div class="final-txt">
      <h2 id="final-tit">${esc(c.chamadaFinal.titulo)}</h2>
      <p class="lead">${esc(c.chamadaFinal.texto)}</p>
      ${h.waLink('avaliacao', 'Agendar pelo WhatsApp', 'btn btn-primary btn-xl')}
      <p class="final-tel">ou ligue: <a href="${esc(h.telLink)}">${esc(cl.telefone)}</a></p>
    </div>
    ${formulario}
  </div>
</section>`;

  return `${head(c, h, { titulo: c.site.titulo, descricao: c.site.descricao, caminho: '/', assets, noindex: c.previa })}
${jsonLd(c, h, assets)}
<body>
${header(c, h)}
<main id="conteudo">
${hero}
${sobre}
${tratamentos}
${porQue}
${avaliacoes}
${galeria}
${localizacao}
${faq}
${final}
</main>
${footer(c, h)}
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
${header(c, h, { home: false })}
<main id="conteudo" class="secao pagina-texto">
  <div class="wrap estreito">
    <p class="rotulo">Privacidade</p>
    <h1>Política de privacidade</h1>
    <p class="muted">Última atualização: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>

    <h2>Quem somos</h2>
    <p>Este site pertence à ${esc(controlador)}, clínica odontológica localizada na ${esc(h.enderecoCompleto)}. Somos a responsável (controladora) pelos dados pessoais tratados por meio deste site, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>

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
      <li><strong>Google Maps:</strong> o mapa da seção de localização é fornecido pelo Google e pode usar cookies próprios ao ser exibido.</li>
      ${ga ? '<li><strong>Google Analytics:</strong> usado apenas com o seu consentimento, que pode ser retirado a qualquer momento pelo botão abaixo.</li>' : ''}
    </ul>

    <h2>Por quanto tempo guardamos os dados</h2>
    <p>Pelo tempo necessário para atender à sua solicitação e cumprir obrigações legais e regulatórias, incluindo as regras de guarda de prontuário odontológico, quando houver atendimento.</p>

    <h2>Seus direitos</h2>
    <p>Você pode solicitar a qualquer momento: confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, informação sobre compartilhamento e revogação de consentimento, conforme o artigo 18 da LGPD.</p>

    <h2>Como falar com a gente</h2>
    <p>Pelo WhatsApp ou telefone <a href="${esc(h.telLink)}">${esc(cl.telefone)}</a>${cl.email ? `, pelo e-mail <a href="mailto:${esc(cl.email)}">${esc(cl.email)}</a>` : ''} ou pessoalmente na clínica, no horário de funcionamento.</p>
    ${ga ? '<p><button class="btn btn-ghost btn-sm" data-cookies="revogar">Revogar consentimento de cookies</button></p>' : ''}

    <p><a class="btn btn-link" href="/">${icon('seta')} Voltar para o início</a></p>
  </div>
</main>
${footer(c, h, { home: false })}
${scripts(c, assets)}
</body>
</html>
`;
}

function naoEncontrada(c, assets) {
  const h = helpers(c, assets);
  return `${head(c, h, { titulo: `Página não encontrada | ${h.cl.nome}`, descricao: c.site.descricao, caminho: '/404.html', assets, noindex: true })}
<body>
${header(c, h, { home: false })}
<main id="conteudo" class="secao pagina-texto"><div class="wrap estreito">
  <h1>Página não encontrada</h1>
  <p>O endereço que você abriu não existe ou mudou de lugar.</p>
  <div class="acoes"><a class="btn btn-primary" href="/">Ir para o início</a>${h.waLink('geral', 'Falar pelo WhatsApp', 'btn btn-ghost')}</div>
</div></main>
${footer(c, h, { home: false })}
${scripts(c, assets)}
</body>
</html>
`;
}

module.exports = { home, privacidade, naoEncontrada, esc, helpers };
