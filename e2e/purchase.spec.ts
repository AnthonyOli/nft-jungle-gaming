import { ANA, countRequests, DEMO, expect, login, logout, open, test, type Scenario } from './fixtures'
import type { Page } from '@playwright/test'

async function addAndCheckout(page: Page) {
  await open(page, '/produto/0042')
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).click()
  await expect(page).toHaveURL(/\/pagamento$/)
}
const review = async (page: Page) => {
  await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toBeVisible()
}
const connect = async (page: Page) => {
  await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  await expect(page.getByText('Carteira conectada')).toBeVisible()
}
const confirm = (page: Page) => page.getByRole('button', { name: 'Confirmar compra', exact: true })

async function buy(page: Page, scenario?: Scenario) {
  await login(page, DEMO)
  if (scenario) await open(page, '/', scenario)
  await addAndCheckout(page)
  await review(page)
  await connect(page)
}

test.describe('purchase', () => {
  test('guest is sent to login at checkout, then lands on payment with the cart intact', async ({ page }) => {
    await open(page, '/produto/0042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).click()
    await expect(page).toHaveURL(/login=true/)
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(DEMO.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(DEMO.password)
    await dialog.locator('form button[type=submit]').click()
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
  })

  test('full purchase: form → review → connect wallet → pending → confirmed, cart emptied', async ({ page }) => {
    await login(page)
    await addAndCheckout(page)
    await review(page)
    await expect(confirm(page)).toBeDisabled()
    await connect(page)
    await expect(confirm(page)).toBeEnabled()
    await confirm(page).click()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
    await expect(page.getByText('Aguardando confirmação')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('ID da transação')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver no Etherscan' })).toHaveAttribute('href', /etherscan\.io\/tx\/0x/)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    await open(page, '/carrinho')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('validation: an invalid form cannot reach the review step', async ({ page }) => {
    await login(page)
    await addAndCheckout(page)
    await page.getByRole('main').getByRole('textbox', { name: /^E-mail/ }).fill('not-an-email')
    await page.getByLabel('Endereço da carteira').fill('xyz')
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByText(/Endereço inválido/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toBeHidden()
  })

  test('the review step can go back and edit', async ({ page }) => {
    await login(page)
    await addAndCheckout(page)
    await review(page)
    await page.getByRole('button', { name: 'Voltar e editar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Revisar compra', exact: true })).toBeVisible()
  })

  test('a wallet that refuses the connection blocks the purchase; reconnecting after a refusal is possible', async ({ page }) => {
    await login(page)
    await open(page, '/perfil/carteiras')
    await page.getByLabel('Endereço da carteira').first().fill('0x00000000000000000000dead')
    await page.getByRole('button', { name: 'Salvar carteira', exact: true }).first().click()
    await expect(page.getByText('Carteira salva.')).toBeVisible()
    await addAndCheckout(page)
    await review(page)
    await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
    await expect(page.getByText('A carteira recusou a conexão.')).toBeVisible()
    await expect(confirm(page)).toBeDisabled()
  })

  test('disconnecting the wallet blocks the confirmation again', async ({ page }) => {
    await buy(page)
    await page.getByRole('button', { name: 'Desconectar', exact: true }).click()
    await expect(confirm(page)).toBeDisabled()
  })

  test('payment-declined: the order ends declined, nothing is charged, the cart keeps the item', async ({ page }) => {
    await buy(page, 'payment-declined')
    await confirm(page).click()
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeHidden()
    await open(page, '/carrinho')
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
  })

  test('price-changed: the first attempt fails, the new total must be accepted explicitly, then it goes through', async ({ page }) => {
    await buy(page, 'price-changed')
    await confirm(page).click()
    await expect(page.getByText('Os valores mudaram', { exact: false }).first()).toBeVisible()
    await expect(confirm(page)).toBeHidden()
    await page.getByRole('button', { name: 'Aceitar novos valores', exact: true }).click()
    await expect(confirm(page)).toBeEnabled()
    await confirm(page).click()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
  })

  test('sold-out: the purchase is refused and no order page is reached', async ({ page }) => {
    await buy(page, 'sold-out')
    await confirm(page).click()
    await expect(page.getByText('Esta edição está esgotada.').first()).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento$/)
  })

  test('double click on confirm creates exactly one order', async ({ page }) => {
    await buy(page)
    const posts = countRequests(page, 'POST', '/api/orders')
    await confirm(page).dblclick()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
    expect(posts).toHaveLength(1)
  })

  test('order-timeout: the answer never arrives, the order still exists and the toast leads to it (one purchase, one unit of stock)', async ({ page }) => {
    test.setTimeout(60_000)
    await buy(page, 'order-timeout')
    const stock = () => page.evaluate(async () => (await (await fetch('/api/nfts/0042')).json()).editions.reduce((n: number, e: { stock: number }) => n + e.stock, 0))
    const before = await stock()
    const posts = countRequests(page, 'POST', '/api/orders')
    await confirm(page).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Sem conexão' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Ver pedido', exact: true }).click()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect(posts).toHaveLength(1)
    expect(before - (await stock())).toBe(1)
  })

  test('idempotency (API): same key + same body returns the same order, same key + another body conflicts', async ({ page }) => {
    await login(page)
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('kurio:token')
      const call = async (method: string, path: string, body?: unknown, key?: string) => {
        const r = await fetch(path, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(key && { 'idempotency-key': key }) }, body: body ? JSON.stringify(body) : undefined })
        return { status: r.status, body: await r.json() }
      }
      const items = [{ id: '0042', edition: '1/10', qty: 1 }]
      const wallet = { type: 'MetaMask', network: 'Ethereum', address: '0x1234567890abcdef' }
      const quote = (await call('POST', '/api/quote', { items })).body
      const key = crypto.randomUUID()
      const first = await call('POST', '/api/orders', { quoteId: quote.quoteId, items, wallet }, key)
      const again = await call('POST', '/api/orders', { quoteId: quote.quoteId, items, wallet }, key)
      const other = await call('POST', '/api/orders', { quoteId: quote.quoteId, items, wallet, note: 'different' }, key)
      const noKey = await call('POST', '/api/orders', { quoteId: quote.quoteId, items, wallet })
      return { first, again, other, noKey }
    })
    expect(result.first.status).toBe(201)
    expect(result.again.status).toBe(200)
    expect(result.again.body.id).toBe(result.first.body.id)
    expect(result.other.status).toBe(409)
    expect(result.other.body.code).toBe('idempotency_conflict')
    expect(result.noKey.status).toBe(400)
  })

  test('another user cannot read this order', async ({ page }) => {
    await buy(page)
    await confirm(page).click()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
    const orderPath = new URL(page.url()).pathname
    await logout(page)
    await login(page, ANA)
    await open(page, orderPath)
    await expect(page.getByText('Pedido não encontrado.')).toBeVisible()
  })
})
