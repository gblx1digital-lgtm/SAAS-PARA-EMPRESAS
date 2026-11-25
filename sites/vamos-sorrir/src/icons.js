/**
 * Ícones de linha (24×24, traço 1.7). Inline, sem bibliotecas.
 */
const TOOTH = 'M8 3.5c-2.6 0-4.5 2-4.5 4.8 0 2.2.9 3.5 1.5 5.3.6 1.9.7 7 2.6 7 1.6 0 1.4-4.6 4.4-4.6s2.8 4.6 4.4 4.6c1.9 0 2-5.1 2.6-7 .6-1.8 1.5-3.1 1.5-5.3 0-2.8-1.9-4.8-4.5-4.8-1.7 0-2.6.9-4 .9s-2.3-.9-4-.9z';
const P = {
  whatsapp: '<path d="M3.5 20.5l1.2-4.3A8.5 8.5 0 1 1 8 19.4l-4.5 1.1z"/><path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.7l-.5.6c-.1.2-.1.4 0 .5.6 1 1.4 1.8 2.4 2.4.2.1.4.1.5 0l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.2.6-.6.8-.7.4-1.6.5-2.5.1a9.7 9.7 0 0 1-4.9-4.9c-.4-.9-.3-1.8.1-2.5z"/>',
  local: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  telefone: '<path d="M6.6 3.5h2.6l1.4 4-1.9 1.3a10.6 10.6 0 0 0 6.5 6.5l1.3-1.9 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
  estrela: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8.5 13.5l2.2 2.2 4.8-4.6"/>',
  conversa: '<path d="M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5V16h-1a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 9.5h8M8 12.5h5"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  mapa: '<path d="M9 4.5l-5 2v13l5-2 6 2 5-2v-13l-5 2-6-2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  navegar: '<path d="M12 3.5l7 17-7-4-7 4z"/>',
  ampliar: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4M11 8.5v5M8.5 11h5"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
  escudo: '<path d="M12 3l7 3v5.5c0 4.4-3 8.1-7 9.5-4-1.4-7-5.1-7-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.4"/>',
  lapis: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>',
  // atendimento
  dente: `<path d="${TOOTH}"/>`,
  dor: `<path d="${TOOTH}"/><path d="M12.6 7.2l-2.3 3.3h3l-2.2 3.3"/>`,
  avaliacao: `<path d="${TOOTH}"/><path d="M9.5 9.6l1.8 1.8 3.4-3.4"/>`,
  restauracao: `<path d="${TOOTH}"/><path d="M10 9.5h4v3h-4z"/>`,
  clareamento: '<path d="M8 5.5c-2.2 0-3.8 1.7-3.8 4 0 1.9.8 3 1.3 4.5.5 1.6.6 6 2.2 6 1.4 0 1.2-3.9 3.8-3.9s2.4 3.9 3.8 3.9c1.6 0 1.7-4.4 2.2-6 .5-1.5 1.3-2.6 1.3-4.5 0-2.3-1.6-4-3.8-4-1.5 0-2.2.8-3.5.8S9.5 5.5 8 5.5z"/><path d="M19.5 2.5v3M18 4h3M4 2.5v2M3 3.5h2"/>',
  ortodontia: '<path d="M3.5 9.5c2.5 2 5.3 3 8.5 3s6-1 8.5-3"/><rect x="5.5" y="9" width="3" height="3" rx=".6"/><rect x="10.5" y="10.5" width="3" height="3" rx=".6"/><rect x="15.5" y="9" width="3" height="3" rx=".6"/><path d="M3.5 15.5c2.5 1.6 5.3 2.4 8.5 2.4s6-.8 8.5-2.4"/>',
  implante: '<path d="M7.5 3.5h9c0 2.7-1.6 4.5-4.5 4.5S7.5 6.2 7.5 3.5z"/><path d="M9 10h6M9.5 13h5M10 16h4M10.5 19h3M10 8l.5 12.5h3L14 8"/>',
};

function icon(name, cls = 'ico') {
  const d = P[name] || P.dente;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}

module.exports = { icon };
