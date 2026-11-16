import { DEMO, dev, expect, login, open, test } from './fixtures'

test.describe('keyboard, focus and validation', () => {
  test('skip link is the first Tab stop and moves focus to the content', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'no keyboard on the touch project')
    await open(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
  })

  test('navigating to another page moves focus to its content', async ({ page }) => {
    await open(page, '/')
    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
    await open(page, '/')
    await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/carrinho"]')!.click())
    await expect(page.locator('#main')).toBeFocused()
  })

  test('login dialog: focus is trapped, Esc closes it', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'no keyboard on the touch project')
    await open(page, '/?login=true')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page).not.toHaveURL(/login=true/)
  })

  test('form errors are announced and tied to their field (aria-invalid, role=alert)', async ({ page }) => {
    await login(page, DEMO)
    await open(page, '/produto/0042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar', exact: true }).click()
    const address = page.getByLabel('Endereço da carteira')
    await address.fill('xyz')
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
    await expect(address).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert').filter({ hasText: 'Endereço inválido' })).toBeVisible()
    const describedBy = await address.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText('Endereço inválido')
  })

  test('cart quantity is operable from the keyboard', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'no keyboard on the touch project')
    await open(page, '/produto/0042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    const more = page.getByRole('button', { name: 'Mais', exact: true })
    await more.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Resumo da carteira' }).locator('..')).toContainText('2.396 ETH')
  })
})

test.describe('loading and retry states', () => {
  test('slow network: the catalog shows a skeleton (aria-busy), then the cards', async ({ page }) => {
    await open(page, '/', 'slow')
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
    await expect(page.getByRole('article').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  })

  test('a failing catalog call shows an error with a retry that recovers', async ({ page }) => {
    await open(page, '/carrinho')
    await dev(page, 'POST', '/api/dev/fail', { path: '/api/nfts?', times: 3, status: 500 })
    await page.getByRole('link', { name: 'Início', exact: true }).first().click()
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs.' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    await expect(page.getByRole('article').first()).toBeVisible()
    await expect(alert).toBeHidden()
  })

  test('cart: a failing quote shows its own error and retry', async ({ page }) => {
    await open(page, '/produto/0042')
    await dev(page, 'POST', '/api/dev/fail', { path: '/api/quote', times: 3, status: 500 })
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await expect(page.getByText('Não foi possível calcular o resumo.')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(page.getByText('Não foi possível calcular o resumo.')).toBeHidden()
  })
})

test.describe('footer', () => {
  test('every footer button shows the pointer cursor', async ({ page }) => {
    await open(page, '/')
    const cursors = await page.getByRole('contentinfo').getByRole('button').evaluateAll((els) => els.map((e) => getComputedStyle(e).cursor))
    expect(cursors.length).toBeGreaterThan(10)
    expect(cursors.filter((c) => c !== 'pointer')).toEqual([])
  })

  test('"Meu perfil" leads to the profile (through login for a guest)', async ({ page }) => {
    await open(page, '/')
    const link = page.getByRole('contentinfo').getByRole('link', { name: 'Meu perfil', exact: true })
    await link.click()
    await expect(page).toHaveURL(/login=true/)
    await expect(page).toHaveURL(/redirect=%2Fperfil/)
    await login(page, DEMO, '/')
    await link.click()
    await expect(page).toHaveURL(/\/perfil$/)
  })
})
