import { useMemo, useState } from 'react'
import { Building2, Mail, MapPin, Phone, User } from 'lucide-react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusGuard } from '@/components/status-guard'
import { useLanguage } from '@/context/language-provider'
import { type Customer } from '../data/schema'

interface CustomerActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSave: (data: Partial<Customer>) => void
}

const defaultFormData: Partial<Customer> = {
  name: '',
  code: '',
  contactPerson: '',
  contactPhone: '',
  email: '',
  address: '',
  status: 'Active',
  creditLimit: 0,
  balance: 0,
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
  const allowedEditStatuses = ['Active', 'Pending']
  const sourceKey = customer?.id ?? 'create'
  const initialFormData = useMemo(() => (customer ? customer : defaultFormData), [customer])
  const [draftState, setDraftState] = useState<{
    sourceKey: string
    draft: Partial<Customer>
  }>({
    sourceKey,
    draft: {},
  })
  const draft = draftState.sourceKey === sourceKey ? draftState.draft : {}
  const formData = { ...initialFormData, ...draft }

  const updateFormData = (updater: (prev: Partial<Customer>) => Partial<Customer>) => {
    setDraftState((prev) => {
      const currentDraft = prev.sourceKey === sourceKey ? prev.draft : {}
      return {
        sourceKey,
        draft: updater({ ...initialFormData, ...currentDraft }),
      }
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDraftState({ sourceKey, draft: {} })
    }
    onOpenChange(nextOpen)
  }

  const handleSave = () => {
    onSave(formData)
    setDraftState({ sourceKey, draft: {} })
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
                  onChange={(event) =>
                    updateFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
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
                onChange={(event) =>
                  updateFormData((prev) => ({ ...prev, code: event.target.value }))
                }
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
                  onChange={(event) =>
                    updateFormData((prev) => ({ ...prev, contactPerson: event.target.value }))
                  }
                />
              </div>
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
                  onChange={(event) =>
                    updateFormData((prev) => ({ ...prev, contactPhone: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <Label
              htmlFor='email'
              className='text-[11px] font-bold uppercase text-muted-foreground'
            >
              {t('trading.customers.dialog.fields.email')}
            </Label>
            <div className='relative'>
              <Mail className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
              <Input
                id='email'
                type='email'
                placeholder={t('trading.customers.dialog.placeholders.email')}
                className='pl-10 h-10 font-bold'
                value={formData.email}
                onChange={(event) =>
                  updateFormData((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
          </div>

          <div className='grid gap-2'>
            <Label
              htmlFor='address'
              className='text-[11px] font-bold uppercase text-muted-foreground'
            >
              {t('trading.customers.dialog.fields.address')}
            </Label>
            <div className='relative'>
              <MapPin className='absolute left-3 top-3 size-4 text-muted-foreground/40' />
              <Textarea
                id='address'
                placeholder={t('trading.customers.dialog.placeholders.address')}
                rows={3}
                className='pl-10 resize-none font-medium text-xs leading-relaxed'
                value={formData.address}
                onChange={(event) =>
                  updateFormData((prev) => ({ ...prev, address: event.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </StatusGuard>
    </ActionDialogShell>
  )
}
