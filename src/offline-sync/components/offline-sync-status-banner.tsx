import { AlertTriangle, CloudOff, RefreshCcw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useOfflineSyncStore } from '@/offline-sync/stores/offline-sync-store'

/**
 * Persistent root-level banner for offline sync risk visibility.
 */
export function OfflineSyncStatusBanner() {
  const isEngineStarted = useOfflineSyncStore((state) => state.isEngineStarted)
  const isOnline = useOfflineSyncStore((state) => state.isOnline)
  const isSyncing = useOfflineSyncStore((state) => state.isSyncing)
  const severity = useOfflineSyncStore((state) => state.severity)
  const headline = useOfflineSyncStore((state) => state.headline)
  const detail = useOfflineSyncStore((state) => state.detail)
  const summary = useOfflineSyncStore((state) => state.summary)
  const lastFlushAt = useOfflineSyncStore((state) => state.lastFlushAt)
  const updatedAt = useOfflineSyncStore((state) => state.updatedAt)

  const shouldShow = isEngineStarted && (severity !== 'healthy' || isSyncing || summary.pendingCount > 0 || summary.conflictCount > 0)

  if (!shouldShow) {
    return null
  }

  const Icon = !isOnline ? CloudOff : isSyncing ? RefreshCcw : AlertTriangle

  return (
    <div className='px-4 pt-4'>
      <Alert
        variant={severity === 'critical' ? 'destructive' : 'default'}
        className={cn(
          'rounded-[32px] border-dashed bg-muted/5 shadow-sm',
          severity === 'critical' && 'animate-in fade-in duration-300',
          isSyncing && 'border-primary/40'
        )}
      >
        <Icon className={cn('mt-1 size-4', isSyncing && 'animate-spin')} />
        <AlertTitle className='text-sm font-black tracking-tighter italic uppercase'>
          {headline || 'OFFLINE SYNC STATUS'}
        </AlertTitle>
        <AlertDescription className='gap-2'>
          <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/80'>
            {detail || '离线同步状态正常。'}
          </p>
          <div className='flex flex-wrap gap-2 text-[8px] font-mono uppercase text-muted-foreground/80'>
            <span>online={String(isOnline)}</span>
            <span>pending={summary.pendingCount}</span>
            <span>conflicts={summary.conflictCount}</span>
            <span>unhandled={summary.unhandledPendingCount}</span>
            {lastFlushAt ? <span>last_flush={lastFlushAt}</span> : null}
            {updatedAt ? <span>updated={updatedAt}</span> : null}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
