# Site — Vamos Sorrir (clínica odontológica, Joinville/SC)

Site de uma página (mais a política de privacidade) feito para transformar visitas em pedidos de avaliação pelo WhatsApp, dentro das regras de publicidade odontológica.

## O que tem

- **Topo que converte:**
  - título com a busca que o paciente faz ("Cuide do seu sorriso no Centro de Joinville");
  - **aviso "Aberto agora · fecha às 19h"** calculado no horário de Brasília, que também mostra "Fechado agora · abre amanhã às 8h", "abre segunda" etc.;
  - botões de WhatsApp e de ligar;
  - nota do Google, fotos da clínica e o selo da responsável técnica.
- **Agendar é simples:** 3 passos que tiram a insegurança de entrar em contato.
- **Conte o que você precisa:** cartões pensados no problema do paciente ("Estou com dor", "Perdi um dente", "Quero clarear"...). Cada um abre o WhatsApp com a mensagem daquela situação, sem afirmar tratamentos que a clínica não confirmou.
- **A clínica:** fotos e fatos verificados (endereço, horários, WhatsApp, responsável técnica com CRO).
- **Avaliações:** nota e total do Google, botão para ler e botão **"Já é paciente? Avalie a clínica"**, que abre direto a tela de avaliação do Google.
- **Galeria** com ampliação.
- **Localização:**
  - horário com o **dia de hoje destacado** e aviso sobre feriados;
  - rota pelo **Google Maps** e pelo **Waze**;
  - mapa que só carrega quando a pessoa chega perto dele.
- **Perguntas frequentes**, incluindo "quanto custa", respondida sem divulgar preço, como o CFO exige.
- **Chamada final "Vamos sorrir?"** com formulário que monta a mensagem de agendamento e abre o WhatsApp, deixando claro que **a equipe confirma o horário**. Nada fica guardado no site.
- **Celular:** barra fixa embaixo com **WhatsApp** e **Ligar**. No computador, botão flutuante de WhatsApp.
- **Logo em vetor** gerado no build, no estilo da fachada ("Vamos" em grafite e "Sorrir" em vermelho com o sorriso). Para usar o arquivo oficial da clínica, troque o `makeLogo` no `build.js`.
- **SEO local:** título, descrição, um único H1, Open Graph, dados estruturados do Google (`Dentist`, `FAQPage`), sitemap e robots.txt.
- **Desempenho:** fotos em WebP com vários tamanhos, fontes no próprio site e nenhuma biblioteca externa.
- **Acessibilidade:** teclado, menu acessível, textos alternativos e botões com pelo menos 44 px de altura.
- **LGPD:** política de privacidade. O Google Analytics é opcional e só carrega depois que o visitante aceita os cookies.
- **Segurança:** cabeçalhos de segurança (arquivo `_headers`).

## Modo prévia (padrão)

Com `"previa": true` no `conteudo.json`, o site:
- mostra a faixa "Prévia do site";
- **não aparece no Google** (`noindex` e robots.txt bloqueando).

Quando a clínica aprovar, mude para `false`. O build **se recusa a gerar a versão final sem o responsável técnico e o CRO**.

## Como editar

Todo o texto está no **`conteudo.json`**. Os campos que começam com `_` explicam o que vai em cada lugar.

- **`intencoes`:** os cartões de "Conte o que você precisa", com título, texto e a mensagem que vai para o WhatsApp.
- **`passos`:** os 3 passos do "Agendar é simples".
- **`clinica.horarios`:** os horários. `diasSemana` (0 = domingo … 6 = sábado) alimenta o "Aberto agora".
- **Equipe, diferenciais e depoimentos:** ficam vazios e só aparecem quando preenchidos, com informações reais.
- **`credito`:** a assinatura no rodapé. Deixe o texto vazio para não mostrar.
- **Fotos:** ficam na pasta `fotos/`, com os nomes listados em `fotos/LEIA-ME.txt`.

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

`npm run build` gera a pasta `dist/`. `npm start` gera e abre em <http://localhost:4000>.

```bash
npm test
```

O teste abre o site num navegador de verdade e confere 38 pontos, entre eles:
- o "Aberto agora" em 7 dias e horários diferentes, simulando o relógio;
- os links de WhatsApp, telefone, Maps, Waze e avaliação;
- a galeria, o formulário, o menu e a barra do celular;
- o layout de 320 a 1440 px;
- o modo prévia e a versão final;
- os cookies.

## Publicar

- **Netlify, o mais simples:** gere o site com `npm run build`, compacte o **conteúdo** da pasta `dist` num .zip e arraste o .zip no painel da Netlify.
- **Netlify ligada ao GitHub:** em *Base directory*, coloque `sites/vamos-sorrir`. O `netlify.toml` já define o build.
- **Domínio próprio:** registre no registro.br (ex.: `vamossorrirjoinville.com.br`), aponte para a hospedagem e coloque o endereço em `site.url`.

## Checklist antes de sair da prévia

1. A clínica autorizou as fotos (hoje são as do perfil dela no Google).
2. Responsável técnica, CRO e EPAO confirmados (foram lidos na placa da fachada).
3. Os cartões de atendimento combinam com o que a clínica faz.
4. `site.url` com o domínio definitivo.
5. Nota e número de avaliações atualizados.
6. Opcional: `googleAnalyticsId` (GA4) e `googleSearchConsole`.
7. `"previa": false`, `npm test`, `npm run build` e publicar.
8. **Depois de publicar:** envie o `sitemap.xml` no Search Console e coloque o link do site no **Perfil da Empresa no Google**.
