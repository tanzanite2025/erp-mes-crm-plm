import { useEffect, useMemo, useState } from 'react'
import { type z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Truck, Save } from 'lucide-react'
import { type DeltaSet } from '@/lib/delta/types'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { UdsHealthProgress } from '@/components/uds/uds-health-progress'
import {
  type EquipmentPartner,
  type Mold,
  type MoldLoan,
  moldLoanSchema,
} from '../data/schema'
import { AssetService } from '../services/asset-service'
import { prepareTrackedDialogSubmit } from '../utils/tracked-dialog-submit'
import { ImageUpload } from './image-upload'

type LoanMode = 'LEND' | 'BORROW'

type MoldLoanFormInput = z.input<typeof moldLoanSchema>
type MoldLoanFormOutput = z.output<typeof moldLoanSchema>

interface MoldLoanActionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: LoanMode
  currentRow?: MoldLoan | null
  molds: Mold[]
  partners: EquipmentPartner[]
  onSubmit: (data: MoldLoan, isPatch?: boolean, delta?: DeltaSet) => void
}

export function MoldLoanActionDialog({
  isOpen,
  onOpenChange,
  initialMode = 'LEND',
  currentRow,
  molds,
  partners,
  onSubmit,
}: MoldLoanActionDialogProps) {
  const { t } = useLanguage()
  const homeFactory = t('equipmentTooling.loans.defaults.homeFactory')

  // SDRTS: 状态初始化
  const isEdit = !!currentRow
  const [createMode, setCreateMode] = useState<LoanMode>(initialMode)
  const mode: LoanMode = currentRow
    ? currentRow.toFactory === homeFactory
      ? 'BORROW'
      : 'LEND'
    : createMode

  const initialValues = useMemo(() => {
    if (currentRow) return currentRow
    return {
      // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
      id: '',
      moldId: '',
      moldSn: '',
      moldName: '',
      fromFactory: mode === 'LEND' ? homeFactory : '',
      toFactory: mode === 'BORROW' ? homeFactory : '',
      contactPerson: '',
      loanDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      status: 'ACTIVE' as const,
      remarks: '',
      photoUrl: '',
      maxCycles: undefined,
      currentCycles: undefined,
      maintenanceThreshold: undefined,
      version: 1,
      createdAt: new Date().toISOString(),
    }
  }, [currentRow, mode, homeFactory])

  const { commit, deltaProxy, reset } = useDeltaTracker<MoldLoan>(
    initialValues,
    isOpen
  )

  const form = useForm<MoldLoanFormInput, unknown, MoldLoanFormOutput>({
    resolver: zodResolver(moldLoanSchema),
    defaultValues: initialValues,
  })
  const watchedMaxCycles = useWatch({
    control: form.control,
    name: 'maxCycles',
  })
  const watchedCurrentCycles = useWatch({
    control: form.control,
    name: 'currentCycles',
  })
  const watchedMaintenanceThreshold = useWatch({
    control: form.control,
    name: 'maintenanceThreshold',
  })
  const healthPercent = AssetService.previewHealthScore(
    watchedCurrentCycles ?? 0,
    watchedMaxCycles ?? 0
  )

  const handleOpenChange = (open: boolean) => {
    if (open && !currentRow) {
      setCreateMode(initialMode)
    }
    onOpenChange(open)
  }

  useEffect(() => {
    if (isOpen) {
      form.reset(initialValues)
      reset(initialValues)
    }
  }, [isOpen, initialValues, form, reset])

  const handleFormSubmit = (values: MoldLoanFormOutput) => {
    const { isDirty, patchDelta } = prepareTrackedDialogSubmit({
      values,
      deltaProxy,
      commit,
      isEdit,
    })

    if (isEdit && !isDirty) {
      handleOpenChange(false)
      return
    }

    onSubmit(values, isEdit, patchDelta)
    handleOpenChange(false)
  }

  return (
    <ActionDialogShell
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={
        <div className='flex items-center gap-2'>
          <Truck className='size-6 text-blue-600' />
          <span>
            {isEdit
              ? t('equipmentTooling.loans.dialog.title.edit')
              : t('equipmentTooling.loans.dialog.title.create')}
          </span>
        </div>
      }
      description={t('equipmentTooling.loans.dialog.description')}
      contentDecoration={
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      }
      contentClassName='relative w-[95vw] sm:max-w-md max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden bg-background'
      headerClassName='p-6 sm:p-8 shrink-0 pb-4 bg-muted/5 border-b border-dashed text-left'
      bodyClassName='flex-1 overflow-y-auto px-6 sm:p-8 pt-6 custom-scrollbar pb-8'
      footerClassName='p-6 sm:px-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'
      titleClassName='text-xl font-black tracking-tighter italic uppercase'
      descriptionClassName='text-[9px] font-black uppercase tracking-widest opacity-60'
      footer={
        <>
          <Button
            variant='ghost'
            onClick={() => handleOpenChange(false)}
            className='h-11 flex-1 rounded-full px-8 text-[10px] font-black tracking-widest uppercase sm:flex-none'
          >
            {t('equipmentTooling.loans.dialog.actions.cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(handleFormSubmit)}
            className='h-11 flex-1 rounded-full bg-blue-600 px-10 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 sm:flex-none'
          >
            <Save className='mr-2 size-3.5' />
            {t('common.actions.save')}
          </Button>
        </>
      }
    >
      {!isEdit && (
        <div className='mb-6 flex gap-1.5 rounded-2xl border border-dashed border-slate-200 bg-muted/50 p-1.5'>
          <Button
            variant={mode === 'LEND' ? 'default' : 'ghost'}
            className={cn(
              'h-10 flex-1 rounded-xl text-[10px] font-black tracking-widest uppercase',
              mode === 'LEND'
                ? 'border border-blue-100 bg-white text-blue-600 shadow-sm'
                : 'text-muted-foreground/60'
            )}
            onClick={() => setCreateMode('LEND')}
          >
            {t('equipmentTooling.loans.dialog.modes.lend')}
          </Button>
          <Button
            variant={mode === 'BORROW' ? 'default' : 'ghost'}
            className={cn(
              'h-10 flex-1 rounded-xl text-[10px] font-black tracking-widest uppercase',
              mode === 'BORROW'
                ? 'border border-purple-100 bg-white text-purple-600 shadow-sm'
                : 'text-muted-foreground/60'
            )}
            onClick={() => setCreateMode('BORROW')}
          >
            {t('equipmentTooling.loans.dialog.modes.borrow')}
          </Button>
        </div>
      )}
      {mode === 'BORROW' && (watchedMaxCycles ?? 0) > 0 ? (
        <UdsHealthProgress
          className='mb-6'
          label={t('equipmentTooling.molds.dialog.healthIndex')}
          value={healthPercent}
          footer={
            <>
              <div className='flex flex-wrap gap-3'>
                <span className='text-[8px] font-black text-muted-foreground/30 uppercase'>
                  {t('equipmentTooling.molds.dialog.metrics.current', {
                    value: watchedCurrentCycles ?? 0,
                  })}
                </span>
                <span className='text-[8px] font-black text-muted-foreground/30 uppercase'>
                  {t('equipmentTooling.molds.dialog.metrics.total', {
                    value: watchedMaxCycles ?? 0,
                  })}
                </span>
                <span className='text-[8px] font-black text-muted-foreground/30 uppercase'>
                  {t(
                    'equipmentTooling.molds.dialog.fields.maintenanceThreshold'
                  )}{' '}
                  {watchedMaintenanceThreshold ?? 0}
                </span>
              </div>
              <Badge
                variant='outline'
                className='h-4 border-none bg-primary/5 text-[8px] font-black whitespace-nowrap text-primary uppercase'
              >
                {t('equipmentTooling.molds.dialog.realtimeSync')}
              </Badge>
            </>
          }
        />
      ) : null}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className='space-y-6'
        >
          {mode === 'LEND' ? (
            <FormField
              control={form.control}
              name='moldId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                    {t('equipmentTooling.loans.dialog.fields.mold')}
                  </FormLabel>
                  <Select
                    onValueChange={(val) => {
                      const m = molds.find((x) => x.id === val)
                      if (m) {
                        form.setValue('moldId', m.id)
                        form.setValue('moldSn', m.sn)
                        form.setValue('moldName', m.name)
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold focus:ring-blue-500/20'>
                        <SelectValue
                          placeholder={t(
                            'equipmentTooling.loans.dialog.placeholders.selectMold'
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='rounded-2xl border-none shadow-2xl'>
                      {molds.map((mold) => (
                        <SelectItem
                          key={mold.id}
                          value={mold.id}
                          className='rounded-xl font-bold'
                        >
                          {mold.sn} - {mold.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='moldSn'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                      {t('equipmentTooling.loans.dialog.fields.externalSn')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                        placeholder={t(
                          'equipmentTooling.loans.dialog.placeholders.moldSn'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='moldName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                      {t('equipmentTooling.loans.dialog.fields.moldName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                        placeholder={t(
                          'equipmentTooling.loans.dialog.placeholders.moldName'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='fromFactory'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                    {mode === 'LEND'
                      ? t('equipmentTooling.loans.dialog.fields.fromFactory')
                      : t('equipmentTooling.loans.dialog.fields.sourceFactory')}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold'>
                        <SelectValue
                          placeholder={t(
                            'equipmentTooling.loans.dialog.placeholders.selectSourceFactory'
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='rounded-2xl border-none shadow-2xl'>
                      {partners.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.name}
                          className='rounded-xl font-bold'
                        >
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='toFactory'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                    {t('equipmentTooling.loans.dialog.fields.toFactory')}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold'>
                        <SelectValue
                          placeholder={t(
                            'equipmentTooling.loans.dialog.placeholders.selectTargetFactory'
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='rounded-2xl border-none shadow-2xl'>
                      {partners.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.name}
                          className='rounded-xl font-bold'
                        >
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
          </div>

          {mode === 'BORROW' && (
            <div className='grid grid-cols-1 gap-4 border-y border-dashed bg-muted/5 py-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='maxCycles'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                      寿命上限 / LIFESPAN
                    </FormLabel>
                    <FormControl>
                      <Input
                        className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                        type='number'
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10))
                        }
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='currentCycles'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                      当前次数 / INITIAL
                    </FormLabel>
                    <FormControl>
                      <Input
                        className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                        type='number'
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10))
                        }
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
            </div>
          )}
          <FormField
            control={form.control}
            name='contactPerson'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                  {t('equipmentTooling.loans.dialog.fields.contact')}
                </FormLabel>
                <FormControl>
                  <Input
                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                    placeholder={t(
                      'equipmentTooling.loans.dialog.placeholders.contact'
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='loanDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                    {t('equipmentTooling.loans.dialog.fields.loanDate')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold italic'
                      type='date'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='expectedReturnDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                    {t(
                      'equipmentTooling.loans.dialog.fields.expectedReturnDate'
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold italic'
                      type='date'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='remarks'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                  {t('equipmentTooling.loans.dialog.fields.remarks')}
                </FormLabel>
                <FormControl>
                  <Input
                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                    placeholder={t(
                      'equipmentTooling.loans.dialog.placeholders.remarks'
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='photoUrl'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                  {t('equipmentTooling.loans.dialog.fields.photo')}
                </FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    label={t('equipmentTooling.loans.dialog.fields.photo')}
                  />
                </FormControl>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ActionDialogShell>
  )
}
