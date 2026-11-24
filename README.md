# Prospecção de Sites

Site particular para encontrar empresas **sem site** no Google Maps e reunir tudo sobre elas, para oferecer a criação de um site.

Nichos: **Odontologia** (dentista, clínica odontológica), **Pizzaria** e **Lanchonete** (lanchonete, hamburgueria).

## O que ele faz

- **Busca no Google Maps** pela API oficial, cidade por cidade (ou bairro por bairro), e guarda só quem **não tem site próprio**:
  - sem site nenhum;
  - só Instagram, Facebook, WhatsApp ou link na bio;
  - só perfil em plataforma (iFood, Anota AI, Goomer, Doctoralia...).
- **Ficha completa de cada empresa**, com tudo que o Google informa:
  - até **10 fotos** (com ampliação) e até **5 avaliações** com texto, ótimas como depoimentos;
  - telefone (marca se é celular), link do WhatsApp, Instagram (quando é o link cadastrado; se não, um atalho para procurar);
  - endereço completo, bairro, CEP, coordenadas, link do Google Maps;
  - nota, número de avaliações, categoria, faixa de preço e descrição;
  - horário de funcionamento;
  - serviços (delivery, retirada, comer no local, reservas...), formas de pagamento, estacionamento e acessibilidade.
- **Prioridade** de 0 a 100 para cada empresa: sem site, celular, nota alta, muitas avaliações e fotos sobem a nota.
- **Filtros** por nicho, estado, cidade, situação do site, nota (alta ou baixa), reclamações, status, "só celular" e "só com fotos".
- **Atalho "Sem site + nota baixa + reclamações"**: mostra quem não tem site, tem nota até 4,3 e avaliações reclamando (atendimento, demora, comida fria...). As reclamações ficam destacadas em vermelho na ficha e vão para a planilha.
- **Instagram encontrado por você**: na ficha, cole o @perfil ou o link (o código `?igsh=` é removido). Ele aparece no cartão, na busca e na planilha, e não é apagado quando você atualiza os dados do Google.
- **Status e anotações** simples (Nova, Já contatei, Negociando, Virou cliente, Descartada).
- **Exportar planilha** (CSV, abre no Excel e no Google Planilhas) com todas as informações.
- **Atualizar dados do Google** de uma empresa quando quiser (nota, fotos e avaliações novas), sem perder suas anotações.
- Sem automação de WhatsApp: o botão só abre a conversa para você escrever.

## Publicar no Railway (cerca de 10 minutos)

1. No Railway, abra o seu projeto e clique em **New → GitHub Repo → SAAS-PARA-EMPRESAS**. O Railway detecta o `Dockerfile`.
2. No serviço criado: **Volumes → Add Volume**, com Mount Path `/data`. As empresas e as fotos ficam guardadas ali.
3. Em **Variables**, adicione:

   | Variável | O que colocar |
   |---|---|
   | `ADMIN_PASSWORD` | Uma senha forte, com pelo menos 8 caracteres. É a senha para entrar no site. |
   | `GOOGLE_PLACES_API_KEY` | Sua chave do Google. Pode ser **a mesma chave do Clinova Prospecção**. |
   | `NODE_ENV` | `production` |

4. Em **Settings → Networking → Generate Domain**, gere um endereço.
5. Abra o endereço, entre com a senha, vá em **Buscar no Google** e comece.

## Chave do Google (Places API)

Se você já tem a chave do Clinova, use a mesma. Para criar uma nova:

1. Em <https://console.cloud.google.com/>, crie um projeto e **ative o faturamento** (o Google exige cartão, mas tem uma cota gratuita mensal).
2. Em **APIs e serviços → Biblioteca**, ative a **Places API (New)**.
3. Em **APIs e serviços → Credenciais → Criar credenciais → Chave de API**.
4. Na chave, em **Restrições de API**, escolha **Places API (New)**.
5. Recomendado: em **Faturamento → Orçamentos e alertas**, crie um alerta de gasto (ex.: R$ 50/mês).

### Custo

- Como o sistema pede **todos** os dados (fotos, avaliações, horário, serviços), cada consulta de busca entra na faixa mais completa da *Text Search* (Enterprise + Atmosphere). Cada consulta traz até 20 empresas.
- As fotos são cobradas à parte (*Place Photos*), **só quando você abre** a lista ou a ficha, e ficam guardadas por 30 dias para não pagar de novo.
- O sistema não repete uma busca feita nos últimos 30 dias e para no limite de consultas que você escolher em cada rodada.
- Confira os preços atuais e a cota gratuita na página de preços do Google Maps Platform.

## Dicas de busca

- Cada busca do Google traz no máximo 60 empresas. Em cidades grandes, acrescente bairros: `Centro, Joinville`, `América, Joinville`...
- Para buscar num estado inteiro, escolha o estado e o tamanho mínimo das cidades e clique em **Adicionar as cidades do estado**. Também dá para escrever só a sigla (`SC`) numa linha.
- "São Paulo" sozinho é a **cidade**. Para o estado, use `SP`.

## Fotos e avaliações no site do cliente

As fotos e avaliações vêm do Google Maps e pertencem a quem as publicou. Use-as para **conhecer a empresa e montar a prévia**. No site final, use fotos que o próprio cliente enviar (ou que ele autorize) e confirme com ele os depoimentos.

## Rodar no computador (opcional)

```bash
npm install
```

```bash
ADMIN_PASSWORD=sua-senha-aqui GOOGLE_PLACES_API_KEY=sua-chave npm start
```

Abra <http://localhost:3000>.

## Testes

```bash
npm test
```

O teste usa um Google **simulado**: não precisa de internet e não gasta cota.

## Variáveis opcionais

| Variável | Para quê |
|---|---|
| `DATA_DIR` | Pasta dos dados (no Docker já é `/data`). |
| `SESSION_SECRET` | Segredo das sessões. Sem ele, o segredo é derivado da senha, e trocar a senha desconecta todo mundo. |

População por município: IBGE, Censo 2022 (dados do pacote `municipios-br`, licença CC0 — domínio público; veja `src/data/LICENSE-municipios-br.txt`).
