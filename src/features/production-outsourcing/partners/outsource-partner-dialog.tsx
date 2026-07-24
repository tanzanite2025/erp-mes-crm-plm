import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
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
import type { Supplier } from '@/features/purchase/suppliers'
import type {
  OutsourcePartner,
  OutsourcePartnerFormValues,
  OutsourcePartnerQualityGrade,
  OutsourcePartnerStatus,
} from '../data/outsource-partner'

const emptyFormValues: OutsourcePartnerFormValues = {
  code: '',
  name: '',
  supplierId: '',
  contactPerson: '',
  contactPhone: '',
  email: '',
  address: '',
  qualityGrade: '',
  status: 'ACTIVE',
  leadTimeDays: 0,
  settlementPolicy: '',
  notes: '',
}

const fieldLabelClass = 'text-xs font-medium text-muted-foreground'
const inputClass = 'h-10 rounded-xl text-sm'
const selectClass =
  'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
const textareaClass = 'min-h-20 rounded-xl text-sm'

function buildFormValues(partner: OutsourcePartner | null) {
  if (!partner) {
    return emptyFormValues
  }
  return {
    code: partner.code,
    name: partner.name,
    supplierId: partner.supplierId,
    contactPerson: partner.contactPerson,
    contactPhone: partner.contactPhone,
    email: partner.email,
    address: partner.address,
    qualityGrade: partner.qualityGrade,
    status: partner.status,
    leadTimeDays: partner.leadTimeDays,
    settlementPolicy: partner.settlementPolicy,
    notes: partner.notes,
  }
}

interface OutsourcePartnerDialogProps {
  open: boolean
  partner: OutsourcePartner | null
  suppliers: Supplier[]
  isSaving?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: OutsourcePartnerFormValues) => void
}

export function OutsourcePartnerDialog({
  open,
  partner,
  suppliers,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: OutsourcePartnerDialogProps) {
  const { t } = useLanguage()
  const [values, setValues] = useState<OutsourcePartnerFormValues>(
    buildFormValues(partner)
  )
  const sortedSuppliers = useMemo(
    () =>
      [...suppliers].sort((a, b) =>
        `${a.name}${a.code}`.localeCompare(`${b.name}${b.code}`)
      ),
    [suppliers]
  )

  useEffect(() => {
    if (open) {
      setValues(buildFormValues(partner))
    }
  }, [open, partner])

  const updateValue = <K extends keyof OutsourcePartnerFormValues>(
    key: K,
    value: OutsourcePartnerFormValues[K]
  ) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized: OutsourcePartnerFormValues = {
      ...values,
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      supplierId: values.supplierId.trim(),
      contactPerson: values.contactPerson.trim(),
      contactPhone: values.contactPhone.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
      settlementPolicy: values.settlementPolicy.trim(),
      notes: values.notes.trim(),
      leadTimeDays: Number.isFinite(values.leadTimeDays)
        ? Math.max(0, Math.floor(values.leadTimeDays))
        : 0,
    }

    if (!normalized.code || !normalized.name) {
      toast.error(t('productionOutsourcing.partners.validation.required'))
      return
    }

    onSubmit(normalized)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='6xl' className='overflow-hidden rounded-2xl p-0'>
        <DialogHeader className='border-b bg-muted/20 px-5 py-4 pr-10 sm:px-6'>
          <div className='flex items-center gap-3'>
            <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Building2 className='size-4' />
            </div>
            <div>
              <DialogTitle className='text-lg font-semibold tracking-tight'>
                {partner
                  ? t('productionOutsourcing.partners.dialog.editTitle')
                  : t('productionOutsourcing.partners.dialog.createTitle')}
              </DialogTitle>
              <DialogDescription className='mt-1 text-sm'>
                {t('productionOutsourcing.partners.dialog.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className='space-y-4 px-5 py-4 sm:px-6' onSubmit={handleSubmit}>
          <div className='grid gap-4 md:grid-cols-4'>
            <div className='space-y-2 md:col-span-1'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.code')}
              </Label>
              <Input
                value={values.code}
                onChange={(event) => updateValue('code', event.target.value)}
                placeholder='OS-001'
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.name')}
              </Label>
              <Input
                value={values.name}
                onChange={(event) => updateValue('name', event.target.value)}
                placeholder={t(
                  'productionOutsourcing.partners.placeholders.name'
                )}
                className={inputClass}
              />
            </div>
            <div className='space-y-2 md:col-span-1'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.status')}
              </Label>
              <select
                value={values.status}
                onChange={(event) =>
                  updateValue(
                    'status',
                    event.target.value as OutsourcePartnerStatus
                  )
                }
                className={selectClass}
              >
                <option value='ACTIVE'>
                  {t('productionOutsourcing.partners.statuses.ACTIVE')}
                </option>
                <option value='ON_REVIEW'>
                  {t('productionOutsourcing.partners.statuses.ON_REVIEW')}
                </option>
                <option value='INACTIVE'>
                  {t('productionOutsourcing.partners.statuses.INACTIVE')}
                </option>
              </select>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-4'>
            <div className='space-y-2 md:col-span-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.supplier')}
              </Label>
              <select
                value={values.supplierId}
                onChange={(event) =>
                  updateValue('supplierId', event.target.value)
                }
                className={selectClass}
              >
                <option value=''>
                  {t('productionOutsourcing.partners.placeholders.supplier')}
                </option>
                {sortedSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} · {supplier.code}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.qualityGrade')}
              </Label>
              <select
                value={values.qualityGrade || 'NONE'}
                onChange={(event) =>
                  updateValue(
                    'qualityGrade',
                    event.target.value === 'NONE'
                      ? ''
                      : (event.target.value as OutsourcePartnerQualityGrade)
                  )
                }
                className={selectClass}
              >
                <option value='NONE'>
                  {t('productionOutsourcing.partners.qualityGrades.NONE')}
                </option>
                <option value='A'>
                  {t('productionOutsourcing.partners.qualityGrades.A')}
                </option>
                <option value='B'>
                  {t('productionOutsourcing.partners.qualityGrades.B')}
                </option>
                <option value='C'>
                  {t('productionOutsourcing.partners.qualityGrades.C')}
                </option>
              </select>
            </div>
            <div className='space-y-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.leadTimeDays')}
              </Label>
              <Input
                type='number'
                min={0}
                value={values.leadTimeDays}
                onChange={(event) =>
                  updateValue('leadTimeDays', Number(event.target.value))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.contactPerson')}
              </Label>
              <Input
                value={values.contactPerson}
                onChange={(event) =>
                  updateValue('contactPerson', event.target.value)
                }
                className={inputClass}
              />
            </div>
            <div className='space-y-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.contactPhone')}
              </Label>
              <Input
                value={values.contactPhone}
                onChange={(event) =>
                  updateValue('contactPhone', event.target.value)
                }
                className={inputClass}
              />
            </div>
            <div className='space-y-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.email')}
              </Label>
              <Input
                value={values.email}
                onChange={(event) => updateValue('email', event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.address')}
              </Label>
              <Textarea
                value={values.address}
                onChange={(event) => updateValue('address', event.target.value)}
                className={textareaClass}
              />
            </div>
            <div className='space-y-2'>
              <Label className={fieldLabelClass}>
                {t('productionOutsourcing.partners.fields.settlementPolicy')}
              </Label>
              <Textarea
                value={values.settlementPolicy}
                onChange={(event) =>
                  updateValue('settlementPolicy', event.target.value)
                }
                className={textareaClass}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label className={fieldLabelClass}>
              {t('productionOutsourcing.partners.fields.notes')}
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
              className='rounded-xl'
              onClick={() => onOpenChange(false)}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button type='submit' disabled={isSaving} className='rounded-xl'>
              {isSaving ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : null}
              {t('common.actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
