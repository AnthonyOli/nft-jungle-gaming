import { ActivityIcon, DownloadIcon, GiftIcon, HeartIcon, LifeBuoyIcon, LogOutIcon, UserIcon, WalletIcon } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  changePassword, createSecondaryWallet, deleteSecondaryWallet, getProfile, getWallets, removeAvatar, saveMainWallet,
  setAvatar, updateProfile, updateSecondaryWallet,
} from '../api'
import { keys } from '../api/queryKeys'
import type { Profile as ProfileData, SecondaryWallet, Wallets } from '../api/types'
import { useAuth } from '../auth'
import { Button, EnsField as Ens, Field, Skeleton } from '../components'
import { fileToAvatar } from '../lib/avatar'
import { errorCode, errorFields, errorStatus } from '../lib/errors'
import { unavailable } from '../lib/unavailable'
import { tList } from '../lib/i18n'
import { ADDRESS, NETWORKS, WALLET_TYPES } from '../lib/wallets'
import { cn } from '@/lib/utils'
const two = 'grid grid-cols-2 gap-x-7 max-[800px]:grid-cols-1'
const menuLink = 'flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 text-left text-[15px] text-brand no-underline'

const MENU_ICONS = [UserIcon, WalletIcon, ActivityIcon, HeartIcon, GiftIcon, DownloadIcon, LifeBuoyIcon]

const text = z.string().trim()
const required = text.min(1, 'required')
const email = required.email('invalid_email')
const address = required.regex(ADDRESS, 'invalid_address')

const profileSchema = z.object({
  displayName: required, username: required, email, ens: text.optional(), walletNickname: text.optional(),
  current: z.string().optional(), next: z.string().optional(), confirm: z.string().optional(),
}).superRefine((v, ctx) => {
  if (!(v.current || v.next || v.confirm)) return
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (!v.current) issue('current', 'required')
  if ((v.next ?? '').length < 6) issue('next', 'min6')
  else if (v.next !== v.confirm) issue('confirm', 'password_mismatch')
})
const mainWalletSchema = z.object({
  displayName: required, walletNickname: text.optional(), network: text.optional(), profileName: text.optional(),
  address, walletType: text.optional(), referralCode: text.optional(), email: text.optional(), ens: text.optional(),
})
const secondarySchema = z.object({ nickname: required, network: required, address, walletType: required })

function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>) {
  if (errorStatus(e) === 401) return
  const fields = Object.entries(errorFields(e))
  if (!fields.length) return setError('root', { message: errorCode(e) })
  fields.forEach(([name, code]) => setError(name as Path<T>, { message: code }))
}

function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  const { t } = useTranslation()
  if (error) return <p role="alert" className="mb-3 text-xs text-destructive">{t(`errors.${error}`, { defaultValue: t('errors.generic') })}</p>
  if (ok) return <p role="status" className="text-muted-foreground">{ok}</p>
  return null
}

function AvatarEditor({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  const done = (p: ProfileData) => qc.setQueryData(keys.profile(userId), p)
  const upload = useMutation({ mutationFn: async (file: File) => setAvatar(await fileToAvatar(file)), onSuccess: done })
  const remove = useMutation({ mutationFn: removeAvatar, onSuccess: done })
  const busy = upload.isPending || remove.isPending
  const code = error ?? (upload.error || remove.error ? (upload.error as Error | null)?.message === 'avatar_invalid' ? 'avatar_invalid' : errorFields(upload.error ?? remove.error).avatar ?? 'invalid_data' : undefined)
  return (
    <div>
      <p>{t('profile.avatar')}</p>
      <div className="flex items-center gap-3">
        {profile.avatar
          ? <img src={profile.avatar} alt={t('profile.avatarAlt')} className="size-16 rounded-full object-cover" />
          : <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-secondary text-xl font-bold">{profile.displayName.slice(0, 1).toUpperCase()}</span>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-label={t('profile.change')}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            setError(undefined)
            if (file) upload.mutate(file, { onError: (err) => setError((err as Error).message === 'avatar_invalid' ? 'avatar_invalid' : undefined) })
          }} />
        <Button type="button" disabled={busy} onClick={() => input.current?.click()}>{upload.isPending ? t('profile.uploading') : t('profile.change')}</Button>
        <Button ghost type="button" disabled={busy || !profile.avatar} onClick={() => remove.mutate()}>{t('common.remove')}</Button>
      </div>
      {code && <p role="alert" className="mt-1 text-xs text-destructive">{t(`fieldErrors.${code}`, { defaultValue: t('fieldErrors.invalid_data') })}</p>}
    </div>
  )
}

function Data({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const form = useForm<z.input<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: profile.displayName, username: profile.username, email: profile.email, ens: profile.ens, walletNickname: profile.walletNickname, current: '', next: '', confirm: '' },
  })
  const { register, handleSubmit, formState: { errors } } = form
  const save = useMutation({
    mutationFn: async ({ current, next, confirm, ...fields }: z.input<typeof profileSchema>) => {
      const saved = await updateProfile(fields)
      qc.setQueryData(keys.profile(userId), saved)
      qc.removeQueries({ queryKey: keys.wallets(userId) })
      if (current || next || confirm) await changePassword({ current, next, confirm })
    },
    onSuccess: () => form.reset({ ...form.getValues(), current: '', next: '', confirm: '' }),
    onError: (e) => applyServerErrors(e, form.setError),
  })
  return (
    <div>
      <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        <h2 className="text-[1.17em]">{t('common.collectorProfile')}</h2>
        <div className={two}>
          <Field req label={t('common.displayName')} error={errors.displayName?.message} {...register('displayName')} />
          <Field req label={t('common.username')} error={errors.username?.message} {...register('username')} />
          <Field req label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />
          <Ens {...register('ens')} />
          <Field req label={t('common.walletNickname')} {...register('walletNickname')} />
          <AvatarEditor profile={profile} />
        </div>
        <h3 className="my-[1.33em] text-[1em]">{t('profile.changePassword')}</h3>
        <div className="max-w-[420px]">
          <Field label={t('profile.currentPassword')} type="password" autoComplete="current-password" error={errors.current?.message} {...register('current')} />
          <Field label={t('profile.newPassword')} type="password" autoComplete="new-password" error={errors.next?.message} {...register('next')} />
          <Field label={t('profile.confirmNewPassword')} type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        </div>
        <FormMessage error={errors.root?.message} ok={save.isSuccess ? t('profile.saved') : undefined} />
        <Button type="submit" disabled={save.isPending}>{t('profile.save')}</Button>
      </form>
    </div>
  )
}

function MainWallet({ wallets, onAdd }: { wallets: Wallets; onAdd?: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const w = wallets.main
  const form = useForm<z.input<typeof mainWalletSchema>>({ resolver: zodResolver(mainWalletSchema), defaultValues: { ...w } })
  const { register, handleSubmit, setValue, control, formState: { errors } } = form
  const [network, walletType] = useWatch({ control, name: ['network', 'walletType'] })
  const save = useMutation({
    mutationFn: (v: z.input<typeof mainWalletSchema>) => saveMainWallet(v),
    onSuccess: (saved) => {
      qc.setQueryData(keys.wallets(userId), saved)
      qc.removeQueries({ queryKey: keys.profile(userId) })
    },
    onError: (e) => applyServerErrors(e, form.setError),
  })
  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
      <div className="flex justify-between">
        <h2 className="m-0 text-[1.17em]">{t('profile.mainWallet')}</h2>
        {onAdd && <button type="button" className="font-bold text-brand" onClick={onAdd}>{t('profile.add')}</button>}
      </div>
      <p className="text-muted-foreground">{t('profile.mainWalletSub')}</p>
      <div className={two}>
        <Field req label={t('common.displayName')} error={errors.displayName?.message} {...register('displayName')} />
        <Field req label={t('common.walletNickname')} {...register('walletNickname')} />
        <Field req as="select" name="network" label={t('common.network')} value={network ?? ''} onValueChange={(v) => setValue('network', v, { shouldDirty: true })} options={NETWORKS} placeholder={t('common.selectNetwork')} />
        <Field req label={t('common.profileName')} {...register('profileName')} />
        <Field req label={t('common.walletAddress')} placeholder={t('common.walletAddressPh')} error={errors.address?.message} {...register('address')} />
        <Field req as="select" name="walletType" label={t('common.walletType')} value={walletType ?? ''} onValueChange={(v) => setValue('walletType', v, { shouldDirty: true })} options={WALLET_TYPES} placeholder={t('common.selectWallet')} />
        <Field req label={t('common.referralCode')} {...register('referralCode')} />
        <Field req label={t('common.email')} type="email" {...register('email')} />
        <Ens {...register('ens')} />
      </div>
      <FormMessage error={errors.root?.message} ok={save.isSuccess ? t('profile.walletSaved') : undefined} />
      <Button type="submit" disabled={save.isPending}>{t('profile.saveWallet')}</Button>
    </form>
  )
}

function SecondaryForm({ initial, onDone }: { initial?: SecondaryWallet; onDone: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const form = useForm<z.input<typeof secondarySchema>>({ resolver: zodResolver(secondarySchema), defaultValues: initial ?? { nickname: '', network: '', address: '', walletType: '' } })
  const { register, handleSubmit, setValue, control, formState: { errors } } = form
  const [network, walletType] = useWatch({ control, name: ['network', 'walletType'] })
  const save = useMutation({
    mutationFn: (v: SecondaryWallet) => (initial ? updateSecondaryWallet : createSecondaryWallet)(v),
    onSuccess: (saved) => {
      qc.setQueryData(keys.wallets(userId), saved)
      toast.success(t('profile.walletSaved'))
      onDone()
    },
    onError: (e) => applyServerErrors(e, form.setError),
  })
  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} aria-label={t(initial ? 'profile.editSecondary' : 'profile.addSecondary')}>
      <div className={two}>
        <Field req label={t('profile.secondaryNickname')} error={errors.nickname?.message} {...register('nickname')} />
        <Field req as="select" name="network" label={t('common.network')} value={network} onValueChange={(v) => setValue('network', v, { shouldDirty: true, shouldValidate: true })} options={NETWORKS} placeholder={t('common.selectNetwork')} error={errors.network?.message} />
        <Field req label={t('common.walletAddress')} placeholder={t('common.walletAddressPh')} error={errors.address?.message} {...register('address')} />
        <Field req as="select" name="walletType" label={t('common.walletType')} value={walletType} onValueChange={(v) => setValue('walletType', v, { shouldDirty: true, shouldValidate: true })} options={WALLET_TYPES} placeholder={t('common.selectWallet')} error={errors.walletType?.message} />
      </div>
      <FormMessage error={errors.root?.message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? t('profile.saving') : t('profile.saveWallet')}</Button>
        <Button ghost type="button" onClick={onDone}>{t('profile.cancel')}</Button>
      </div>
    </form>
  )
}

function SecondaryWalletSection({ wallets, adding, setAdding }: { wallets: Wallets; adding: boolean; setAdding: (v: boolean) => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const [editing, setEditing] = useState(false)
  const remove = useMutation({
    mutationFn: deleteSecondaryWallet,
    onSuccess: (saved) => { qc.setQueryData(keys.wallets(userId), saved); toast.success(t('profile.walletRemoved')) },
    onError: () => toast.error(t('errors.generic')),
  })
  const s = wallets.secondary
  return (
    <section>
      <h2 className="text-[1.17em]">{t('profile.secondaryWallet')}</h2>
      {s && !editing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-4">
          <div className="min-w-0"><b>{s.nickname}</b><br /><small className="break-all text-muted-foreground">{s.walletType} · {s.network} · {s.address}</small></div>
          <div className="flex flex-wrap gap-2">
            <Button ghost type="button" onClick={() => setEditing(true)}>{t('profile.editSecondary')}</Button>
            <Button ghost type="button" disabled={remove.isPending} onClick={() => remove.mutate()}>{t('profile.removeSecondary')}</Button>
          </div>
        </div>
      )}
      {s && editing && <SecondaryForm initial={s} onDone={() => setEditing(false)} />}
      {!s && adding && <SecondaryForm onDone={() => setAdding(false)} />}
      {!s && !adding && (
        <>
          <p className="text-muted-foreground">{t('profile.noSecondary')}</p>
          <Button type="button" onClick={() => setAdding(true)}>{t('profile.addSecondary')}</Button>
        </>
      )}
    </section>
  )
}

function WalletsTab({ wallets }: { wallets: Wallets }) {
  const [adding, setAdding] = useState(false)
  return (
    <div>
      <MainWallet wallets={wallets} onAdd={wallets.secondary ? undefined : () => setAdding(true)} />
      <SecondaryWalletSection wallets={wallets} adding={adding} setAdding={setAdding} />
    </div>
  )
}

function Loaded<T>({ queryKey, queryFn, children }: { queryKey: readonly unknown[]; queryFn: () => Promise<T>; children: (data: T) => ReactNode }) {
  const { t } = useTranslation()
  const userId = useAuth().user?.id
  const { data, error } = useQuery({ queryKey, queryFn, enabled: !!userId })
  if (error) return <p role="alert" className="mb-3 text-xs text-destructive">{t('errors.generic')}</p>
  if (data) return <div className="animate-fade">{children(data)}</div>
  return (
    <div aria-busy="true" aria-label={t('profile.loading')}>
      <Skeleton w={200} h={24} />
      <div className={`mt-4 ${two}`}><Skeleton h={56} count={6} /></div>
      <Skeleton w={120} h={40} mt={24} />
    </div>
  )
}

export default function Profile() {
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const userId = user?.id
  const { pathname } = useLocation()
  const wallets = pathname.startsWith('/perfil/carteiras')
  const menu = tList<string>(t, 'profile.menu')
  return (
    <div className="grid grid-cols-[310px_1fr] gap-7 max-[1100px]:grid-cols-[250px_1fr] max-[800px]:grid-cols-1">
      <nav className="self-start bg-card">
        <h1 className="m-0 px-4 pt-3 pb-2 text-[18px]">{t('profile.menuTitle')}</h1>
        {MENU_ICONS.map((Icon, i) => {
          const body = <><Icon aria-hidden="true" className="size-[18px] shrink-0" />{menu[i]}</>
          if (i < 2) {
            const on = i === 0 ? !wallets : wallets
            return <Link key={i} to={i === 0 ? '/perfil' : '/perfil/carteiras'} aria-current={on ? 'page' : undefined} className={cn(menuLink, on && 'border-primary bg-secondary/60')}>{body}</Link>
          }
          return <button key={i} type="button" aria-disabled="true" title={t('profile.unavailable')} onClick={unavailable} className={cn(menuLink, 'cursor-not-allowed')}>{body}</button>
        })}
        <Link to="/" className={cn(menuLink, 'mt-2 border-t')} onClick={logout}><LogOutIcon aria-hidden="true" className="size-[18px]" /><b>{t('profile.logout')}</b></Link>
      </nav>
      {wallets
        ? <Loaded key="wallets" queryKey={keys.wallets(userId)} queryFn={getWallets}>{(w) => <WalletsTab wallets={w} />}</Loaded>
        : <Loaded key="data" queryKey={keys.profile(userId)} queryFn={getProfile}>{(p) => <Data profile={p} />}</Loaded>}
    </div>
  )
}
