# Site — Vamos Sorrir (clínica odontológica, Joinville/SC)

Site de uma página (mais a política de privacidade), feito para transformar visitas em pedidos de agendamento pelo WhatsApp.

## O que tem

- **Seções:** topo com menu, apresentação, a clínica, tratamentos, por que conhecer, avaliações, galeria, localização com mapa, perguntas frequentes e chamada final com formulário.
- **WhatsApp com mensagem pronta por seção.** Cada tratamento pergunta sobre ele mesmo.
- **Formulário de agendamento:** nome, telefone, motivo, dia e período. Ele monta a mensagem e abre o WhatsApp, deixando claro que **a equipe confirma o horário**. Nada fica guardado no site.
- **Botão flutuante de WhatsApp**, que some quando o formulário aparece para não cobri-lo.
- **SEO local:**
  - título, descrição, um único H1, Open Graph e imagem de compartilhamento gerada sozinha;
  - dados estruturados do Google (`Dentist`, `FAQPage`), sitemap e robots.txt.
- **Desempenho:** fotos convertidas para WebP em 3 tamanhos, fonte no próprio site, mapa carregado só quando a pessoa chega perto dele e nenhuma biblioteca externa.
- **Acessibilidade:** navegação por teclado, menu acessível, textos alternativos, botões com área de toque grande e respeito a "reduzir movimento".
- **LGPD:** política de privacidade. O Google Analytics é opcional e só carrega depois que o visitante aceita os cookies.
- **Segurança:** cabeçalhos de segurança, incluindo CSP (arquivo `_headers`).

## Modo prévia (padrão)

Com `"previa": true` no `conteudo.json`, o site:
- mostra uma faixa "Prévia do site — conteúdo em validação pela clínica";
- **não aparece no Google** (`noindex` e robots.txt bloqueando).

Use assim para apresentar à clínica. Quando ela aprovar, mude para `false`. O build **se recusa a gerar a versão final sem o responsável técnico e o CRO**, que são obrigatórios na divulgação odontológica.

## Como editar

Todo o texto está no **`conteudo.json`**: dados da clínica, tratamentos, perguntas frequentes, mensagens de WhatsApp, equipe, depoimentos e fotos. Os campos que começam com `_` explicam o que vai em cada lugar.

- **Tratamentos:** cada um tem `"confirmado": false`, e o botão pergunta *"vocês realizam...?"*. Quando a clínica confirmar, mude para `true` e o botão vira "Agendar". Apague os que ela não faz.
- **Equipe, diferenciais e depoimentos:** ficam vazios e só aparecem quando preenchidos, com informações reais.
- **Fotos:** coloque na pasta `fotos/` com os nomes listados em `fotos/LEIA-ME.txt`. Foto que faltar aparece como espaço reservado.

## Comandos

```bash
npm install
```

```bash
npm run build
```

```bash
npm start
```

`npm run build` gera a pasta `dist/` e avisa o que está faltando. `npm start` gera e abre em <http://localhost:4000>.

```bash
npm test
```

O teste abre o site num navegador de verdade e confere 27 pontos: links, mensagens do WhatsApp, formulário, menu do celular, galeria, mapa, SEO, cookies, modo prévia e final, e layout de 320 a 1440 px.

## Publicar

O site é estático (só arquivos), então funciona em qualquer hospedagem.

- **Netlify (recomendado, grátis para começar):**
  1. Conecte o repositório.
  2. Em *Base directory*, coloque `sites/vamos-sorrir`.
  3. O `netlify.toml` já define o build e a pasta.
- **Vercel:** *Root Directory* `sites/vamos-sorrir`, *Build Command* `npm run build`, *Output Directory* `dist`. Os cabeçalhos do `_headers` não valem lá.
- **Domínio próprio:** registre no registro.br (ex.: `vamossorrirjoinville.com.br`), aponte para a hospedagem e coloque o endereço em `site.url`.

## Checklist antes de sair da prévia

1. Fotos reais da clínica em `fotos/`, com autorização.
2. `responsavelTecnico` e `croResponsavel` preenchidos (e `inscricaoClinicaCro`, se a clínica tiver).
3. Tratamentos revisados com a clínica (`confirmado: true` ou apagados).
4. `googleMapsUrl` com o link exato do perfil da clínica (botão **Compartilhar** no Google Maps).
5. `site.url` com o domínio definitivo.
6. Nota e número de avaliações atualizados.
7. Opcional: `googleAnalyticsId` (GA4) e `googleSearchConsole`.
8. `"previa": false`, `npm test`, `npm run build` e publicar.
9. **Depois de publicar:**
   - no Search Console, envie o `sitemap.xml`;
   - no **Perfil da Empresa no Google**, coloque o link do site. Esse é o passo que mais traz visitas.

## Regras de publicidade odontológica (CFO)

O site já segue as principais regras:
- não mostra preços, promoções ou "antes e depois";
- não promete resultado;
- tem espaço obrigatório para o nome e o CRO do responsável técnico.

Antes de publicar, a clínica deve conferir o texto final com o responsável técnico.
