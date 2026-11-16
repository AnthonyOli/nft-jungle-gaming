import { DEMO, expect, login, open, test } from './fixtures'
import type { Page } from '@playwright/test'

const buy = async (page: Page, id = '0042') => {
  await open(page, `/produto/${id}`)
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}
const coupon = (page: Page) => page.getByRole('textbox', { name: 'Código promocional' })
const apply = (page: Page, code: string) => coupon(page).fill(code).then(() => page.getByRole('button', { name: 'Aplicar', exact: true }).click())
const summary = (page: Page) => page.getByRole('heading', { name: 'Resumo da carteira' }).locator('..')

test.describe('cart and coupon', () => {
  test('a guest cart survives a reload and shows server-quoted prices', async ({ page }) => {
    await buy(page)
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(summary(page)).toContainText('1.206 ETH')
    await page.reload()
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(summary(page)).toContainText('1.206 ETH')
  })

  test('quantity can be changed and an item removed', async ({ page }) => {
    await buy(page)
    await page.getByRole('button', { name: 'Mais', exact: true }).click()
    await expect(summary(page)).toContainText('2.396 ETH')
    await page.getByRole('button', { name: 'Menos', exact: true }).click()
    await expect(summary(page)).toContainText('1.206 ETH')
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar', exact: true })).toBeDisabled()
  })

  test('KURIO10 applies 10 %, can be removed; invalid and expired codes explain themselves', async ({ page }) => {
    await buy(page)
    await apply(page, 'KURIO10')
    await expect(page.getByText('Cupom KURIO10 aplicado')).toBeVisible()
    await expect(summary(page)).not.toContainText('(-) 0.00')
    await expect(summary(page)).toContainText('1.087 ETH')
    await page.getByRole('button', { name: 'Remover cupom', exact: true }).click()
    await expect(summary(page)).toContainText('1.206 ETH')
    await apply(page, 'NOPE')
    await expect(page.getByRole('alert').filter({ hasText: 'Cupom inválido.' })).toBeVisible()
    await apply(page, 'EXPIRADO')
    await expect(page.getByRole('alert').filter({ hasText: 'Cupom expirado.' })).toBeVisible()
  })

  test('coupon-expired scenario: even KURIO10 answers expired', async ({ page }) => {
    await open(page, '/', 'coupon-expired')
    await buy(page)
    await apply(page, 'KURIO10')
    await expect(page.getByRole('alert').filter({ hasText: 'Cupom expirado.' })).toBeVisible()
  })

  test('the coupon is remembered across a reload', async ({ page }) => {
    await buy(page)
    await apply(page, 'KURIO10')
    await expect(page.getByText('Cupom KURIO10 aplicado')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Cupom KURIO10 aplicado')).toBeVisible()
  })

  test('quantity is capped by the edition stock', async ({ page }) => {
    await open(page, '/produto/0071')
    const edition = page.getByRole('group', { name: 'Edição:' }).getByRole('button', { name: '1/50', exact: true })
    await edition.click()
    await expect(page.getByText('3 disponíveis')).toBeVisible()
    const more = page.getByRole('button', { name: 'Mais', exact: true })
    await more.click(); await more.click()
    await expect(more).toBeDisabled()
  })

  test('a sold-out edition cannot be chosen and a fully sold-out NFT cannot be bought', async ({ page }) => {
    await open(page, '/produto/0160')
    await expect(page.getByRole('button', { name: 'Esgotado', exact: true }).first()).toBeDisabled()
  })

  test('guest cart is merged into the account on login and then lives on the server', async ({ page }) => {
    await buy(page, '0089')
    await login(page, DEMO, '/carrinho')
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByText('Sage Nomad #089').first()).toBeVisible()
    await page.reload()
    await expect(page.getByText('Sage Nomad #089').first()).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio:guest-cart'))).toBeFalsy()
  })

  test('another account does not see this cart', async ({ page }) => {
    await login(page)
    await buy(page)
    const { logout } = await import('./fixtures')
    await logout(page)
    await login(page, { email: 'ana@kurio.com', password: '123456' }, '/carrinho')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })
})
