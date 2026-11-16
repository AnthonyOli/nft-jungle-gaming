import type { Page } from '@playwright/test'
import { countRequests, DEMO, dev, expect, login, open, test } from './fixtures'

const socket = (page: Page) => dev(page, 'GET', '/api/dev/socket') as Promise<{ peers: number; connections: number }>
const connected = (page: Page) => expect.poll(async () => (await socket(page)).peers).toBeGreaterThan(0)
const price = (page: Page) => page.getByRole('main').getByText(/^\d+\.\d+ ETH$/).first()
const emit = (page: Page, event: string, data: unknown) => dev(page, 'POST', '/api/dev/events', { event, data })
const version = (page: Page, id: string) => page.evaluate(async (i) => (await (await fetch(`/api/nfts/${i}`)).json()).version as number, id)

test.describe('realtime (Socket.IO)', () => {
  test('a price change reaches an open product page without reloading', async ({ page }) => {
    await open(page, '/produto/0042')
    await expect(price(page)).toHaveText('1.19 ETH')
    await connected(page)
    await dev(page, 'PATCH', '/api/dev/nfts/0042', { price: '7.77' })
    await expect(price(page)).toHaveText('7.77 ETH')
  })

  test('stock changes update the edition availability live', async ({ page }) => {
    await open(page, '/produto/0042')
    await connected(page)
    const edition = page.getByRole('group', { name: 'Edição:' }).getByRole('button', { name: '1/10', exact: true })
    await expect(edition).toBeEnabled()
    await dev(page, 'PATCH', '/api/dev/nfts/0042', { stock: { '1/10': 0 } })
    await expect(edition).toBeDisabled()
  })

  test('stale versions and duplicate events are ignored', async ({ page }) => {
    await open(page, '/produto/0042')
    await connected(page)
    const v = await version(page, '0042')
    const payload = { id: '0042', name: 'Emerald Ape #042', editions: [{ id: '1/10', stock: 5 }], available: true }
    await emit(page, 'nft.updated', { eventId: 'e-new', resource: 'nft:0042', version: v + 100, payload: { ...payload, price: '8.88' } })
    await expect(price(page)).toHaveText('8.88 ETH')
    await emit(page, 'nft.updated', { eventId: 'e-old', resource: 'nft:0042', version: v + 1, payload: { ...payload, price: '1.11' } })
    await emit(page, 'nft.updated', { eventId: 'e-new', resource: 'nft:0042', version: v + 200, payload: { ...payload, price: '9.99' } })
    await page.waitForTimeout(600)
    await expect(price(page)).toHaveText('8.88 ETH')
  })

  test('cart: a price change on an item in the cart warns (aria-live) and the summary follows', async ({ page }) => {
    await open(page, '/produto/0089')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await connected(page)
    await dev(page, 'PATCH', '/api/dev/nfts/0089', { price: '3.33' })
    await expect(page.getByText('Sage Nomad #089 teve preço ou estoque atualizado')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Resumo da carteira' }).locator('..')).toContainText('3.346 ETH')
  })

  test('an item that is not in the cart does not raise a warning', async ({ page }) => {
    await open(page, '/produto/0089')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await connected(page)
    await dev(page, 'PATCH', '/api/dev/nfts/0042', { price: '2.22' })
    await page.waitForTimeout(700)
    await expect(page.getByText('teve preço ou estoque atualizado')).toBeHidden()
  })

  test('checkout: a price change during review blocks confirmation until the new total is accepted', async ({ page }) => {
    await login(page, DEMO)
    await open(page, '/produto/0042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).click()
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
    await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
    await expect(page.getByText('Carteira conectada')).toBeVisible()
    await connected(page)
    const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true })
    await expect(confirm).toBeEnabled()
    await dev(page, 'PATCH', '/api/dev/nfts/0042', { price: '2.50' })
    await expect(page.getByRole('alert').filter({ hasText: 'Os valores mudaram' })).toBeVisible()
    await expect(confirm).toBeHidden()
    await page.getByRole('button', { name: 'Aceitar novos valores', exact: true }).click()
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
    await expect(page.getByText('2.516 ETH').first()).toBeVisible()
  })

  test('an order is confirmed by a pushed event, not by polling', async ({ page }) => {
    await login(page, DEMO)
    await open(page, '/produto/0042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).click()
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
    await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
    await connected(page)
    const reads = countRequests(page, 'GET', '/api/orders/ord_')
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    expect(reads.length).toBeLessThanOrEqual(2)
  })

  test('dropped connection: the client reconnects and recovers an event it missed, over REST', async ({ page }) => {
    await open(page, '/produto/0042')
    await connected(page)
    const before = (await socket(page)).connections
    await dev(page, 'POST', '/api/dev/socket/drop')
    await dev(page, 'PATCH', '/api/dev/nfts/0042', { price: '5.55' })
    await expect(price(page)).toHaveText('5.55 ETH')
    await expect.poll(async () => (await socket(page)).connections).toBeGreaterThan(before)
  })

  test('events for another user are not applied', async ({ page }) => {
    await login(page, DEMO)
    await connected(page)
    const order = (id: string) => ({ id, status: 'confirmed', items: [], createdAt: new Date().toISOString() })
    await emit(page, 'order.updated', { eventId: 'o-mine', resource: 'order:ord_mine', version: 2, userId: '1', payload: order('ord_mine') })
    await expect(page.getByText('Pedido ord_mine confirmado.')).toBeVisible()
    await emit(page, 'order.updated', { eventId: 'o-other', resource: 'order:ord_other', version: 2, userId: '2', payload: order('ord_other') })
    await page.waitForTimeout(700)
    await expect(page.getByText('Pedido ord_other confirmado.')).toBeHidden()
  })
})
