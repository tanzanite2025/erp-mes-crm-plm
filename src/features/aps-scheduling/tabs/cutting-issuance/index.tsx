'use client'

import { Scissors, TriangleAlert } from 'lucide-react'
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

  return (
    <ModuleTabbedLayout
      title={t('sidebar.items.cuttingOperations')}
      tabs={getCuttingOperationTabs(t as any)}
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
          <section className='rounded-[24px] border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800'>
            <div className='flex items-start gap-2'>
              <TriangleAlert className='mt-0.5 size-4 shrink-0' />
              <p>{missingTemplateMessage}</p>
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
