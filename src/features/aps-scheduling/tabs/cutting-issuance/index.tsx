'use client'

import { ExternalLink, Scissors, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { getCuttingOperationTabs } from '@/features/cutting-operations/tab-config'
import { ExecutionTableSection } from './components/execution-table-section'
import { PlanningSelectionSection } from './components/planning-selection-section'
import { TraceReportSection } from './components/trace-report-section'
import { useCuttingIssuancePageState } from './hooks/use-cutting-issuance-page-state'

export function ApsCuttingIssuanceTab() {
  const { t } = useLanguage()
  const {
    orders,
    executions,
    traceReport,
    isLoading,
    loadingError,
    isExecutionOrTraceRefreshing,
    selectedOrder,
    compatibleTemplates,
    orderId,
    setOrderId,
    lineNo,
    setLineNo,
    templateId,
    headerStatus,
    templateMatchHint,
    missingTemplateMessage,
    canCreateExecution,
    isSubmittingExecution,
    handleCreateExecution,
    refreshExecutionAndTrace,
  } = useCuttingIssuancePageState()

  const handleOpenCuttingPlan = () => {
    window.open('/raw-materials/cutting-plan', '_blank', 'noopener,noreferrer')
  }

  return (
    <ModuleTabbedLayout
      title={t('sidebar.items.cuttingOperations')}
      tabs={getCuttingOperationTabs(t)}
    >
      <div className='flex animate-in flex-col gap-5 fade-in duration-700'>
        <IndustrialHeader
          icon={Scissors}
          title={t('apsScheduling.cuttingIssuance.header.title')}
          description={t('apsScheduling.cuttingIssuance.header.description')}
          gradient
          statusBadge={
            <div
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${headerStatus.className}`}
            >
              {headerStatus.label}
            </div>
          }
        />

        {loadingError ? (
          <section className='rounded-[24px] border border-dashed border-rose-300 bg-rose-50 p-4 text-sm text-rose-700'>
            {t('apsScheduling.cuttingIssuance.feedback.loadingFailed', {
              message:
                loadingError instanceof Error
                  ? loadingError.message
                  : t('apsScheduling.cuttingIssuance.feedback.unknownError'),
            })}
          </section>
        ) : null}

        {missingTemplateMessage ? (
          <section className='rounded-[24px] border border-dashed border-amber-300/80 bg-muted/5 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-2.5 text-[11px] font-medium leading-5 text-muted-foreground'>
                <TriangleAlert className='size-3.5 shrink-0 text-amber-600/75' />
                <p>{missingTemplateMessage}</p>
              </div>
              <Button
                type='button'
                variant='outline'
                className='h-8 shrink-0 rounded-full border-amber-300/70 bg-amber-50/40 px-3 text-[10px] font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100/70 hover:text-amber-800'
                onClick={handleOpenCuttingPlan}
              >
                <ExternalLink className='size-3.5' />
                {t('apsScheduling.cuttingIssuance.feedback.openCuttingPlan')}
              </Button>
            </div>
          </section>
        ) : null}

        <PlanningSelectionSection
          isLoading={isLoading}
          isSubmitting={isSubmittingExecution}
          canCreateExecution={canCreateExecution}
          orders={orders}
          templates={compatibleTemplates}
          selectedOrder={selectedOrder}
          orderId={orderId}
          lineNo={lineNo}
          templateId={templateId}
          templateMatchHint={templateMatchHint}
          onOrderIdChange={setOrderId}
          onLineNoChange={setLineNo}
          onCreateExecution={handleCreateExecution}
        />

        <ExecutionTableSection
          executions={executions}
          isRefreshing={isExecutionOrTraceRefreshing}
          onRefresh={refreshExecutionAndTrace}
        />

        <TraceReportSection
          traceReport={traceReport}
          isRefreshing={isExecutionOrTraceRefreshing}
          onRefresh={refreshExecutionAndTrace}
        />
      </div>
    </ModuleTabbedLayout>
  )
}
