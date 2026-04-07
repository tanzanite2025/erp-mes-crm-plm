import { useMemo, useState, useEffect } from 'react'
import { Box, Building2, MapPin, Phone, User } from 'lucide-react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type Supplier, type SupplierStatus } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'

interface SupplierActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
  onSave: (payload: { data: Partial<Supplier>; isPatch: boolean; delta?: DeltaSet }) => void
}

const DEFAULT_CATEGORY = '原材料'
const DEFAULT_FORM_DATA: Partial<Supplier> = {
  name: '',
  code: '',
  category: DEFAULT_CATEGORY,
  mainProducts: [],
  contactPerson: '',
  contactPhone: '',
  email: '',
  address: '',
  status: 'Active',
  rating: 5,
}

export function SupplierActionDialog({
  open,
  onOpenChange,
  supplier,
  onSave,
}: SupplierActionDialogProps) {
  const { t } = useLanguage()
  const shellClasses = buildActionDialogShellClasses({
    content: 'flex max-h-[90vh] flex-col sm:max-w-[600px]',
    header: 'shrink-0 border-b border-dashed border-muted-foreground/5 bg-muted/5 px-6 pb-4 pt-6 sm:px-8',
    title: 'text-base sm:text-lg',
    description: 'mt-1 text-[9px]',
    body: 'custom-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8',
    footer: 'shrink-0 flex-row gap-3 border-t border-dashed border-muted-foreground/10 bg-muted/5 p-6 sm:justify-end sm:px-8',
  })
  
  const initialFormData = useMemo(() => (supplier ? supplier : DEFAULT_FORM_DATA), [supplier])
  const { data: formData, tracker } = useDeltaTracker(initialFormData as Supplier, open)
  const [productInput, setProductInput] = useState('')

  useEffect(() => {
    if (!open) {
        setProductInput('')
    }
  }, [open])

  const handleSave = () => {
    const isPatch = !!supplier
    const delta = tracker.commit()
    
    if (isPatch && Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
    }

    onSave({ 
        data: formData as Partial<Supplier>, 
        isPatch, 
        delta: isPatch ? delta : undefined 
    })
    setProductInput('')
    onOpenChange(false)
  }

  const addProduct = () => {
    if (!productInput || formData.mainProducts?.includes(productInput)) return
    formData.mainProducts = [...(formData.mainProducts || []), productInput]
    setProductInput('')
  }

  const removeProduct = (product: string) => {
    formData.mainProducts = formData.mainProducts?.filter((item) => item !== product)
  }

  const categoryOptions = [
    { value: '原材料', label: t('purchase.suppliers.categories.rawMaterial') },
    { value: '标准件', label: t('purchase.suppliers.categories.standardPart') },
    { value: '外协加工', label: t('purchase.suppliers.categories.outsourcing') },
    { value: '设备工装', label: t('purchase.suppliers.categories.equipmentTooling') },
  ]

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={supplier ? t('purchase.suppliers.dialogEditTitle') : t('purchase.suppliers.dialogCreateTitle')}
      description={t('purchase.suppliers.dialogDescription')}
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
            className='h-11 flex-1 rounded-full px-8 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-muted/30 sm:flex-none'
          >
            {t('purchase.suppliers.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='h-11 flex-1 rounded-full bg-primary px-10 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 hover:bg-primary/90 sm:flex-none'
          >
            {t('purchase.suppliers.save')}
          </Button>
        </>
      )}
    >
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <div className='grid gap-3'>
          <Label htmlFor='name' className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('purchase.suppliers.fields.name')}
          </Label>
          <div className='group relative'>
            <Building2 className='absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
            <Input
              id='name'
              placeholder={t('purchase.suppliers.fields.namePlaceholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 pl-11 text-sm font-black transition-all placeholder:text-muted-foreground/20 focus:ring-2 focus:ring-primary/20'
              value={formData.name}
              onChange={(e) => { formData.name = e.target.value }}
            />
          </div>
        </div>
        <div className='grid gap-3'>
          <Label htmlFor='code' className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('purchase.suppliers.fields.code')}
          </Label>
          <Input
            id='code'
            placeholder={t('purchase.suppliers.fields.codePlaceholder')}
            className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-sm font-black tabular-nums transition-all focus:ring-2 focus:ring-primary/20'
            value={formData.code}
            onChange={(e) => { formData.code = e.target.value }}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <div className='grid gap-3'>
          <Label htmlFor='category' className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('purchase.suppliers.fields.category')}
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => { formData.category = value }}
          >
            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black uppercase transition-all focus:ring-2 focus:ring-primary/20'>
              <SelectValue placeholder={t('purchase.suppliers.fields.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent className='rounded-2xl border-none shadow-2xl'>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className='py-3 text-[11px] font-black uppercase'>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-3'>
          <Label htmlFor='status' className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('purchase.suppliers.fields.status')}
          </Label>
          <Select
            value={formData.status}
            onValueChange={(value) => { formData.status = value as SupplierStatus }}
          >
            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black uppercase transition-all focus:ring-2 focus:ring-primary/20'>
              <SelectValue placeholder={t('purchase.suppliers.fields.statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent className='rounded-2xl border-none shadow-2xl'>
              <SelectItem value='Active' className='py-3 text-[11px] font-black uppercase'>
                {t('purchase.suppliers.statusActive')}
              </SelectItem>
              <SelectItem value='OnReview' className='py-3 text-[11px] font-black uppercase'>
                {t('purchase.suppliers.statusReview')}
              </SelectItem>
              <SelectItem value='Inactive' className='py-3 text-[11px] font-black uppercase'>
                {t('purchase.suppliers.statusInactive')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-3'>
        <Label className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
          {t('purchase.suppliers.fields.productScope')}
        </Label>
        <div className='mb-1 flex min-h-[50px] flex-wrap gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/5 bg-muted/30 p-3'>
          {formData.mainProducts?.map((product) => (
            <Badge
              key={product}
              variant='outline'
              className='h-5 gap-1.5 rounded-full border-none bg-white px-2.5 text-[8px] font-black uppercase shadow-sm'
            >
              {product}
              <button onClick={() => removeProduct(product)} className='text-[10px] transition-colors hover:text-destructive'>
                ×
              </button>
            </Badge>
          ))}
          {(!formData.mainProducts || formData.mainProducts.length === 0) && (
            <span className='p-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 italic'>
              {t('purchase.suppliers.fields.productEmpty')}
            </span>
          )}
        </div>
        <div className='flex gap-3'>
          <div className='group relative flex-1'>
            <Box className='absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={t('purchase.suppliers.fields.productPlaceholder')}
              className='h-11 rounded-xl border-none bg-muted/50 pl-11 text-[11px] font-black transition-all focus:ring-2 focus:ring-primary/20'
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                addProduct()
              }}
            />
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={addProduct}
            className='h-11 rounded-xl border-dashed px-6 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-primary/5 hover:text-primary'
          >
            {t('purchase.suppliers.fields.addProduct')}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <div className='grid gap-3'>
          <Label htmlFor='contactPerson' className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('purchase.suppliers.fields.contactPerson')}
          </Label>
          <div className='group relative'>
            <User className='absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
            <Input
              id='contactPerson'
              placeholder={t('purchase.suppliers.fields.contactPersonPlaceholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 pl-11 text-sm font-black transition-all focus:ring-2 focus:ring-primary/20'
              value={formData.contactPerson}
              onChange={(e) => { formData.contactPerson = e.target.value }}
            />
          </div>
        </div>
        <div className='grid gap-3'>
          <Label htmlFor='contactPhone' className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('purchase.suppliers.fields.contactPhone')}
          </Label>
          <div className='group relative'>
            <Phone className='absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
            <Input
              id='contactPhone'
              placeholder={t('purchase.suppliers.fields.contactPhonePlaceholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 pl-11 font-mono text-sm font-black tabular-nums transition-all focus:ring-2 focus:ring-primary/20'
              value={formData.contactPhone}
              onChange={(e) => { formData.contactPhone = e.target.value }}
            />
          </div>
        </div>
      </div>

      <div className='grid gap-3 pb-2'>
        <Label htmlFor='address' className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
          {t('purchase.suppliers.fields.address')}
        </Label>
        <div className='group relative'>
          <MapPin className='absolute left-4 top-4 size-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
          <Textarea
            id='address'
            placeholder={t('purchase.suppliers.fields.addressPlaceholder')}
            rows={2}
            className='resize-none rounded-2xl border-none bg-muted/50 py-4 pl-11 pr-4 text-sm font-bold leading-relaxed transition-all focus:ring-2 focus:ring-primary/20'
            value={formData.address}
            onChange={(e) => { formData.address = e.target.value }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
