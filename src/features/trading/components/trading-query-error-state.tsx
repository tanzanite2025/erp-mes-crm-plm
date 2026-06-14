import {
  AlertCircle,
  ShieldAlert,
  TimerReset,
  WifiOff,
  Zap,
} from 'lucide-react'
import {
  isAuthRequiredError,
  isCircuitBreakerError,
  isInvalidResponseError,
  isNetworkError,
  isTimeoutError,
} from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

type TradingQueryErrorStateProps = {
  title: string
  error: unknown
  onRetry: () => void
  retryLabel?: string
}

function extractErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const normalized = error.message.trim()
    return normalized.length > 0 ? normalized : null
  }

  if (!error || typeof error !== 'object') {
    return null
  }

  const record = error as Record<string, unknown>
  const message =
    typeof record.message === 'string' ? record.message.trim() : ''
  return message.length > 0 ? message : null
}

export function TradingQueryErrorState({
  title,
  error,
  onRetry,
  retryLabel,
}: TradingQueryErrorStateProps) {
  const { t } = useLanguage()

  let Icon = AlertCircle
  let summary = t('tradingSalesOrder.master.errors.unknown')

  if (isAuthRequiredError(error)) {
    Icon = ShieldAlert
    summary = t('tradingSalesOrder.master.errors.authRequired')
  } else if (isCircuitBreakerError(error)) {
    Icon = Zap
    summary = t('tradingSalesOrder.master.errors.circuitBreaker')
  } else if (isTimeoutError(error)) {
    Icon = TimerReset
    summary = t('tradingSalesOrder.master.errors.timeout')
  } else if (isNetworkError(error)) {
    Icon = WifiOff
    summary = t('tradingSalesOrder.master.errors.network')
  } else if (isInvalidResponseError(error)) {
    Icon = AlertCircle
    summary = t('tradingSalesOrder.master.errors.invalidResponse')
  }

  const detail = extractErrorMessage(error)

  return (
    <div className='flex h-72 flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-rose-300/50 bg-rose-50/40 px-6 text-center'>
      <Icon className='mb-4 size-12 text-rose-400/40' />
      <p className='mb-3 text-[10px] font-black tracking-[0.3em] text-rose-600 uppercase'>
        {title}
      </p>
      <p className='mb-2 text-xs font-bold text-rose-700/80'>{summary}</p>
      <p className='mb-6 text-[11px] text-rose-700/70'>
        {detail
          ? `${t('tradingSalesOrder.master.errors.reasonPrefix')} ${detail}`
          : summary}
      </p>
      <Button
        variant='outline'
        onClick={onRetry}
        className='h-12 rounded-full border-2 border-dashed px-10 text-[10px] font-black tracking-widest uppercase'
      >
        {retryLabel ?? t('tradingSalesOrder.master.errors.retry')}
      </Button>
    </div>
  )
}
