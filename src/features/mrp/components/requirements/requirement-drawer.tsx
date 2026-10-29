'use client'

import { Download, Printer, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { ProductionMaterialIssuanceStartWorkflowLauncher } from '@/features/production-material-issuance/components/production-material-issuance-start-workflow-launcher'
import { ProductionMaterialRequirementBomBasisReview } from '@/features/production-material-requirements/components/production-material-requirement-bom-basis-review'
import type {
  ProductionMaterialRequirementBomSelection,
  ProductionMaterialRequirementSourceLine,
} from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'
import { type MaterialRequirement } from '../../data/requirement-schema'
import { RequirementExportService } from '../../services/requirement-export-service'
import { MoldRequirementAlert } from './mold-requirement-alert'
import { RequirementList } from './requirement-list'
import { RequirementStageAlert } from './requirement-stage-alert'

interface RequirementDrawerProps {
  isOpen: boolean
  onClose: () => void
  data: MaterialRequirement[]
  errorMessage?: string
  stats: {
    analyzedModels: { modelName: string; totalQty: number }[]
  }
  isLoading: boolean
  selectedCount: number
  sourceLines: ProductionMaterialRequirementSourceLine[]
  bomSelections: ProductionMaterialRequirementBomSelection[]
  isComplete: boolean
  onBomSelectionChange: (
    selection: ProductionMaterialRequirementBomSelection
  ) => void
  onRecalculate: () => void
}

export function RequirementDrawer({
  isOpen,
  onClose,
  data,
  errorMessage,
  stats,
  isLoading,
  selectedCount,
  sourceLines,
  bomSelections,
  isComplete,
  onBomSelectionChange,
  onRecalculate,
}: RequirementDrawerProps) {
  const { locale, t } = useLanguage()
  const isAnalyzedButEmpty =
    !isLoading &&
    !errorMessage &&
    isComplete &&
    selectedCount > 0 &&
    data.length === 0

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side='right'
        className='w-full overflow-hidden rounded-l-[32px] border-l-2 border-dashed border-primary/20 bg-[#F8FAFC] p-0 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] sm:max-w-[1050px]'
      >
        <div
          data-mobile-floating-surface-layout='column'
          className='flex h-full flex-col'
        >
          <div className='relative overflow-hidden border-b border-dashed bg-white/80 px-8 py-7 backdrop-blur-md'>
            <div className='pointer-events-none absolute top-0 right-0 p-10 opacity-[0.05]'>
              <Download className='size-40 rotate-12 text-primary' />
            </div>

            <div className='relative z-10 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center'>
              <div className='min-w-0 space-y-1'>
                <div className='flex flex-wrap items-center gap-4'>
                  <div className='rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black tracking-[0.2em] text-primary uppercase'>
                    {t('mrp.requirements.drawer.badge')}
                  </div>
                  <SheetTitle className='text-3xl font-black tracking-tighter uppercase'>
                    {t('mrp.requirements.drawer.title')}
                  </SheetTitle>
                </div>
                <SheetDescription className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                  {t('mrp.requirements.drawer.description', {
                    count: selectedCount,
                  })}
                </SheetDescription>
              </div>

              <div className='flex flex-wrap items-center gap-2 lg:pr-6'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-11 gap-2 rounded-full border-2 border-dashed border-muted/50 px-6 text-[11px] font-black uppercase hover:bg-muted/5'
                  onClick={() => window.print()}
                  disabled={!isComplete || isLoading}
                >
                  <Printer className='size-4' />
                  {t('mrp.requirements.drawer.printList')}
                </Button>
                <Button
                  size='sm'
                  className='h-11 gap-2 rounded-full bg-primary px-8 text-[11px] font-black uppercase shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95'
                  disabled={!isComplete || isLoading}
                  onClick={async () => {
                    try {
                      await RequirementExportService.exportToExcel(data, locale)
                      toast.success(
                        t('mrp.requirements.drawer.exportSuccess'),
                        {
                          description: t(
                            'mrp.requirements.drawer.exportSuccessDescription'
                          ),
                        }
                      )
                    } catch (error) {
                      failLoudly(error, 'RequirementDrawer.exportToExcel')
                    }
                  }}
                >
                  <Download className='size-4' />
                  {t('mrp.requirements.drawer.exportExcel')}
                </Button>
              </div>
            </div>
          </div>

          <div
            data-mobile-floating-surface-scroll-body
            className='custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6 [scrollbar-gutter:stable]'
          >
            <ProductionMaterialRequirementBomBasisReview
              sourceLines={sourceLines}
              selections={bomSelections}
              isComplete={isComplete}
              isLoading={isLoading}
              onSelectionChange={onBomSelectionChange}
              onRecalculate={onRecalculate}
            />
            {isOpen && (
              <ProductionMaterialIssuanceStartWorkflowLauncher
                key={`${isComplete && !isLoading && !errorMessage}/${JSON.stringify(sourceLines)}`}
                initialSources={sourceLines.map((source) => ({
                  salesOrderId: source.salesOrderId,
                  salesOrderLineId: source.salesOrderLineId,
                  ...(source.bom ? { bomId: source.bom.id } : {}),
                  orderNo: source.orderNo,
                  lineNo: source.lineNo,
                  productName: source.productName,
                }))}
              />
            )}
            {errorMessage ? (
              <RequirementStageAlert
                tone='error'
                title={t('mrp.requirements.drawer.stageErrorTitle')}
                description={t('mrp.requirements.drawer.stageErrorDescription')}
                details={errorMessage}
              />
            ) : isAnalyzedButEmpty ? (
              <RequirementStageAlert
                tone='warning'
                title={t('mrp.requirements.drawer.emptyAnalyzedTitle')}
                description={t(
                  'mrp.requirements.drawer.emptyAnalyzedDescription'
                )}
              />
            ) : isComplete || isLoading ? (
              <>
                <MoldRequirementAlert models={stats.analyzedModels} />
                <RequirementList data={data} isLoading={isLoading} />
              </>
            ) : null}
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 border-t bg-white px-6 py-4 text-[10px] font-bold text-muted-foreground/40'>
            <div className='flex items-center gap-4'>
              <span className='flex items-center gap-1.5 uppercase'>
                <div className='size-1.5 rounded-full bg-primary' />
                {t('mrp.requirements.drawer.realtimeNotice')}
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <Share2 className='size-3 cursor-pointer transition-colors hover:text-primary' />
              <span>{t('mrp.requirements.drawer.shareLink')}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
