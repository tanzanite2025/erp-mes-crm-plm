import {
  AlertCircle,
  RefreshCcw,
  ShieldAlert,
  TimerReset,
  WifiOff,
  Zap,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  getRoutingQueryErrorState,
  type RoutingQueryErrorOptions,
} from './routing-query-error-state.helpers'

type RoutingQueryErrorStateProps = RoutingQueryErrorOptions & {
  error: unknown
  onRetry: () => void
  retryLabel?: string
  className?: string
}

export function RoutingQueryErrorState({
  className,
  error,
  endpoint,
  onRetry,
  protocolShape,
  resourceLabel,
  retryLabel,
}: RoutingQueryErrorStateProps) {
  const state = getRoutingQueryErrorState(error, {
    endpoint,
    protocolShape,
    resourceLabel,
  })

  const Icon = (() => {
    switch (state.tone) {
      case 'protocol':
      case 'auth':
        return ShieldAlert
      case 'network':
        return WifiOff
      case 'timeout':
        return TimerReset
      case 'circuit':
        return Zap
      default:
        return AlertCircle
    }
  })()

  return (
    <div
      className={
        className ??
        'rounded-[24px] border border-dashed border-rose-200 bg-rose-50/80 p-4'
      }
    >
      <Alert className='border-none bg-transparent px-0 py-0 text-rose-900 shadow-none [&>svg]:size-5'>
        <Icon className='text-rose-500' />
        <AlertTitle className='text-sm font-black tracking-tight text-rose-900'>
          {state.title}
        </AlertTitle>
        <AlertDescription className='gap-3 text-sm text-rose-800/80'>
          <p>{state.description}</p>
          <p className='text-xs text-rose-700/80'>{state.hint}</p>
          {state.detail ? (
            <div className='w-full rounded-2xl border border-dashed border-rose-200/90 bg-white/70 px-3 py-2 font-mono text-[11px] leading-5 text-rose-700'>
              {state.detail}
            </div>
          ) : null}
          <Button
            variant='outline'
            onClick={onRetry}
            className='h-10 rounded-full border-dashed border-rose-300 bg-white/80 px-4 text-xs font-bold text-rose-700 hover:bg-white'
          >
            <RefreshCcw className='mr-2 size-4' />
            {retryLabel ?? `重新加载${resourceLabel}`}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
