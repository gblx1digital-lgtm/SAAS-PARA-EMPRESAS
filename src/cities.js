/**
 * Municípios brasileiros com a população (IBGE, Censo 2022), para buscar em um estado inteiro.
 * Dados em src/data/municipios.json (5.571 municípios).
 */
const data = require('./data/municipios.json');

const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const BY_NAME = Object.fromEntries(Object.entries(STATE_NAMES).map(([uf, name]) => [norm(name), uf]));

/**
 * Linha que significa "o estado inteiro": só a sigla ("MG") ou escrito com "estado"
 * ("estado de Minas Gerais", "todo o estado de SP"). O nome sozinho NÃO conta, porque
 * "São Paulo", "Rio de Janeiro", "Goiás" e "Tocantins" também são nomes de cidades.
 */
function ufFromText(text) {
  const t = norm(text);
  if (/^[a-z]{2}$/.test(t)) return data.estados[t.toUpperCase()] ? t.toUpperCase() : null;
  const m = t.match(/^(?:todo (?:o )?)?(?:o )?estado (?:de |do |da )?(.+)$/);
  if (!m) return null;
  const rest = m[1].trim();
  if (/^[a-z]{2}$/.test(rest) && data.estados[rest.toUpperCase()]) return rest.toUpperCase();
  return BY_NAME[rest] || null;
}

/** Cidades de um estado com pelo menos minPop habitantes, das maiores para as menores. */
function citiesOf(uf, minPop = 0) {
  return (data.estados[uf] || []).filter(([, pop]) => pop >= minPop).map(([name, pop]) => ({ name, pop }));
}

/** Troca linhas que são só um estado ("MG") pela lista "Cidade, UF" das cidades daquele estado. */
function expandAreas(lines, minPop = 0) {
  const out = [];
  for (const line of lines) {
    const uf = ufFromText(line);
    if (uf) out.push(...citiesOf(uf, minPop).map(c => `${c.name}, ${uf}`));
    else out.push(line);
  }
  return [...new Set(out)];
}

function states() {
  return Object.entries(STATE_NAMES).map(([uf, name]) => ({ uf, name, cities: (data.estados[uf] || []).length }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { STATE_NAMES, ufFromText, citiesOf, expandAreas, states, norm };
