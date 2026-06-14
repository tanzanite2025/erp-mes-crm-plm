import { Building2, Mail, MapPin, Phone, User } from 'lucide-react'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
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
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { buildHostedQuickActionDialogContentClassName } from '@/components/hosted-quick-action-dialog.styles'
import { StatusGuard } from '@/components/status-guard'
import { buildCustomerSaveSnapshot } from '../customer/utils/customer-save-snapshot'
import { type Customer, type CustomerFormValues } from '../data/schema'
import { useCustomerActionViewModel } from '../hooks/use-customer-action-view-model'

interface CustomerActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSave: (payload: {
    data: Customer | CustomerFormValues
    isPatch: boolean
    delta?: DeltaSet
  }) => Promise<Customer | void>
  onSaved?: (customer: Customer) => void
}

export function CustomerActionDialog({
  open,
  onOpenChange,
  customer,
  onSave,
  onSaved,
}: CustomerActionDialogProps) {
  const { t } = useLanguage()
  const shellClasses = buildActionDialogShellClasses({
    content: buildHostedQuickActionDialogContentClassName(
      'flex flex-col gap-0 overflow-hidden md:max-w-[600px]'
    ),
    header:
      'shrink-0 border-none bg-transparent px-4 pt-4 pb-2 sm:px-6 sm:pt-5',
    title: 'text-lg sm:text-xl flex items-center gap-2',
    description: 'text-[10px]',
    body: 'min-h-0 flex-1 overflow-y-auto p-0',
    footer:
      'shrink-0 flex-row gap-2 border-t border-dashed border-muted/30 px-4 py-3 sm:px-6 sm:py-4',
  })
  const { allowedEditStatuses, initialFormData, statusOptions } =
    useCustomerActionViewModel({ customer, t })
  const {
    data: formData,
    deltaProxy,
    tracker,
  } = useDeltaTracker(initialFormData, open)

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
  }

  const updateField = <K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K]
  ) => {
    Object.assign(deltaProxy, { [key]: value })
  }

  const handleSave = async () => {
    const isPatch = !!customer
    const delta = tracker.commit()
    const nextData = buildCustomerSaveSnapshot(customer, formData)

    if (isPatch && Object.keys(delta).length === 0) {
      onOpenChange(false)
      return
    }

    try {
      const savedCustomer = await onSave({
        data: nextData,
        isPatch,
        delta: isPatch ? delta : undefined,
      })

      if (!savedCustomer) {
        return
      }

      onSaved?.(savedCustomer)
      onOpenChange(false)
    } catch {
      return
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <>
          <Building2 className='size-5 text-primary' />
          {customer
            ? t('trading.customers.dialog.editTitle')
            : t('trading.customers.dialog.createTitle')}
        </>
      }
      description={t('trading.customers.dialog.description')}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='h-10 min-w-0 flex-1 rounded-full px-4 text-[9px] font-black tracking-widest uppercase sm:h-11 sm:flex-none sm:px-6 sm:text-[10px]'
          >
            {t('trading.customers.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='h-10 min-w-0 flex-1 rounded-full bg-primary px-4 text-[9px] font-black tracking-widest text-primary-foreground uppercase shadow-lg shadow-primary/20 sm:h-11 sm:flex-none sm:px-10 sm:text-[10px]'
          >
            {t('trading.customers.dialog.save')}
          </Button>
        </>
      }
    >
      <StatusGuard
        status={formData.status || 'Active'}
        allowedStatuses={allowedEditStatuses}
        message={t('trading.customers.dialog.lockedMessage')}
      >
        <div className='grid gap-3 px-4 pt-0 pb-4 sm:gap-4 sm:px-6 sm:pb-5'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'>
            <div className='grid gap-1.5 sm:gap-2'>
              <Label
                htmlFor='name'
                className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
              >
                {t('trading.customers.dialog.fields.name')}
              </Label>
              <div className='relative'>
                <Building2 className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
                <Input
                  id='name'
                  placeholder={t('trading.customers.dialog.placeholders.name')}
                  className='h-10 rounded-2xl border-none bg-muted/50 pl-10 text-[12px] font-bold sm:h-11'
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>
            </div>

            <div className='grid gap-1.5 sm:gap-2'>
              <Label
                htmlFor='code'
                className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
              >
                {t('trading.customers.dialog.fields.code')}
              </Label>
              <Input
                id='code'
                placeholder={t('trading.customers.dialog.placeholders.code')}
                className='h-10 rounded-2xl border-none bg-muted/50 font-mono text-[12px] font-bold sm:h-11'
                value={formData.code}
                onChange={(event) => updateField('code', event.target.value)}
              />
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'>
            <div className='grid gap-2'>
              <Label
                htmlFor='contactPerson'
                className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
              >
                {t('trading.customers.dialog.fields.contactPerson')}
              </Label>
              <div className='relative'>
                <User className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
                <Input
                  id='contactPerson'
                  placeholder={t(
                    'trading.customers.dialog.placeholders.contactPerson'
                  )}
                  className='h-11 rounded-2xl border-none bg-muted/50 pl-10 font-bold'
                  value={formData.contactPerson}
                  onChange={(event) =>
                    updateField('contactPerson', event.target.value)
                  }
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-2 sm:contents'>
              <div className='grid min-w-0 gap-1.5 sm:gap-2'>
                <Label
                  htmlFor='status'
                  className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase italic sm:text-[10px]'
                >
                  {t('trading.customers.dialog.fields.status')}
                </Label>
                <Select
                  value={formData.status || 'Active'}
                  onValueChange={(value) => {
                    updateField('status', value as Customer['status'])
                  }}
                >
                  <SelectTrigger className='h-10 w-full rounded-2xl border-none bg-muted/50 text-[10px] font-black tracking-widest uppercase sm:h-11'>
                    <SelectValue
                      placeholder={t(
                        'trading.customers.dialog.placeholders.status'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent className='rounded-2xl border-none p-1.5 shadow-2xl'>
                    {statusOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className='rounded-xl py-2 text-[10px] font-black tracking-widest uppercase'
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid min-w-0 gap-1.5 sm:gap-2'>
                <Label
                  htmlFor='contactPhone'
                  className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase italic sm:text-[10px]'
                >
                  {t('trading.customers.dialog.fields.contactPhone')}
                </Label>
                <div className='relative'>
                  <Phone className='absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/40 sm:left-3 sm:size-4' />
                  <Input
                    id='contactPhone'
                    placeholder={t(
                      'trading.customers.dialog.placeholders.contactPhone'
                    )}
                    className='h-10 rounded-2xl border-none bg-muted/50 pl-8 text-[12px] font-bold sm:h-11 sm:pl-10 sm:text-sm'
                    value={formData.contactPhone}
                    onChange={(event) =>
                      updateField('contactPhone', event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='grid gap-2.5 rounded-[24px] border border-dashed border-muted/40 bg-muted/10 p-3 sm:p-4'>
            <div className='flex flex-col gap-0.5'>
              <h3 className='text-[11px] font-black tracking-[0.2em] text-foreground/80 uppercase'>
                联系与沟通
              </h3>
              <p className='text-[10px] font-bold text-muted-foreground'>
                记录客户常用联系方式，方便跟进报价、订单与售后沟通。
              </p>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label
                  htmlFor='email'
                  className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
                >
                  {t('trading.customers.dialog.fields.email')}
                </Label>
                <div className='relative'>
                  <Mail className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
                  <Input
                    id='email'
                    type='email'
                    placeholder={t(
                      'trading.customers.dialog.placeholders.email'
                    )}
                    className='h-11 rounded-2xl border-none bg-background pl-10 font-bold'
                    value={formData.email}
                    onChange={(event) =>
                      updateField('email', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className='grid gap-2'>
                <Label
                  htmlFor='wechat'
                  className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
                >
                  微信
                </Label>
                <Input
                  id='wechat'
                  placeholder='请输入微信号'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.wechat}
                  onChange={(event) =>
                    updateField('wechat', event.target.value)
                  }
                />
              </div>

              <div className='grid gap-2'>
                <Label
                  htmlFor='whatsapp'
                  className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
                >
                  WhatsApp
                </Label>
                <Input
                  id='whatsapp'
                  placeholder='请输入 WhatsApp 号码或账号'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.whatsapp}
                  onChange={(event) =>
                    updateField('whatsapp', event.target.value)
                  }
                />
              </div>

              <div className='grid gap-2'>
                <Label
                  htmlFor='facebook'
                  className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
                >
                  Facebook
                </Label>
                <Input
                  id='facebook'
                  placeholder='请输入 Facebook 链接或账号名'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.facebook}
                  onChange={(event) =>
                    updateField('facebook', event.target.value)
                  }
                />
              </div>

              <div className='grid gap-2'>
                <Label
                  htmlFor='instagram'
                  className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
                >
                  Instagram
                </Label>
                <Input
                  id='instagram'
                  placeholder='请输入 Instagram 账号'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.instagram}
                  onChange={(event) =>
                    updateField('instagram', event.target.value)
                  }
                />
              </div>

              <div className='grid gap-2'>
                <Label
                  htmlFor='telegram'
                  className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
                >
                  Telegram
                </Label>
                <Input
                  id='telegram'
                  placeholder='请输入 Telegram 用户名或链接'
                  className='h-11 rounded-2xl border-none bg-background font-bold'
                  value={formData.telegram}
                  onChange={(event) =>
                    updateField('telegram', event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <Label
              htmlFor='address'
              className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
            >
              {t('trading.customers.dialog.fields.address')}
            </Label>
            <div className='relative'>
              <MapPin className='absolute top-3 left-3 size-4 text-muted-foreground/40' />
              <Textarea
                id='address'
                placeholder={t('trading.customers.dialog.placeholders.address')}
                rows={3}
                className='resize-none rounded-2xl border-none bg-muted/50 pl-10 text-xs leading-relaxed font-medium'
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
