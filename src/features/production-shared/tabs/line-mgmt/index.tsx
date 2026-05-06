import { Factory } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { useHierarchyLevelLabels } from '../hierarchy-config/hooks/use-hierarchy-level-labels'
import { LineList } from './components/line-list'
import { useLineMgmtLines } from './hooks/use-line-mgmt-lines'

export function LineMgmt() {
  const { t } = useLanguage()
  const { level1Name } = useHierarchyLevelLabels()
  const { lines, isLoading, error, updateLine, deleteLine } = useLineMgmtLines()

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading && lines.length === 0) {
    return <div className="p-10 text-center text-muted-foreground animate-pulse">{t('orgPersonnel.lineMgmt.toasts.loading')}</div>
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Factory}
        title={t('orgPersonnel.lineMgmt.header.title')}
        description={t('orgPersonnel.lineMgmt.header.subtitleDynamic', { level1Name })}
      />

      <LineList
        lines={lines}
        onUpdate={updateLine}
        onDelete={deleteLine}
      />
    </div>
  )
}
