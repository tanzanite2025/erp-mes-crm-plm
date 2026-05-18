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
    <div className='rounded-[20px] border border-dashed border-green-200/60 bg-green-50/35 p-2.5 space-y-2'>
      <div className='flex flex-col gap-1 border-b border-dashed border-green-200/60 pb-1.5 sm:flex-row sm:items-center sm:justify-between'>
        <h4 className='text-[10px] font-black uppercase tracking-widest italic text-green-700'>
          {t('engineering.specForms.fork.title')}
        </h4>
        <Badge variant='outline' className='h-4 rounded-full border-green-200 bg-white px-1.5 text-[8px] font-mono uppercase tracking-wide text-green-700'>
          {t('engineering.specForms.fork.subtitle')}
        </Badge>
      </div>
      <div className='grid grid-cols-1 items-start content-start gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        <FormField
          control={form.control}
          name='offset'
          render={({ field }) => (
            <FormItem className='min-w-0 self-start content-start gap-0.5'>
              <FormLabel className='ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
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
                  className='h-[38px] w-full rounded-xl border-none bg-background/80 px-3 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='axleCrown'
          render={({ field }) => (
            <FormItem className='min-w-0 self-start content-start gap-0.5'>
              <FormLabel className='ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
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
                  className='h-[38px] w-full rounded-xl border-none bg-background/80 px-3 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='steerer'
          render={({ field }) => (
            <FormItem className='min-w-0 self-start content-start gap-0.5'>
              <FormLabel className='ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                {t('engineering.specForms.fork.steerer')}
              </FormLabel>
              <FormControl>
                <Input placeholder='1-1/8 to 1.5' {...field} className='h-[38px] w-full rounded-xl border-none bg-background/80 px-3 text-[11px] font-bold shadow-none' />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 opacity-70'>{t('engineering.specForms.fork.helper')}</p>
    </div>
  )
}

export function ForkSpecOverview({ product: _product }: { product: Product }) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[20px] bg-muted/5 border-2 border-dashed border-muted transition-all hover:bg-muted/10 group text-left sm:text-center'>
      <div className='flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-around gap-3 sm:gap-0 px-1 sm:px-2'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.fork.overviewCategory')}
          </span>
          <span className='text-xl sm:text-3xl font-black text-slate-800 tracking-tighter uppercase italic'>
            {t('engineering.specForms.fork.overviewCategoryValue')}
          </span>
        </div>
        <div className='hidden sm:block w-px h-10 bg-muted border-l border-dashed border-muted mx-3' />
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest'>
            {t('engineering.specForms.fork.overviewWeight')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-3xl font-mono font-black text-emerald-600 tracking-tighter italic'>—</span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>BOM</span>
          </div>
        </div>
        <div className='hidden sm:block w-px h-10 bg-muted border-l border-dashed border-muted mx-3' />
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
