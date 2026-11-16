# Kurio — marketplace de NFTs

Front-end de um marketplace de NFTs (tema escuro marrom + laranja, interface em português), feito a partir de um desafio de front-end com design no Figma. **Não existe backend real**: a API e o servidor Socket.IO são simulados no navegador com MSW, o que vale também para a versão publicada.

- **Stack:** React 19 · TypeScript (strict) · Vite 8 · TanStack Router + Query · Axios · Socket.IO · Tailwind v4 + shadcn/ui · react-hook-form + zod · i18next · MSW v3 · Playwright · Lighthouse.
- **Demo publicada:** _preencher com a URL após o deploy (ver [Deploy](#deploy))._
- **Arquitetura detalhada:** [ARCHITECTURE.md](./ARCHITECTURE.md). 

## Como rodar

Requer Node 22+.

```bash
npm ci          # o .npmrc liga legacy-peer-deps (o binding do Socket.IO declara msw@^2; funciona com a v3)
npm run dev     # http://localhost:5173 — a API simulada sobe junto
```

### Contas e cupons de teste

| Conta | E-mail | Senha |
|---|---|---|
| Principal (carteira principal + secundária "Reserva") | `demo@kurio.com` | `123456` |
| Segunda (só carteira principal) | `ana@kurio.com` | `123456` |

Carteiras cujo endereço termina em `dead` recusam a conexão (para testar a recusa).

### Cupom de desconto

Na página do carrinho (`/carrinho`), digite o código em **Código promocional** e clique em **Aplicar**. O código vale para visitantes e para usuários logados, não diferencia maiúsculas de minúsculas e é guardado no navegador (`kurio:coupon`), então continua aplicado ao ir para o pagamento.

| Código | Resultado |
|---|---|
| `KURIO10` | 10 % de desconto sobre o subtotal |
| `BEMVINDO20` | 20 % de desconto sobre o subtotal |
| `EXPIRADO` | "expirado", sem desconto |
| qualquer outro | "inválido", sem desconto |

O desconto não é calculado na tela: o carrinho envia as linhas e o código para `POST /api/quote`, e a resposta traz `discount`, `total` e `coupon: { code, status }` (`applied`, `expired` ou `invalid`). A taxa de rede não entra no desconto. O pedido é recalculado no servidor ao confirmar a compra. No cenário `coupon-expired`, `KURIO10` passa a responder "expirado". Para adicionar outro cupom, inclua uma entrada em `COUPON_PERCENT` em `src/mocks/handlers/quote.ts`.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento com mocks |
| `npm run build` | build de produção (sem mocks, a menos que `VITE_MOCKS=true`) |
| `npm run preview` | serve o build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | oxlint (dois avisos conhecidos em `components/ui`) |
| `npm run test` | testes unitários (vitest; dinheiro em wei/BigInt) |
| `npm run test:e2e` | Playwright: faz o build com mocks, sobe o preview e roda os projetos **desktop (1440)** e **mobile (390)** |
| `npm run test:e2e:ui` | o mesmo, no modo interativo |
| `npm run audit:lighthouse` | Lighthouse (home e detalhe × mobile e desktop × 3 execuções) → `reports/lighthouse/` |

Relatório HTML do Playwright: `npx playwright show-report`. Primeira vez: `npx playwright install chromium`.

## O backend simulado

Tudo roda no navegador:

- **API REST** com handlers MSW (`src/mocks/handlers/*`). O "banco" é um único JSON em `localStorage['kurio:db:v1']` (42 NFTs, 2 usuários, carrinhos, pedidos, favoritos). Para voltar ao estado inicial: `await window.__kurio.resetDb()` no console (e entre de novo — o segredo do JWT é regerado).
- **Tempo real:** o `socket.io-client` real conecta em `/socket.io/`; o MSW intercepta o WebSocket e o `@mswjs/socket.io-binding` fala o protocolo. Eventos `nft.updated` (público) e `order.updated` (só do dono).
- **Autenticação:** JWT HS256 (1 h) assinado com `jose` dentro do mock; a chave é aleatória por navegador.
- Em produção o build precisa de `VITE_MOCKS=true` — sem isso não existe API nenhuma.

### Cenários e como reproduzir falhas

Ative com `?scenario=<nome>` na URL (fica salvo até você passar outro; `?scenario=success` volta ao normal), com `VITE_MOCK_SCENARIO` ou com `localStorage['kurio:scenario']`.

| Cenário | Efeito |
|---|---|
| `success` | padrão: latência fixa, sem falhas |
| `empty` | o catálogo volta vazio |
| `slow` | toda requisição leva 2–4 s |
| `flaky` | latência variável (respostas fora de ordem), ~15 % de erros de rede e ~20 % de 500/503 |
| `expired-session` | o JWT dura 15 s; depois toda chamada autenticada dá 401 |
| `coupon-expired` | `KURIO10` responde "expirado" |
| `price-changed` | a 1ª tentativa de compra falha com 409 e sobe o preço em 10 % |
| `sold-out` | a 1ª tentativa falha com 409 e zera o estoque |
| `order-timeout` | o pedido é criado mas a resposta demora 15 s (o cliente desiste aos 10 s) |
| `payment-declined` | o pedido termina `declined` |

Para **provocar eventos em tempo real** (sempre pela camada de rede, nunca pela UI), no console da página:

```js
// muda preço/estoque → publica nft.updated
await fetch('/api/dev/nfts/0042', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ price: '2.50', stock: { '1/10': 0 } }) })
await fetch('/api/dev/socket/drop', { method: 'POST' })                       // derruba os sockets (o cliente reconecta)
await fetch('/api/dev/fail', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/api/nfts', times: 3 }) }) // as próximas 3 chamadas falham
```

Outros endpoints de apoio estão em `src/mocks/handlers/dev.ts`.

## Testes

- **Unitários** (`src/lib/eth.test.ts`): aritmética de dinheiro sem ponto flutuante.
- **E2E (Playwright: 71 testes funcionais + 4 de regressão visual por projeto (desktop e mobile) = 150 execuções, 147 efetivas: 3 testes de teclado rodam só no desktop)**, contra o build de produção com mocks. Cada teste abre um contexto novo (= banco novo). Cobrem: catálogo e estado na URL, detalhe e 404, cadastro/login/expiração/troca de usuário, favoritos (inclusive falha e rollback), carrinho e cupom, compra completa (revisão, carteira, pendente → confirmado), recusa, mudança de preço, esgotado, clique duplo, timeout e idempotência, perfil/avatar/senha/carteiras, tempo real (eventos, duplicados, versão antiga, queda e reconexão, outro usuário), teclado/foco/validação, skeletons e retry.
- **Acessibilidade:** auditada com axe-core (0 violações nas rotas e diálogos, em 390 e 1440 px). Não é parte da suíte.
- **Lighthouse:** `npm run audit:lighthouse`. Resultados da última execução na seção abaixo.

### Lighthouse

Mediana de 3 execuções por página, build de produção com mocks, Chrome headless local (Lighthouse 13.6, emulação padrão: mobile com CPU 4× mais lenta e rede 4G lenta; desktop sem throttling). Relatórios completos (HTML e JSON) em `reports/lighthouse/` e resumo em `reports/lighthouse/summary.json` (gerados por `npm run audit:lighthouse`; a pasta não é versionada).

| Página | Perf. | A11y | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| mobile · `/` | 86 | 100 | 100 | 100 | 4,1 s | 0 | 117 ms |
| mobile · `/produto/0042` | 86 | 100 | 96 | 100 | 4,0 s | 0 | 120 ms |
| desktop · `/` | 99 | 100 | 100 | 100 | 0,82 s | 0,006 | 0 ms |
| desktop · `/produto/0042` | 99 | 100 | 96 | 100 | 0,85 s | 0,019 | 0 ms |

Leitura honesta: o LCP no mobile fica perto de 4 s porque, no build com mocks, o app só renderiza depois que o service worker do MSW sobe (pré-carregamos a imagem do hero, o que ajudou pouco); um backend real dispensaria essa espera. O ponto que falta em "boas práticas" na página de detalhe são as imagens de baixa resolução (só há 4 recortes do PNG do design). O JavaScript não usado (~170 KiB) é majoritariamente o próprio MSW + Socket.IO simulado.

## Deploy

Vercel (config em `vercel.json`): build com `VITE_MOCKS=true`, saída `dist`, e um rewrite de SPA para que qualquer rota (`/carrinho`, `/pedido/ord_…`) recarregue o `index.html`; `mockServiceWorker.js` e `/assets/*` ficam fora do rewrite. Passos:

```bash
npm i -g vercel
vercel          # primeira vez: vincula o projeto
vercel --prod
```

Depois do deploy: abrir uma rota interna direto (`/carrinho`), recarregar `/pedido/<id>`, comprar um item e conferir que o pedido muda de "Pendente" para "Confirmado" (o socket simulado funciona em `wss://`). Colocar a URL no topo deste arquivo.

## Estrutura

```
src/
  pages/        Home, Product, Cart, Checkout, Order, Profile
  components/   UI compartilhada (+ ui/ = shadcn)
  api/          cliente axios, endpoints, chaves e política do React Query
  mocks/        backend simulado (db, handlers, cenários, socket, eventos)
  realtime.ts   cliente Socket.IO → cache do Query
  lib/          dinheiro (eth.ts), erros, rascunho do checkout, etc.
  locales/pt.json   todas as strings da interface
e2e/            testes Playwright
scripts/        auditoria Lighthouse
```

## Limitações e desvios do design

- Um único breakpoint (800 px). As telas mobile aproximam os frames do Figma (menu em gaveta, barra de abas, filtros em gaveta); tablets em retrato usam o layout mobile.
- Ações fora do escopo (Criadores/Aprenda, newsletter, login social, "Esqueceu a senha?", compartilhar, itens do menu do perfil) mostram "indisponível" e nunca simulam sucesso.
- Não há lista de pedidos nem página de favoritos (a API de favoritos existe).
- Segurança do mock: JWT sem refresh, PBKDF2 com 100 mil iterações e segredo no `localStorage` — adequado para uma simulação, nunca para produção.
