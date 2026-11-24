/* Vamos Sorrir — comportamento do site (menu, galeria, mapa, formulário, cookies). Sem bibliotecas. */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var CFG = {};
  try { CFG = JSON.parse($('#config').textContent); } catch (e) { /* sem configuração */ }

  // ─── Menu do celular ─────────────────────────────────────────────────────────
  var btn = $('#menu-btn'), nav = $('#nav');
  function fecharMenu() { if (!btn) return; nav.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir menu'); }
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var abrir = btn.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('aberto', abrir);
      btn.setAttribute('aria-expanded', String(abrir));
      btn.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', fecharMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharMenu(); });
  }

  // Borda no topo ao rolar
  var topo = $('#topo');
  function aoRolar() { if (topo) topo.classList.toggle('rolou', window.scrollY > 8); }
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  // ─── Medição (Google Analytics só com consentimento) ─────────────────────────
  function evento(nome, params) {
    if (typeof window.gtag === 'function') window.gtag('event', nome, params || {});
  }
  function carregarGA() {
    if (!CFG.ga || window.gtag) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.ga);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CFG.ga, { anonymize_ip: true });
  }
  function lerConsentimento() { try { return localStorage.getItem('cookies'); } catch (e) { return null; } }
  function salvarConsentimento(v) { try { if (v) localStorage.setItem('cookies', v); else localStorage.removeItem('cookies'); } catch (e) { /* ignora */ } }
  var aviso = $('#cookies');
  if (CFG.ga) {
    var c = lerConsentimento();
    if (c === 'sim') carregarGA();
    else if (!c && aviso) aviso.hidden = false;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cookies]');
    if (!b) return;
    var v = b.getAttribute('data-cookies');
    if (v === 'revogar') { salvarConsentimento(null); window.location.reload(); return; }
    salvarConsentimento(v);
    if (aviso) aviso.hidden = true;
    if (v === 'sim') carregarGA();
  });

  // Cliques em WhatsApp e mapas (para saber de onde vêm os contatos)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-wa]');
    if (a) evento('contato_whatsapp', { origem: a.getAttribute('data-wa') });
    var m = e.target.closest('[data-evento]');
    if (m) evento(m.getAttribute('data-evento'));
  });

  // Botão flutuante some quando a chamada final está na tela (não cobre o formulário)
  var flutuante = $('.wa-flutuante'), final = $('#agendar');
  if (flutuante && final && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      flutuante.classList.toggle('escondido', entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(final);
  }

  // ─── Mapa: carrega quando chega perto da tela (ou ao clicar) ─────────────────
  var mapa = $('#mapa');
  function carregarMapa() {
    if (!mapa || mapa.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    f.src = mapa.getAttribute('data-src');
    f.title = 'Mapa com a localização da clínica';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.setAttribute('allowfullscreen', '');
    mapa.appendChild(f);
  }
  if (mapa) {
    var mb = $('#mapa-carregar');
    if (mb) mb.addEventListener('click', carregarMapa);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { carregarMapa(); io.disconnect(); }
      }, { rootMargin: '300px' });
      io.observe(mapa);
    }
  }

  // ─── Galeria com ampliação ───────────────────────────────────────────────────
  var lb = $('#lightbox'), fotos = $$('.gal-btn'), atual = 0;
  function mostrar(i) {
    atual = (i + fotos.length) % fotos.length;
    var b = fotos[atual];
    $('#lb-img').src = b.getAttribute('data-full');
    $('#lb-img').alt = b.getAttribute('data-alt');
    $('#lb-leg').textContent = b.getAttribute('data-legenda') + ' · ' + (atual + 1) + ' de ' + fotos.length;
  }
  if (lb && fotos.length && typeof lb.showModal === 'function') {
    fotos.forEach(function (b, i) { b.addEventListener('click', function () { mostrar(i); lb.showModal(); }); });
    $('#lb-ant').addEventListener('click', function () { mostrar(atual - 1); });
    $('#lb-prox').addEventListener('click', function () { mostrar(atual + 1); });
    $('#lb-fechar').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') mostrar(atual - 1);
      if (e.key === 'ArrowRight') mostrar(atual + 1);
    });
  }

  // ─── Formulário de agendamento → WhatsApp ────────────────────────────────────
  var form = $('#form-agendar');
  var tel = $('#f-tel');
  if (tel) {
    tel.addEventListener('input', function () {
      var d = tel.value.replace(/\D/g, '').slice(0, 11);
      var f = d;
      if (d.length > 2) f = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 6) f = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length === 11 ? 7 : 6) + '-' + d.slice(d.length === 11 ? 7 : 6);
      tel.value = f;
    });
  }
  function marcar(campo, erroId, ok) {
    campo.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (ok) campo.removeAttribute('aria-describedby'); else campo.setAttribute('aria-describedby', erroId);
    $('#' + erroId).hidden = ok;
    return ok;
  }
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = $('#f-nome'), motivo = $('#f-motivo');
      var digitos = tel.value.replace(/\D/g, '');
      var ok = [
        marcar(nome, 'e-nome', nome.value.trim().length >= 2),
        marcar(tel, 'e-tel', digitos.length === 10 || digitos.length === 11),
        marcar(motivo, 'e-motivo', Boolean(motivo.value))
      ];
      var primeiroErro = [nome, tel, motivo][ok.indexOf(false)];
      if (primeiroErro) { primeiroErro.focus(); return; }

      var dia = $('#f-dia').value || 'Qualquer dia';
      var periodo = $('#f-periodo').value;
      var obs = $('#f-obs').value.trim();
      var linhas = [
        'Olá! Gostaria de solicitar um agendamento pelo site da Vamos Sorrir.',
        '',
        '*Nome:* ' + nome.value.trim(),
        '*Telefone:* ' + tel.value,
        '*Motivo:* ' + motivo.value,
        '*Preferência:* ' + dia + ' · ' + periodo
      ];
      if (obs) linhas.push('*Observações:* ' + obs);
      linhas.push('', 'Aguardo a confirmação do horário. Obrigado!');
      var url = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(linhas.join('\n'));

      $('#form-link').href = url;
      $('#form-ok').hidden = false;
      evento('agendamento_formulario', { motivo: motivo.value });
      // (com 'noopener' o navegador devolve null mesmo abrindo; por isso o opener é zerado à mão)
      var janela = window.open(url, '_blank');
      if (janela) janela.opener = null; else window.location.href = url;
    });
  }
})();
