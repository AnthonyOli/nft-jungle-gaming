import type { TFunction } from 'i18next'

export const tList = <T>(t: TFunction, key: string) => t(key, { returnObjects: true }) as unknown as T[]
export const tObj = (t: TFunction, key: string) => t(key, { returnObjects: true }) as unknown as Record<string, string>
