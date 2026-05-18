'use client'

import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { type Product } from '../../data/schema'

interface RimSpecFormProps {
  form: UseFormReturn<Product>
}

export function RimSpecForm({
  form,
}: RimSpecFormProps) {
  const { t } = useLanguage()

  return (
    <div className='rounded-[18px] border border-dashed border-blue-200/60 bg-blue-50/30 p-2'>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        <FormField
          control={form.control}
          name='depth'
          render={({ field }) => (
            <FormItem className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0'>
              <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 whitespace-nowrap'>{t('engineering.specForms.rim.depth')}</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t('engineering.specForms.rim.depthPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                  className='h-8 w-full rounded-lg border-none bg-background/90 px-2.5 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='widthInternal'
          render={({ field }) => (
            <FormItem className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0'>
              <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 whitespace-nowrap'>
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
                  className='h-8 w-full rounded-lg border-none bg-background/90 px-2.5 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='widthExternal'
          render={({ field }) => (
            <FormItem className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0'>
              <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 whitespace-nowrap'>
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
                  className='h-8 w-full rounded-lg border-none bg-background/90 px-2.5 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='maxTirePressure'
          render={({ field }) => (
            <FormItem className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0'>
              <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 whitespace-nowrap'>
                {t('engineering.specForms.rim.maxTirePressure')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t('engineering.specForms.rim.maxTirePressurePlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                  className='h-8 w-full rounded-lg border-none bg-background/90 px-2.5 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

export function RimSpecOverview({ product }: { product: Product }) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[20px] bg-muted/5 border-2 border-dashed border-muted transition-all hover:bg-muted/10 group'>
      <div className='flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-5 px-1 sm:px-2'>
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
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.rim.overviewWeight')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-2xl sm:text-3xl font-mono font-black text-emerald-600 tracking-tighter italic'>—</span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>BOM</span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
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
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
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
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.rim.overviewMaxTirePressure')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-2xl sm:text-3xl font-mono font-black text-amber-600 tracking-tighter italic'>
              {product.maxTirePressure || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>PSI</span>
          </div>
        </div>
      </div>
    </div>
  )
}
