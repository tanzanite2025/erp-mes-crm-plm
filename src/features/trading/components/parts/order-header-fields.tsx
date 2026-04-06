import { Barcode as BarcodeIcon, Calendar, Hash, User } from 'lucide-react'
import { StatusGuard } from '@/components/status-guard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { type Customer, type SalesOrder } from '../../data/schema'

interface OrderHeaderFieldsProps {
  formData: Partial<SalesOrder>
  setFormData: (value: any) => void
  customers: Customer[]
  onClassificationChange: (value: string) => void
}

export function OrderHeaderFields({
  formData,
  setFormData,
  customers,
  onClassificationChange,
}: OrderHeaderFieldsProps) {
  const { t } = useLanguage()
  const allowedEditStatuses = ['Draft', 'Pending']

  return (
    <section className='space-y-3'>
      <div className='flex items-center gap-2 px-1'>
        <div className='flex size-3 items-center justify-center rounded-full bg-primary/20'>
          <div className='size-1.5 rounded-full bg-primary' />
        </div>
        <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic'>
          {t('tradingSalesOrder.headerFields.sectionTitle')}
        </h4>
      </div>

      <StatusGuard
        status={formData.status || 'Draft'}
        allowedStatuses={allowedEditStatuses}
        message={t('tradingSalesOrder.headerFields.lockedMessage')}
      >
        <div className='grid grid-cols-1 gap-4 rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-4 transition-all sm:p-5 md:grid-cols-2 lg:grid-cols-4'>
          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] font-bold uppercase leading-none tracking-widest text-muted-foreground/80 italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.orderNo')}
            </Label>
            <div className='group relative'>
              <Hash className='absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-primary/40 transition-colors group-hover:text-primary' />
              <Input
                placeholder={t('tradingSalesOrder.headerFields.orderNoPlaceholder')}
                value={formData.orderNo}
                readOnly
                className='h-11 cursor-not-allowed border-muted-foreground/10 bg-muted/20 pl-9 font-mono text-[13px] font-bold shadow-sm sm:h-10 sm:text-[12px]'
              />
            </div>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] font-bold uppercase leading-none tracking-widest text-muted-foreground/80 italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.customer')}
            </Label>
            <div className='relative'>
              <User className='absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40' />
              <select
                className='w-full appearance-none truncate rounded-xl border border-muted/30 bg-background px-3 pl-9 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px] h-11'
                value={formData.customerName}
                onChange={(e) => {
                  const customer = customers.find((item) => item.name === e.target.value)
                  setFormData((prev: any) => ({
                    ...prev,
                    customerName: e.target.value,
                    customerId: customer?.id,
                  }))
                }}
              >
                <option value=''>{t('tradingSalesOrder.headerFields.customerPlaceholder')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] font-bold uppercase leading-none tracking-widest text-muted-foreground/80 italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.tradeMode')}
            </Label>
            <select
              className='h-11 w-full appearance-none rounded-xl border border-muted/30 bg-background px-4 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
              value={formData.type}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, type: e.target.value }))}
            >
              {dictionaryService.getOptions('ORDER_TYPE').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] font-bold uppercase leading-none tracking-widest text-muted-foreground/80 italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.category')}
            </Label>
            <select
              className='h-11 w-full appearance-none rounded-xl border border-muted/30 bg-background px-4 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
              value={formData.classification}
              onChange={(e) => onClassificationChange(e.target.value)}
            >
              {dictionaryService.getOptions('ORDER_CLASSIFICATION').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] font-bold uppercase leading-none tracking-widest text-muted-foreground/80 italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.deliveryDeadline')}
            </Label>
            <div className='relative'>
              <Calendar className='absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40' />
              <Input
                type='date'
                value={formData.deliveryDate}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, deliveryDate: e.target.value }))}
                className='h-11 pl-9 text-[13px] font-bold shadow-sm sm:h-10 sm:text-[12px]'
              />
            </div>
          </div>

          <div className='grid gap-1 md:col-span-3'>
            <Label className='pl-1 text-[8px] font-bold uppercase leading-none tracking-widest text-muted-foreground/80 italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.barcode')}
            </Label>
            <div className='group relative'>
              <BarcodeIcon className='absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-primary/60' />
              <Input
                placeholder={t('tradingSalesOrder.headerFields.barcodePlaceholder')}
                value={formData.barcode}
                readOnly
                className='h-11 cursor-not-allowed border-primary/20 bg-primary/5 pl-9 font-mono text-[13px] font-bold text-primary sm:h-10 sm:text-[12px]'
              />
            </div>
          </div>
        </div>
      </StatusGuard>
    </section>
  )
}
