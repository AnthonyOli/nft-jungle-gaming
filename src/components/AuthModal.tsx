import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { unavailable } from '../lib/unavailable'
import type { AxiosError } from 'axios'
import { useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { login as apiLogin, signup as apiSignup } from '../api'
import type { User } from '../api/types'
import { Button as UiButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Button from './Button'
import Modal from './Modal'
const social = 'mb-3 h-10 w-full gap-3 rounded-sm border-border bg-transparent text-xs font-bold text-muted-foreground hover:bg-transparent'
const inputCls = 'h-auto flex-1 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0'
const box = 'mb-3 flex h-10 items-center rounded-sm border bg-card px-[15px] focus-within:border-primary'

const Google = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.200.9-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z" />
    <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
  </svg>
)
const Facebook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#3b5998" d="M14 8V6.500c0-.7.500-1 1-1h2V2h-3c-3 0-4 2-4 4.200V8H7v3.500h3V22h4V11.500h2.800L17.300 8H14z" />
  </svg>
)

const tab = (on: boolean) => `cursor-pointer ${on ? 'text-brand' : 'text-foreground'}`

function Password(p: InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  return (
    <div className={box}>
      <Input type={show ? 'text' : 'password'} className={inputCls} aria-label={t(p.name === 'confirm' ? 'auth.confirm' : 'auth.password')} {...p} />
      <button type="button" className="cursor-pointer p-0 text-brand" onClick={() => setShow(!show)} aria-label={t(show ? 'auth.hidePassword' : 'auth.showPassword')}>{show ? <EyeIcon aria-hidden="true" className="size-[18px]" /> : <EyeOffIcon aria-hidden="true" className="size-[18px]" />}</button>
    </div>
  )
}

export default function AuthModal({ onClose, onSuccess, initialMode = 'login' }: { onClose: () => void; onSuccess: (u: User) => void; initialMode?: 'login' | 'signup' }) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(initialMode)
  const login = mode === 'login'
  return (
    <Modal onClose={onClose} label={t(login ? 'auth.login' : 'auth.signup')}>
      <h2 className="m-0 flex items-center justify-center gap-2 text-xl font-medium">
        <button type="button" className={tab(login)} onClick={() => setMode('login')}>{t('auth.login')}</button>
        <i className="h-5 w-px bg-primary" />
        <button type="button" className={tab(!login)} onClick={() => setMode('signup')}>{t('auth.signup')}</button>
      </h2>
      <p className="mt-8 mb-6 text-center text-xs">
        {t(login ? 'auth.loginSub' : 'auth.signupSub')}
      </p>
      <form onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
          const res = await (login ? apiLogin : apiSignup)(Object.fromEntries(new FormData(e.currentTarget)))
          onSuccess(res.user)
        } catch (err) {
          setError((err as AxiosError<{ message: string }>).response?.data?.message ?? 'generic')
        } finally {
          setBusy(false)
        }
      }}>
        {!login && <div className={box}><Input name="username" aria-label={t('common.username')} className={inputCls} placeholder={t('common.username')} required /></div>}
        <div className={box}><Input name="email" type="email" aria-label={t('common.email')} className={inputCls} placeholder={t(login ? 'auth.emailLogin' : 'auth.emailSignup')} required /></div>
        <Password name="password" placeholder={login ? '' : t('auth.password')} required />
        {login ? <button type="button" aria-disabled="true" onClick={unavailable} className="-mt-0.5 mb-4 block w-full cursor-pointer text-right text-brand">{t('auth.forgot')}</button> : <Password name="confirm" placeholder={t('auth.confirm')} required />}
        {error && <p role="alert" className="mb-3 text-xs text-destructive">{t(`auth.errors.${error}`, t('auth.errors.generic'))}</p>}
        <Button type="submit" className="my-3 w-full text-sm normal-case" disabled={busy}>{t(login ? 'auth.login' : 'auth.signup')}</Button>
      </form>
      <div className="relative -mx-20 mt-6 mb-4 border-t text-center"><span className="relative -top-[11px] bg-popover px-3 text-xs">{t('auth.orContinue')}</span></div>
      <UiButton variant="outline" className={social} type="button" aria-disabled="true" onClick={unavailable}><Google />{t('auth.google')}</UiButton>
      <UiButton variant="outline" className={social} type="button" aria-disabled="true" onClick={unavailable}><Facebook />{t('auth.facebook')}</UiButton>
    </Modal>
  )
}
