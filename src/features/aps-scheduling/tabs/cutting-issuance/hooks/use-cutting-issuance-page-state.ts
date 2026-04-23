import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { CUTTING_ISSUANCE_QUERY_KEYS } from '../constants'
import { findTemplateForOrder, getCompatibleTemplates } from '../template-matcher'
import {
  createCuttingIssuanceExecution,
  getCuttingIssuanceOrders,
  getCuttingIssuanceTemplates,
  getCuttingIssuanceTraceReport,
  listCuttingIssuanceExecutions,
} from '../service'

export function useCuttingIssuancePageState() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [orderId, setOrderId] = useState('')
  const [lineNo, setLineNo] = useState('')
  const [templateId, setTemplateId] = useState('')

  const ordersQuery = useQuery({
    queryKey: CUTTING_ISSUANCE_QUERY_KEYS.orders,
    queryFn: getCuttingIssuanceOrders,
  })

  const templatesQuery = useQuery({
    queryKey: CUTTING_ISSUANCE_QUERY_KEYS.templates,
    queryFn: getCuttingIssuanceTemplates,
  })

  const executionsQuery = useQuery({
    queryKey: CUTTING_ISSUANCE_QUERY_KEYS.executions,
    queryFn: listCuttingIssuanceExecutions,
  })

  const traceReportQuery = useQuery({
    queryKey: CUTTING_ISSUANCE_QUERY_KEYS.traceReport,
    queryFn: getCuttingIssuanceTraceReport,
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

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === orderId),
    [orderId, orders],
  )

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

  const compatibleTemplates = useMemo(
    () => getCompatibleTemplates(selectedLine, templates),
    [selectedLine, templates],
  )

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

  const createExecutionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder || !selectedLine || !selectedTemplate) {
        throw new Error(t('apsScheduling.cuttingIssuance.feedback.createMissingSelection'))
      }

      return createCuttingIssuanceExecution({
        order: selectedOrder,
        line: selectedLine,
        template: selectedTemplate,
      })
    },
    onSuccess: async (result) => {
      toast.success(
        t('apsScheduling.cuttingIssuance.feedback.createSuccess', {
          id: result.id || selectedOrder?.orderNo || '',
        }),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CUTTING_ISSUANCE_QUERY_KEYS.executions }),
        queryClient.invalidateQueries({ queryKey: CUTTING_ISSUANCE_QUERY_KEYS.traceReport }),
        queryClient.invalidateQueries({ queryKey: CUTTING_ISSUANCE_QUERY_KEYS.orders }),
      ])
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message === 'CUTTING_ISSUANCE_RESPONSE_MISSING_ID'
            ? t('apsScheduling.cuttingIssuance.feedback.responseMissingId')
            : error.message
          : t('apsScheduling.cuttingIssuance.feedback.createFailed')
      toast.error(message)
    },
  })

  const isLoading = ordersQuery.isLoading || templatesQuery.isLoading
  const loadingError =
    ordersQuery.error || templatesQuery.error || executionsQuery.error || traceReportQuery.error
  const isExecutionOrTraceRefreshing = executionsQuery.isFetching || traceReportQuery.isFetching

  const headerStatus = useMemo(() => {
    if (isLoading) {
      return {
        label: t('apsScheduling.cuttingIssuance.header.status.loading'),
        className: 'border-slate-300/70 bg-slate-100 text-slate-600',
      }
    }

    if (!selectedOrder) {
      return {
        label: t('apsScheduling.cuttingIssuance.header.status.awaitingOrder'),
        className: 'border-border/60 bg-background text-muted-foreground',
      }
    }

    if (!selectedLine) {
      return {
        label: t('apsScheduling.cuttingIssuance.header.status.awaitingLine'),
        className: 'border-border/60 bg-background text-muted-foreground',
      }
    }

    if (compatibleTemplates.length === 0) {
      return {
        label: t('apsScheduling.cuttingIssuance.header.status.missingTemplate'),
        className: 'border-amber-300 bg-amber-50 text-amber-700',
      }
    }

    if (selectedTemplate) {
      return {
        label: t('apsScheduling.cuttingIssuance.header.status.templateMatched'),
        className: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-700',
      }
    }

    return {
      label: t('apsScheduling.cuttingIssuance.header.status.matching'),
      className: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-700',
    }
  }, [compatibleTemplates.length, isLoading, selectedLine, selectedOrder, selectedTemplate, t])

  const templateMatchHint = !selectedLine
    ? t('apsScheduling.cuttingIssuance.feedback.templateHintAwaitingLine')
    : compatibleTemplates.length === 0
      ? t('apsScheduling.cuttingIssuance.feedback.templateHintNoTemplate')
      : compatibleTemplates.length === 1
        ? t('apsScheduling.cuttingIssuance.feedback.templateHintSingleTemplate')
        : t('apsScheduling.cuttingIssuance.feedback.templateHintMultipleTemplate', {
            count: compatibleTemplates.length,
          })

  const missingTemplateMessage =
    selectedLine && compatibleTemplates.length === 0
      ? t('apsScheduling.cuttingIssuance.feedback.missingTemplateMessage', {
          productModel: selectedLine.productModel,
          holeCount: selectedLine.holeCount || '--',
        })
      : null

  const canCreateExecution = Boolean(selectedOrder && selectedLine && selectedTemplate)

  const refreshExecutionAndTrace = () => {
    void executionsQuery.refetch()
    void traceReportQuery.refetch()
  }

  const handleCreateExecution = () => {
    createExecutionMutation.mutate()
  }

  return {
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
    isSubmittingExecution: createExecutionMutation.isPending,
    handleCreateExecution,
    refreshExecutionAndTrace,
  }
}
