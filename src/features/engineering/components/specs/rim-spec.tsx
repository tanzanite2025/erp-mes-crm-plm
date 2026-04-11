'use client'

import type { UseFormReturn } from 'react-hook-form'
import { ListChecks } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { type Product } from '../../data/schema'
import { getProductAttributes } from '../../utils/product-utils'

interface RimSpecFormProps {
  form: UseFormReturn<Product>
  options: {
    versionCategoryOptions: Array<{ label: string; value: string }>
  }
  selectedVariants: { level: string; weight: number | undefined }[]
  onVariantToggle: (level: string, checked: boolean) => void
  onWeightChange: (level: string, weight: number | undefined) => void
}

export function RimSpecForm({
  form,
  options,
  selectedVariants,
  onVariantToggle,
  onWeightChange,
}: RimSpecFormProps) {
  const { t } = useLanguage()

  return (
    <div className='p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100/50 dark:border-blue-900/30 space-y-2'>
      <div className='flex items-center justify-between border-b border-blue-100 dark:border-blue-900/50 pb-1.5'>
        <h4 className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
          {t('engineering.specForms.rim.title')}
        </h4>
        <Badge variant='outline' className='text-[10px] bg-background dark:bg-slate-900'>
          {t('engineering.specForms.rim.subtitle')}
        </Badge>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2'>
        <FormField
          control={form.control}
          name='depth'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-blue-600/70'>{t('engineering.specForms.rim.depth')}</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t('engineering.specForms.rim.depthPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                  className='h-8 w-full bg-background/50'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='widthInternal'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-blue-600/70'>
                {t('engineering.specForms.rim.internalWidth')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t('engineering.specForms.rim.internalWidthPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                  className='h-8 w-full bg-background/50'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='widthExternal'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-blue-600/70'>
                {t('engineering.specForms.rim.externalWidth')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t('engineering.specForms.rim.externalWidthPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                  className='h-8 w-full bg-background/50'
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className='p-2 bg-blue-600/5 rounded-xl border border-blue-600/10 space-y-2'>
        <div className='flex items-center gap-2 text-blue-700'>
          <ListChecks className='size-3' />
          <span className='text-[10px] font-black uppercase tracking-wider'>
            {t('engineering.specForms.rim.matrixTitle')}
          </span>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1'>
          {options.versionCategoryOptions.map((option) => {
            const isSelected = selectedVariants.some((variant) => variant.level === option.value)
            const variant = selectedVariants.find((entry) => entry.level === option.value)

            return (
              <div
                key={option.value}
                className={`flex items-center justify-between p-1 px-1.5 rounded border transition-all ${
                  isSelected
                    ? 'bg-background border-blue-200 shadow-sm'
                    : 'bg-muted/5 border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <div className='flex items-center space-x-1.5'>
                  <Checkbox
                    id={`spec-level-${option.value}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => onVariantToggle(option.value, !!checked)}
                    className='size-3.5 data-[state=checked]:bg-blue-600'
                  />
                  <Label htmlFor={`spec-level-${option.value}`} className='text-[10px] font-bold cursor-pointer'>
                    {option.label}
                  </Label>
                </div>

                {isSelected && (
                  <div className='flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200'>
                    <div className='text-[9px] text-muted-foreground mr-0.5'>
                      {t('engineering.specForms.rim.targetWeight')}
                    </div>
                    <Input
                      type='number'
                      className='h-6 w-16 text-xs font-mono font-bold bg-blue-50/50 border-blue-100 focus-visible:ring-blue-400'
                      value={variant?.weight ?? ''}
                      placeholder='g'
                      onChange={(event) =>
                        onWeightChange(
                          option.value,
                          event.target.value === '' ? undefined : parseFloat(event.target.value)
                        )
                      }
                    />
                    <span className='text-[9px] font-bold text-blue-600/40'>g</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function RimSpecOverview({ product }: { product: Product }) {
  const { t } = useLanguage()
  const productView = getProductAttributes(product)

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted transition-all hover:bg-muted/10 group'>
      <div className='flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 px-2 sm:px-4'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.rim.overviewDepth')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-3xl font-mono font-black text-slate-800 tracking-tighter italic'>
              {product.depth || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>MM</span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-8'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.rim.overviewWeight')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-2xl sm:text-3xl font-mono font-black text-emerald-600 tracking-tighter italic'>
              {product.weight || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>G</span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-8'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.rim.overviewInternalWidth')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-2xl sm:text-3xl font-mono font-black text-slate-800 tracking-tighter italic'>
              {product.widthInternal || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>MM</span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-8'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.rim.overviewExternalWidth')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-2xl sm:text-3xl font-mono font-black text-slate-800 tracking-tighter italic'>
              {product.widthExternal || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>MM</span>
          </div>
        </div>
      </div>
      <div className='px-8 py-4 bg-blue-600 rounded-3xl flex flex-col items-center justify-center shrink-0 shadow-2xl shadow-blue-600/30 group-hover:scale-105 transition-transform'>
        <span className='text-[10px] text-blue-100/40 font-black uppercase tracking-widest mb-1 leading-none'>
          {t('engineering.specForms.rim.overviewBadge')}
        </span>
        <span className='text-lg font-black text-white uppercase tracking-tighter italic leading-none'>
          {productView.tireType}
        </span>
      </div>
    </div>
  )
}
