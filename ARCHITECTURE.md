# Arquitetura

Visão do que o código faz e por quê. Para convenções de quem edita, veja [AGENTS.md](./AGENTS.md); para comandos e cenários, [README.md](./README.md).

## Camadas

```
UI (pages, components)  ──►  hooks (useAuth, useCart, useQuote, useRealtime)  ──►  Query cache
                                                                    ▲                    │
                       axios (api/client.ts) ◄── REST ──► MSW ◄── eventos ── Socket.IO ─┘
                                                              │
                                                        "banco" em localStorage
```

- **Estado de servidor** vive só no cache do TanStack Query (nenhum Redux/Zustand). Cada chave que depende do usuário carrega o id dele (`api/queryKeys.ts`), então trocar de conta nunca mostra dado da anterior.
- **Estado de navegação** vive na URL (TanStack Router, rotas em código): filtros do catálogo, página, ordenação, modal de login (`?login=true&redirect=…`).
- **Mock = servidor de verdade para o cliente.** O front só conhece `/api/*` e `/socket.io/`; trocar o MSW por um backend não muda nada fora de `src/mocks/`.

## Contratos REST

Preços são **strings decimais** (nunca `number`); a matemática é em wei/BigInt (`lib/eth.ts`). Erros: `{ code, message, fields? }`, com `fields` mapeando nome do input → código (a UI traduz via `errors.*`, `fieldErrors.*`).

| Método e rota | Auth | Notas |
|---|---|---|
| `GET /api/nfts` | — | `q, collection[], network[], minPrice, maxPrice, sort, page, pageSize` → `{items,total,page,pages,pageSize,facets}`; 400 `invalid_data` |
| `GET /api/nfts/:id` · `/related` | opcional | com token, inclui `favorited`; `version` cresce a cada mudança de preço/estoque |
| `GET /api/favorites` · `PUT\|DELETE /api/favorites/:id` | ✔ | idempotentes |
| `GET/POST/PATCH/DELETE /api/cart…` · `POST /api/cart/merge` | ✔ | linhas `{id,edition,qty}`; acima do estoque → 409 `insufficient_stock`; o merge corta no estoque e descarta o que não existe |
| `POST /api/quote` | — | `{items,coupon?}` → `{quoteId,expiresAt(5 min),lines,subtotal,discount,networkFee,total,coupon,issues[]}` |
| `POST /api/orders` | ✔ + `Idempotency-Key` | 201 novo · 200 mesma chave e mesmo corpo · 409 `idempotency_conflict` (mesma chave, outro corpo) · 409 `quote_changed` / `sold_out` · 400 sem chave |
| `GET /api/orders/:id` | ✔ | só do dono (senão 404) |
| `POST /api/auth/login\|signup\|logout` · `GET /api/auth/me` | — / ✔ | 401 `invalid_credentials`, 409 `email_taken` |
| `GET\|PUT /api/profile` · `PUT /api/profile/password` · `PUT\|DELETE /api/profile/avatar` | ✔ | avatar = data URL ≤ 300 mil caracteres |
| `GET /api/wallets` · `PUT /api/wallets/main` · `POST\|PUT\|DELETE /api/wallets/secondary` | ✔ | |

Endpoints `/api/dev/*` existem só no mock (ver README).

## Eventos em tempo real (Socket.IO)

Nome do evento do socket = tipo. Corpo: `{ eventId, resource, version, payload, userId? }`.

| Evento | Quem recebe | `resource` | `version` | `payload` |
|---|---|---|---|---|
| `nft.updated` | todos | `nft:<id>` | a `version` do NFT | `{id,name,price,oldPrice?,editions[{id,stock}],available}` |
| `order.updated` | só os sockets do dono (`userId`) | `order:<id>` | 1 = pendente, 2 = resolvido | o `Order` completo |

**Produtor (mock):** toda mutação do "banco" publica o evento (`touchNft()` em `mocks/db.ts`; criação e resolução de pedidos em `handlers/orders.ts`). Pedidos pendentes são resolvidos por timer, então o `order.updated` é de fato empurrado. O token JWT vai no pacote CONNECT do Socket.IO; token inválido = só eventos públicos.

**Consumidor (`src/realtime.ts`), uma conexão por sessão:**

1. descarta `eventId` já visto, `version` não maior que a última aplicada para o mesmo `resource` e eventos de outro `userId`;
2. `nft.updated` → atualiza o detalhe em cache (se mais velho), invalida listas e cotações; avisa (toast, `aria-live`) **só** quando o carrinho é afetado (preço diferente do cotado ou estoque menor que a quantidade);
3. `order.updated` → grava o pedido (a menos que o REST já tenha um estado final), atualiza o carrinho e avisa com ação "Ver pedido" (útil quando a resposta HTTP nunca chegou);
4. a cada **re**conexão refaz por REST o que estiver montado (`nfts, nft, quote, cart, order`) — eventos perdidos offline são recuperados;
5. `socket.close()` ao sair/trocar de usuário.

**REST × Socket.IO:** o REST é a fonte da verdade; o socket só adianta a atualização. A página do pedido faz polling de segurança (10 s com socket, 1,5 s sem) e, de qualquer forma, relê o pedido ao recarregar.

## Sessão

- Login/cadastro devolvem `{token, user}`; o token fica em `localStorage['kurio:token']`. JWT HS256 de 1 h, sem refresh.
- **Restauração:** `useAuth()` consulta `GET /auth/me` se houver token não expirado; falha = deslogado, em silêncio.
- **Guard** (`requireAuth`): sem token válido → `/?login=true&redirect=<rota>`; `redirect` só aceita caminho do mesmo site.
- **401 no meio do uso:** o interceptor limpa o token e dispara `kurio:unauthorized`; `resetSession()` zera o usuário e o cache (queries do catálogo são *resetadas*, não removidas, para a tela montada reler o servidor) e o `App` reabre o login com a rota atual. O rascunho do checkout (`sessionStorage`, por usuário) sobrevive.
- **Logout:** limpa token e cache.

## Carrinho, cotação e pedido

- **Carrinho:** só `{id, edition, qty}`. Visitante → `localStorage` (`guestCart`); logado → servidor. No login, `mergeGuestCart` move o local para a conta (o servidor corta no estoque) e cancela qualquer `GET /cart` em voo para o carrinho vazio não sobrescrever o resultado.
- **Preços e nomes vêm só do `POST /quote`** (`useQuote`): Carrinho, Checkout e Resumo apenas exibem; nada é recalculado no cliente. A cotação expira em 5 min e informa `issues[]` (esgotado, estoque insuficiente).
- **Compra:** formulário (zod) → **revisão** → conexão (simulada) da carteira → `POST /orders`. Uma `Idempotency-Key` por tentativa: reaproveitada após timeout/erro de rede, renovada após resposta definitiva. O servidor reprecifica; se o total mudou ou a cotação venceu, responde 409 `quote_changed` e o cliente exige **"Aceitar novos valores"** (só habilitado com a cotação nova carregada) antes de reenviar. O hash do corpo para idempotência **não** inclui o `quoteId` (um retry pode ter cotação renovada).
- **Pedido:** nasce `pending` e vira `confirmed` (tx, link de explorador) ou `declined` após ~4 s; confirmar remove do carrinho só o que foi comprado, recusar devolve o estoque. A tela de sucesso só aparece para `confirmed`.

## Cache e tentativas

`staleTime` 30 s; sem refetch ao focar a janela; retry só para erro de rede ou 5xx, no máximo 2 (4xx são respostas, não falhas). Axios com timeout de 10 s. Mutações não repetem sozinhas — repetir uma compra é decisão do usuário, protegida pela chave de idempotência.

## Estados de carregamento

Skeletons espelham o layout final (mesma grade, alturas medidas) para não gerar deslocamento; `animate-shimmer` entra com 150 ms de atraso (respostas rápidas não piscam) e respeita `prefers-reduced-motion`. `useCart().pending` impede o "carrinho vazio" falso enquanto sessão/carrinho carregam.

## Responsivo e acessibilidade

Um breakpoint (800 px; `max-[800px]:` e `useCompact()`): menu em gaveta, barra de abas fixa, filtros em gaveta, carrinho em cards. Skip link, `<main>` focado a cada troca de rota, um `h1` por página, rótulos em todos os campos, `aria-live` em totais e avisos. Ver AGENTS.md para o checklist e como reauditar com axe.

## Limitações conhecidas

- O servidor simulado vive na própria página: fechar a aba "desliga" o backend (o estado persiste no `localStorage`).
- O Socket.IO simulado não tem salas, namespaces nem acks; os pings do engine.io são enviados pelo mock porque o binding só finge o handshake.
- IDs de evento são contadores por sessão de página; versões de pedido são só 1 e 2.
- Segurança do mock (JWT sem refresh, logout não revoga, segredo no `localStorage`) não deve ser copiada para produção.
- Imagens: 4 recortes do PNG do design, reutilizados.
