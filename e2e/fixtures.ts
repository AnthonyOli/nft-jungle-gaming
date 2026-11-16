import { expect, test as base, type Page } from '@playwright/test'

export const DEMO = { email: 'demo@kurio.com', password: '123456' }
export const ANA = { email: 'ana@kurio.com', password: '123456' }

export type Scenario = 'success' | 'empty' | 'slow' | 'flaky' | 'expired-session' | 'coupon-expired' | 'price-changed' | 'sold-out' | 'order-timeout' | 'payment-declined'

export async function open(page: Page, path = '/', scenario?: Scenario) {
  const url = scenario ? `${path}${path.includes('?') ? '&' : '?'}scenario=${scenario}` : path
  await page.goto(url)
  await expect(page.locator('header')).toBeVisible()
}

export async function login(page: Page, who = DEMO, redirect?: string) {
  await open(page, `/?login=true${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(who.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(who.password)
  await dialog.locator('form button[type=submit]').click()
  await expect(dialog).toBeHidden()
}

export async function logout(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) <= 800) await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeHidden()
}

export const dev = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(async ([m, p, b]) => {
    const r = await fetch(p as string, { method: m as string, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })
    return r.json()
  }, [method, path, body] as const)

export function countRequests(page: Page, method: string, pathPart: string) {
  const seen: string[] = []
  page.on('request', (r) => { if (r.method() === method && r.url().includes(pathPart)) seen.push(r.url()) })
  return seen
}

export const test = base
export { expect }
