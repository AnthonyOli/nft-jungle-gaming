import type { Page } from '@playwright/test'
import { expect, open, test } from './fixtures'

const cards = (page: Page) => page.locator('main a[href^="/produto/"] article')
const firstName = (page: Page) => cards(page).first().getByRole('heading').innerText()
const results = (page: Page) => page.getByText(/^\d+ NFTs$/)

async function withFilters(page: Page, isMobile: boolean | undefined, fn: () => Promise<void>) {
  if (isMobile) await page.getByRole('button', { name: /^Filtros/ }).click()
  await fn()
  if (isMobile) await page.keyboard.press('Escape')
}

test.describe('catalog (state lives in the URL)', () => {
  test('first page: 9 cards of 42', async ({ page }) => {
    await open(page, '/')
    await expect(cards(page)).toHaveCount(9)
    await expect(results(page)).toHaveText('42 NFTs')
  })

  test('collection filter → URL → survives reload and back/forward', async ({ page, isMobile }) => {
    await open(page, '/')
    await expect(results(page)).toHaveText('42 NFTs')
    await withFilters(page, isMobile, () => page.locator('label', { hasText: /Kurio Apes/ }).click())
    await expect(page).toHaveURL(/collection=/)
    await expect(results(page)).not.toHaveText('42 NFTs')
    const filtered = await results(page).innerText()
    await page.reload()
    await expect(results(page)).toHaveText(filtered)
    await page.goBack()
    await expect(page).not.toHaveURL(/collection=/)
    await expect(results(page)).toHaveText('42 NFTs')
    await page.goForward()
    await expect(results(page)).toHaveText(filtered)
  })

  test('sort tabs change the order and the URL', async ({ page }) => {
    await open(page, '/')
    const featured = await firstName(page)
    await page.getByRole('tab', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/sort=hot/)
    await expect.poll(() => firstName(page)).not.toBe(featured)
    await page.getByRole('tab', { name: 'Novos lançamentos' }).click()
    await expect(page).toHaveURL(/sort=new/)
  })

  test('price range is validated, then applied', async ({ page, isMobile }) => {
    await open(page, '/')
    await withFilters(page, isMobile, async () => {
      await page.getByLabel('Mínimo (ETH)').fill('abc')
      await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
      await expect(page.getByText('Use números como 0.5 ou 1.25.')).toBeVisible()
      await page.getByLabel('Mínimo (ETH)').fill('2')
      await page.getByLabel('Máximo (ETH)').fill('1')
      await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
      await expect(page.getByText('O mínimo não pode ser maior que o máximo.')).toBeVisible()
      await page.getByLabel('Mínimo (ETH)').fill('1.5')
      await page.getByLabel('Máximo (ETH)').fill('2')
      await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    })
    await expect(page).toHaveURL(/minPrice=%221\.5%22/)
    await expect(page).toHaveURL(/maxPrice=%222%22/)
    await expect.poll(async () => {
      const prices = (await cards(page).locator('span.font-bold').allInnerTexts()).map((p) => Number(p.split(' ')[0]))
      return prices.length > 0 && prices.every((n) => n >= 1.5 && n <= 2)
    }).toBe(true)
  })

  test('search, empty result, and clearing filters', async ({ page, isMobile }) => {
    await open(page, '/')
    const find = async (q: string) => {
      if (isMobile) {
        const box = page.getByRole('main').getByRole('searchbox', { name: 'Buscar' })
        await box.fill(q)
        await page.getByRole('main').getByRole('button', { name: 'Buscar', exact: true }).click()
      } else {
        const header = page.getByRole('banner')
        if (!(await header.getByRole('searchbox').isVisible())) await header.getByRole('button', { name: 'Buscar', exact: true }).click()
        await header.getByRole('searchbox').fill(q)
        await header.getByRole('searchbox').press('Enter')
      }
    }
    await find('Emerald')
    await expect(page).toHaveURL(/q=Emerald/)
    await expect(cards(page).first()).toContainText('Emerald')
    await find('zzzzzzzz')
    await expect(page).toHaveURL(/q=zzzzzzzz/)
    await expect(page.getByText('Nenhum NFT encontrado com esses filtros.')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).first().click()
    await expect(cards(page)).toHaveCount(9)
    await expect(page).not.toHaveURL(/q=/)
  })

  test('pagination: page 2 differs, and changing a filter goes back to page 1', async ({ page, isMobile }) => {
    await open(page, '/')
    const first = await firstName(page)
    await page.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: '2', exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect.poll(() => firstName(page)).not.toBe(first)
    await withFilters(page, isMobile, () => page.locator('label', { hasText: /Kurio Apes/ }).click())
    await expect(page).not.toHaveURL(/page=/)
  })

  test('empty scenario shows the empty state, not a broken page', async ({ page }) => {
    await open(page, '/', 'empty')
    await expect(page.getByText('Nenhum NFT encontrado com esses filtros.')).toBeVisible()
  })

  test('a malformed URL is tolerated: bad params are dropped', async ({ page }) => {
    await open(page, '/?page=abc&minPrice=oops&sort=nonsense')
    await expect(cards(page)).toHaveCount(9)
  })
})

test.describe('product detail', () => {
  test('opens from a card; gallery and editions work; related items are shown', async ({ page }) => {
    await open(page, '/')
    await cards(page).first().click()
    await expect(page).toHaveURL(/\/produto\/\d+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    if (test.info().project.name === 'desktop') {
      const thumb2 = page.getByRole('button', { name: 'Ver imagem 2' })
      await thumb2.click()
      await expect(thumb2).toHaveAttribute('aria-pressed', 'true')
    }
    await expect(page.getByRole('group', { name: 'Edição:' }).getByRole('button').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
  })

  test('direct access works', async ({ page }) => {
    await open(page, '/produto/0042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('unknown id: dedicated 404 with a way back', async ({ page }) => {
    await open(page, '/produto/does-not-exist')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(cards(page)).toHaveCount(9)
  })

  test('unknown route shows the router not-found page', async ({ page }) => {
    await page.goto('/nada-aqui')
    await expect(page.getByText(/not found/i)).toBeVisible()
  })
})
