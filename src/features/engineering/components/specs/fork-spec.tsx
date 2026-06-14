'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { type Product } from '../../data/schema'

export function ForkSpecForm({ form }: { form: UseFormReturn<Product> }) {
  const { t } = useLanguage()

  return (
    <div className='space-y-2 rounded-[20px] border border-dashed border-green-200/60 bg-green-50/35 p-2.5'>
      <div className='flex flex-col gap-1 border-b border-dashed border-green-200/60 pb-1.5 sm:flex-row sm:items-center sm:justify-between'>
        <h4 className='text-[10px] font-black tracking-widest text-green-700 uppercase italic'>
          {t('engineering.specForms.fork.title')}
        </h4>
        <Badge
          variant='outline'
          className='h-4 rounded-full border-green-200 bg-white px-1.5 font-mono text-[8px] tracking-wide text-green-700 uppercase'
        >
          {t('engineering.specForms.fork.subtitle')}
        </Badge>
      </div>
      <div className='grid grid-cols-1 content-start items-start gap-2 sm:grid-cols-2 lg:grid-cols-3'>
        <FormField
          control={form.control}
          name='offset'
          render={({ field }) => (
            <FormItem className='min-w-0 content-start gap-0.5 self-start'>
              <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('engineering.specForms.fork.offset')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='45 / 51'
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ''
                        ? undefined
                        : parseFloat(event.target.value)
                    )
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
            <FormItem className='min-w-0 content-start gap-0.5 self-start'>
              <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('engineering.specForms.fork.axleCrown')}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='370-400'
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ''
                        ? undefined
                        : parseFloat(event.target.value)
                    )
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
            <FormItem className='min-w-0 content-start gap-0.5 self-start'>
              <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('engineering.specForms.fork.steerer')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder='1-1/8 to 1.5'
                  {...field}
                  className='h-[38px] w-full rounded-xl border-none bg-background/80 px-3 text-[11px] font-bold shadow-none'
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <p className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase opacity-70'>
        {t('engineering.specForms.fork.helper')}
      </p>
    </div>
  )
}

export function ForkSpecOverview({ product: _product }: { product: Product }) {
  const { t } = useLanguage()

  return (
    <div className='group flex flex-col items-stretch gap-3 rounded-[20px] border-2 border-dashed border-muted bg-muted/5 p-3 text-left transition-all hover:bg-muted/10 sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-center'>
      <div className='flex flex-1 flex-col items-start justify-around gap-3 px-1 sm:flex-row sm:items-center sm:gap-0 sm:px-2'>
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            {t('engineering.specForms.fork.overviewCategory')}
          </span>
          <span className='text-xl font-black tracking-tighter text-slate-800 uppercase italic sm:text-3xl'>
            {t('engineering.specForms.fork.overviewCategoryValue')}
          </span>
        </div>
        <div className='mx-3 hidden h-10 w-px border-l border-dashed border-muted bg-muted sm:block' />
        <div className='flex flex-col gap-1.5'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            {t('engineering.specForms.fork.overviewWeight')}
          </span>
          <div className='flex items-baseline gap-1.5'>
            <span className='font-mono text-3xl font-black tracking-tighter text-emerald-600 italic'>
              —
            </span>
            <span className='text-[10px] font-black text-muted-foreground/20 italic'>
              BOM
            </span>
          </div>
        </div>
        <div className='mx-3 hidden h-10 w-px border-l border-dashed border-muted bg-muted sm:block' />
        <div className='flex items-center gap-3 text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase italic'>
          <Settings2 className='size-4 opacity-50' />
          <div className='flex flex-col'>
            <span>{t('engineering.specForms.fork.overviewLocked')}</span>
            <span className='text-[8px] opacity-50'>
              {t('engineering.specForms.fork.overviewLockedHint')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
