/**
 * Teste completo do site num navegador de verdade (Playwright + Chromium).
 *   npm test
 *
 * Gera o site com fotos de exemplo numa pasta temporária e confere: links, mensagens do
 * WhatsApp por seção, formulário, menu do celular, galeria, mapa, SEO e layout em várias telas.
 * Não mexe na pasta dist/ nem em fotos/.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
const { execFileSync, spawn } = require('child_process');
const sharp = require('sharp');
const { chromium } = require('playwright');

const ROOT = __dirname;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'site-vs-'));
const FOTOS = path.join(TMP, 'fotos');
const DIST = path.join(TMP, 'dist');
const PORT = 4500 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'conteudo.json'), 'utf8'));
const WA = C.clinica.whatsapp;

function waText(href) {
  const u = new URL(href);
  assert.equal(u.origin + u.pathname, `https://wa.me/${WA}`, `link de WhatsApp com o número certo: ${href}`);
  return u.searchParams.get('text');
}

let passou = 0;
async function caso(nome, fn) { await fn(); passou++; console.log(`  ✓ ${nome}`); }

async function main() {
  // Fotos de exemplo (só para o teste)
  fs.mkdirSync(FOTOS);
  for (const [i, f] of C.galeria.fotos.entries()) {
    await sharp({ create: { width: 1800, height: 1200, channels: 3, background: ['#d9c9a3', '#c8b48a', '#e2d6b9', '#b9a57d', '#d1c098', '#e8dcc0'][i % 6] } })
      .jpeg().toFile(path.join(FOTOS, f.arquivo));
  }
  execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { env: { ...process.env, FOTOS_DIR: FOTOS, DIST_DIR: DIST }, stdio: 'pipe' });
  const srv = spawn(process.execPath, [path.join(ROOT, 'serve.js')], { env: { ...process.env, DIST_DIR: DIST, PORT: String(PORT) } });
  await new Promise(r => srv.stdout.on('data', r));

  const browser = await chromium.launch();
  const erros = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await ctx.route(/maps\.google\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
    await ctx.route(/wa\.me/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>whatsapp</p>' }));
    const page = await ctx.newPage();
    page.on('pageerror', e => erros.push(e.message));
    page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
    await page.goto(BASE + '/');

    await caso('SEO: título, descrição, um único H1, canonical, Open Graph', async () => {
      assert.equal(await page.title(), C.site.titulo);
      assert.equal(await page.getAttribute('meta[name=description]', 'content'), C.site.descricao);
      assert.equal(await page.locator('h1').count(), 1);
      assert.match(await page.locator('h1').innerText(), /Clínica odontológica no Centro de Joinville/i);
      assert.equal(await page.getAttribute('link[rel=canonical]', 'href'), `${C.site.url}/`);
      const og = await page.getAttribute('meta[property="og:image"]', 'content');
      assert.ok(og.startsWith(C.site.url + '/og-'));
      assert.ok(fs.existsSync(path.join(DIST, og.slice(C.site.url.length))));
      const h2 = await page.locator('main h2').allInnerTexts();
      assert.ok(h2.length >= 8, 'cada seção tem seu H2');
    });

    await caso('Prévia fica fora do Google (noindex + robots.txt)', async () => {
      assert.equal(C.previa, true);
      assert.equal(await page.getAttribute('meta[name=robots]', 'content'), 'noindex, nofollow');
      assert.match(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'), /Disallow: \//);
      assert.match(fs.readFileSync(path.join(DIST, '_headers'), 'utf8'), /X-Robots-Tag: noindex/);
      assert.ok(await page.locator('.previa').isVisible());
    });

    await caso('Dados estruturados: Dentist com endereço, horário e geo; FAQPage; sem nota autodeclarada', async () => {
      const blocos = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(t => JSON.parse(t));
      const d = blocos.find(b => b['@type'] === 'Dentist');
      assert.equal(d.name, 'Vamos Sorrir');
      assert.equal(d.telephone, '+5547988251098');
      assert.equal(d.address.streetAddress, 'Rua 9 de Março, 396');
      assert.equal(d.address.postalCode, '89201-400');
      assert.equal(d.geo.latitude, -26.301716);
      assert.deepEqual(d.openingHoursSpecification.map(o => [o.opens, o.closes, o.dayOfWeek.length]), [['08:00', '19:00', 5], ['08:00', '14:00', 1]]);
      assert.equal(d.aggregateRating, undefined, 'Google não aceita nota autodeclarada');
      const faq = blocos.find(b => b['@type'] === 'FAQPage');
      assert.equal(faq.mainEntity.length, C.faq.length);
    });

    await caso('Sitemap com as duas páginas', async () => {
      const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
      assert.ok(xml.includes(`<loc>${C.site.url}/</loc>`));
      assert.ok(xml.includes(`<loc>${C.site.url}/politica-de-privacidade/</loc>`));
    });

    await caso('Todos os links de WhatsApp: número certo, mensagem da seção, nova aba', async () => {
      const links = await page.locator('a[data-wa]').evaluateAll(as => as.map(a => ({ href: a.href, origem: a.dataset.wa, target: a.target, rel: a.rel })));
      assert.equal(links.length, 9 + C.tratamentos.lista.length, `${links.length} links`);
      for (const l of links) {
        const t = waText(l.href);
        assert.ok(t && t.length > 20, `mensagem pronta em ${l.origem}`);
        assert.equal(l.target, '_blank');
        assert.match(l.rel, /noopener/);
        if (C.whatsappMensagens[l.origem]) assert.equal(t, C.whatsappMensagens[l.origem], l.origem);
      }
      const nav = links.find(l => l.origem === 'avaliacao');
      assert.equal(waText(nav.href), C.whatsappMensagens.avaliacao);
    });

    await caso('Cada tratamento pergunta sobre ele mesmo no WhatsApp', async () => {
      for (const t of C.tratamentos.lista) {
        const href = await page.locator(`a[data-wa="tratamento:${t.nome}"]`).getAttribute('href');
        const txt = waText(href);
        assert.ok(txt.includes(t.nome.toLowerCase()), `${t.nome}: ${txt}`);
        if (!t.confirmado) assert.match(txt, /se vocês realizam/);
      }
    });

    await caso('Avaliações: nota 4,1, 71 avaliações e botão para o Google', async () => {
      const sec = page.locator('#avaliacoes');
      assert.equal(await sec.locator('.av-nota').innerText(), '4,1');
      assert.match(await sec.innerText(), /71 avaliações/);
      const href = await sec.locator('a', { hasText: 'Ver avaliações no Google' }).getAttribute('href');
      if (C.clinica.googleMapsUrl) assert.equal(href, C.clinica.googleMapsUrl, 'perfil exato da clínica no Maps');
      else { assert.ok(href.startsWith('https://www.google.com/maps/')); assert.ok(decodeURIComponent(href).includes('Vamos Sorrir')); }
      assert.equal(await sec.locator('.est-cheia').evaluate(e => parseFloat(e.style.width)), 82);
    });

    await caso('Localização: endereço, horários e "Como chegar" com destino certo', async () => {
      const sec = page.locator('#localizacao');
      const txt = await sec.innerText();
      for (const s of ['Rua 9 de Março, 396', '89201-400', '8h às 19h', '8h às 14h', 'Fechado']) assert.ok(txt.includes(s), s);
      const rota = new URL(await sec.locator('a', { hasText: 'Como chegar' }).getAttribute('href'));
      assert.equal(rota.pathname, '/maps/dir/');
      assert.match(rota.searchParams.get('destination'), /Rua 9 de Março, 396.*Joinville/);
      if (C.clinica.googlePlaceId) assert.equal(rota.searchParams.get('destination_place_id'), C.clinica.googlePlaceId);
    });

    await caso('Mapa carrega sozinho ao chegar perto da seção', async () => {
      assert.equal(await page.locator('#mapa iframe').count(), 0, 'não carrega antes (mais rápido)');
      await page.locator('#localizacao').scrollIntoViewIfNeeded();
      await page.waitForSelector('#mapa iframe');
      const src = await page.getAttribute('#mapa iframe', 'src');
      assert.ok(src.startsWith('https://maps.google.com/maps?q=') && src.includes('output=embed'));
      assert.ok(await page.getAttribute('#mapa iframe', 'title'));
    });

    await caso('Galeria: fotos otimizadas (WebP + srcset), ampliar, navegar e fechar', async () => {
      const imgs = page.locator('.gal-btn img');
      assert.equal(await imgs.count(), C.galeria.fotos.length);
      const srcset = await imgs.first().getAttribute('srcset');
      assert.match(srcset, /\.webp 480w, .*\.webp 960w, .*\.webp 1600w/);
      for (const alt of await imgs.evaluateAll(is => is.map(i => i.alt))) assert.ok(alt.length > 10, 'texto alternativo');
      await page.locator('.gal-btn').nth(1).click();
      assert.ok(await page.locator('#lightbox').evaluate(d => d.open));
      assert.match(await page.locator('#lb-leg').innerText(), /Recepção · 2 de 6/);
      await page.keyboard.press('ArrowRight');
      assert.match(await page.locator('#lb-leg').innerText(), /3 de 6/);
      await page.locator('#lb-ant').click();
      await page.locator('#lb-ant').click();
      assert.match(await page.locator('#lb-leg').innerText(), /1 de 6/);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#lightbox').evaluate(d => d.open), false);
    });

    await caso('Formulário: valida campos e abre o WhatsApp com a mensagem organizada', async () => {
      await page.locator('#agendar').scrollIntoViewIfNeeded();
      await page.click('#form-agendar button[type=submit]');
      for (const id of ['e-nome', 'e-tel', 'e-motivo']) assert.ok(await page.locator('#' + id).isVisible(), id);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'f-nome', 'foco vai para o primeiro erro');

      await page.fill('#f-nome', 'Maria Souza');
      await page.fill('#f-tel', '47999887766');
      assert.equal(await page.inputValue('#f-tel'), '(47) 99988-7766', 'máscara do telefone');
      await page.selectOption('#f-motivo', 'Dor ou desconforto');
      await page.selectOption('#f-dia', 'Sábado');
      await page.selectOption('#f-periodo', 'Sábado pela manhã');
      await page.fill('#f-obs', 'Dente do siso incomodando');
      const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('#form-agendar button[type=submit]')]);
      await popup.waitForLoadState();
      const t = waText(popup.url());
      assert.equal(await popup.evaluate(() => window.opener), null, 'nova aba sem acesso ao site');
      await popup.close();
      assert.equal(t, [
        'Olá! Gostaria de solicitar um agendamento pelo site da Vamos Sorrir.', '',
        '*Nome:* Maria Souza', '*Telefone:* (47) 99988-7766', '*Motivo:* Dor ou desconforto',
        '*Preferência:* Sábado · Sábado pela manhã', '*Observações:* Dente do siso incomodando', '',
        'Aguardo a confirmação do horário. Obrigado!'
      ].join('\n'));
      assert.ok(await page.locator('#form-ok').isVisible(), 'mostra que o WhatsApp foi aberto');
      for (const id of ['e-nome', 'e-tel', 'e-motivo']) assert.equal(await page.locator('#' + id).isVisible(), false);
      assert.match(await page.locator('.form-nota').innerText(), /só fica marcado depois da confirmação/);
    });

    await caso('Links internos do menu levam às seções certas', async () => {
      const hrefs = await page.locator('#nav a:not([data-wa])').evaluateAll(as => as.map(a => a.getAttribute('href')));
      assert.deepEqual(hrefs, ['#inicio', '#a-clinica', '#tratamentos', '#avaliacoes', '#localizacao']);
      for (const h of hrefs) assert.equal(await page.locator(h).count(), 1, h);
      const ancoras = await page.locator('main a[href^="#"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
      for (const h of ancoras) assert.equal(await page.locator(h).count(), 1, `âncora ${h}`);
    });

    await caso('Rodapé: endereço, telefone, horários, Maps, privacidade e espaço para o CRO', async () => {
      const r = await page.locator('.rodape').innerText();
      const cro = C.clinica.croResponsavel ? `Responsável técnico: ${C.clinica.responsavelTecnico} — ${C.clinica.croResponsavel}` : 'CRO-SC [número]';
      for (const s of ['Rua 9 de Março, 396', 'CEP 89201-400', '(47) 98825-1098', 'Segunda a sexta', 'Ver no Google Maps', 'Política de privacidade', 'Todos os direitos reservados', cro]) assert.ok(r.includes(s), s);
      assert.equal(await page.locator('.rodape a[href^="tel:"]').getAttribute('href'), 'tel:+5547988251098');
    });

    await caso('Política de privacidade e página 404 funcionam', async () => {
      const p2 = await ctx.newPage();
      const res = await p2.goto(BASE + '/politica-de-privacidade/');
      assert.equal(res.status(), 200);
      assert.match(await p2.locator('h1').innerText(), /Política de privacidade/);
      assert.match(await p2.locator('main').innerText(), /LGPD|13\.709/);
      await p2.click('.topo a.logo');
      await p2.waitForURL(BASE + '/#inicio');
      const r404 = await p2.goto(BASE + '/nao-existe');
      assert.equal(r404.status(), 404);
      assert.match(await p2.locator('h1').innerText(), /não encontrada/);
      await p2.close();
    });

    await caso('Todas as imagens têm texto alternativo e tamanho definido', async () => {
      const ruins = await page.locator('img').evaluateAll(is => is.filter(i => !i.alt || (i.id !== 'lb-img' && !i.getAttribute('width'))).map(i => i.src));
      assert.deepEqual(ruins, []);
    });

    // ─── Celular ──────────────────────────────────────────────────────────────
    const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mob.route(/maps\.google\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
    const m = await mob.newPage();
    m.on('pageerror', e => erros.push(e.message));
    await m.goto(BASE + '/');

    await caso('Celular: menu abre, fecha e navega; botão "Agendar avaliação" dentro do menu', async () => {
      assert.equal(await m.locator('#nav').isVisible(), false);
      await m.click('#menu-btn');
      assert.equal(await m.getAttribute('#menu-btn', 'aria-expanded'), 'true');
      assert.ok(await m.locator('#nav .nav-cta').isVisible());
      await m.click('#nav a[href="#tratamentos"]');
      assert.equal(await m.getAttribute('#menu-btn', 'aria-expanded'), 'false');
      await m.waitForTimeout(600);
      const y = await m.locator('#tratamentos').evaluate(e => e.getBoundingClientRect().top);
      assert.ok(y >= 0 && y < 120, `rolou até Tratamentos (${y})`);
      await m.click('#menu-btn');
      await m.keyboard.press('Escape');
      assert.equal(await m.locator('#nav').isVisible(), false);
    });

    await caso('Celular: WhatsApp flutuante visível e some na chamada final', async () => {
      await m.evaluate(() => window.scrollTo(0, 0));
      await m.waitForTimeout(200);
      const wa = m.locator('.wa-flutuante');
      assert.ok(await wa.isVisible());
      const box = await wa.boundingBox();
      assert.ok(box.width >= 48 && box.height >= 48, 'fácil de tocar');
      await m.locator('#agendar').scrollIntoViewIfNeeded();
      await m.waitForTimeout(400);
      assert.match(await wa.getAttribute('class'), /escondido/);
    });

    await caso('Celular: botões com área de toque de pelo menos 44px', async () => {
      const pequenos = await m.locator('main .btn, .topo .menu-btn').evaluateAll(bs => bs.filter(b => b.offsetParent && b.getBoundingClientRect().height < 42).map(b => b.textContent.trim()));
      assert.deepEqual(pequenos, []);
    });

    for (const w of [320, 390, 768, 1024, 1440]) {
      await caso(`Sem rolagem lateral em ${w}px`, async () => {
        await m.setViewportSize({ width: w, height: 800 });
        await m.waitForTimeout(150);
        const sw = await m.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(sw <= w, `largura ${sw} > ${w}`);
      });
    }
    await mob.close();

    // ─── Versão final (fora da prévia) com Google Analytics ───────────────────
    const final = { ...C, previa: false, site: { ...C.site, googleAnalyticsId: 'G-TESTE123' },
      clinica: { ...C.clinica, responsavelTecnico: 'Dra. Teste', croResponsavel: 'CRO-SC 00000' } };
    const cf = path.join(TMP, 'final.json');
    fs.writeFileSync(cf, JSON.stringify(final));
    const DIST2 = path.join(TMP, 'dist-final');
    execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { env: { ...process.env, FOTOS_DIR: FOTOS, DIST_DIR: DIST2, CONTEUDO_FILE: cf }, stdio: 'pipe' });
    const srv2 = spawn(process.execPath, [path.join(ROOT, 'serve.js')], { env: { ...process.env, DIST_DIR: DIST2, PORT: String(PORT + 1) } });
    await new Promise(r => srv2.stdout.on('data', r));
    try {
      await caso('Versão final: aparece no Google, sitemap no robots.txt, CRO no rodapé, sem faixa de prévia', async () => {
        const f = await browser.newPage();
        await f.goto(`http://127.0.0.1:${PORT + 1}/`);
        assert.equal(await f.getAttribute('meta[name=robots]', 'content'), 'index, follow, max-image-preview:large');
        assert.equal(await f.locator('.previa').count(), 0);
        assert.match(fs.readFileSync(path.join(DIST2, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/.+\/sitemap\.xml/);
        assert.doesNotMatch(fs.readFileSync(path.join(DIST2, '_headers'), 'utf8'), /noindex/);
        assert.match(await f.locator('.rodape-legal').innerText(), /Responsável técnico: Dra\. Teste — CRO-SC 00000/);
        await f.close();
      });

      await caso('Google Analytics só carrega depois de aceitar os cookies', async () => {
        const ctx3 = await browser.newContext();
        const pedidos = [];
        await ctx3.route(/googletagmanager\.com/, r => { pedidos.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
        const g = await ctx3.newPage();
        await g.goto(`http://127.0.0.1:${PORT + 1}/`);
        assert.ok(await g.locator('#cookies').isVisible(), 'mostra o aviso');
        await g.waitForTimeout(300);
        assert.equal(pedidos.length, 0, 'nada antes do aceite');
        await g.click('[data-cookies="sim"]');
        await g.waitForTimeout(300);
        assert.ok(pedidos.some(u => u.includes('id=G-TESTE123')));
        assert.equal(await g.locator('#cookies').isVisible(), false);
        await g.reload();
        assert.equal(await g.locator('#cookies').isVisible(), false, 'lembra a escolha');
        await ctx3.close();
        const ctx4 = await browser.newContext();
        const p4 = []; await ctx4.route(/googletagmanager\.com/, r => { p4.push(1); r.abort(); });
        const n = await ctx4.newPage();
        await n.goto(`http://127.0.0.1:${PORT + 1}/`);
        await n.click('[data-cookies="nao"]');
        await n.reload(); await n.waitForTimeout(300);
        assert.equal(p4.length, 0, 'recusou: nunca carrega');
        await ctx4.close();
      });

      await caso('Publicar sem CRO é bloqueado', async () => {
        const sem = path.join(TMP, 'sem-cro.json');
        fs.writeFileSync(sem, JSON.stringify({ ...final, clinica: { ...final.clinica, croResponsavel: '' } }));
        assert.throws(() => execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { env: { ...process.env, FOTOS_DIR: FOTOS, DIST_DIR: path.join(TMP, 'x'), CONTEUDO_FILE: sem }, stdio: 'pipe' }));
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

main().catch(e => { console.error('\n❌', e.message); process.exitCode = 1; });
