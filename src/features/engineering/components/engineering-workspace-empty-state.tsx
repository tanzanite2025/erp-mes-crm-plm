'use client'

import { Box, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'

interface EngineeringWorkspaceEmptyStateProps {
  onInitializeProject: () => void
}

export function EngineeringWorkspaceEmptyState({
  onInitializeProject,
}: EngineeringWorkspaceEmptyStateProps) {
  const { t } = useLanguage()

  return (
    <div className='flex-1 h-full p-3 sm:p-4 flex items-center justify-center bg-background rounded-r-[32px]'>
      <div className='w-full max-w-xl relative'>
        {/* 背景装饰：增强 UDS 深度感 */}
        <div className='absolute -inset-4 bg-linear-to-b from-blue-600/5 to-transparent blur-3xl rounded-full opacity-50' />
        
        <EmptyState
          icon={Box}
          title={t('engineering.productMgmt.selectPrompt')}
          description={t('engineering.productMgmt.initiateProject')}
          className='border-none bg-transparent p-0'
          action={
            <Button
              className='h-auto py-3 px-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-1'
              onClick={onInitializeProject}
            >
              <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest'>
                <Plus className='size-4' /> {t('engineering.productMgmt.initializeNewProject')}
              </div>
            </Button>
          }
        />
      </div>
    </div>
  )
}
