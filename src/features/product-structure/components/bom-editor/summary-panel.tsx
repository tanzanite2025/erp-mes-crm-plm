import { useLanguage } from '@/context/language-provider'
import { useBOMSummary } from '../../hooks/use-bom-summary'
import { type BOMWorkspaceGroupNode } from '../../hooks/use-bom-workspace-projection'

interface SummaryPanelProps {
  groups: BOMWorkspaceGroupNode[]
  onSectionClick: (section: string) => void
}

export function SummaryPanel({ groups, onSectionClick }: SummaryPanelProps) {
  const { t } = useLanguage()
  const { totalItems, totalCost, stageCoverage, sectionSummaries } =
    useBOMSummary({
      groups,
    })

  return (
    <div className='space-y-3 bg-muted/5 p-2.5 sm:p-3'>
      <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4'>
        <div className='group rounded-[24px] border border-dashed border-blue-200 bg-blue-50 p-3.5 shadow-inner transition-all hover:bg-white sm:p-4'>
          <div className='text-[10px] font-black tracking-widest text-blue-800 uppercase italic'>
            {t('engineering.bomArchive.summary.totalItems')}
          </div>
          <div className='mt-2 text-2xl font-black tracking-tighter text-slate-800 uppercase italic sm:text-3xl'>
            {totalItems}{' '}
            <span className='text-[10px] font-bold text-blue-400'>
              {t('engineering.bomArchive.summary.itemsUnit')}
            </span>
          </div>
        </div>
        <div className='group rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50 p-3.5 shadow-inner transition-all hover:bg-white sm:p-4'>
          <div className='text-[10px] font-black tracking-widest text-emerald-800 uppercase italic'>
            {t('engineering.bomArchive.summary.totalCost')}
          </div>
          <div className='mt-2 text-2xl font-black tracking-tighter break-all text-emerald-600 uppercase italic sm:text-3xl'>
            {totalCost.toFixed(2)}
          </div>
        </div>
        <div className='group rounded-[24px] border border-dashed border-orange-200 bg-orange-50 p-3.5 shadow-inner transition-all hover:bg-white sm:p-4'>
          <div className='text-[10px] font-black tracking-widest text-orange-800 uppercase italic'>
            {t('engineering.bomArchive.summary.stageCoverage')}
          </div>
          <div className='mt-2 text-2xl font-black tracking-tighter text-slate-800 uppercase italic sm:text-3xl'>
            {stageCoverage} / {groups.length}
          </div>
        </div>
      </div>

      <div className='space-y-1.5 rounded-[24px] border border-dashed border-muted/50 bg-white/50 p-2.5 sm:p-3'>
        <h5 className='flex items-center gap-3 text-[9px] font-black tracking-widest text-slate-500 uppercase sm:text-[10px]'>
          {t('engineering.bomArchive.summary.sectionDistribution')}
          <span className='h-px flex-1 bg-muted-foreground/10' />
        </h5>
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5'>
          {sectionSummaries.map(({ section, itemCount, sectionCost }) => {
            return (
              <div
                key={section.code}
                className='group/row flex cursor-pointer items-center justify-between rounded-2xl border border-transparent bg-muted/20 p-2.5 shadow-sm transition-all hover:bg-blue-600 hover:text-white'
                onClick={() => onSectionClick(section.code)}
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={`size-3 rounded-full border-2 border-white ${itemCount > 0 ? 'bg-blue-500 group-hover/row:bg-white' : 'bg-slate-300'}`}
                  />
                  <span className='text-xs font-black tracking-tight uppercase'>
                    {section.name}
                  </span>
                </div>
                <div className='flex items-center gap-6 text-[10px]'>
                  <span className='font-bold opacity-60 group-hover/row:opacity-100'>
                    {itemCount} {t('engineering.bomArchive.summary.itemsUnit')}
                  </span>
                  <span className='w-[70px] text-right font-mono font-black text-emerald-600 group-hover/row:text-white'>
                    {sectionCost.toFixed(1)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className='rounded-2xl bg-primary p-3 text-center text-[9px] font-bold tracking-widest text-white uppercase italic shadow-lg shadow-primary/20'>
        {t('engineering.bomArchive.recipe.summaryHint')}
      </div>
    </div>
  )
}
