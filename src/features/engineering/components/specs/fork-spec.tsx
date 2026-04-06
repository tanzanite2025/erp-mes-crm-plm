'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { type Product } from '../../data/schema'

export function ForkSpecForm({ form }: { form: UseFormReturn<Product> }) {
  const { t } = useLanguage()

  return (
    <div className='p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-100/50 dark:border-green-900/30 space-y-3'>
      <div className='flex items-center justify-between border-b border-green-100 dark:border-green-900/50 pb-1.5'>
        <h4 className='text-xs font-semibold text-green-600 dark:text-green-400'>
          {t('engineering.specForms.fork.title')}
        </h4>
        <Badge variant='outline' className='text-[10px] bg-background dark:bg-slate-900'>
          {t('engineering.specForms.fork.subtitle')}
        </Badge>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <FormField
          control={form.control}
          name='offset'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] sm:text-xs'>
                {t('engineering.specForms.fork.offset')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='45 / 51'
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
          name='axleCrown'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] sm:text-xs'>
                {t('engineering.specForms.fork.axleCrown')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='370-400'
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
          name='steerer'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] sm:text-xs'>
                {t('engineering.specForms.fork.steerer')}
              </FormLabel>
              <FormControl>
                <Input placeholder='1-1/8 to 1.5' {...field} />
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
                {t('engineering.specForms.fork.weight')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='380'
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
      <p className='text-[10px] text-muted-foreground italic'>{t('engineering.specForms.fork.helper')}</p>
    </div>
  )
}

export function ForkSpecOverview({ product }: { product: Product }) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted transition-all hover:bg-muted/10 group text-left sm:text-center'>
      <div className='flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-around gap-4 sm:gap-0 px-2 sm:px-4'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.fork.overviewCategory')}
          </span>
          <span className='text-xl sm:text-3xl font-black text-slate-800 tracking-tighter uppercase italic'>
            {t('engineering.specForms.fork.overviewCategoryValue')}
          </span>
        </div>
        <div className='hidden sm:block w-px h-12 bg-muted border-l border-dashed border-muted mx-4' />
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.fork.overviewWeight')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-3xl font-mono font-black text-emerald-600 tracking-tighter italic'>
              {product.weight || '0'}
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>G</span>
          </div>
        </div>
        <div className='hidden sm:block w-px h-12 bg-muted border-l border-dashed border-muted mx-4' />
        <div className='flex items-center gap-3 text-muted-foreground/30 italic text-[10px] font-black uppercase tracking-widest'>
          <Settings2 className='size-4 opacity-50' />
          <div className='flex flex-col'>
            <span>{t('engineering.specForms.fork.overviewLocked')}</span>
            <span className='text-[8px] opacity-50'>{t('engineering.specForms.fork.overviewLockedHint')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
