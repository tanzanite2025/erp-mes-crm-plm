'use client'

import { Box } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function EngineeringWorkspaceLoadingState() {
  const { t } = useLanguage()

  return (
    <div className='flex-1 h-full flex flex-col items-center justify-center text-muted-foreground bg-background animate-pulse'>
      <div className='relative'>
        <div className='absolute inset-0 bg-blue-600/20 blur-2xl rounded-full' />
        <Box className='size-20 opacity-10 mb-6 relative z-10' />
      </div>
      <span className='text-[10px] font-black tracking-widest uppercase opacity-30'>
        {t('engineering.productMgmt.syncing')}
      </span>
    </div>
  )
}
