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
    <div className='rounded-[20px] border border-dashed border-purple-200/60 bg-purple-50/35 p-2.5 space-y-2'>
      <div className='flex flex-col gap-1 border-b border-dashed border-purple-200/60 pb-1.5 sm:flex-row sm:items-center sm:justify-between'>
        <h4 className='text-[10px] font-black uppercase tracking-widest italic text-purple-700'>
          {t('engineering.specForms.stem.title')}
        </h4>
        <Badge variant='outline' className='h-4 rounded-full border-purple-200 bg-white px-1.5 text-[8px] font-mono uppercase tracking-wide text-purple-700'>
          {t('engineering.specForms.stem.subtitle')}
        </Badge>
      </div>
      <div className='grid grid-cols-1 items-start content-start gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        <FormField
          control={form.control}
          name='length'
          render={({ field }) => (
            <FormItem className='min-w-0 self-start content-start gap-0.5'>
              <FormLabel className='ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
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
                  className='h-[38px] w-full rounded-xl border-none bg-background/80 px-3 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='angle'
          render={({ field }) => (
            <FormItem className='min-w-0 self-start content-start gap-0.5'>
              <FormLabel className='ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
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
                  className='h-[38px] w-full rounded-xl border-none bg-background/80 px-3 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='clamp'
          render={({ field }) => (
            <FormItem className='min-w-0 self-start content-start gap-0.5'>
              <FormLabel className='ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                {t('engineering.specForms.stem.clamp')}
              </FormLabel>
              <FormControl>
                <Input placeholder='31.8 / 35' {...field} className='h-[38px] w-full rounded-xl border-none bg-background/80 px-3 text-[11px] font-bold shadow-none' />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 opacity-70'>{t('engineering.specForms.stem.helper')}</p>
    </div>
  )
}

export function StemSpecOverview({ product: _product }: { product: Product }) {
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
            <span className='text-3xl font-mono font-black text-emerald-600 tracking-tighter italic'>—</span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>BOM</span>
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
