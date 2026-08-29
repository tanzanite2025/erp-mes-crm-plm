'use client'

import { useCallback, useMemo } from 'react'
import {
  CalendarClock,
  Landmark,
  Save,
  Tag,
  Box,
  Info,
  Target,
  Route,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { SelectDropdown } from '@/components/select-dropdown'
import { useProductDisplayOptions } from '@/features/engineering/hooks/use-product-display-options'
import {
  useProductionProcessesQuery,
  useProductionRoutesQuery,
} from '@/features/production-shared/hooks/use-production-resources'
import { useProductionTopologyLabels } from '@/features/production-shared/topology/production-topology-labels'
import type { PieceworkRate } from '../data/schema'

interface RateActionDialogProps {
  currentRow?: PieceworkRate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: PieceworkRate
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => void
  isLoading?: boolean
}

const DEFAULT_RATE: Partial<PieceworkRate> = {
  productId: '',
  processStepId: '',
  routeStepId: '',
  processName: '',
  unitPrice: 0,
  unit: 'PCS',
  currency: 'CNY',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'active',
  remarks: '',
  version: 1,
}

export function RateActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: RateActionDialogProps) {
  const { t } = useLanguage()
  const { level3Name } = useProductionTopologyLabels()
  const { productOptions } = useProductDisplayOptions({ enabled: open })
  const processesQuery = useProductionProcessesQuery({ enabled: open })
  const routesQuery = useProductionRoutesQuery({ enabled: open })

  const processOptions = useMemo(
    () =>
      (processesQuery.data ?? []).map((process) => ({
        label: process.code
          ? `${process.code} · ${process.name}`
          : process.name,
        value: process.id,
      })),
    [processesQuery.data]
  )

  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[600px] rounded-[32px] overflow-hidden',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title:
      'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer:
      'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const isEdit = !!currentRow
  const initialFormData = useMemo(() => {
    if (currentRow) return currentRow
    return {
      ...DEFAULT_RATE,
      // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
      id: '',
    } as PieceworkRate
  }, [currentRow])

  const {
    data: formData,
    tracker,
    isDirty,
  } = useDeltaTracker(initialFormData, open)

  const routeStepOptions = useMemo(() => {
    const productId = formData.productId
    return (routesQuery.data ?? [])
      .filter((route) => !productId || route.productId === productId)
      .flatMap((route) =>
        route.steps.map((step) => ({
          label: `${route.code} · ${step.sequence}. ${step.processName || step.processCode || step.processStepId}`,
          value: step.id,
          processStepId: step.processStepId,
        }))
      )
  }, [formData.productId, routesQuery.data])

  const setFormData = useCallback(
    (
      updater: Partial<PieceworkRate> | ((prev: PieceworkRate) => PieceworkRate)
    ) => {
      if (typeof updater === 'function') {
        Object.assign(formData, updater(formData))
        return
      }

      Object.assign(formData, updater)
    },
    [formData]
  )

  const handleSave = () => {
    // Fail Loudly: 必须检查必要字段
    if (
      !formData.productId ||
      !formData.processStepId ||
      formData.unitPrice === undefined
    ) {
      toast.error(
        t('piecework.rules.toast.validationRequired', { levelName: level3Name })
      )
      return
    }

    if (isEdit && currentRow) {
      const delta = tracker.commit()
      // 如果没有变化且处于编辑模式，直接关闭
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }
      onSave({
        data: formData,
        isPatch: true,
        delta,
        version: currentRow.version,
      })
    } else {
      onSave({ data: formData, isPatch: false })
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <div className='rounded-xl bg-emerald-500/10 p-2'>
            <Landmark className='size-5 text-emerald-500' />
          </div>
          {isEdit
            ? t('piecework.rules.dialog.titleEdit')
            : t('piecework.rules.dialog.titleCreate')}
        </>
      }
      description={t('piecework.rules.dialog.description', {
        levelName: level3Name,
      })}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <p className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
            <span className='inline-block size-1.5 animate-pulse rounded-full bg-emerald-500' />
            {t('piecework.rules.dialog.footerTracking')}
          </p>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              {t('piecework.rules.dialog.cancel')}
            </Button>
            <Button
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave}
              className='h-11 gap-2 rounded-full bg-emerald-600 px-10 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95'
            >
              {isLoading ? (
                <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              ) : (
                <Save className='size-4' />
              )}
              {t('piecework.rules.dialog.save')}
            </Button>
          </div>
        </>
      }
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent' />

      <div className='relative grid gap-8'>
        {/* 产品关联 */}
        <div className='space-y-2'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
            <Box className='size-3' />{' '}
            {t('piecework.rules.dialog.fields.product')}
          </Label>
          <SelectDropdown
            value={formData.productId}
            isControlled
            onValueChange={(val) => {
              setFormData({
                productId: val,
                routeStepId: '',
                processStepId: '',
                processCode: '',
                processName: '',
              })
            }}
            items={productOptions}
            placeholder={t('piecework.rules.dialog.placeholders.product')}
            className='h-12 rounded-2xl border-none bg-muted/40 px-4 text-sm font-bold italic shadow-inner'
          />
        </div>

        {/* 作业身份与单价组 */}
        <div className='grid grid-cols-2 gap-6 rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/20 p-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
              <Target className='size-3' />{' '}
              {t('piecework.rules.dialog.fields.processStep')}
            </Label>
            <SelectDropdown
              value={formData.processStepId}
              isControlled
              onValueChange={(val) => {
                const selected = processesQuery.data?.find(
                  (process) => process.id === val
                )
                setFormData({
                  processStepId: val,
                  routeStepId: '',
                  processCode: selected?.code || '',
                  processName: selected?.name || '',
                })
              }}
              items={processOptions}
              isPending={processesQuery.isPending}
              placeholder={t('piecework.rules.dialog.placeholders.processStep')}
              className='h-12 rounded-2xl border-none bg-background px-4 text-sm font-bold shadow-sm'
            />
          </div>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
              <Route className='size-3' />{' '}
              {t('piecework.rules.dialog.fields.routeStep')}
            </Label>
            <SelectDropdown
              value={formData.routeStepId}
              isControlled
              onValueChange={(val) => {
                const selected = routeStepOptions.find(
                  (step) => step.value === val
                )
                setFormData({
                  routeStepId: val,
                  ...(selected?.processStepId
                    ? {
                        processStepId: selected.processStepId,
                        processCode:
                          processesQuery.data?.find(
                            (process) => process.id === selected.processStepId
                          )?.code || '',
                        processName:
                          processesQuery.data?.find(
                            (process) => process.id === selected.processStepId
                          )?.name || '',
                      }
                    : {}),
                })
              }}
              items={routeStepOptions}
              isPending={routesQuery.isPending}
              placeholder={t('piecework.rules.dialog.placeholders.routeStep')}
              className='h-12 rounded-2xl border-none bg-background px-4 text-sm font-bold shadow-sm'
            />
          </div>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
              <Tag className='size-3' />{' '}
              {t('piecework.rules.dialog.fields.unitPrice')}
            </Label>
            <Input
              type='number'
              step='0.0001'
              min='0'
              placeholder={t('piecework.rules.dialog.placeholders.unitPrice')}
              className='h-12 rounded-2xl border-none bg-background px-5 font-mono text-sm font-black shadow-sm'
              value={formData.unitPrice}
              onChange={(e) => {
                setFormData({ unitPrice: parseFloat(e.target.value) || 0 })
              }}
            />
          </div>
        </div>

        {/* 单位与状态 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black tracking-widest uppercase'>
              {t('piecework.rules.dialog.fields.unit')}
            </Label>
            <Input
              placeholder={t('piecework.rules.dialog.placeholders.unit')}
              className='h-11 rounded-2xl border-none bg-muted/40 px-5 text-xs font-bold'
              value={formData.unit}
              onChange={(e) => {
                setFormData({ unit: e.target.value })
              }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black tracking-widest uppercase'>
              {t('piecework.rules.dialog.fields.status')}
            </Label>
            <SelectDropdown
              defaultValue={formData.status}
              onValueChange={(val) => {
                setFormData({ status: val as 'active' | 'inactive' })
              }}
              items={[
                { label: t('piecework.rules.status.active'), value: 'active' },
                {
                  label: t('piecework.rules.status.inactive'),
                  value: 'inactive',
                },
              ]}
              className='h-11 rounded-2xl border-none bg-muted/40 px-4 text-xs font-bold shadow-inner'
            />
          </div>
        </div>

        {/* 生效区间 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
              <CalendarClock className='size-3' />{' '}
              {t('piecework.rules.dialog.fields.effectiveFrom')}
            </Label>
            <Input
              type='date'
              value={toDateInputValue(formData.effectiveFrom)}
              onChange={(e) => {
                setFormData({ effectiveFrom: e.target.value })
              }}
              className='h-11 rounded-2xl border-none bg-muted/40 px-5 text-xs font-bold'
            />
          </div>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
              <CalendarClock className='size-3' />{' '}
              {t('piecework.rules.dialog.fields.effectiveTo')}
            </Label>
            <Input
              type='date'
              value={toDateInputValue(formData.effectiveTo)}
              onChange={(e) => {
                setFormData({ effectiveTo: e.target.value })
              }}
              className='h-11 rounded-2xl border-none bg-muted/40 px-5 text-xs font-bold'
            />
          </div>
        </div>

        {/* 备注 */}
        <div className='space-y-2'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
            <Info className='size-3' />{' '}
            {t('piecework.rules.dialog.fields.remarks')}
          </Label>
          <Input
            placeholder={t('piecework.rules.dialog.placeholders.remarks')}
            className='h-11 rounded-2xl border-none bg-muted/40 px-5 text-xs font-medium'
            value={formData.remarks || ''}
            onChange={(e) => {
              setFormData({ remarks: e.target.value })
            }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}

function toDateInputValue(value?: string) {
  return value ? value.slice(0, 10) : ''
}
