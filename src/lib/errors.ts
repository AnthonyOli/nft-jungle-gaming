import type { AxiosError } from 'axios'
import type { ApiError } from '../api/types'
import i18n from '../i18n'

export const errorCode = (e: unknown) => {
  const res = (e as AxiosError<ApiError>).response
  return res ? (res.data?.code ?? 'generic') : 'network'
}
export const errorFields = (e: unknown) => (e as AxiosError<ApiError>).response?.data?.fields ?? {}
export const errorStatus = (e: unknown) => (e as AxiosError).response?.status

export const errorText = (e: unknown) => i18n.t(`errors.${errorCode(e)}`, { defaultValue: i18n.t('errors.generic') })
