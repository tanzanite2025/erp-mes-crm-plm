'use client'

import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { type Product } from '../../data/schema'

interface RimSpecFormProps {
  form: UseFormReturn<Product>
}

export function RimSpecForm({ form }: RimSpecFormProps) {
  const { t } = useLanguage()

  return (
    <div className='rounded-[18px] border border-dashed border-blue-200/60 bg-blue-50/30 p-2'>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        <FormField
          control={form.control}
          name='depth'
          render={({ field }) => (
            <FormItem className='grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0'>
              <FormLabel className='text-[10px] font-black tracking-widest whitespace-nowrap text-muted-foreground/70 uppercase'>
                {t('engineering.specForms.rim.depth')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t('engineering.specForms.rim.depthPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ''
                        ? undefined
                        : parseFloat(event.target.value)
                    )
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
              <FormLabel className='text-[10px] font-black tracking-widest whitespace-nowrap text-muted-foreground/70 uppercase'>
                {t('engineering.specForms.rim.internalWidth')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t(
                    'engineering.specForms.rim.internalWidthPlaceholder'
                  )}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ''
                        ? undefined
                        : parseFloat(event.target.value)
                    )
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
              <FormLabel className='text-[10px] font-black tracking-widest whitespace-nowrap text-muted-foreground/70 uppercase'>
                {t('engineering.specForms.rim.externalWidth')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t(
                    'engineering.specForms.rim.externalWidthPlaceholder'
                  )}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ''
                        ? undefined
                        : parseFloat(event.target.value)
                    )
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
              <FormLabel className='text-[10px] font-black tracking-widest whitespace-nowrap text-muted-foreground/70 uppercase'>
                {t('engineering.specForms.rim.maxTirePressure')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder={t(
                    'engineering.specForms.rim.maxTirePressurePlaceholder'
                  )}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ''
                        ? undefined
                        : parseFloat(event.target.value)
                    )
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
    <div className='group flex flex-col items-stretch gap-3 rounded-[20px] border-2 border-dashed border-muted bg-muted/5 p-3 transition-all hover:bg-muted/10 sm:flex-row sm:items-center sm:gap-4 sm:p-4'>
      <div className='grid flex-1 grid-cols-2 gap-3 px-1 sm:grid-cols-5 sm:gap-5 sm:px-2'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            {t('engineering.specForms.rim.overviewDepth')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='font-mono text-3xl font-black tracking-tighter text-slate-800 italic'>
              {product.depth || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>
              MM
            </span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            {t('engineering.specForms.rim.overviewWeight')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='font-mono text-2xl font-black tracking-tighter text-emerald-600 italic sm:text-3xl'>
              —
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>
              BOM
            </span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            {t('engineering.specForms.rim.overviewInternalWidth')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='font-mono text-2xl font-black tracking-tighter text-slate-800 italic sm:text-3xl'>
              {product.widthInternal || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>
              MM
            </span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            {t('engineering.specForms.rim.overviewExternalWidth')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='font-mono text-2xl font-black tracking-tighter text-slate-800 italic sm:text-3xl'>
              {product.widthExternal || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>
              MM
            </span>
          </div>
        </div>
        <div className='flex flex-col gap-1.5 sm:border-l sm:border-dashed sm:border-muted sm:pl-5'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            {t('engineering.specForms.rim.overviewMaxTirePressure')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='font-mono text-2xl font-black tracking-tighter text-amber-600 italic sm:text-3xl'>
              {product.maxTirePressure || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>
              PSI
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
