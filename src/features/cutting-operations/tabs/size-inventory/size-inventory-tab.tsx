'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Plus, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import {
  type CutSizeUnit,
} from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { formatCutSizeExpression } from '@/features/raw-materials/cut-size-library/domain/cut-size-geometry'
import { CutSizeLibraryService } from '@/features/raw-materials/cut-size-library/services/cut-size-library-service'
import { getCuttingOperationTabs } from '@/features/cutting-operations/tab-config'
import {
  CutSizeInventoryService,
  type RecordCutSizeInventoryInput,
} from './size-inventory-service'

const CUTTING_SIZE_INVENTORY_QUERY_KEY = [
  'cutting-operations',
  'size-inventory',
  'cut-size-library',
] as const

const CUTTING_SIZE_INVENTORY_RECORDS_QUERY_KEY = [
  'cutting-operations',
  'size-inventory',
  'records',
] as const

function statusClass(status: CutSizeUnit['status']): string {
  if (status === 'Active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'Inactive') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

const STATUS_LABEL_KEY = {
  Active: 'cuttingOperations.sizeInventory.status.Active',
  Inactive: 'cuttingOperations.sizeInventory.status.Inactive',
  Archived: 'cuttingOperations.sizeInventory.status.Archived',
} as const

export function CuttingSizeInventoryTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')

  const { data = [], isLoading, error } = useQuery({
    queryKey: CUTTING_SIZE_INVENTORY_QUERY_KEY,
    queryFn: () => CutSizeLibraryService.list(''),
  })
  const {
    data: inventoryRecords = [],
    isLoading: isInventoryLoading,
    error: inventoryError,
  } = useQuery({
    queryKey: CUTTING_SIZE_INVENTORY_RECORDS_QUERY_KEY,
    queryFn: () => CutSizeInventoryService.list(),
  })

  const activeUnits = useMemo(
    () => data.filter((item) => item.status === 'Active'),
    [data],
  )

  const inventoryByUnitId = useMemo(
    () =>
      new Map(
        inventoryRecords.map((record) => [record.cutSizeUnitId, record]),
      ),
    [inventoryRecords],
  )

  const usageTypeCount = useMemo(() => {
    const types = new Set(
      data.map((item) => item.usageType.trim()).filter((item) => item.length > 0)
    )
    return types.size
  }, [data])

  const selectedUnit = useMemo(
    () => data.find((item) => item.id === selectedUnitId) ?? null,
    [data, selectedUnitId],
  )

  const recordMutation = useMutation({
    mutationFn: (input: RecordCutSizeInventoryInput) =>
      CutSizeInventoryService.record(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CUTTING_SIZE_INVENTORY_RECORDS_QUERY_KEY,
      })
      toast.success(t('cuttingOperations.sizeInventory.toasts.recordSuccess'))
      setDialogOpen(false)
      setSelectedUnitId('')
      setQuantity('')
      setLocation('')
      setRemarks('')
    },
  })

  const openRecordDialog = () => {
    if (activeUnits.length === 0) {
      toast.error(t('cuttingOperations.sizeInventory.toasts.noActiveUnit'))
      return
    }
    setDialogOpen(true)
  }

  const handleRecordInventory = () => {
    if (!selectedUnit) {
      toast.error(t('cuttingOperations.sizeInventory.toasts.selectUnit'))
      return
    }
    const parsedQuantity = Number(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error(t('cuttingOperations.sizeInventory.toasts.invalidQuantity'))
      return
    }

    recordMutation.mutate({
      cutSizeUnitId: selectedUnit.id,
      cutSizeCode: selectedUnit.code,
      cutSizeName: selectedUnit.name,
      quantity: parsedQuantity,
      unit: 'pcs',
      location: location.trim(),
      remarks: remarks.trim(),
    })
  }

  const tableError = error ?? inventoryError
  const tableLoading = isLoading || isInventoryLoading

  return (
    <ModuleTabbedLayout
      title={t('sidebar.items.cuttingOperations')}
      tabs={getCuttingOperationTabs(t)}
    >
      <div className='flex animate-in flex-col gap-5 fade-in duration-700'>
        <IndustrialHeader
          icon={Archive}
          title={t('cuttingOperations.sizeInventory.header.title')}
          description={t('cuttingOperations.sizeInventory.header.description')}
          gradient
        />

        <div className='grid gap-2 md:grid-cols-3'>
          <Card className='rounded-xl border border-slate-200 shadow-none'>
            <CardContent className='flex min-h-10 items-center justify-between gap-3 px-3 py-2'>
              <p className='truncate text-xs font-bold text-muted-foreground'>
                {t('cuttingOperations.sizeInventory.metrics.total')}
              </p>
              <p className='text-xl font-black tabular-nums leading-none text-slate-900'>
                {data.length}
              </p>
            </CardContent>
          </Card>
          <Card className='rounded-xl border border-slate-200 shadow-none'>
            <CardContent className='flex min-h-10 items-center justify-between gap-3 px-3 py-2'>
              <p className='truncate text-xs font-bold text-muted-foreground'>
                {t('cuttingOperations.sizeInventory.metrics.active')}
              </p>
              <p className='text-xl font-black tabular-nums leading-none text-slate-900'>
                {data.filter((item) => item.status === 'Active').length}
              </p>
            </CardContent>
          </Card>
          <Card className='rounded-xl border border-slate-200 shadow-none'>
            <CardContent className='flex min-h-10 items-center justify-between gap-3 px-3 py-2'>
              <p className='truncate text-xs font-bold text-muted-foreground'>
                {t('cuttingOperations.sizeInventory.metrics.usageTypes')}
              </p>
              <p className='text-xl font-black tabular-nums leading-none text-slate-900'>
                {usageTypeCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className='overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
          <CardContent className='p-0'>
            <div className='flex flex-col gap-3 border-b border-dashed border-muted/50 bg-background/55 px-5 py-4 md:flex-row md:items-center md:justify-between'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex size-8 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8'>
                  <Ruler className='size-4 text-primary/75' />
                </div>
                <p className='truncate text-[13px] font-black uppercase tracking-tight text-foreground md:text-sm'>
                  {t('cuttingOperations.sizeInventory.table.title')}
                </p>
              </div>
              <div className='flex shrink-0 items-center gap-3'>
                <p className='hidden max-w-md truncate text-[9px] font-black uppercase tracking-widest text-muted-foreground/55 md:block'>
                  {t('cuttingOperations.sizeInventory.table.hint')}
                </p>
                <Button
                  onClick={openRecordDialog}
                  className='h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10'
                >
                  <Plus className='size-4' />
                  {t('cuttingOperations.sizeInventory.actions.recordInventory')}
                </Button>
              </div>
            </div>
            {tableError ? (
              <div className='px-5 py-6 text-[11px] font-black uppercase tracking-widest text-rose-600'>
                {t('cuttingOperations.sizeInventory.table.error', {
                  message: tableError instanceof Error ? tableError.message : '--',
                })}
              </div>
            ) : null}
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[900px]'>
                <thead className='bg-muted/30'>
                  <tr>
                    <th className='px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('cuttingOperations.sizeInventory.table.columns.code')}</th>
                    <th className='px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('cuttingOperations.sizeInventory.table.columns.name')}</th>
                    <th className='px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('cuttingOperations.sizeInventory.table.columns.size')}</th>
                    <th className='px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('cuttingOperations.sizeInventory.table.columns.usage')}</th>
                    <th className='px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('cuttingOperations.sizeInventory.table.columns.sourceStatus')}</th>
                    <th className='px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('cuttingOperations.sizeInventory.table.columns.inventoryQty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLoading ? (
                    <tr>
                      <td className='px-5 py-8 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/35' colSpan={6}>
                        {t('cuttingOperations.sizeInventory.table.loading')}
                      </td>
                    </tr>
                  ) : null}
                  {!tableLoading && data.length === 0 ? (
                    <tr>
                      <td className='px-5 py-8 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/35' colSpan={6}>
                        {t('cuttingOperations.sizeInventory.table.empty')}
                      </td>
                    </tr>
                  ) : null}
                  {!tableLoading
                    ? data.map((item) => {
                        const inventory = inventoryByUnitId.get(item.id)
                        return (
                          <tr
                            key={item.id}
                            className='border-t border-dashed border-muted/50 align-top transition-colors hover:bg-background/55'
                          >
                            <td className='px-5 py-3.5 align-top font-mono text-[11px] font-black tracking-wide text-foreground'>
                              {item.code || '--'}
                            </td>
                            <td className='px-5 py-3.5 align-top text-[12px] font-bold text-foreground/85'>{item.name || '--'}</td>
                            <td className='px-5 py-3.5 align-top text-[12px] font-bold text-foreground/80'>
                              {formatCutSizeExpression(item) || '--'}
                            </td>
                            <td className='px-5 py-3.5 align-top text-[12px] font-bold text-foreground/75'>
                              {item.usageType || '--'}
                            </td>
                            <td className='px-5 py-3.5 align-top'>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass(item.status)}`}
                              >
                                {t(STATUS_LABEL_KEY[item.status])}
                              </span>
                            </td>
                            <td className='px-5 py-3.5 align-top'>
                              <div className='text-sm font-black tabular-nums leading-none text-foreground'>
                                {(inventory?.quantity ?? 0).toLocaleString()} {inventory?.unit || 'pcs'}
                              </div>
                              <div className='mt-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/45'>
                                {inventory
                                  ? inventory.location || t('cuttingOperations.sizeInventory.table.noLocation')
                                  : t('cuttingOperations.sizeInventory.table.noInventory')}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className='rounded-[24px] sm:max-w-[640px]'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-lg font-black tracking-tight'>
                <Archive className='size-5 text-primary' />
                {t('cuttingOperations.sizeInventory.dialog.title')}
              </DialogTitle>
            </DialogHeader>

            <div className='grid gap-4'>
              <div className='grid gap-2'>
                <Label className='text-xs font-black text-muted-foreground'>
                  {t('cuttingOperations.sizeInventory.dialog.unit')}
                </Label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className='h-11 rounded-xl'>
                    <SelectValue
                      placeholder={t('cuttingOperations.sizeInventory.dialog.unitPlaceholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {activeUnits.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} / {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUnit ? (
                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700'>
                  <div className='font-black text-slate-900'>
                    {selectedUnit.code} / {selectedUnit.name}
                  </div>
                  <div className='mt-1'>
                    {formatCutSizeExpression(selectedUnit) || '--'}
                  </div>
                  <div className='mt-1 text-muted-foreground'>
                    {selectedUnit.usageType || '--'}
                  </div>
                </div>
              ) : null}

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label className='text-xs font-black text-muted-foreground'>
                    {t('cuttingOperations.sizeInventory.dialog.quantity')}
                  </Label>
                  <Input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    inputMode='decimal'
                    placeholder='0'
                    className='h-11 rounded-xl'
                  />
                </div>
                <div className='grid gap-2'>
                  <Label className='text-xs font-black text-muted-foreground'>
                    {t('cuttingOperations.sizeInventory.dialog.location')}
                  </Label>
                  <Input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder={t('cuttingOperations.sizeInventory.dialog.locationPlaceholder')}
                    className='h-11 rounded-xl'
                  />
                </div>
              </div>

              <div className='grid gap-2'>
                <Label className='text-xs font-black text-muted-foreground'>
                  {t('cuttingOperations.sizeInventory.dialog.remarks')}
                </Label>
                <Textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder={t('cuttingOperations.sizeInventory.dialog.remarksPlaceholder')}
                  className='min-h-20 resize-none rounded-xl'
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setDialogOpen(false)}
                className='rounded-full px-6 font-black'
              >
                {t('cuttingOperations.sizeInventory.dialog.cancel')}
              </Button>
              <Button
                onClick={handleRecordInventory}
                disabled={recordMutation.isPending}
                className='rounded-full px-8 font-black'
              >
                {recordMutation.isPending
                  ? t('cuttingOperations.sizeInventory.dialog.saving')
                  : t('cuttingOperations.sizeInventory.dialog.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleTabbedLayout>
  )
}
