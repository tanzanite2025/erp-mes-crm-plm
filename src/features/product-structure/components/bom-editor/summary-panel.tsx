import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM } from '../../data/schema'
import { useBOMSummary } from '../../hooks/use-bom-summary'

interface SummaryPanelProps {
  fields: Array<{ id: string }>
  form: UseFormReturn<BOM>
  sections: BOMSectionOption[]
  onSectionClick: (section: string) => void
}

export function SummaryPanel({ fields, form, sections, onSectionClick }: SummaryPanelProps) {
  const { t } = useLanguage()
  const {
    totalItems,
    totalCost,
    stageCoverage,
    sectionSummaries,
  } = useBOMSummary({
    fields,
    form,
    sections,
  })

  return (
    <div className='space-y-4 bg-muted/5 p-3 sm:p-4'>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6'>
        <div className='group rounded-[24px] border border-dashed border-blue-200 bg-blue-50 p-4 shadow-inner transition-all hover:bg-white sm:p-5'>
          <div className='text-[10px] font-black uppercase tracking-widest italic text-blue-800'>
            {t('engineering.bomArchive.summary.totalItems')}
          </div>
          <div className='mt-2 text-2xl font-black uppercase italic tracking-tighter text-slate-800 sm:text-3xl'>
            {totalItems}{' '}
            <span className='text-[10px] font-bold text-blue-400'>
              {t('engineering.bomArchive.summary.itemsUnit')}
            </span>
          </div>
        </div>
        <div className='group rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50 p-4 shadow-inner transition-all hover:bg-white sm:p-5'>
          <div className='text-[10px] font-black uppercase tracking-widest italic text-emerald-800'>
            {t('engineering.bomArchive.summary.totalCost')}
          </div>
          <div className='mt-2 break-all text-2xl font-black uppercase italic tracking-tighter text-emerald-600 sm:text-3xl'>
            {totalCost.toFixed(2)}
          </div>
        </div>
        <div className='group rounded-[24px] border border-dashed border-orange-200 bg-orange-50 p-4 shadow-inner transition-all hover:bg-white sm:p-5'>
          <div className='text-[10px] font-black uppercase tracking-widest italic text-orange-800'>
            {t('engineering.bomArchive.summary.stageCoverage')}
          </div>
          <div className='mt-2 text-2xl font-black uppercase italic tracking-tighter text-slate-800 sm:text-3xl'>
            {stageCoverage} / {sections.length}
          </div>
        </div>
      </div>

      <div className='space-y-2 rounded-[24px] border border-dashed border-muted/50 bg-white/50 p-3 sm:p-4'>
        <h5 className='flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500 sm:text-[10px]'>
          {t('engineering.bomArchive.summary.sectionDistribution')}
          <span className='h-px flex-1 bg-muted-foreground/10' />
        </h5>
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3'>
          {sectionSummaries.map(({ section, itemCount, sectionCost }) => {
            return (
              <div
                key={section.code}
                className='group/row flex cursor-pointer items-center justify-between rounded-2xl border border-transparent bg-muted/20 p-3 shadow-sm transition-all hover:bg-blue-600 hover:text-white'
                onClick={() => onSectionClick(section.code)}
              >
                <div className='flex items-center gap-3'>
                  <div className={`size-3 rounded-full border-2 border-white ${itemCount > 0 ? 'bg-blue-500 group-hover/row:bg-white' : 'bg-slate-300'}`} />
                  <span className='text-xs font-black uppercase tracking-tight'>{section.name}</span>
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

      <div className='rounded-2xl bg-primary p-3 text-center text-[9px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 italic'>
        {t('engineering.bomArchive.recipe.summaryHint')}
      </div>
    </div>
  )
}
