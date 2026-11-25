/**
 * Teste completo do site num navegador de verdade (Playwright + Chromium).
 *   npm test
 *
 * Gera o site numa pasta temporária e confere: SEO, prévia fora do Google, links de WhatsApp
 * por seção, "aberto agora" em vários dias e horários, avaliações, rotas (Maps e Waze), mapa,
 * galeria, formulário, menu e barra do celular, rodapé, versão final e cookies.
 * Não mexe na pasta dist/.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
const { execFileSync, spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'site-vs-'));
const DIST = path.join(TMP, 'dist');
const PORT = 4500 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'conteudo.json'), 'utf8'));
const WA = C.clinica.whatsapp;
// O teste não depende das chaves do conteudo.json: gera o site padrão (prévia, sem avaliações do Google)
// e a versão final (com avaliações) a partir de configurações próprias. Inclui um depoimento de teste.
const DEPO = { texto: 'Fui muito bem atendida, recomendo.', autor: 'Paciente Teste' };
const PADRAO = { ...C, previa: true, mostrarAvaliacoes: false, depoimentos: [DEPO] };
const HORARIO_CURTO = 'Seg. a sex. 8h–19h · Sáb. 8h–14h';
const fundos = (p) => p.locator('main > section').evaluateAll((ss) => ss.map((s) => `${s.id}:${s.classList.contains('hero') ? 'hero' : s.classList.contains('secao-creme') ? 'creme' : s.classList.contains('secao-escura') ? 'escura' : s.classList.contains('final') ? 'sol' : 'branco'}`));

function waText(href) {
  const u = new URL(href);
  assert.equal(u.origin + u.pathname, `https://wa.me/${WA}`, `link de WhatsApp com o número certo: ${href}`);
  return u.searchParams.get('text');
}
// Horário de Brasília (UTC-3, sem horário de verão) → instante UTC
const brt = (iso) => new Date(`${iso}-03:00`);

let passou = 0;
async function caso(nome, fn) { await fn(); passou++; console.log(`  ✓ ${nome}`); }

async function novaPagina(browser, { viewport = { width: 1366, height: 900 }, quando = '2026-11-25T10:30:00', timezoneId = 'America/Sao_Paulo', mobile = false } = {}, erros) {
  const ctx = await browser.newContext({ viewport, timezoneId, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.route(/maps\.google\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
  await ctx.route(/wa\.me/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>whatsapp</p>' }));
  const page = await ctx.newPage();
  await page.clock.setFixedTime(brt(quando));
  if (erros) {
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  }
  await page.goto(BASE + '/');
  return { ctx, page };
}

async function main() {
  const cp = path.join(TMP, 'padrao.json');
  fs.writeFileSync(cp, JSON.stringify(PADRAO));
  execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { env: { ...process.env, DIST_DIR: DIST, CONTEUDO_FILE: cp }, stdio: 'pipe' });
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js')], { env: { ...process.env, DIST_DIR: DIST, PORT: String(PORT) } });
  await new Promise((r) => srv.stdout.on('data', r));

  const browser = await chromium.launch();
  const erros = [];
  try {
    const { ctx, page } = await novaPagina(browser, {}, erros);

    await caso('SEO: título, descrição, um único H1 com "Centro de Joinville", canonical, Open Graph', async () => {
      assert.equal(await page.title(), C.site.titulo);
      assert.equal(await page.getAttribute('meta[name=description]', 'content'), C.site.descricao);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal((await page.locator('h1').textContent()).replace(/\s+/g, ' ').trim(), 'Cuide do seu sorriso no Centro de Joinville');
      assert.equal(await page.getAttribute('link[rel=canonical]', 'href'), `${C.site.url}/`);
      const og = await page.getAttribute('meta[property="og:image"]', 'content');
      assert.ok(fs.existsSync(path.join(DIST, og.slice(C.site.url.length))));
      assert.ok((await page.locator('main h2').count()) >= 7, 'cada seção tem seu H2');
    });

    await caso('Prévia fica fora do Google (noindex + robots.txt + cabeçalho) e mostra a faixa', async () => {
      assert.equal(await page.getAttribute('meta[name=robots]', 'content'), 'noindex, nofollow');
      assert.match(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'), /Disallow: \//);
      assert.match(fs.readFileSync(path.join(DIST, '_headers'), 'utf8'), /X-Robots-Tag: noindex/);
      assert.ok(await page.locator('.previa').isVisible());
    });

    await caso('Dados estruturados: Dentist com endereço, horário e geo; FAQPage; sem nota autodeclarada', async () => {
      const blocos = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
      const d = blocos.find((b) => b['@type'] === 'Dentist');
      assert.equal(d.telephone, '+5547988251098');
      assert.equal(d.address.streetAddress, 'Rua 9 de Março, 396');
      assert.equal(d.geo.latitude, -26.301716);
      assert.deepEqual(d.openingHoursSpecification.map((o) => [o.opens, o.closes, o.dayOfWeek.length]), [['08:00', '19:00', 5], ['08:00', '14:00', 1]]);
      assert.equal(d.aggregateRating, undefined);
      assert.equal(blocos.find((b) => b['@type'] === 'FAQPage').mainEntity.length, C.faq.length);
      const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
      assert.ok(xml.includes(`<loc>${C.site.url}/</loc>`) && xml.includes(`<loc>${C.site.url}/politica-de-privacidade/</loc>`));
    });

    await caso('Logo em vetor (Vamos + Sorrir + ODONTOLOGIA), sem coordenadas inválidas', async () => {
      const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
      assert.ok(!/NaN/.test(html), 'nenhum "NaN" no HTML');
      assert.equal(await page.locator('.topo .logo-svg path').count(), 4);
      assert.equal(await page.locator('.rodape .logo-svg path').count(), 4);
    });

    await caso('Todos os links de WhatsApp: número certo, mensagem pronta, nova aba', async () => {
      const links = await page.locator('a[data-wa]').evaluateAll((as) => as.map((a) => ({ href: a.href, origem: a.dataset.wa, target: a.target, rel: a.rel })));
      assert.ok(links.length >= 15, `${links.length} links`);
      for (const l of links) {
        const t = waText(l.href);
        assert.ok(t && t.length > 20, `mensagem pronta em ${l.origem}`);
        assert.equal(l.target, '_blank');
        assert.match(l.rel, /noopener/);
        if (C.whatsappMensagens[l.origem]) assert.equal(t, C.whatsappMensagens[l.origem], l.origem);
      }
      assert.equal(waText(await page.locator('#nav .nav-cta').getAttribute('href')), C.whatsappMensagens.avaliacao);
    });

    await caso('"Conte o que você precisa": cada cartão abre o WhatsApp com a mensagem daquela situação', async () => {
      const cards = page.locator('.intencao');
      assert.equal(await cards.count(), C.intencoes.itens.length);
      for (const [i, it] of C.intencoes.itens.entries()) {
        const card = cards.nth(i);
        assert.equal(await card.locator('h3').innerText(), it.titulo);
        assert.equal(waText(await card.getAttribute('href')), it.mensagem);
      }
    });

    await caso('Telefone: todos os botões "Ligar" discam o número da clínica', async () => {
      const tels = await page.locator('a[href^="tel:"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      assert.ok(tels.length >= 4);
      for (const t of tels) assert.equal(t, 'tel:+5547988251098');
    });

    // ─── Aberto agora: vários dias e horários (relógio simulado) ─────────────────
    const situacoes = [
      ['quarta 10h30', '2026-11-25T10:30:00', true, 'Aberto agora · fecha às 19h', '1,2,3,4,5'],
      ['sexta 18h59', '2026-11-27T18:59:00', true, 'Aberto agora · fecha às 19h', '1,2,3,4,5'],
      ['sexta 19h', '2026-11-27T19:00:00', false, 'Fechado agora · abre amanhã às 8h', '1,2,3,4,5'],
      ['sábado 8h', '2026-11-28T08:00:00', true, 'Aberto agora · fecha às 14h', '6'],
      ['sábado 15h', '2026-11-28T15:00:00', false, 'Fechado agora · abre segunda às 8h', '6'],
      ['domingo 12h', '2026-11-29T12:00:00', false, 'Fechado agora · abre amanhã às 8h', '0'],
      ['segunda 7h', '2026-11-30T07:00:00', false, 'Fechado agora · abre hoje às 8h', '1,2,3,4,5'],
    ];
    for (const [nome, quando, aberto, texto, diasHoje] of situacoes) {
      await caso(`Aberto agora: ${nome} → "${texto}" e destaca o dia de hoje`, async () => {
        // fuso do navegador propositalmente diferente: o site calcula sempre no horário de Brasília
        const { ctx: c2, page: p } = await novaPagina(browser, { quando, timezoneId: 'Asia/Tokyo' }, erros);
        const st = p.locator('.hero [data-status]');
        assert.equal(await st.innerText(), texto);
        assert.equal(await st.evaluate((e) => e.classList.contains('aberto')), aberto);
        const hoje = await p.locator('#localizacao .horarios .hoje').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-dias')));
        assert.deepEqual(hoje, [diasHoje]);
        await c2.close();
      });
    }

    await caso('Nota do Google escondida (mostrarAvaliacoes: false) em todas as páginas', async () => {
      for (const arq of ['index.html', 'politica-de-privacidade/index.html', '404.html']) {
        const html = fs.readFileSync(path.join(DIST, arq), 'utf8');
        for (const proibido of ['avaliações no Google', 'avaliacoes no Google', 'id="avaliacoes"', '#avaliacoes', 'writereview', 'class="estrelas"', 'Avalie a clínica']) {
          assert.ok(!html.includes(proibido), `${arq}: não pode aparecer "${proibido}"`);
        }
      }
      const texto = await page.locator('body').innerText();
      assert.ok(!/\b4,1\b/.test(texto), 'a nota 4,1 não aparece');
      assert.ok(!/71 avaliações/.test(texto), 'o total de avaliações não aparece');
      const priv = fs.readFileSync(path.join(DIST, 'politica-de-privacidade/index.html'), 'utf8');
      assert.ok(priv.includes('href="/#galeria">Fotos</a>'), 'o menu das outras páginas também troca para Fotos');
    });

    await caso('Topo sem repetição: a faixa mostra os horários do cadastro e o texto não repete dias nem endereço', async () => {
      const faixa = (await page.locator('.hero .confianca').textContent()).replace(/\s+/g, ' ');
      assert.ok(faixa.includes(HORARIO_CURTO), faixa);
      const lead = await page.locator('.hero .lead').innerText();
      assert.equal(lead, C.hero.texto);
      assert.ok(!/segunda a sábado|9 de Março/.test(lead), 'o texto do topo não repete o que está na faixa');
    });

    await caso('Sem a faixa escura: localização separa "A clínica" da galeria e as cores alternam sem repetir', async () => {
      assert.deepEqual(await fundos(page), ['inicio:hero', 'como-funciona:branco', 'atendimento:creme', 'a-clinica:branco', 'localizacao:creme', 'galeria:branco', 'duvidas:creme', 'agendar:sol']);
    });

    await caso('Depoimentos continuam aparecendo (em "A clínica") com as avaliações do Google escondidas', async () => {
      const sec = page.locator('#a-clinica');
      assert.match(await sec.innerText(), /O que dizem nossos pacientes/);
      assert.ok((await sec.innerText()).includes(DEPO.texto));
      assert.ok((await sec.innerText()).includes(DEPO.autor));
    });

    await caso('Localização: endereço, horários, Google Maps (rota com place_id) e Waze', async () => {
      const sec = page.locator('#localizacao');
      const txt = await sec.innerText();
      for (const s of ['Rua 9 de Março, 396', '89201-400', '8h às 19h', '8h às 14h', 'Fechado', 'feriados']) assert.ok(txt.includes(s), s);
      const rota = new URL(await sec.locator('a', { hasText: 'Google Maps' }).getAttribute('href'));
      assert.equal(rota.pathname, '/maps/dir/');
      assert.equal(rota.searchParams.get('destination_place_id'), C.clinica.googlePlaceId);
      const waze = new URL(await sec.locator('a', { hasText: 'Waze' }).getAttribute('href'));
      assert.equal(waze.hostname, 'waze.com');
      assert.equal(waze.searchParams.get('ll'), `${C.clinica.endereco.latitude},${C.clinica.endereco.longitude}`);
      assert.equal(waze.searchParams.get('navigate'), 'yes');
    });

    await caso('Mapa carrega sozinho ao chegar perto da seção', async () => {
      assert.equal(await page.locator('#mapa iframe').count(), 0, 'não carrega antes (mais rápido)');
      await page.locator('#localizacao').scrollIntoViewIfNeeded();
      await page.waitForSelector('#mapa iframe');
      const src = await page.getAttribute('#mapa iframe', 'src');
      assert.ok(src.startsWith('https://maps.google.com/maps?q=') && src.includes('output=embed'));
    });

    await caso('Galeria: 6 fotos reais carregadas (WebP + srcset), ampliar, navegar e fechar', async () => {
      await page.locator('#galeria').scrollIntoViewIfNeeded();
      const imgs = page.locator('.gal-btn img');
      assert.equal(await imgs.count(), C.galeria.fotos.length);
      for (let i = 0; i < C.galeria.fotos.length; i++) await imgs.nth(i).scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('.gal-btn img')].every((i) => i.complete && i.naturalWidth > 0));
      assert.match(await imgs.first().getAttribute('srcset'), /\.webp \d+w/);
      await page.locator('.gal-btn').nth(1).click();
      assert.ok(await page.locator('#lightbox').evaluate((d) => d.open));
      assert.match(await page.locator('#lb-leg').innerText(), /Recepção · 2 de 6/);
      await page.keyboard.press('ArrowRight');
      assert.match(await page.locator('#lb-leg').innerText(), /3 de 6/);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#lightbox').evaluate((d) => d.open), false);
    });

    await caso('Formulário: valida campos e abre o WhatsApp com a mensagem organizada', async () => {
      await page.locator('#agendar').scrollIntoViewIfNeeded();
      await page.click('#form-agendar button[type=submit]');
      for (const id of ['e-nome', 'e-tel', 'e-motivo']) assert.ok(await page.locator('#' + id).isVisible(), id);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'f-nome');
      await page.fill('#f-nome', 'Maria Souza');
      await page.fill('#f-tel', '47999887766');
      assert.equal(await page.inputValue('#f-tel'), '(47) 99988-7766');
      await page.selectOption('#f-motivo', 'Dor ou desconforto');
      await page.selectOption('#f-dia', 'Sábado');
      await page.selectOption('#f-periodo', 'Sábado pela manhã');
      await page.fill('#f-obs', 'Dente do siso incomodando');
      const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('#form-agendar button[type=submit]')]);
      await popup.waitForLoadState();
      const t = waText(popup.url());
      assert.equal(await popup.evaluate(() => window.opener), null);
      await popup.close();
      assert.equal(t, [
        'Olá! Gostaria de solicitar um agendamento pelo site da Vamos Sorrir.', '',
        '*Nome:* Maria Souza', '*Telefone:* (47) 99988-7766', '*Motivo:* Dor ou desconforto',
        '*Preferência:* Sábado · Sábado pela manhã', '*Observações:* Dente do siso incomodando', '',
        'Aguardo a confirmação do horário. Obrigado!',
      ].join('\n'));
      assert.ok(await page.locator('#form-ok').isVisible());
    });

    await caso('Menu e âncoras levam às seções certas', async () => {
      const hrefs = await page.locator('#nav a:not([data-wa])').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      assert.deepEqual(hrefs, ['#a-clinica', '#como-funciona', '#atendimento', '#localizacao', '#galeria']);
      const ancoras = (await page.locator('a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).filter((h) => h.length > 1);
      for (const h of ancoras) assert.equal(await page.locator(h).count(), 1, `âncora ${h}`);
    });

    await caso('Rodapé: endereço, contato, horários, responsável técnica com CRO, EPAO, privacidade e assinatura', async () => {
      const r = await page.locator('.rodape').innerText();
      for (const s of ['Rua 9 de Março, 396', 'CEP 89201-400', '(47) 98825-1098', 'Segunda a sexta', 'Ver no Google Maps',
        `${C.clinica.responsavelTecnico}, ${C.clinica.croResponsavel}`, C.clinica.inscricaoClinicaCro, 'Política de privacidade', C.credito.texto]) assert.ok(r.includes(s), s);
    });

    await caso('Política de privacidade e página 404', async () => {
      const p2 = await ctx.newPage();
      assert.equal((await p2.goto(BASE + '/politica-de-privacidade/')).status(), 200);
      assert.match(await p2.locator('main').innerText(), /LGPD|13\.709/);
      assert.equal((await p2.goto(BASE + '/nao-existe')).status(), 404);
      assert.match(await p2.locator('h1').innerText(), /não encontrada/);
      await p2.close();
    });

    await caso('Todas as imagens têm texto alternativo e tamanho definido', async () => {
      const ruins = await page.locator('img').evaluateAll((is) => is.filter((i) => !i.alt || (i.id !== 'lb-img' && !i.getAttribute('width'))).map((i) => i.src));
      assert.deepEqual(ruins, []);
    });

    await caso('Computador: botão flutuante do WhatsApp visível e barra do celular escondida', async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.ok(await page.locator('.wa-flutuante').isVisible());
      assert.equal(await page.locator('.barra-mobile').isVisible(), false);
    });
    await ctx.close();

    // ─── Celular ──────────────────────────────────────────────────────────────
    const { ctx: mob, page: m } = await novaPagina(browser, { viewport: { width: 390, height: 844 }, mobile: true }, erros);

    await caso('Celular: barra fixa embaixo com WhatsApp e Ligar; botão flutuante escondido', async () => {
      const barra = m.locator('.barra-mobile');
      assert.ok(await barra.isVisible());
      const box = await barra.boundingBox();
      assert.ok(Math.abs(box.y + box.height - 844) <= 1, 'presa na base da tela');
      assert.match(waText(await barra.locator('[data-wa]').getAttribute('href')), /agendar uma avaliação/);
      assert.equal(await barra.locator('a[href^="tel:"]').getAttribute('href'), 'tel:+5547988251098');
      assert.equal(await m.locator('.wa-flutuante').isVisible(), false);
      await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const cred = await m.locator('.rodape-legal').boundingBox();
      const barra2 = await barra.boundingBox();
      assert.ok(cred.y + cred.height <= barra2.y + 2, 'a barra não cobre o fim do rodapé');
    });

    await caso('Celular: menu abre, fecha e navega', async () => {
      await m.evaluate(() => window.scrollTo(0, 0));
      assert.equal(await m.locator('#nav').isVisible(), false);
      await m.click('#menu-btn');
      assert.equal(await m.getAttribute('#menu-btn', 'aria-expanded'), 'true');
      await m.click('#nav a[href="#atendimento"]');
      assert.equal(await m.getAttribute('#menu-btn', 'aria-expanded'), 'false');
      await m.waitForTimeout(700);
      const y = await m.locator('#atendimento').evaluate((e) => e.getBoundingClientRect().top);
      assert.ok(y >= 0 && y < 130, `rolou até Atendimento (${y})`);
    });

    await caso('Celular: botões com área de toque de pelo menos 44px', async () => {
      const pequenos = await m.locator('main .btn, .menu-btn, .barra-mobile a').evaluateAll((bs) => bs.filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim()));
      assert.deepEqual(pequenos, []);
    });

    for (const w of [320, 360, 390, 768, 1024, 1280, 1440]) {
      await caso(`Sem rolagem lateral em ${w}px`, async () => {
        await m.setViewportSize({ width: w, height: 800 });
        await m.waitForTimeout(120);
        const sw = await m.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(sw <= w, `largura ${sw} > ${w}`);
      });
    }
    await mob.close();

    // ─── Versão final (fora da prévia) com Google Analytics ───────────────────
    const final = { ...C, previa: false, mostrarAvaliacoes: true, depoimentos: [DEPO], site: { ...C.site, googleAnalyticsId: 'G-TESTE123' } };
    const cf = path.join(TMP, 'final.json');
    fs.writeFileSync(cf, JSON.stringify(final));
    const DIST2 = path.join(TMP, 'dist-final');
    execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { env: { ...process.env, DIST_DIR: DIST2, CONTEUDO_FILE: cf }, stdio: 'pipe' });
    const srv2 = spawn(process.execPath, [path.join(ROOT, 'serve.js')], { env: { ...process.env, DIST_DIR: DIST2, PORT: String(PORT + 1) } });
    await new Promise((r) => srv2.stdout.on('data', r));
    try {
      await caso('Versão final: aparece no Google, sitemap no robots.txt, sem faixa de prévia', async () => {
        const f = await browser.newPage();
        await f.goto(`http://127.0.0.1:${PORT + 1}/`);
        assert.equal(await f.getAttribute('meta[name=robots]', 'content'), 'index, follow, max-image-preview:large');
        assert.equal(await f.locator('.previa').count(), 0);
        assert.match(fs.readFileSync(path.join(DIST2, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/.+\/sitemap\.xml/);
        assert.doesNotMatch(fs.readFileSync(path.join(DIST2, '_headers'), 'utf8'), /noindex/);
        await f.close();
      });

      await caso('Chave ligada (mostrarAvaliacoes: true): nota no topo, seção de avaliações, "Avalie a clínica" e item no menu', async () => {
        const f = await browser.newPage();
        await f.goto(`http://127.0.0.1:${PORT + 1}/`);
        assert.match((await f.locator('.hero .confianca').textContent()).replace(/\s+/g, ' '), /4,1 · 71 avaliações no Google/);
        const sec = f.locator('#avaliacoes');
        assert.equal(await sec.locator('.av-nota').innerText(), '4,1');
        assert.equal(await sec.locator('a', { hasText: 'Ler avaliações no Google' }).getAttribute('href'), C.clinica.googleMapsUrl);
        assert.equal(await sec.locator('a', { hasText: 'Avalie a clínica' }).getAttribute('href'), `https://search.google.com/local/writereview?placeid=${C.clinica.googlePlaceId}`);
        assert.equal(await sec.locator('.est-cheia').evaluate((e) => parseFloat(e.style.width)), 82);
        const hrefs = await f.locator('#nav a:not([data-wa])').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        assert.deepEqual(hrefs, ['#a-clinica', '#como-funciona', '#atendimento', '#avaliacoes', '#localizacao']);
        // (o "toque aqui" do formulário começa com href="#" e só ganha o link do WhatsApp depois do envio)
        const ancoras = (await f.locator('a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).filter((h) => h.length > 1);
        for (const h of ancoras) assert.equal(await f.locator(h).count(), 1, `âncora ${h}`);
        assert.deepEqual(await fundos(f), ['inicio:hero', 'como-funciona:branco', 'atendimento:creme', 'a-clinica:branco', 'avaliacoes:escura', 'galeria:branco', 'localizacao:creme', 'duvidas:branco', 'agendar:sol']);
        assert.ok((await sec.innerText()).includes(DEPO.texto), 'com a chave ligada, o depoimento fica na seção de avaliações');
        assert.ok(!(await f.locator('#a-clinica').innerText()).includes(DEPO.texto), 'e não se repete em A clínica');
        await f.close();
      });

      await caso('Google Analytics só carrega depois de aceitar os cookies (e respeita a recusa)', async () => {
        const ctx3 = await browser.newContext();
        const pedidos = [];
        await ctx3.route(/googletagmanager\.com/, (r) => { pedidos.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
        const g = await ctx3.newPage();
        await g.goto(`http://127.0.0.1:${PORT + 1}/`);
        assert.ok(await g.locator('#cookies').isVisible());
        await g.waitForTimeout(300);
        assert.equal(pedidos.length, 0, 'nada antes do aceite');
        await g.click('[data-cookies="sim"]');
        await g.waitForTimeout(300);
        assert.ok(pedidos.some((u) => u.includes('id=G-TESTE123')));
        assert.equal(await g.locator('#cookies').isVisible(), false);
        await g.reload();
        assert.equal(await g.locator('#cookies').isVisible(), false, 'lembra a escolha');
        await ctx3.close();
        const ctx4 = await browser.newContext();
        const p4 = [];
        await ctx4.route(/googletagmanager\.com/, (r) => { p4.push(1); r.abort(); });
        const nn = await ctx4.newPage();
        await nn.goto(`http://127.0.0.1:${PORT + 1}/`);
        await nn.click('[data-cookies="nao"]');
        await nn.reload(); await nn.waitForTimeout(300);
        assert.equal(p4.length, 0, 'recusou: nunca carrega');
        await ctx4.close();
      });

      await caso('Publicar sem o CRO do responsável técnico é bloqueado', async () => {
        const sem = path.join(TMP, 'sem-cro.json');
        fs.writeFileSync(sem, JSON.stringify({ ...final, clinica: { ...final.clinica, croResponsavel: '' } }));
        assert.throws(() => execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { env: { ...process.env, DIST_DIR: path.join(TMP, 'x'), CONTEUDO_FILE: sem }, stdio: 'pipe' }));
      });
    } finally { srv2.kill(); }

    await caso('Sem erros no console', async () => { assert.deepEqual(erros, []); });
    console.log(`\n✅ ${passou} verificações passaram.`);
  } finally {
    await browser.close();
    srv.kill();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error('\n❌', e.message); process.exitCode = 1; });
