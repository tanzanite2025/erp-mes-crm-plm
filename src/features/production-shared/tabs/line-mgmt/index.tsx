import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { LineList } from './components/line-list'
import { useLineMgmtLines } from './hooks/use-line-mgmt-lines'

export function LineMgmt() {
  const { t } = useLanguage()
  const { lines, isLoading, error, updateLine, deleteLine } = useLineMgmtLines()

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading && lines.length === 0) {
    return <div className="p-10 text-center text-muted-foreground animate-pulse">{t('orgPersonnel.lineMgmt.toasts.loading')}</div>
  }

  return (
    <LineList
      lines={lines}
      onUpdate={updateLine}
      onDelete={deleteLine}
    />
  )
}
