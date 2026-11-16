import type { Page } from '@playwright/test'
import { expect, login, open, test } from './fixtures'

const FIXED_TIME = new Date('2026-01-15T12:00:00-03:00')

async function settle(page: Page) {
  await page.addStyleTag({ content: '[aria-label="Navegação do aplicativo"] { display: none !important }' })
  await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => ((i as HTMLImageElement).loading = 'eager')))
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))
  await page.evaluate(() => document.fonts.ready)
}
const shot = async (page: Page, name: string) => {
  await settle(page)
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.01 })
}

test.describe('visual regression', () => {
  test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(FIXED_TIME) })

  test('home', async ({ page }) => {
    await open(page, '/')
    await expect(page.locator('main a[href^="/produto/"] article')).toHaveCount(9)
    await shot(page, 'home')
  })

  test('product detail', async ({ page }) => {
    await open(page, '/produto/0042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await shot(page, 'product')
  })

  test('cart', async ({ page }) => {
    await open(page, '/produto/0042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await expect(page.getByRole('heading', { name: 'Resumo da carteira' })).toBeVisible()
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await shot(page, 'cart')
  })

  test('checkout', async ({ page }) => {
    await login(page)
    await open(page, '/produto/0042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Revisar compra', exact: true })).toBeEnabled()
    await shot(page, 'checkout')
  })
})
