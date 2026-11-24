/**
 * Nichos atendidos e os termos usados na busca do Google Maps.
 * Cada termo é buscado em cada cidade/bairro ("pizzaria em Joinville, SC").
 */
const SEGMENTS = [
  { id: 'odontologia', label: 'Odontologia', terms: ['dentista', 'clínica odontológica'] },
  { id: 'pizzaria', label: 'Pizzaria', terms: ['pizzaria'] },
  { id: 'lanchonete', label: 'Lanchonete', terms: ['lanchonete', 'hamburgueria'] }
];

const BY_ID = Object.fromEntries(SEGMENTS.map(s => [s.id, s]));

/** Áreas sugeridas na primeira vez: cidades grandes de SC, RS e SP. */
const DEFAULT_AREAS = [
  'Joinville, SC', 'Florianópolis, SC', 'Blumenau, SC',
  'Porto Alegre, RS', 'Caxias do Sul, RS',
  'Campinas, SP', 'Ribeirão Preto, SP'
];

module.exports = { SEGMENTS, BY_ID, DEFAULT_AREAS };
