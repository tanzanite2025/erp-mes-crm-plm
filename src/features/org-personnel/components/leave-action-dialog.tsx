import { useCallback, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { getLeaveTypeLabel } from '../data/leave-display'
import { leaveCreateFormSchema, type LeaveCreateForm } from '../data/leave-request-schema'
import { useEmployeesQuery } from '../hooks/use-employees-query'
import { useSubmitLeaveRequest } from '../hooks/use-submit-leave-request'

const DEFAULT_LEAVE_FORM_VALUES: LeaveCreateForm = {
  employeeId: '',
  leaveType: 'annual',
  startTime: '',
  endTime: '',
  reason: '',
}

interface LeaveActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toDateTimeLocalValue(isoValue: string): string {
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

function toIsoString(localValue: string): string {
  return new Date(localValue).toISOString()
}

export function LeaveActionDialog({ open, onOpenChange }: LeaveActionDialogProps) {
  const { locale, t } = useLanguage()
  const form = useForm<LeaveCreateForm>({
    resolver: zodResolver(leaveCreateFormSchema),
    defaultValues: DEFAULT_LEAVE_FORM_VALUES,
  })
  const employeesQuery = useEmployeesQuery()

  const leaveTypeOptions = [
    { value: 'annual', label: getLeaveTypeLabel('annual', locale) },
    { value: 'sick', label: getLeaveTypeLabel('sick', locale) },
    { value: 'personal', label: getLeaveTypeLabel('personal', locale) },
    { value: 'marriage', label: getLeaveTypeLabel('marriage', locale) },
    { value: 'maternity', label: getLeaveTypeLabel('maternity', locale) },
    { value: 'funeral', label: getLeaveTypeLabel('funeral', locale) },
    { value: 'other', label: getLeaveTypeLabel('other', locale) },
  ] as const
  const employeeOptions = useMemo(() => {
    return (employeesQuery.data ?? [])
      .filter((employee) => employee.status !== 'resigned')
      .map((employee) => ({
        label: employee.name,
        value: employee.id,
        secondaryLabel: employee.deptName || employee.positionName || employee.status,
        tertiaryLabel: employee.staffId || employee.id,
        keywords: [employee.name, employee.staffId, employee.deptName, employee.positionName, employee.phone]
          .filter(Boolean)
          .join(' '),
      }))
  }, [employeesQuery.data])

  const handleSubmitSuccess = useCallback(() => {
    onOpenChange(false)
    form.reset(DEFAULT_LEAVE_FORM_VALUES)
  }, [form, onOpenChange])

  const {
    hasSelectedEmployee,
    preview,
    isPreviewing,
    isSubmitting,
    previewLeaveRequest,
    submitLeaveRequest,
    resetPreview,
  } = useSubmitLeaveRequest(handleSubmitSuccess)

  const { reset } = form

  const employeeId = useWatch({ control: form.control, name: 'employeeId' })
  const startTime = useWatch({ control: form.control, name: 'startTime' })
  const endTime = useWatch({ control: form.control, name: 'endTime' })

  useEffect(() => {
    if (!open) {
      reset(DEFAULT_LEAVE_FORM_VALUES)
      resetPreview()
    }
  }, [open, reset, resetPreview])

  const handlePreview = async () => {
    const valid = await form.trigger(['employeeId', 'leaveType', 'startTime', 'endTime'])
    if (!valid) return

    const values = form.getValues()
    await previewLeaveRequest({
      ...values,
      startTime: toIsoString(values.startTime),
      endTime: toIsoString(values.endTime),
    })
  }

  const handleSubmit = async (values: LeaveCreateForm) => {
    await submitLeaveRequest({
      ...values,
      startTime: toIsoString(values.startTime),
      endTime: toIsoString(values.endTime),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-[560px] rounded-3xl border-dashed p-0 overflow-hidden'>
        <div className='relative p-6 md:p-8 space-y-6'>
          <DialogHeader className='text-left'>
            <DialogTitle className='text-lg md:text-xl font-black tracking-tighter uppercase italic'>
              {t('orgPersonnel.leaveMgmt.actionDialog.title')}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('orgPersonnel.leaveMgmt.actionDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form id='leave-action-form' className='space-y-5' onSubmit={form.handleSubmit(handleSubmit)}>
              <FormField
                control={form.control}
                name='employeeId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.leaveMgmt.actionDialog.employee')}</FormLabel>
                    <FormControl>
                      <Combobox
                        variant='industrial'
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('orgPersonnel.leaveMgmt.actionDialog.employeePlaceholder')}
                        searchPlaceholder={t('orgPersonnel.leaveMgmt.actionDialog.employeeSearchPlaceholder')}
                        emptyText={t('orgPersonnel.leaveMgmt.actionDialog.employeeEmpty')}
                        options={employeeOptions}
                        isLoading={employeesQuery.isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='leaveType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.leaveMgmt.actionDialog.leaveType')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full h-11 rounded-2xl'>
                          <SelectValue placeholder={t('orgPersonnel.leaveMgmt.actionDialog.leaveTypePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leaveTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='startTime'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.leaveMgmt.actionDialog.startTime')}</FormLabel>
                      <FormControl>
                        <Input type='datetime-local' className='h-11 rounded-2xl' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='endTime'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.leaveMgmt.actionDialog.endTime')}</FormLabel>
                      <FormControl>
                        <Input type='datetime-local' className='h-11 rounded-2xl' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='reason'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.leaveMgmt.actionDialog.reason')}</FormLabel>
                    <FormControl>
                      <Textarea
                        className='min-h-28 rounded-2xl'
                        placeholder={t('orgPersonnel.leaveMgmt.actionDialog.reasonPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {preview ? (
            <div className='rounded-2xl border border-dashed bg-primary/5 p-4 flex items-center justify-between gap-4'>
              <div className='space-y-1'>
                <p className='text-[10px] font-black uppercase tracking-widest opacity-60'>{t('orgPersonnel.leaveMgmt.actionDialog.previewTitle')}</p>
                <p className='text-sm font-black italic tracking-tighter uppercase'>
                  {preview.employeeName || t('orgPersonnel.leaveMgmt.actionDialog.employeeFallback')}
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  {toDateTimeLocalValue(preview.startTime)} → {toDateTimeLocalValue(preview.endTime)}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-2xl font-black italic tracking-tighter text-primary'>
                  {preview.durationDays.toFixed(1)}
                </p>
                <p className='text-[9px] font-black uppercase tracking-widest opacity-50'>{t('orgPersonnel.leaveMgmt.actionDialog.daysLabel')}</p>
              </div>
            </div>
          ) : null}

          <DialogFooter className='flex-col-reverse md:flex-row md:justify-between gap-3'>
            <Button
              type='button'
              variant='outline'
              className='h-11 rounded-full px-6 font-black text-[10px] uppercase tracking-widest'
              onClick={() => onOpenChange(false)}
            >
              {t('orgPersonnel.leaveMgmt.actionDialog.close')}
            </Button>
            <div className='flex flex-col-reverse md:flex-row gap-3 w-full md:w-auto'>
              <Button
                type='button'
                variant='outline'
                className='h-11 rounded-full px-6 font-black text-[10px] uppercase tracking-widest'
                onClick={handlePreview}
                disabled={!hasSelectedEmployee(employeeId) || isPreviewing || isSubmitting || !startTime || !endTime}
              >
                {isPreviewing ? <Loader2 className='size-4 animate-spin' /> : null}
                {t('orgPersonnel.leaveMgmt.actionDialog.preview')}
              </Button>
              <Button
                type='submit'
                form='leave-action-form'
                className='h-11 rounded-full px-6 font-black text-[10px] uppercase tracking-widest'
                disabled={!hasSelectedEmployee(employeeId) || isSubmitting}
              >
                {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : null}
                {t('orgPersonnel.leaveMgmt.actionDialog.submit')}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
