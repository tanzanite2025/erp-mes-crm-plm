'use client'

import type { ReactNode } from 'react'
import { Layers } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { type BOMFormOptionsResource } from '../hooks/use-bom-form-options'

interface BOMDialogResourceBoundaryProps {
  resource: BOMFormOptionsResource
  children: ReactNode
}

export function BOMDialogResourceBoundary({ resource, children }: BOMDialogResourceBoundaryProps) {
  const { t } = useLanguage()

  if (resource.status === 'error') {
    return (
      <div className='flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-dashed border-rose-200 bg-rose-50/60 px-6 py-8 text-center'>
        <div className='flex max-w-md flex-col items-center gap-2'>
          <Layers className='size-8 text-rose-500' />
          <div className='text-[10px] font-black uppercase tracking-widest text-rose-700'>
            {t('engineering.bomArchive.toasts.loadFailed')}
          </div>
          <p className='text-[11px] font-bold leading-relaxed text-foreground'>
            {resource.error.message}
          </p>
        </div>
      </div>
    )
  }

  if (resource.status === 'loading') {
    return (
      <div className='flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-dashed border-muted/40 bg-muted/5 px-6 py-8 text-center'>
        <div className='flex max-w-md flex-col items-center gap-2'>
          <Layers className='size-8 animate-pulse text-blue-400' />
          <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('engineering.bomArchive.header.title')}
          </div>
          <p className='text-[11px] font-bold leading-relaxed text-muted-foreground'>
            {t('engineering.bomArchive.toasts.loadFailed')}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
