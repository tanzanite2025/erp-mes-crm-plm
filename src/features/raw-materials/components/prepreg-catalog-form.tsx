import type { ReactNode } from 'react'
import { Calendar, Hash, type LucideIcon, Tag } from 'lucide-react'
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
import { PrepregCleanedPreview } from './prepreg-cleaned-preview'
import type {
  PrepregCleanedDimensionFields,
  PrepregCleanedResinBatchFields,
  PrepregFormState,
  PrepregMaterialSpecStatus,
} from '../data/prepreg-material-spec-schema'

export interface PrepregSupplierOption {
  value: string
  label: string
}

interface PrepregCatalogFormProps {
  form: PrepregFormState
  updateForm: <K extends keyof PrepregFormState>(
    key: K,
    value: PrepregFormState[K]
  ) => void
  supplierSelectValue?: string
  supplierOptions: PrepregSupplierOption[]
  isSupplierLoading: boolean
  onSupplierChange: (value: string) => void
  cleanedDimensions: PrepregCleanedDimensionFields
  cleanedResinBatch: PrepregCleanedResinBatchFields
}

export function PrepregCatalogForm({
  form,
  updateForm,
  supplierSelectValue,
  supplierOptions,
  isSupplierLoading,
  onSupplierChange,
  cleanedDimensions,
  cleanedResinBatch,
}: PrepregCatalogFormProps) {
  const { t } = useLanguage()

  return (
    <div className='mt-3 grid gap-3 md:grid-cols-4 [&_input]:h-9 [&_input]:rounded-xl'>
      <Field
        label={t('rawMaterials.catalog.form.code.label')}
        required
        icon={Hash}
      >
        <Input
          value={form.code}
          onChange={(event) => updateForm('code', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.code.placeholder')}
        />
      </Field>
      <Field
        label={t('rawMaterials.catalog.form.name.label')}
        required
        icon={Tag}
      >
        <Input
          value={form.name}
          onChange={(event) => updateForm('name', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.name.placeholder')}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.displayAlias.label')}>
        <Input
          value={form.displayAlias}
          onChange={(event) => updateForm('displayAlias', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.displayAlias.placeholder')}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.supplier.label')}>
        <Select value={supplierSelectValue} onValueChange={onSupplierChange}>
          <SelectTrigger className='h-9 w-full rounded-xl'>
            <SelectValue
              placeholder={
                isSupplierLoading
                  ? t('rawMaterials.catalog.form.supplier.loading')
                  : t('rawMaterials.catalog.form.supplier.placeholder')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {supplierOptions.length === 0 ? (
              <SelectItem value='__empty_supplier__' disabled>
                {t('rawMaterials.catalog.form.supplier.empty')}
              </SelectItem>
            ) : (
              supplierOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t('rawMaterials.catalog.form.fiberModel.label')}>
        <Input
          value={form.fiberModel}
          onChange={(event) => updateForm('fiberModel', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.fiberModel.placeholder')}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.resinContentBatchRaw.label')}>
        <Input
          value={form.resinContentBatchRaw}
          onChange={(event) =>
            updateForm('resinContentBatchRaw', event.target.value)
          }
          placeholder={t(
            'rawMaterials.catalog.form.resinContentBatchRaw.placeholder'
          )}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.widthMm.label')}>
        <Input
          value={form.widthMm}
          onChange={(event) => updateForm('widthMm', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.widthMm.placeholder')}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.nominalAreaM2.label')}>
        <Input
          value={form.nominalAreaM2}
          onChange={(event) => updateForm('nominalAreaM2', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.nominalAreaM2.placeholder')}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.inspector.label')}>
        <Input
          value={form.inspector}
          onChange={(event) => updateForm('inspector', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.inspector.placeholder')}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.boxNo.label')}>
        <Input
          value={form.boxNo}
          onChange={(event) => updateForm('boxNo', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.boxNo.placeholder')}
        />
      </Field>
      <Field
        label={t('rawMaterials.catalog.form.productionDate.label')}
        icon={Calendar}
      >
        <Input
          value={form.productionDate}
          onChange={(event) => updateForm('productionDate', event.target.value)}
          placeholder={t(
            'rawMaterials.catalog.form.productionDate.placeholder'
          )}
        />
      </Field>
      <Field label={t('rawMaterials.catalog.form.status.label')}>
        <Select
          value={form.status}
          onValueChange={(value) =>
            updateForm('status', value as PrepregMaterialSpecStatus)
          }
        >
          <SelectTrigger className='h-9 w-full rounded-xl'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='Active'>
              {t('rawMaterials.catalog.status.active')}
            </SelectItem>
            <SelectItem value='Inactive'>
              {t('rawMaterials.catalog.status.inactive')}
            </SelectItem>
            <SelectItem value='Archived'>
              {t('rawMaterials.catalog.status.archived')}
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <PrepregCleanedPreview
        cleanedDimensions={cleanedDimensions}
        cleanedResinBatch={cleanedResinBatch}
      />

      <Field
        label={t('rawMaterials.catalog.form.description.label')}
        className='md:col-span-4'
      >
        <Textarea
          value={form.description}
          onChange={(event) => updateForm('description', event.target.value)}
          placeholder={t('rawMaterials.catalog.form.description.placeholder')}
          className='min-h-[64px] resize-none rounded-xl'
        />
      </Field>
    </div>
  )
}

function Field({
  label,
  required,
  icon: Icon,
  className,
  children,
}: {
  label: string
  required?: boolean
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <Label className='mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
        {Icon ? <Icon className='size-3.5 text-primary/70' /> : null}
        {label}
        {required ? <span className='text-destructive'>*</span> : null}
      </Label>
      {children}
    </div>
  )
}
