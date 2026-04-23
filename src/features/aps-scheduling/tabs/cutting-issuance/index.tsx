'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Scissors, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getApsSchedulingTabs } from '../../tab-config'
import { CUTTING_ISSUANCE_QUERY_KEYS, DEFAULT_CUTTING_ISSUANCE_FILTER_DRAFT } from './constants'
import { ExecutionTableSection } from './components/execution-table-section'
import { FilterPanel } from './components/filter-panel'
import { PlanningSelectionSection } from './components/planning-selection-section'
import { PreviewSection } from './components/preview-section'
import { TraceReportSection } from './components/trace-report-section'
import { buildCuttingIssuancePreview, findTemplateForOrder, getCompatibleTemplates } from './planner'
import {
  createCuttingIssuanceExecution,
  getCuttingIssuanceOrders,
  getCuttingIssuanceTemplates,
  getCuttingIssuanceTraceReport,
  listCuttingIssuanceExecutions,
} from './service'
import type { CuttingIssuanceExecutionFilters, CuttingIssuanceFilterDraft } from './types'
import { APS_CARD_SHELL_CLASS, APS_DESC_CLASS, APS_KICKER_CLASS, APS_PANEL_CLASS } from './ui-classes'
import { buildExecutionFilters, buildFilterTagList, formatNumber, validateFilterDateRange } from './utils'

export function ApsCuttingIssuanceTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const [orderId, setOrderId] = useState('')
  const [lineNo, setLineNo] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [preferredBatchSizeInput, setPreferredBatchSizeInput] = useState('200')
  const [filterDraft, setFilterDraft] = useState<CuttingIssuanceFilterDraft>(DEFAULT_CUTTING_ISSUANCE_FILTER_DRAFT)
  const [executionFilters, setExecutionFilters] = useState<CuttingIssuanceExecutionFilters>({})

  const ordersQuery = useQuery({
    queryKey: CUTTING_ISSUANCE_QUERY_KEYS.orders,
    queryFn: getCuttingIssuanceOrders,
  })

  const templatesQuery = useQuery({
    queryKey: CUTTING_ISSUANCE_QUERY_KEYS.templates,
    queryFn: getCuttingIssuanceTemplates,
  })

  const executionsQuery = useQuery({
    queryKey: [...CUTTING_ISSUANCE_QUERY_KEYS.executions, executionFilters],
    queryFn: () => listCuttingIssuanceExecutions(executionFilters),
  })

  const traceReportQuery = useQuery({
    queryKey: [...CUTTING_ISSUANCE_QUERY_KEYS.traceReport, executionFilters],
    queryFn: () => getCuttingIssuanceTraceReport(executionFilters),
  })

  const orders = ordersQuery.data ?? []
  const templates = templatesQuery.data ?? []
  const executions = executionsQuery.data ?? []
  const traceReport = traceReportQuery.data

  useEffect(() => {
    if (!orderId && orders.length > 0) {
      setOrderId(orders[0].id)
    }
  }, [orderId, orders])

  const selectedOrder = useMemo(() => orders.find((order) => order.id === orderId), [orderId, orders])

  useEffect(() => {
    if (!selectedOrder) {
      setLineNo('')
      return
    }
    const exists = selectedOrder.lines.some((line) => String(line.lineNo) === lineNo)
    if (!exists) {
      setLineNo(selectedOrder.lines[0] ? String(selectedOrder.lines[0].lineNo) : '')
    }
  }, [lineNo, selectedOrder])

  const selectedLine = useMemo(
    () => selectedOrder?.lines.find((line) => String(line.lineNo) === lineNo),
    [lineNo, selectedOrder],
  )

  const compatibleTemplates = useMemo(() => getCompatibleTemplates(selectedLine, templates), [selectedLine, templates])

  useEffect(() => {
    if (!selectedLine) {
      setTemplateId('')
      return
    }
    const existsInCompatible = compatibleTemplates.some((template) => template.id === templateId)
    if (existsInCompatible) {
      return
    }
    const matchedTemplate = findTemplateForOrder(selectedLine, compatibleTemplates)
    setTemplateId(matchedTemplate?.id || '')
  }, [compatibleTemplates, selectedLine, templateId])

  const selectedTemplate = useMemo(
    () => compatibleTemplates.find((template) => template.id === templateId),
    [compatibleTemplates, templateId],
  )

  const preferredBatchSize = Math.max(1, Number.parseInt(preferredBatchSizeInput, 10) || 1)
  const preview = useMemo(
    () => buildCuttingIssuancePreview(selectedOrder, selectedLine, selectedTemplate, preferredBatchSize),
    [preferredBatchSize, selectedLine, selectedOrder, selectedTemplate],
  )

  const appliedFilterTags = useMemo(() => buildFilterTagList(executionFilters), [executionFilters])

  const createExecutionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder || !selectedLine || !selectedTemplate) {
        throw new Error('请先选择订单、订单行，并确认系统已自动匹配到裁纱模板。')
      }
      return createCuttingIssuanceExecution({
        order: selectedOrder,
        line: selectedLine,
        template: selectedTemplate,
        preferredBatchSize,
      })
    },
    onSuccess: async (result) => {
      toast.success(`执行单已生成：${result.id || selectedOrder?.orderNo || ''}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CUTTING_ISSUANCE_QUERY_KEYS.executions }),
        queryClient.invalidateQueries({ queryKey: CUTTING_ISSUANCE_QUERY_KEYS.traceReport }),
        queryClient.invalidateQueries({ queryKey: CUTTING_ISSUANCE_QUERY_KEYS.orders }),
      ])
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '生成执行单失败。'
      toast.error(message)
    },
  })

  const isLoading = ordersQuery.isLoading || templatesQuery.isLoading
  const loadingError = ordersQuery.error || templatesQuery.error
  const isExecutionOrTraceRefreshing = executionsQuery.isFetching || traceReportQuery.isFetching

  const applyFilters = () => {
    const validationMessage = validateFilterDateRange(filterDraft)
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }
    const nextFilters = buildExecutionFilters(filterDraft)
    if (JSON.stringify(nextFilters) === JSON.stringify(executionFilters)) {
      return
    }
    setExecutionFilters(nextFilters)
  }

  const resetFilters = () => {
    setFilterDraft(DEFAULT_CUTTING_ISSUANCE_FILTER_DRAFT)
    setExecutionFilters({})
  }

  const refreshExecutionAndTrace = () => {
    void executionsQuery.refetch()
    void traceReportQuery.refetch()
  }

  return (
    <ModuleTabbedLayout title={t('apsScheduling.layout.title')} tabs={getApsSchedulingTabs(t as any)}>
      <div className='flex flex-col gap-5 animate-in fade-in duration-700'>
        <section className='relative overflow-hidden rounded-[32px] border border-dashed border-cyan-500/15 bg-muted/5 p-6'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent' />
          <div className='relative flex items-center gap-3'>
            <div className='flex size-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-background text-cyan-700'>
              <Scissors className='size-5' />
            </div>
            <div>
              <p className={APS_KICKER_CLASS}>APS Cutting Issuance</p>
              <h2 className='mt-1 text-lg font-black tracking-tight italic'>裁纱下达</h2>
              <p className={APS_DESC_CLASS}>销售订单、模板匹配、执行单落库在同一页闭环。</p>
            </div>
          </div>
        </section>

        {loadingError ? (
          <section className='rounded-[24px] border border-dashed border-rose-300 bg-rose-50 p-4 text-sm text-rose-700'>
            加载失败：{loadingError instanceof Error ? loadingError.message : '未知错误'}
          </section>
        ) : null}

        {selectedLine && compatibleTemplates.length === 0 ? (
          <section className='rounded-[24px] border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800'>
            <div className='flex items-start gap-2'>
              <TriangleAlert className='mt-0.5 size-4 shrink-0' />
              <p>
                当前订单行（{selectedLine.productModel} / {selectedLine.holeCount || '--'}孔）未匹配到可用的 Active
                裁纱模板，请先到“工程数据库 / 裁纱方案”维护后再下达。
              </p>
            </div>
          </section>
        ) : null}

        <PlanningSelectionSection
          isLoading={isLoading}
          orders={orders}
          templates={compatibleTemplates}
          selectedOrder={selectedOrder}
          orderId={orderId}
          lineNo={lineNo}
          templateId={templateId}
          preferredBatchSizeInput={preferredBatchSizeInput}
          templateMatchHint={
            !selectedLine
              ? '请先选择订单行，系统会自动匹配裁纱模板。'
              : compatibleTemplates.length === 0
                ? '暂无匹配模板。'
                : compatibleTemplates.length === 1
                  ? '已按型号+孔数自动匹配模板。'
                  : `已匹配 ${compatibleTemplates.length} 个同型号同孔数模板，默认选择最新版本。`
          }
          onOrderIdChange={setOrderId}
          onLineNoChange={setLineNo}
          onPreferredBatchSizeInputChange={setPreferredBatchSizeInput}
        />

        <section className='grid gap-2 md:grid-cols-4'>
          <div className={`${APS_CARD_SHELL_CLASS} p-2.5`}>
            <div className={APS_PANEL_CLASS + ' p-2'}>
              <p className={APS_KICKER_CLASS}>订单行圈数</p>
              <p className='mt-1 text-2xl font-black italic tracking-tighter text-cyan-700'>
                {preview?.totalRimQuantity ?? 0}
              </p>
            </div>
          </div>
          <div className={`${APS_CARD_SHELL_CLASS} p-2.5`}>
            <div className={APS_PANEL_CLASS + ' p-2'}>
              <p className={APS_KICKER_CLASS}>单圈裁纱行数</p>
              <p className='mt-1 text-2xl font-black italic tracking-tighter text-amber-600'>
                {preview?.template.lineCountPerRim ?? 0}
              </p>
            </div>
          </div>
          <div className={`${APS_CARD_SHELL_CLASS} p-2.5`}>
            <div className={APS_PANEL_CLASS + ' p-2'}>
              <p className={APS_KICKER_CLASS}>总裁纱行数</p>
              <p className='mt-1 text-2xl font-black italic tracking-tighter text-cyan-700'>
                {preview?.totalLineQuantity ?? 0}
              </p>
            </div>
          </div>
          <div className={`${APS_CARD_SHELL_CLASS} p-2.5`}>
            <div className={APS_PANEL_CLASS + ' p-2'}>
              <p className={APS_KICKER_CLASS}>筛选后执行单数</p>
              <p className='mt-1 text-2xl font-black italic tracking-tighter text-rose-600'>
                {formatNumber(traceReport?.summary.executionCount ?? executions.length)}
              </p>
            </div>
          </div>
        </section>

        <FilterPanel
          filterDraft={filterDraft}
          appliedFilterTags={appliedFilterTags}
          onFilterDraftChange={setFilterDraft}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
        />

        <TraceReportSection traceReport={traceReport} isRefreshing={isExecutionOrTraceRefreshing} onRefresh={refreshExecutionAndTrace} />

        <PreviewSection preview={preview} isSubmitting={createExecutionMutation.isPending} onCreateExecution={() => createExecutionMutation.mutate()} />

        <ExecutionTableSection executions={executions} isRefreshing={isExecutionOrTraceRefreshing} onRefresh={refreshExecutionAndTrace} />
      </div>
    </ModuleTabbedLayout>
  )
}
