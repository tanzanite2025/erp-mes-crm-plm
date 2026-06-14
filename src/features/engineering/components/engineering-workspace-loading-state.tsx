'use client'

import { Box } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function EngineeringWorkspaceLoadingState() {
  const { t } = useLanguage()

  return (
    <div className='flex h-full flex-1 animate-pulse flex-col items-center justify-center bg-background text-muted-foreground'>
      <div className='relative'>
        <div className='absolute inset-0 rounded-full bg-blue-600/20 blur-2xl' />
        <Box className='relative z-10 mb-6 size-20 opacity-10' />
      </div>
      <span className='text-[10px] font-black tracking-widest uppercase opacity-30'>
        {t('engineering.productMgmt.syncing')}
      </span>
    </div>
  )
}
