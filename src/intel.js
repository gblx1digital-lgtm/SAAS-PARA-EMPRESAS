/**
 * Qualificação: quem mais precisa de um site.
 *
 * Quem NÃO tem site próprio (nenhum site, só Instagram/Facebook/Linktree/WhatsApp, ou só
 * um perfil em plataforma como iFood ou Doctoralia) é o cliente ideal.
 */

// Redes sociais e "links na bio": não é site próprio
const SOCIAL = [
  'instagram.com', 'instagr.am', 'facebook.com', 'fb.com', 'fb.me', 'm.facebook.com', 'linktr.ee', 'linktree.com',
  'wa.me', 'api.whatsapp.com', 'whatsapp.com', 'chat.whatsapp.com', 'wa.link', 'tiktok.com', 'linkedin.com', 'youtube.com',
  'youtu.be', 'twitter.com', 'x.com', 'beacons.ai', 'bio.link', 'lnk.bio', 'taplink.cc', 'linkbio.co', 'campsite.bio',
  'business.site', 'negocio.site', 'g.page', 'goo.gl', 'maps.app.goo.gl', 'linkme.bio', 'msha.ke', 'carrd.co'
];

// Plataformas de pedido/cardápio e de agendamento: a empresa tem só um perfil lá, não um site próprio
const PLATFORMS = {
  'ifood.com.br': 'iFood', 'anota.ai': 'Anota AI', 'goomer.app': 'Goomer', 'goomer.com.br': 'Goomer',
  'cardapioweb.com': 'Cardápio Web', 'aiqfome.com': 'aiqfome', 'deliverydireto.com.br': 'Delivery Direto',
  'menudino.com': 'MenuDino', 'saipos.com': 'Saipos', 'olaclick.com': 'OlaClick', 'instadelivery.com.br': 'InstaDelivery',
  'neemo.com.br': 'Neemo', 'yooga.app': 'Yooga', 'cardapio.menu': 'Cardápio Menu', 'menuvem.com.br': 'Menuvem',
  'pedirdelivery.com.br': 'Pedir Delivery', 'deliverymuch.com.br': 'Delivery Much', 'rappi.com.br': 'Rappi',
  '99app.com': '99Food', 'ubereats.com': 'Uber Eats', 'consumer.com.br': 'Consumer', 'kyte.site': 'Kyte',
  'doctoralia.com.br': 'Doctoralia', 'doctoralia.com': 'Doctoralia', 'boaconsulta.com': 'BoaConsulta',
  'simplesdental.com': 'Simples Dental', 'simples.dental': 'Simples Dental', 'calendly.com': 'Calendly'
};

function hostOf(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch (e) { return ''; }
}

const matches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

/**
 * Tipo de presença na internet:
 *  nenhum     não tem site nenhum no Google
 *  social     só rede social / link na bio
 *  plataforma só perfil em plataforma (iFood, Doctoralia...)
 *  proprio    site próprio
 */
function classifySite(lead) {
  const site = String(lead.website || '').trim();
  if (!site) return { kind: 'nenhum', label: 'Sem site' };
  const host = hostOf(site);
  const platform = Object.keys(PLATFORMS).find(d => matches(host, d));
  if (platform) return { kind: 'plataforma', label: `Só ${PLATFORMS[platform]}`, platform: PLATFORMS[platform] };
  if (SOCIAL.some(d => matches(host, d))) {
    const net = /instagr/.test(host) ? 'Instagram' : /facebook|fb\./.test(host) ? 'Facebook'
      : /whatsapp|wa\.me|wa\.link/.test(host) ? 'WhatsApp' : /linktr|bio|taplink/.test(host) ? 'link na bio' : 'rede social';
    return { kind: 'social', label: `Só ${net}`, network: net };
  }
  if (host) return { kind: 'proprio', label: 'Site próprio', host };
  return { kind: 'nenhum', label: 'Sem site' };
}

/** Sem site próprio = nenhum, só rede social ou só plataforma. */
function hasNoOwnSite(lead) { return classifySite(lead).kind !== 'proprio'; }

/** Link do Instagram, quando é o "site" cadastrado no Google. */
function instagramOf(lead) {
  const site = String(lead.website || '');
  return /instagr(am\.com|\.am)/i.test(hostOf(site)) ? site : '';
}

/**
 * Nota de 0 a 100 e os motivos. Alta >= 70, Média >= 45, Baixa < 45.
 */
function score(lead) {
  const site = classifySite(lead);
  const reasons = [];
  let s = 0;
  const add = (pts, why) => { s += pts; if (why) reasons.push(why); };

  if (site.kind === 'nenhum') add(40, 'Sem site');
  else if (site.kind === 'social') add(38, `${site.label} (sem site próprio)`);
  else if (site.kind === 'plataforma') add(35, `${site.label} (sem site próprio)`);
  else add(0, 'Já tem site próprio');

  if (lead.mobile) add(20, 'Celular (WhatsApp)');
  else if (lead.phone) add(8, 'Só telefone fixo');

  const n = Number(lead.ratingCount) || 0;
  if (n >= 20 && n <= 800) add(15, `${n} avaliações (negócio ativo)`);
  else if (n > 800) add(10, `${n} avaliações (negócio grande)`);
  else if (n > 0) add(5, `${n} avaliações`);

  if (Number(lead.rating) >= 4.5) add(15, `Nota ${lead.rating}`);
  else if (Number(lead.rating) >= 4) add(8, `Nota ${lead.rating}`);

  if ((lead.photos || []).length >= 3) add(10, 'Tem fotos no Google');

  s = Math.max(0, Math.min(100, s));
  return { score: s, level: s >= 70 ? 'alta' : s >= 45 ? 'media' : 'baixa', site, reasons };
}

module.exports = { classifySite, hasNoOwnSite, instagramOf, score, hostOf };
