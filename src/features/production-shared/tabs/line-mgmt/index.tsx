import { Factory } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
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
    return (
      <div className='animate-pulse p-10 text-center text-muted-foreground'>
        {t('orgPersonnel.lineMgmt.toasts.loading')}
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={Factory}
        title={t('orgPersonnel.lineMgmt.header.title')}
        description={t('orgPersonnel.lineMgmt.header.subtitleDynamic', {
          level1Name,
        })}
      />

      <LineList lines={lines} onUpdate={updateLine} onDelete={deleteLine} />
    </div>
  )
}
