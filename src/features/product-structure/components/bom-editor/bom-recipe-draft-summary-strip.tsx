import { useLanguage } from '@/context/language-provider'
import { type BOMWorkspaceGroupNode } from '../../hooks/use-bom-workspace-projection'
import { useBOMWorkspaceSummary } from '../../hooks/use-bom-workspace-summary'

export function BOMRecipeDraftSummaryStrip({
  groups,
}: {
  groups: BOMWorkspaceGroupNode[]
}) {
  const { t } = useLanguage()
  const { totalItems, totalCost, stageCoverage } = useBOMWorkspaceSummary({
    groups,
  })
  const metrics = [
    {
      label: t('engineering.bomArchive.summary.totalItems'),
      value: String(totalItems),
    },
    {
      label: t('engineering.bomArchive.summary.totalCost'),
      value: totalCost.toFixed(2),
    },
    {
      label: t('engineering.bomArchive.summary.stageCoverage'),
      value: `${stageCoverage} / ${groups.length}`,
    },
  ]
  return (
    <dl
      aria-label={t('engineering.bomArchive.recipe.draftSummary')}
      className='grid shrink-0 grid-cols-3 gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-3 py-2.5'
    >
      {metrics.map((metric) => (
        <div key={metric.label} className='min-w-0 space-y-0.5'>
          <dt className='text-[10px] text-muted-foreground sm:text-xs'>
            {metric.label}
          </dt>
          <dd className='truncate text-sm font-bold tabular-nums sm:text-base'>
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
