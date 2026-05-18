/**
 * 切料计划主管理页(列表 + CRUD + 编辑器入口 + 失效告警)。
 *
 * 此页面是"切料计划"模块的总入口(/engineering-db/tabs/cutting-plan):
 *   - 列表展示所有切料计划,带状态/客户/产品筛选
 *   - 关联 CuttingPlanEditor(独立组件,本文件不实现编辑器)
 *   - 失效计划专项告警(InvalidCuttingPlanAlert)+ 失败原因分类
 *
 * 失效原因分类(getInvalidCuttingPlanFailure*):
 *   - filter:  规格名/型号匹配失效
 *   - group:   分组关联失效
 *   - status:  原料状态变更
 *
 * 数据/UI 解耦:
 *   - 数据层走 React Query(useMutation/useQuery/useQueryClient)
 *   - 编辑器/预览组件外置,本页面只负责"列表 + 入口 + 告警"三态
 */
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Layers3,
  Plus,
  Printer,
  Scissors,
  Search,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { isApiClientError } from '@/lib/api-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { CuttingPlanEditor } from '../components/cutting-plan-editor'
import {
  buildCuttingPlanInput,
  CuttingPlanPreparationError,
  EMPTY_CUTTING_PLAN_INPUT,
  prepareCuttingPlanForPersistence,
  type CuttingPlan,
  type CuttingPlanInput,
} from '../data/cutting-plan-schema'
import { useCuttingPlanImportExport } from '../hooks/use-cutting-plan-import-export'
import { ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY } from '../query-keys'
import {
  CuttingPlanService,
  type InvalidCuttingPlanFailureType,
  type InvalidCuttingPlanSummary,
} from '../services/cutting-plan-service'
import { CutSizeLibraryService } from '@/features/raw-materials/cut-size-library/services/cut-size-library-service'

const CUT_SIZE_OPTIONS_QUERY_KEY = ['raw-materials', 'cut-size-library', 'active-options'] as const

export function CuttingPlanTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CuttingPlan | null>(null)
  const [draft, setDraft] = useState<CuttingPlanInput>(EMPTY_CUTTING_PLAN_INPUT)
  const { downloadTemplate, parseExcel, exportPrint, previewPrint } = useCuttingPlanImportExport()

  const { data: listReadModel, isLoading } = useQuery({
    queryKey: ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY,
    queryFn: CuttingPlanService.listReadModel,
  })
  const plans = useMemo(() => listReadModel?.items ?? [], [listReadModel?.items])
  const invalidItems = useMemo(() => listReadModel?.invalidItems ?? [], [listReadModel?.invalidItems])
  const cutSizeQuery = useQuery({
    queryKey: CUT_SIZE_OPTIONS_QUERY_KEY,
    queryFn: () => CutSizeLibraryService.listActive(),
    staleTime: 5 * 60 * 1000,
  })
  const cutSizeUnits = cutSizeQuery.data ?? []

  const filteredPlans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return plans

    return plans.filter((plan) =>
      [
        plan.name,
        plan.productCode,
        plan.productName,
        plan.holeCount,
        plan.documentNo,
        plan.carbonFiberModel,
        plan.resinModel,
      ].some((value) => value?.toLowerCase().includes(keyword)),
    )
  }, [plans, searchTerm])

  const saveMutation = useMutation({
    mutationFn: (payload: CuttingPlanInput) =>
      CuttingPlanService.save(payload, { id: editingPlan?.id, cutSizeUnits }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY })
      toast.success(editingPlan ? t('engineering.cuttingPlan.toasts.saveUpdated') : t('engineering.cuttingPlan.toasts.saveCreated'))
      closeDialog()
    },
    onError: (error) => {
      if (error instanceof CuttingPlanPreparationError) {
        handlePreparationIssues(error)
        return
      }

      if (isApiClientError(error) && error.isConflict) {
        toast.error(t('engineering.cuttingPlan.toasts.conflict'))
        return
      }

      const message = error instanceof Error ? error.message : t('engineering.cuttingPlan.toasts.saveFailed')
      toast.error(t('engineering.cuttingPlan.toasts.saveFailed', { message }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CuttingPlanService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY })
      toast.success(t('engineering.cuttingPlan.toasts.deleteSuccess'))
    },
  })

  const activeCount = plans.filter((plan) => plan.status === 'Active').length
  const lineCount = plans.reduce((total, plan) => total + plan.lines.length, 0)

  const openCreate = () => {
    setEditingPlan(null)
    setDraft(EMPTY_CUTTING_PLAN_INPUT)
    setDialogOpen(true)
  }

  const openEdit = (plan: CuttingPlan) => {
    if (cutSizeQuery.isLoading) {
      toast.error('裁切尺寸库加载中，请稍后再编辑')
      return
    }

    setEditingPlan(plan)
    setDraft(buildCuttingPlanInput(plan, cutSizeUnits))
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingPlan(null)
    setDraft(EMPTY_CUTTING_PLAN_INPUT)
  }

  const handlePreparationIssues = (error: CuttingPlanPreparationError) => {
    const firstIssue = error.issues[0]
    if (!firstIssue) {
      toast.error(t('engineering.cuttingPlan.toasts.saveFailed', { message: 'Unknown preparation error' }))
      return
    }

    switch (firstIssue.kind) {
      case 'missing_product_binding':
        toast.error(t('engineering.cuttingPlan.toasts.productRequired'))
        return
      case 'missing_hole_count':
        toast.error(t('engineering.cuttingPlan.toasts.holeCountRequired'))
        return
      case 'name_generate_failed':
        toast.error(t('engineering.cuttingPlan.toasts.nameGenerateFailed'))
        return
      case 'empty_lines':
        toast.error(t('engineering.cuttingPlan.toasts.emptyLines'))
        return
      case 'missing_cut_size_binding':
        toast.error(`第 ${firstIssue.sequenceNo} 行未绑定尺寸库条目，裁纱单所有行必须引用尺寸库。`)
        return
      case 'missing_cut_size_unit':
        toast.error(`第 ${firstIssue.sequenceNo} 行引用的尺寸库条目不存在或未启用，请先修复尺寸库。`)
        return
    }
  }

  const preparePlanForOutput = (plan: CuttingPlanInput | CuttingPlan): CuttingPlanInput | null => {
    if (cutSizeQuery.isLoading) {
      toast.error('裁切尺寸库加载中，请稍后重试')
      return null
    }

    try {
      return prepareCuttingPlanForPersistence(plan, cutSizeUnits)
    } catch (error) {
      if (error instanceof CuttingPlanPreparationError) {
        handlePreparationIssues(error)
        return null
      }

      const message = error instanceof Error ? error.message : t('engineering.cuttingPlan.toasts.saveFailed')
      toast.error(t('engineering.cuttingPlan.toasts.saveFailed', { message }))
      return null
    }
  }

  const handlePreview = async (plan: CuttingPlanInput | CuttingPlan) => {
    const payload = preparePlanForOutput(plan)
    if (!payload) return
    await previewPrint(payload)
  }

  const handleExport = async (plan: CuttingPlanInput | CuttingPlan) => {
    const payload = preparePlanForOutput(plan)
    if (!payload) return
    await exportPrint(payload)
  }

  const handleSave = () => {
    if (cutSizeQuery.isLoading) {
      toast.error('裁切尺寸库加载中，请稍后重试')
      return
    }

    saveMutation.mutate(draft)
  }

  const handleImportFile = async (file: File) => {
    if (cutSizeQuery.isLoading) {
      toast.error('裁切尺寸库加载中，请稍后再导入')
      return
    }

    const parsed = await parseExcel(file, cutSizeUnits)
    if (!parsed) return
    setEditingPlan(null)
    setDraft(parsed)
    setDialogOpen(true)
  }

  return (
    <div className='flex animate-in flex-col gap-5 fade-in duration-700'>
      <IndustrialHeader
        icon={Scissors}
        title={t('engineering.cuttingPlan.overview.title')}
        description={t('engineering.cuttingPlan.overview.description')}
        gradient
        innerClassName='text-rose-600'
        className='border-muted-foreground/10'
        statusBadge={
          <div className='grid grid-cols-3 gap-2 text-center md:min-w-[360px]'>
            <Metric label={t('engineering.cuttingPlan.metrics.plans')} value={plans.length} />
            <Metric label={t('engineering.cuttingPlan.metrics.active')} value={activeCount} />
            <Metric label={t('engineering.cuttingPlan.metrics.lines')} value={lineCount} />
          </div>
        }
      />

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='relative w-full md:max-w-md'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('engineering.cuttingPlan.placeholders.search')}
            className='h-11 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-semibold shadow-inner'
          />
        </div>

        <div className='flex flex-wrap items-center justify-end gap-2'>
          <input
            ref={importInputRef}
            type='file'
            accept='.xlsx,.xls'
            className='hidden'
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleImportFile(file)
                event.target.value = ''
              }
            }}
          />
          <Button variant='outline' onClick={downloadTemplate} className='h-11 rounded-full px-5 text-xs font-black'>
            <Download className='size-4' />
            {t('engineering.cuttingPlan.actions.downloadTemplate')}
          </Button>
          <Button
            variant='outline'
            onClick={() => importInputRef.current?.click()}
            className='h-11 rounded-full px-5 text-xs font-black'
          >
            <Upload className='size-4' />
            {t('engineering.cuttingPlan.actions.importTemplate')}
          </Button>
          <Button onClick={openCreate} className='h-11 rounded-full px-6 text-xs font-black'>
            <Plus className='size-4' />
            {t('engineering.cuttingPlan.actions.create')}
          </Button>
        </div>
      </div>

      {invalidItems.length > 0 ? <InvalidCuttingPlanAlert invalidItems={invalidItems} t={t} /> : null}

      <div className='grid gap-3'>
        {isLoading ? (
          <div className='rounded-[24px] border border-dashed border-muted-foreground/15 p-10 text-center text-xs font-black tracking-widest text-muted-foreground'>
            {t('engineering.cuttingPlan.empty.loading')}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className='rounded-[24px] border border-dashed border-muted-foreground/15 p-12 text-center'>
            <p className='text-sm font-black'>{t('engineering.cuttingPlan.empty.title')}</p>
            <p className='mt-1 text-xs font-semibold text-muted-foreground'>
              {t('engineering.cuttingPlan.empty.description')}
            </p>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className='rounded-[24px] border border-dashed border-muted-foreground/15 bg-background p-4 shadow-sm'
            >
              <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                <button type='button' onClick={() => openEdit(plan)} className='min-w-0 flex-1 text-left'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-base font-black tracking-tight'>{plan.name}</span>
                    <Badge variant='outline' className='rounded-full border-dashed text-[10px] font-black'>
                      {getCuttingPlanStatusLabel(t, plan.status)}
                    </Badge>
                    {plan.documentNo ? (
                      <Badge className='rounded-full bg-primary/10 text-[10px] font-black text-primary'>
                        {plan.documentNo}
                      </Badge>
                    ) : null}
                  </div>
                  <div className='mt-2 grid gap-2 text-xs font-semibold text-muted-foreground md:grid-cols-4'>
                    <Info
                      icon={FileSpreadsheet}
                      label={t('engineering.cuttingPlan.fields.product')}
                      value={
                        plan.holeCount
                          ? `${plan.productName || plan.productCode || '--'} / ${t('engineering.cuttingPlan.values.holeCount', { count: plan.holeCount })}`
                          : (plan.productName || plan.productCode || '--')
                      }
                    />
                    <Info
                      icon={CalendarDays}
                      label={t('engineering.cuttingPlan.fields.revisionEffective')}
                      value={`${plan.revisionNo || '--'} / ${plan.effectiveDate || '--'}`}
                    />
                    <Info icon={Layers3} label={t('engineering.cuttingPlan.fields.material')} value={plan.carbonFiberModel || '--'} />
                    <Info icon={Scissors} label={t('engineering.cuttingPlan.fields.lineCount')} value={t('engineering.cuttingPlan.values.lineCount', { count: plan.lines.length })} />
                  </div>
                </button>

                <div className='flex flex-wrap items-center justify-end gap-1.5'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => void handlePreview(plan)}
                    className='h-8 rounded-full px-3 text-[11px] font-black'
                  >
                    <Printer className='size-3.5' />
                    {t('engineering.cuttingPlan.actions.previewPrint')}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => void handleExport(plan)}
                    className='h-8 rounded-full px-3 text-[11px] font-black'
                  >
                    <Download className='size-3.5' />
                    {t('engineering.cuttingPlan.actions.downloadPrint')}
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => deleteMutation.mutate(plan.id)}
                    disabled={deleteMutation.isPending}
                    className='rounded-full text-muted-foreground hover:text-destructive'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='flex h-[85vh] w-[min(96vw,1500px)] flex-col overflow-hidden rounded-[32px] p-0 sm:max-w-[1500px]'>
          <DialogHeader className='border-b border-dashed border-muted-foreground/15 px-6 py-5'>
            <DialogTitle className='flex items-center gap-2 text-xl font-black italic tracking-tighter'>
              <Scissors className='size-5 text-primary' />
              {editingPlan ? t('engineering.cuttingPlan.dialog.editTitle') : t('engineering.cuttingPlan.dialog.createTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5'>
            <CuttingPlanEditor value={draft} onChange={setDraft} />
          </div>

          <DialogFooter className='border-t border-dashed border-muted-foreground/15 px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end'>
            <Button
              variant='outline'
              onClick={() => void handlePreview(draft)}
              className='rounded-full px-5 font-black'
            >
              <Printer className='size-4' />
              {t('engineering.cuttingPlan.actions.previewPrint')}
            </Button>
            <Button
              variant='outline'
              onClick={() => void handleExport(draft)}
              className='rounded-full px-5 font-black'
            >
              <Download className='size-4' />
              {t('engineering.cuttingPlan.actions.downloadPrint')}
            </Button>
            <Button variant='outline' onClick={closeDialog} className='rounded-full px-6 font-black'>
              {t('engineering.cuttingPlan.actions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className='rounded-full px-8 font-black'>
              {saveMutation.isPending ? `${t('engineering.cuttingPlan.actions.save')}...` : t('engineering.cuttingPlan.actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getInvalidCuttingPlanFailureFilterLabel(
  t: ReturnType<typeof useLanguage>['t'],
  failureType: InvalidCuttingPlanFailureType,
  count: number
) {
  switch (failureType) {
    case 'missing_required_fields':
      return t('engineering.cuttingPlan.alerts.failureTypes.missing_required_fields', { count })
    case 'invalid_lines':
      return t('engineering.cuttingPlan.alerts.failureTypes.invalid_lines', { count })
    case 'schema_mismatch':
      return t('engineering.cuttingPlan.alerts.failureTypes.schema_mismatch', { count })
    case 'unknown_invalid_payload':
      return t('engineering.cuttingPlan.alerts.failureTypes.unknown_invalid_payload', { count })
  }
}

function getInvalidCuttingPlanFailureGroupLabel(
  t: ReturnType<typeof useLanguage>['t'],
  failureType: InvalidCuttingPlanFailureType,
) {
  switch (failureType) {
    case 'missing_required_fields':
      return t('engineering.cuttingPlan.alerts.failureGroups.missing_required_fields')
    case 'invalid_lines':
      return t('engineering.cuttingPlan.alerts.failureGroups.invalid_lines')
    case 'schema_mismatch':
      return t('engineering.cuttingPlan.alerts.failureGroups.schema_mismatch')
    case 'unknown_invalid_payload':
      return t('engineering.cuttingPlan.alerts.failureGroups.unknown_invalid_payload')
  }
}

function getCuttingPlanStatusLabel(
  t: ReturnType<typeof useLanguage>['t'],
  status: CuttingPlan['status']
) {
  if (status === 'Active') {
    return t('engineering.cuttingPlan.status.active')
  }
  if (status === 'Archived') {
    return t('engineering.cuttingPlan.status.archived')
  }
  return t('engineering.cuttingPlan.status.draft')
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-2xl border border-dashed border-muted/60 bg-background/70 p-3'>
      <div className='text-2xl font-black tabular-nums'>{value}</div>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground'>{label}</div>
    </div>
  )
}

function InvalidCuttingPlanAlert({
  invalidItems,
  t,
}: {
  invalidItems: InvalidCuttingPlanSummary[]
  t: ReturnType<typeof useLanguage>['t']
}) {
  const [selectedFailureType, setSelectedFailureType] = useState<'all' | InvalidCuttingPlanFailureType>('all')

  const groupedInvalidItems = useMemo(() => {
    const result = new Map<InvalidCuttingPlanFailureType, InvalidCuttingPlanSummary[]>()

    invalidItems.forEach((item) => {
      const bucket = result.get(item.failureType)
      if (bucket) {
        bucket.push(item)
        return
      }

      result.set(item.failureType, [item])
    })

    return result
  }, [invalidItems])

  const availableFailureTypes = useMemo(
    () => Array.from(groupedInvalidItems.keys()),
    [groupedInvalidItems],
  )

  const effectiveFailureType =
    selectedFailureType === 'all' || availableFailureTypes.includes(selectedFailureType)
      ? selectedFailureType
      : 'all'

  const filteredInvalidItems = useMemo(() => {
    if (effectiveFailureType === 'all') return invalidItems
    return invalidItems.filter((item) => item.failureType === effectiveFailureType)
  }, [effectiveFailureType, invalidItems])

  const filteredGroupedEntries = useMemo(() => {
    if (effectiveFailureType === 'all') {
      return availableFailureTypes.map((failureType) => ({
        failureType,
        items: groupedInvalidItems.get(failureType) ?? [],
      }))
    }

    return [
      {
        failureType: effectiveFailureType,
        items: filteredInvalidItems,
      },
    ]
  }, [availableFailureTypes, effectiveFailureType, filteredInvalidItems, groupedInvalidItems])

  return (
    <div className='relative overflow-hidden rounded-[24px] border border-dashed border-amber-500/40 bg-amber-500/5'>
      <div className='absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-transparent' />
      <div className='relative flex flex-col gap-4 p-5'>
        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='size-4 shrink-0 text-amber-600' />
              <div className='text-sm font-black italic tracking-tighter text-amber-700'>
                {t('engineering.cuttingPlan.alerts.invalidRecordsTitle', { count: invalidItems.length })}
              </div>
            </div>
            <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-amber-700/70'>
              {t('engineering.cuttingPlan.alerts.invalidRecordsDescription')}
            </p>
          </div>
          <Badge className='h-5 rounded-full bg-amber-500/10 px-2.5 text-[8px] font-mono text-amber-700'>
            {t('engineering.cuttingPlan.alerts.invalidRecordsBadge', { count: invalidItems.length })}
          </Badge>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant={effectiveFailureType === 'all' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setSelectedFailureType('all')}
            className='h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest'
          >
            {t('engineering.cuttingPlan.alerts.filters.all', { count: invalidItems.length })}
          </Button>
          {availableFailureTypes.map((failureType) => {
            const groupItems = groupedInvalidItems.get(failureType) ?? []
            return (
              <Button
                key={failureType}
                type='button'
                variant={effectiveFailureType === failureType ? 'default' : 'outline'}
                size='sm'
                onClick={() => setSelectedFailureType(failureType)}
                className='h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest'
              >
                {getInvalidCuttingPlanFailureFilterLabel(t, failureType, groupItems.length)}
              </Button>
            )
          })}
        </div>

        {filteredInvalidItems.length === 0 ? (
          <div className='rounded-[20px] border border-dashed border-amber-500/30 bg-background/70 p-6 text-center text-[10px] font-black uppercase tracking-widest text-amber-700'>
            {t('engineering.cuttingPlan.alerts.emptyFilteredResults')}
          </div>
        ) : (
          <div className='grid max-h-72 gap-4 overflow-y-auto pr-1'>
            {filteredGroupedEntries.map(({ failureType, items }) => (
              <div key={failureType} className='grid gap-3'>
                <div className='flex items-center justify-between gap-3 rounded-[20px] border border-dashed border-amber-500/25 bg-background/60 px-4 py-3'>
                  <div className='text-sm font-black italic tracking-tighter text-amber-700'>
                    {getInvalidCuttingPlanFailureGroupLabel(t, failureType)}
                  </div>
                  <Badge className='h-5 rounded-full bg-amber-500/10 px-2.5 text-[8px] font-mono text-amber-700'>
                    {t('engineering.cuttingPlan.alerts.failureGroupCount', { count: items.length })}
                  </Badge>
                </div>

                {items.map((item) => (
                  <div
                    key={item.specId}
                    className='rounded-[20px] border border-dashed border-amber-500/30 bg-background/80 p-4'
                  >
                    <div className='flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-black text-foreground'>{item.displayName}</div>
                        <div className='mt-1 flex flex-wrap gap-2'>
                          <Badge variant='outline' className='rounded-full border-dashed text-[8px] font-mono'>
                            {t('engineering.cuttingPlan.alerts.invalidRecordCode', { code: item.specCode })}
                          </Badge>
                          <Badge variant='outline' className='rounded-full border-dashed text-[8px] font-mono'>
                            {t('engineering.cuttingPlan.alerts.invalidRecordId', { id: item.specId })}
                          </Badge>
                        </div>
                      </div>
                      <div className='max-w-full rounded-2xl bg-amber-500/10 px-3 py-2 text-[10px] font-black tracking-wide text-amber-700 md:max-w-[50%]'>
                        {item.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className='text-[9px] font-black uppercase tracking-widest text-amber-700/70'>
          {t('engineering.cuttingPlan.alerts.invalidRecordsHint')}
        </div>
      </div>
    </div>
  )
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className='flex min-w-0 items-center gap-2 rounded-2xl bg-muted/30 px-3 py-2'>
      <Icon className='size-4 shrink-0 text-primary/60' />
      <div className='min-w-0'>
        <div className='text-[9px] font-black tracking-widest text-muted-foreground'>{label}</div>
        <div className='truncate text-xs font-black text-foreground'>{value}</div>
      </div>
    </div>
  )
}
