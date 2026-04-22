import { Building2, Mail, MapPin, Phone, User } from 'lucide-react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StatusGuard } from '@/components/status-guard'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type Customer, type CustomerFormValues } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'
import { useCustomerActionViewModel } from '../hooks/use-customer-action-view-model'
import { buildCustomerSaveSnapshot } from '../customer/utils/customer-save-snapshot'

interface CustomerActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSave: (payload: { data: Customer | CustomerFormValues; isPatch: boolean; delta?: DeltaSet }) => void
}

export function CustomerActionDialog({
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerActionDialogProps) {
  const { t } = useLanguage()
  const shellClasses = buildActionDialogShellClasses({
    content: 'max-w-[95vw] sm:max-w-[600px]',
    header: 'p-6 pb-2 border-none bg-transparent',
    title: 'text-lg sm:text-xl flex items-center gap-2',
    description: 'text-[10px]',
    body: 'contents',
    footer: 'flex-col-reverse sm:flex-row gap-3 p-6 pt-2 border-t border-dashed border-muted/30',
  })
  const { allowedEditStatuses, initialFormData, statusOptions } = useCustomerActionViewModel({ customer, t })
  const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
  }

  const updateField = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) => {
    formData[key] = value
  }

  const handleSave = () => {
    const isPatch = !!customer
    const delta = tracker.commit()
    const nextData = buildCustomerSaveSnapshot(customer, formData)
    
    if (isPatch && Object.keys(delta).length === 0) {
      onOpenChange(false)
      return
    }

    onSave({ 
      data: nextData,
      isPatch, 
      delta: isPatch ? delta : undefined 
    })
    onOpenChange(false)
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={(
        <>
          <Building2 className='size-5 text-primary' />
          {customer ? t('trading.customers.dialog.editTitle') : t('trading.customers.dialog.createTitle')}
        </>
      )}
      description={t('trading.customers.dialog.description')}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='h-11 rounded-full font-black text-[10px] uppercase tracking-widest'
          >
            {t('trading.customers.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='h-11 px-10 rounded-full bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20'
          >
            {t('trading.customers.dialog.save')}
          </Button>
        </>
      )}
    >
      <StatusGuard
        status={formData.status || 'Active'}
        allowedStatuses={allowedEditStatuses}
        message={t('trading.customers.dialog.lockedMessage')}
      >
        <div className='grid gap-4 sm:gap-6 p-6 pt-0 max-h-[70vh] overflow-y-auto scrollbar-thin'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label
                htmlFor='name'
                className='text-[11px] font-bold uppercase text-muted-foreground'
              >
                {t('trading.customers.dialog.fields.name')}
              </Label>
              <div className='relative'>
                <Building2 className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                <Input
                  id='name'
                  placeholder={t('trading.customers.dialog.placeholders.name')}
                  className='pl-10 h-10 font-bold'
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label
                htmlFor='code'
                className='text-[11px] font-bold uppercase text-muted-foreground'
              >
                {t('trading.customers.dialog.fields.code')}
              </Label>
              <Input
                id='code'
                placeholder={t('trading.customers.dialog.placeholders.code')}
                className='h-10 font-mono text-sm'
                value={formData.code}
                onChange={(event) => updateField('code', event.target.value)}
              />
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label
                htmlFor='contactPerson'
                className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'
              >
                {t('trading.customers.dialog.fields.contactPerson')}
              </Label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                <Input
                  id='contactPerson'
                  placeholder={t('trading.customers.dialog.placeholders.contactPerson')}
                  className='pl-10 h-11 rounded-2xl border-none bg-muted/50 font-bold'
                  value={formData.contactPerson}
                  onChange={(event) => updateField('contactPerson', event.target.value)}
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label
                htmlFor='status'
                className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'
              >
                {t('trading.customers.dialog.fields.status')}
              </Label>
              <Select
                value={formData.status || 'Active'}
                onValueChange={(value) => {
                  updateField('status', value as Customer['status'])
                }}
              >
                <SelectTrigger className='h-11 rounded-2xl border-none bg-muted/50 font-bold'>
                  <SelectValue placeholder={t('trading.customers.dialog.placeholders.status')} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label
                htmlFor='contactPhone'
                className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'
              >
                {t('trading.customers.dialog.fields.contactPhone')}
              </Label>
              <div className='relative'>
                <Phone className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                <Input
                  id='contactPhone'
                  placeholder={t('trading.customers.dialog.placeholders.contactPhone')}
                  className='pl-10 h-11 rounded-2xl border-none bg-muted/50 font-bold'
                  value={formData.contactPhone}
                  onChange={(event) => updateField('contactPhone', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className='grid gap-3 rounded-[24px] border border-dashed border-muted/40 bg-muted/10 p-4 sm:p-5'>
            <div className='flex flex-col gap-1'>
              <h3 className='text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80'>
                联系与沟通
              </h3>
              <p className='text-[10px] font-bold text-muted-foreground'>
                记录客户常用联系方式，方便跟进报价、订单与售后沟通。
              </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='email' className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'>
                  {t('trading.customers.dialog.fields.email')}
                </Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                  <Input
                    id='email'
                    type='email'
                    placeholder={t('trading.customers.dialog.placeholders.email')}
                    className='pl-10 h-11 rounded-2xl border-none bg-background font-bold'
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </div>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='wechat' className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'>
                  微信
                </Label>
                <Input
                  id='wechat'
                  placeholder='请输入微信号'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.wechat}
                  onChange={(event) => updateField('wechat', event.target.value)}
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='whatsapp' className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'>
                  WhatsApp
                </Label>
                <Input
                  id='whatsapp'
                  placeholder='请输入 WhatsApp 号码或账号'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.whatsapp}
                  onChange={(event) => updateField('whatsapp', event.target.value)}
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='facebook' className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'>
                  Facebook
                </Label>
                <Input
                  id='facebook'
                  placeholder='请输入 Facebook 链接或账号名'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.facebook}
                  onChange={(event) => updateField('facebook', event.target.value)}
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='instagram' className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'>
                  Instagram
                </Label>
                <Input
                  id='instagram'
                  placeholder='请输入 Instagram 账号'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.instagram}
                  onChange={(event) => updateField('instagram', event.target.value)}
                />
              </div>

              <div className='grid gap-2 sm:col-span-2'>
                <Label htmlFor='telegram' className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'>
                  Telegram
                </Label>
                <Input
                  id='telegram'
                  placeholder='请输入 Telegram 用户名或链接'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.telegram}
                  onChange={(event) => updateField('telegram', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <Label
              htmlFor='address'
              className='text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest italic'
            >
              {t('trading.customers.dialog.fields.address')}
            </Label>
            <div className='relative'>
              <MapPin className='absolute left-3 top-3 size-4 text-muted-foreground/40' />
              <Textarea
                id='address'
                placeholder={t('trading.customers.dialog.placeholders.address')}
                rows={3}
                className='pl-10 resize-none rounded-2xl border-none bg-muted/50 font-medium text-xs leading-relaxed'
                value={formData.address}
                onChange={(event) => updateField('address', event.target.value)}
              />
            </div>
          </div>
        </div>
      </StatusGuard>
    </ActionDialogShell>
  )
}
