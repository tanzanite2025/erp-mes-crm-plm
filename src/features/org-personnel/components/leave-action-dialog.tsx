import { useCallback, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { leaveCreateFormSchema, type LeaveCreateForm } from '../data/leave-request-schema'
import { useSubmitLeaveRequest } from '../hooks/use-submit-leave-request'

const leaveTypeOptions = [
  { value: 'annual', label: '年假' },
  { value: 'sick', label: '病假' },
  { value: 'personal', label: '事假' },
  { value: 'marriage', label: '婚假' },
  { value: 'maternity', label: '产假' },
  { value: 'funeral', label: '丧假' },
  { value: 'other', label: '其他' },
] as const

const DEFAULT_LEAVE_FORM_VALUES: LeaveCreateForm = {
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
  const form = useForm<LeaveCreateForm>({
    resolver: zodResolver(leaveCreateFormSchema),
    defaultValues: DEFAULT_LEAVE_FORM_VALUES,
  })

  const handleSubmitSuccess = useCallback(() => {
    onOpenChange(false)
    form.reset(DEFAULT_LEAVE_FORM_VALUES)
  }, [form, onOpenChange])

  const {
    isEmployeeBound,
    preview,
    isPreviewing,
    isSubmitting,
    previewLeaveRequest,
    submitLeaveRequest,
    resetPreview,
  } = useSubmitLeaveRequest(handleSubmitSuccess)

  const { reset } = form

  const startTime = useWatch({ control: form.control, name: 'startTime' })
  const endTime = useWatch({ control: form.control, name: 'endTime' })

  useEffect(() => {
    if (!open) {
      reset(DEFAULT_LEAVE_FORM_VALUES)
      resetPreview()
    }
  }, [open, reset, resetPreview])

  const handlePreview = async () => {
    const valid = await form.trigger(['leaveType', 'startTime', 'endTime'])
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
              新建请假申请
            </DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              仅支持本人申请，请假时长以后端权威试算结果为准
            </DialogDescription>
          </DialogHeader>

          {!isEmployeeBound ? (
            <div className='rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive'>
              当前账号未绑定员工档案，暂时无法发起请假申请。
            </div>
          ) : (
            <Form {...form}>
              <form id='leave-action-form' className='space-y-5' onSubmit={form.handleSubmit(handleSubmit)}>
                <FormField
                  control={form.control}
                  name='leaveType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-[10px] font-black uppercase tracking-widest'>请假类型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className='w-full h-11 rounded-2xl'>
                            <SelectValue placeholder='请选择请假类型' />
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
                        <FormLabel className='text-[10px] font-black uppercase tracking-widest'>开始时间</FormLabel>
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
                        <FormLabel className='text-[10px] font-black uppercase tracking-widest'>结束时间</FormLabel>
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
                      <FormLabel className='text-[10px] font-black uppercase tracking-widest'>请假事由</FormLabel>
                      <FormControl>
                        <Textarea
                          className='min-h-28 rounded-2xl'
                          placeholder='请填写请假原因、交接说明或其他补充信息'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}

          {preview ? (
            <div className='rounded-2xl border border-dashed bg-primary/5 p-4 flex items-center justify-between gap-4'>
              <div className='space-y-1'>
                <p className='text-[10px] font-black uppercase tracking-widest opacity-60'>后端试算结果</p>
                <p className='text-sm font-black italic tracking-tighter uppercase'>
                  {preview.employeeName || '本人申请'}
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  {toDateTimeLocalValue(preview.startTime)} → {toDateTimeLocalValue(preview.endTime)}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-2xl font-black italic tracking-tighter text-primary'>
                  {preview.durationDays.toFixed(1)}
                </p>
                <p className='text-[9px] font-black uppercase tracking-widest opacity-50'>DAYS</p>
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
              关闭
            </Button>
            <div className='flex flex-col-reverse md:flex-row gap-3 w-full md:w-auto'>
              <Button
                type='button'
                variant='outline'
                className='h-11 rounded-full px-6 font-black text-[10px] uppercase tracking-widest'
                onClick={handlePreview}
                disabled={!isEmployeeBound || isPreviewing || isSubmitting || !startTime || !endTime}
              >
                {isPreviewing ? <Loader2 className='size-4 animate-spin' /> : null}
                试算请假时长
              </Button>
              <Button
                type='submit'
                form='leave-action-form'
                className='h-11 rounded-full px-6 font-black text-[10px] uppercase tracking-widest'
                disabled={!isEmployeeBound || isSubmitting}
              >
                {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : null}
                提交请假申请
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
