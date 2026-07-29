import { type FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TranslationKey } from '@/locales'
import { ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toOutsourceOrderFormValues } from '../adapters/outsource-order-api-adapter'
import {
  createEmptyOutsourceOrderLine,
  outsourceOrderSourceTypes,
  type OutsourceOrder,
  type OutsourceOrderFormValues,
  type OutsourceOrderLineFormValues,
  type OutsourceOrderSourceType,
} from '../data/outsource-order'
import type { OutsourcePartner } from '../data/outsource-partner'
import {
  getOutsourceProductionPlanSourceOptions,
  getOutsourceSalesOrderSourceOptions,
  type OutsourceProductionPlanSourceOption,
  type OutsourceSalesOrderLineSourceOption,
} from '../services/outsource-order-source-options-service'

const fieldLabelClass = 'text-xs font-medium text-muted-foreground'
const inputClass = 'h-10 rounded-xl text-sm'
const selectClass =
  'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
const textareaClass = 'min-h-20 rounded-xl text-sm'

interface OutsourceOrderDialogProps {
  open: boolean
  order: OutsourceOrder | null
  partners: OutsourcePartner[]
  isSaving?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: OutsourceOrderFormValues) => void
}

function normalizeLine(line: OutsourceOrderLineFormValues) {
  return {
    ...line,
    sourceLineId: line.sourceLineId.trim(),
    productId: line.productId.trim(),
    productCode: line.productCode.trim(),
    productName: line.productName.trim(),
    specification: line.specification.trim(),
    quantity: Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0,
    uom: line.uom.trim().toUpperCase(),
    segmentId: line.segmentId.trim(),
    segmentName: line.segmentName.trim(),
    processStepId: line.processStepId.trim(),
    processCode: line.processCode.trim(),
    processName: line.processName.trim(),
    notes: line.notes.trim(),
  }
}

function buildLineFromSalesLine(
  line: OutsourceSalesOrderLineSourceOption
): OutsourceOrderLineFormValues {
  return patchLineFromSalesLine(createEmptyOutsourceOrderLine(), line)
}

function patchLineFromSalesLine(
  current: OutsourceOrderLineFormValues,
  line: OutsourceSalesOrderLineSourceOption
): OutsourceOrderLineFormValues {
  return {
    ...current,
    sourceLineId: line.id,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    specification: line.specification,
    quantity: line.quantity,
    uom: line.uom,
  }
}

function patchLineFromProductionPlan(
  current: OutsourceOrderLineFormValues,
  plan: OutsourceProductionPlanSourceOption
): OutsourceOrderLineFormValues {
  return {
    ...current,
    sourceLineId: '',
    productId: plan.productId,
    productCode: '',
    productName: plan.productName,
    specification: '',
    quantity: plan.quantity,
    uom: plan.uom,
  }
}

export function OutsourceOrderDialog({
  open,
  order,
  partners,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: OutsourceOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <OutsourceOrderDialogContent
          key={order?.id ?? 'create'}
          order={order}
          partners={partners}
          isSaving={isSaving}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  )
}

function OutsourceOrderDialogContent({
  order,
  partners,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: Omit<OutsourceOrderDialogProps, 'open'>) {
  const { t } = useLanguage()
  const [values, setValues] = useState<OutsourceOrderFormValues>(
    toOutsourceOrderFormValues(order)
  )

  const salesOrdersQuery = useQuery({
    queryKey: ['production-outsourcing', 'source-options', 'sales-orders'],
    queryFn: getOutsourceSalesOrderSourceOptions,
    enabled: values.sourceType === 'SALES_ORDER',
  })
  const productionPlansQuery = useQuery({
    queryKey: ['production-outsourcing', 'source-options', 'production-plans'],
    queryFn: getOutsourceProductionPlanSourceOptions,
    enabled: values.sourceType === 'PRODUCTION_PLAN',
  })

  const sortedPartners = useMemo(
    () =>
      [...partners].sort((a, b) =>
        `${a.name}${a.code}`.localeCompare(`${b.name}${b.code}`)
      ),
    [partners]
  )
  const selectedSalesOrder = salesOrdersQuery.data?.find(
    (item) => item.id === values.sourceId
  )
  const selectedSalesLineIds = useMemo(
    () =>
      new Set(
        values.lines
          .map((line) => line.sourceLineId.trim())
          .filter((sourceLineId) => sourceLineId.length > 0)
      ),
    [values.lines]
  )
  const canAddLine =
    values.sourceType === 'SALES_ORDER' &&
    Boolean(selectedSalesOrder) &&
    values.lines.length < (selectedSalesOrder?.lines.length ?? 0)

  const updateValue = <K extends keyof OutsourceOrderFormValues>(
    key: K,
    value: OutsourceOrderFormValues[K]
  ) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const updateLine = (
    index: number,
    patch: Partial<OutsourceOrderLineFormValues>
  ) => {
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      ),
    }))
  }

  const addLine = () => {
    if (!canAddLine) {
      return
    }
    setValues((current) => ({
      ...current,
      lines: [...current.lines, createEmptyOutsourceOrderLine()],
    }))
  }

  const removeLine = (index: number) => {
    setValues((current) => ({
      ...current,
      lines:
        current.lines.length <= 1
          ? current.lines
          : current.lines.filter((_, lineIndex) => lineIndex !== index),
    }))
  }

  const changeSourceType = (sourceType: OutsourceOrderSourceType) => {
    setValues((current) => ({
      ...current,
      sourceType,
      sourceId: '',
      sourceNo: '',
      customerId: '',
      customerName: '',
      lines: [createEmptyOutsourceOrderLine()],
    }))
  }

  const selectSalesOrder = (sourceId: string) => {
    const selected = salesOrdersQuery.data?.find((item) => item.id === sourceId)
    if (!selected) {
      updateValue('sourceId', sourceId)
      return
    }
    setValues((current) => ({
      ...current,
      sourceId: selected.id,
      sourceNo: selected.orderNo,
      customerId: selected.customerId,
      customerName: selected.customerName,
      lines:
        selected.lines.length === 1
          ? [buildLineFromSalesLine(selected.lines[0])]
          : [createEmptyOutsourceOrderLine()],
    }))
  }

  const selectSalesOrderLine = (lineIndex: number, sourceLineId: string) => {
    const selectedLine = selectedSalesOrder?.lines.find(
      (item) => item.id === sourceLineId
    )
    if (!selectedLine) {
      updateLine(lineIndex, { sourceLineId })
      return
    }
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, index) =>
        index === lineIndex ? patchLineFromSalesLine(line, selectedLine) : line
      ),
    }))
  }

  const selectProductionPlan = (sourceId: string) => {
    const selected = productionPlansQuery.data?.find(
      (item) => item.id === sourceId
    )
    if (!selected) {
      updateValue('sourceId', sourceId)
      return
    }
    setValues((current) => ({
      ...current,
      sourceId: selected.id,
      sourceNo: selected.orderNo,
      customerId: '',
      customerName: '',
      lines: [
        patchLineFromProductionPlan(
          current.lines[0] ?? createEmptyOutsourceOrderLine(),
          selected
        ),
      ],
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized: OutsourceOrderFormValues = {
      ...values,
      orderNo: values.orderNo.trim().toUpperCase(),
      sourceId: values.sourceId.trim(),
      sourceNo: values.sourceNo.trim(),
      customerId: values.customerId.trim(),
      customerName: values.customerName.trim(),
      partnerId: values.partnerId.trim(),
      plannedSendDate: values.plannedSendDate.trim(),
      plannedReturnDate: values.plannedReturnDate.trim(),
      notes: values.notes.trim(),
      lines: values.lines.map(normalizeLine),
    }

    if (!normalized.partnerId) {
      toast.error(t('productionOutsourcing.orders.validation.partnerRequired'))
      return
    }
    if (!normalized.sourceId) {
      toast.error(t('productionOutsourcing.orders.validation.sourceRequired'))
      return
    }
    if (
      normalized.sourceType === 'SALES_ORDER' &&
      normalized.lines.some((line) => !line.sourceLineId)
    ) {
      toast.error(
        t('productionOutsourcing.orders.validation.sourceLineRequired')
      )
      return
    }
    if (
      normalized.sourceType === 'SALES_ORDER' &&
      new Set(normalized.lines.map((line) => line.sourceLineId)).size !==
        normalized.lines.length
    ) {
      toast.error(
        t('productionOutsourcing.orders.validation.sourceLineDuplicate')
      )
      return
    }
    if (
      normalized.sourceType === 'PRODUCTION_PLAN' &&
      normalized.lines.length !== 1
    ) {
      toast.error(
        t('productionOutsourcing.orders.validation.productionPlanSingleLine')
      )
      return
    }
    if (
      normalized.lines.some(
        (line) =>
          line.quantity <= 0 ||
          !line.uom ||
          (!line.productId && !line.productCode && !line.productName)
      )
    ) {
      toast.error(t('productionOutsourcing.orders.validation.lineRequired'))
      return
    }
    onSubmit(normalized)
  }

  return (
    <DialogContent
      size='6xl'
      className='max-h-[calc(100dvh-0.75rem)] max-w-[calc(100%-0.5rem)] rounded-2xl p-0 sm:max-w-[88rem]'
    >
      <DialogHeader className='border-b bg-muted/20 px-5 py-4 pr-10 sm:px-6'>
        <div className='flex items-center gap-3'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <ClipboardList className='size-4' />
          </div>
          <div>
            <DialogTitle className='text-lg font-semibold tracking-tight'>
              {order
                ? t('productionOutsourcing.orders.dialog.editTitle')
                : t('productionOutsourcing.orders.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='mt-1 text-sm'>
              {t('productionOutsourcing.orders.dialog.description')}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form className='space-y-4 px-5 py-4 sm:px-6' onSubmit={handleSubmit}>
        <div className='grid gap-4 md:grid-cols-12'>
          <div className='space-y-2 md:col-span-4'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.orders.fields.sourceType')}
            </Label>
            <select
              value={values.sourceType}
              onChange={(event) =>
                changeSourceType(event.target.value as OutsourceOrderSourceType)
              }
              className={selectClass}
            >
              {outsourceOrderSourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {t(
                    `productionOutsourcing.orders.sourceTypes.${sourceType}` as TranslationKey
                  )}
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-2 md:col-span-4'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.orders.fields.source')}
            </Label>
            {values.sourceType === 'SALES_ORDER' ? (
              <select
                value={values.sourceId}
                onChange={(event) => selectSalesOrder(event.target.value)}
                className={selectClass}
              >
                <option value=''>
                  {salesOrdersQuery.isLoading
                    ? t('common.actions.loading')
                    : t('productionOutsourcing.orders.placeholders.source')}
                </option>
                {(salesOrdersQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.orderNo} · {item.customerName} · {item.quantity}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={values.sourceId}
                onChange={(event) => selectProductionPlan(event.target.value)}
                className={selectClass}
              >
                <option value=''>
                  {productionPlansQuery.isLoading
                    ? t('common.actions.loading')
                    : t('productionOutsourcing.orders.placeholders.source')}
                </option>
                {(productionPlansQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.orderNo} · {item.productName} · {item.quantity}{' '}
                    {item.uom}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className='space-y-2 md:col-span-4'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.orders.fields.status')}
            </Label>
            <select
              value={values.status}
              disabled
              title={t('productionOutsourcing.orders.dialog.statusLocked')}
              className={selectClass}
            >
              {[
                'DRAFT',
                'RELEASED',
                'SENT',
                'IN_PROCESS',
                'RETURNED',
                'CLOSED',
                'CANCELED',
              ].map((status) => (
                <option key={status} value={status}>
                  {t(
                    `productionOutsourcing.orders.statuses.${status}` as TranslationKey
                  )}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-12'>
          <div className='space-y-2 md:col-span-4'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.orders.fields.orderNo')}
            </Label>
            <Input
              value={values.orderNo}
              onChange={(event) => updateValue('orderNo', event.target.value)}
              placeholder={t(
                'productionOutsourcing.orders.placeholders.orderNo'
              )}
              className={`${inputClass} font-mono uppercase`}
            />
          </div>
          <div className='space-y-2 md:col-span-4'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.orders.fields.partner')}
            </Label>
            <select
              value={values.partnerId}
              onChange={(event) => updateValue('partnerId', event.target.value)}
              className={selectClass}
            >
              <option value=''>
                {t('productionOutsourcing.orders.placeholders.partner')}
              </option>
              {sortedPartners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} · {partner.code}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-2 md:col-span-2'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.orders.fields.plannedSendDate')}
            </Label>
            <Input
              type='date'
              value={values.plannedSendDate}
              onChange={(event) =>
                updateValue('plannedSendDate', event.target.value)
              }
              className={inputClass}
            />
          </div>
          <div className='space-y-2 md:col-span-2'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.orders.fields.plannedReturnDate')}
            </Label>
            <Input
              type='date'
              value={values.plannedReturnDate}
              onChange={(event) =>
                updateValue('plannedReturnDate', event.target.value)
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className='space-y-3 rounded-2xl border bg-muted/10 p-3'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h4 className='text-sm font-semibold tracking-tight'>
                {t('productionOutsourcing.orders.dialog.linesTitle')}
              </h4>
              <p className='mt-1 text-xs text-muted-foreground'>
                {t('productionOutsourcing.orders.dialog.linesDescription')}
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!canAddLine}
              className='rounded-full'
              onClick={addLine}
            >
              <Plus className='mr-2 size-3.5' />
              {t('productionOutsourcing.orders.actions.addLine')}
            </Button>
          </div>

          <div className='space-y-3'>
            {values.lines.map((line, index) => (
              <div
                key={line.id ?? index}
                className='rounded-2xl border bg-background p-3 shadow-xs'
              >
                <div className='mb-3 flex items-center justify-between'>
                  <span className='text-sm font-semibold'>
                    {t('productionOutsourcing.orders.fields.lineNo', {
                      no: index + 1,
                    })}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    disabled={values.lines.length <= 1}
                    onClick={() => removeLine(index)}
                    className='h-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive'
                  >
                    <Trash2 className='mr-2 size-3.5' />
                    {t('common.actions.delete')}
                  </Button>
                </div>
                <div className='grid gap-3 md:grid-cols-10'>
                  {values.sourceType === 'SALES_ORDER' ? (
                    <div className='space-y-2 md:col-span-3'>
                      <Label className={fieldLabelClass}>
                        {t('productionOutsourcing.orders.fields.sourceLine')}
                      </Label>
                      <select
                        value={line.sourceLineId}
                        disabled={!selectedSalesOrder}
                        onChange={(event) =>
                          selectSalesOrderLine(index, event.target.value)
                        }
                        className={selectClass}
                      >
                        <option value=''>
                          {selectedSalesOrder
                            ? t(
                                'productionOutsourcing.orders.placeholders.sourceLine'
                              )
                            : t(
                                'productionOutsourcing.orders.placeholders.source'
                              )}
                        </option>
                        {(selectedSalesOrder?.lines ?? []).map((sourceLine) => (
                          <option
                            key={sourceLine.id || sourceLine.lineNo}
                            value={sourceLine.id}
                            disabled={
                              selectedSalesLineIds.has(sourceLine.id) &&
                              sourceLine.id !== line.sourceLineId
                            }
                          >
                            #{sourceLine.lineNo} ·{' '}
                            {sourceLine.productName || sourceLine.productCode} ·{' '}
                            {sourceLine.quantity} {sourceLine.uom}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className='space-y-2 md:col-span-3'>
                    <Label className={fieldLabelClass}>
                      {t('productionOutsourcing.orders.fields.productName')}
                    </Label>
                    <Input
                      value={line.productName}
                      readOnly
                      className={`${inputClass} bg-muted/30`}
                    />
                  </div>
                  <div className='space-y-2 md:col-span-2'>
                    <Label className={fieldLabelClass}>
                      {t('productionOutsourcing.orders.fields.specification')}
                    </Label>
                    <Input
                      value={line.specification}
                      readOnly
                      className={`${inputClass} bg-muted/30`}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-2 md:col-span-2'>
                    <div className='space-y-2'>
                      <Label className={fieldLabelClass}>
                        {t('productionOutsourcing.orders.fields.quantity')}
                      </Label>
                      <Input
                        type='number'
                        min={0}
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(index, {
                            quantity: Number(event.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label className={fieldLabelClass}>
                        {t('productionOutsourcing.orders.fields.uom')}
                      </Label>
                      <Input
                        value={line.uom}
                        readOnly
                        className={`${inputClass} bg-muted/30 uppercase`}
                      />
                    </div>
                  </div>
                </div>

                <div className='mt-3 space-y-2'>
                  <Label className={fieldLabelClass}>
                    {t('productionOutsourcing.orders.fields.lineNotes')}
                  </Label>
                  <Input
                    value={line.notes}
                    onChange={(event) =>
                      updateLine(index, { notes: event.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label className={fieldLabelClass}>
            {t('productionOutsourcing.orders.fields.notes')}
          </Label>
          <Textarea
            value={values.notes}
            onChange={(event) => updateValue('notes', event.target.value)}
            className={textareaClass}
          />
        </div>

        <DialogFooter className='border-t pt-4'>
          <Button
            type='button'
            variant='outline'
            className='rounded-full'
            onClick={() => onOpenChange(false)}
          >
            {t('common.actions.cancel')}
          </Button>
          <Button type='submit' disabled={isSaving} className='rounded-full'>
            {isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            {t('common.actions.save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
