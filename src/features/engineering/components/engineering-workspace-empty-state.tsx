'use client'

import { Box, Plus } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

interface EngineeringWorkspaceEmptyStateProps {
  onInitializeProject: () => void
}

export function EngineeringWorkspaceEmptyState({
  onInitializeProject,
}: EngineeringWorkspaceEmptyStateProps) {
  const { t } = useLanguage()

  return (
    <div className='flex h-full flex-1 items-center justify-center rounded-r-[32px] bg-background p-3 sm:p-4'>
      <div className='relative w-full max-w-xl'>
        {/* 背景装饰：增强 UDS 深度感 */}
        <div className='absolute -inset-4 rounded-full bg-linear-to-b from-blue-600/5 to-transparent opacity-50 blur-3xl' />

        <EmptyState
          icon={Box}
          title={t('engineering.productMgmt.selectPrompt')}
          description={t('engineering.productMgmt.initiateProject')}
          className='border-none bg-transparent p-0'
          action={
            <Button
              className='flex h-auto flex-col items-center gap-1 rounded-full bg-slate-900 px-10 py-3 text-white shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800 active:scale-95'
              onClick={onInitializeProject}
            >
              <div className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase'>
                <Plus className='size-4' />{' '}
                {t('engineering.productMgmt.initializeNewProject')}
              </div>
            </Button>
          }
        />
      </div>
    </div>
  )
}
