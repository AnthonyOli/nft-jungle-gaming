import { toast } from 'sonner'
import i18n from '../i18n'

export const unavailable = () => toast.info(i18n.t('common.unavailable'))
