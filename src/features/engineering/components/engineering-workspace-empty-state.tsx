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
    <div className='flex-1 h-full p-4 flex items-center justify-center bg-background rounded-r-[32px]'>
      <div className='w-full h-full rounded-[24px] border-2 border-dashed border-muted/30 bg-muted/5 flex items-center justify-center p-6 relative overflow-hidden'>
        <div className='absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-600/10 to-transparent' />
        <div className='w-full max-w-xl relative'>
          <div className='absolute inset-x-0 top-0 mx-auto size-24 bg-blue-600/5 blur-2xl rounded-full' />
          <EmptyState
            icon={Box}
            title={t('engineering.productMgmt.selectPrompt')}
            description={t('engineering.productMgmt.initiateProject')}
            action={
              <Button
                className='h-auto py-2.5 px-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-0.5'
                onClick={onInitializeProject}
              >
                <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-90'>
                  <Plus className='size-3.5' /> {t('engineering.productMgmt.initializeNewProject')}
                </div>
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}
