'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { type Product } from '../../data/schema'

export function StemSpecForm({ form }: { form: UseFormReturn<Product> }) {
  const { t } = useLanguage()

  return (
    <div className='p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-100/50 dark:border-purple-900/30 space-y-3'>
      <div className='flex items-center justify-between border-b border-purple-100 dark:border-purple-900/50 pb-1.5'>
        <h4 className='text-xs font-semibold text-purple-600 dark:text-purple-400'>
          {t('engineering.specForms.stem.title')}
        </h4>
        <Badge variant='outline' className='text-[10px] bg-background dark:bg-slate-900'>
          {t('engineering.specForms.stem.subtitle')}
        </Badge>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <FormField
          control={form.control}
          name='length'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] sm:text-xs'>
                {t('engineering.specForms.stem.length')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='80-120'
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='angle'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] sm:text-xs'>
                {t('engineering.specForms.stem.angle')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='-6 / -12'
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='clamp'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] sm:text-xs'>
                {t('engineering.specForms.stem.clamp')}
              </FormLabel>
              <FormControl>
                <Input placeholder='31.8 / 35' {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='weight'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] sm:text-xs'>
                {t('engineering.specForms.stem.weight')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='120'
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <p className='text-[10px] text-muted-foreground italic'>{t('engineering.specForms.stem.helper')}</p>
    </div>
  )
}

export function StemSpecOverview({ product }: { product: Product }) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[20px] bg-muted/5 border-2 border-dashed border-muted transition-all hover:bg-muted/10 group text-left sm:text-center'>
      <div className='flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-around gap-3 sm:gap-0 px-1 sm:px-2'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.stem.overviewCategory')}
          </span>
          <span className='text-xl sm:text-3xl font-black text-slate-800 tracking-tighter uppercase italic'>
            {t('engineering.specForms.stem.overviewCategoryValue')}
          </span>
        </div>
        <div className='hidden sm:block w-px h-10 bg-muted border-l border-dashed border-muted mx-3' />
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.stem.overviewWeight')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-3xl font-mono font-black text-emerald-600 tracking-tighter italic'>
              {product.weight || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>G</span>
          </div>
        </div>
        <div className='hidden sm:block w-px h-10 bg-muted border-l border-dashed border-muted mx-3' />
        <div className='flex items-center gap-3 text-muted-foreground/30 italic text-[10px] font-black uppercase tracking-widest'>
          <Settings2 className='size-4 opacity-50' />
          <div className='flex flex-col'>
            <span>{t('engineering.specForms.stem.overviewLocked')}</span>
            <span className='text-[8px] opacity-50'>{t('engineering.specForms.stem.overviewLockedHint')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
