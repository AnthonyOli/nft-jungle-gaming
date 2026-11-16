const key = (userId: string) => `kurio:checkout-draft:${userId}`
export const loadDraft = (userId: string): Record<string, string> => {
  try { return JSON.parse(sessionStorage.getItem(key(userId)) ?? '{}') } catch { return {} }
}
export const saveDraft = (userId: string, values: Record<string, FormDataEntryValue>) =>
  sessionStorage.setItem(key(userId), JSON.stringify({ ...loadDraft(userId), ...Object.fromEntries(Object.entries(values).filter(([, v]) => typeof v === 'string')) }))
export const clearDraft = (userId: string) => sessionStorage.removeItem(key(userId))
