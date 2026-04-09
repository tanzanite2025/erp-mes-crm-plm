'use client'

import { type MaterialRequirement } from '../../data/requirement-schema'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Download, Printer, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { RequirementList } from './requirement-list'
import { MoldRequirementAlert } from './mold-requirement-alert'
import { RequirementExportService } from '../../services/requirement-export-service'

interface RequirementDrawerProps {
  isOpen: boolean
  onClose: () => void
  data: MaterialRequirement[]
  stats: {
    analyzedModels: { modelName: string; totalQty: number }[]
  }
  isLoading: boolean
  selectedCount: number
}

export function RequirementDrawer({ isOpen, onClose, data, stats, isLoading, selectedCount }: RequirementDrawerProps) {
  const { locale, t } = useLanguage()

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side='right' className='w-full sm:max-w-[1050px] p-0 border-l-2 border-dashed border-primary/20 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] bg-[#F8FAFC] rounded-l-[32px] overflow-hidden'>
        <div className='h-full flex flex-col'>
          <div className='bg-white/80 backdrop-blur-md border-b border-dashed px-8 py-7 relative overflow-hidden'>
            <div className='absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none'>
              <Download className='size-40 rotate-12 text-primary' />
            </div>

            <div className='flex items-center justify-between relative z-10'>
              <div className='space-y-1'>
                <div className='flex items-center gap-4'>
                  <div className='px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] italic border border-primary/20'>
                    {t('trading.requirements.drawer.badge')}
                  </div>
                  <SheetTitle className='text-3xl font-black tracking-tighter italic uppercase'>
                    {t('trading.requirements.drawer.title')}
                  </SheetTitle>
                </div>
                <SheetDescription className='text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest pl-1'>
                  {t('trading.requirements.drawer.description', { count: selectedCount })}
                </SheetDescription>
              </div>

              <div className='flex items-center gap-2 pr-6'>
                <Button variant='outline' size='sm' className='rounded-full h-11 px-6 text-[11px] font-black uppercase gap-2 border-2 border-dashed border-muted/50 hover:bg-muted/5' onClick={() => window.print()}>
                  <Printer className='size-4' />
                  {t('trading.requirements.drawer.printList')}
                </Button>
                <Button
                  size='sm'
                  className='rounded-full h-11 px-8 text-[11px] font-black uppercase gap-2 bg-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all'
                  onClick={async () => {
                    try {
                      await RequirementExportService.exportToExcel(data, locale)
                      toast.success(t('trading.requirements.drawer.exportSuccess'), {
                        description: t('trading.requirements.drawer.exportSuccessDescription'),
                      })
                    } catch (error) {
                      failLoudly(error, 'RequirementDrawer.exportToExcel')
                    }
                  }}
                >
                  <Download className='size-4' />
                  {t('trading.requirements.drawer.exportExcel')}
                </Button>
              </div>
            </div>
          </div>

          <div className='flex-1 overflow-y-auto p-6 custom-scrollbar [scrollbar-gutter:stable]'>
            <MoldRequirementAlert models={stats.analyzedModels} />
            <RequirementList data={data} isLoading={isLoading} />
          </div>

          <div className='px-6 py-4 bg-white border-t flex items-center justify-between text-[10px] font-bold text-muted-foreground/40'>
            <div className='flex items-center gap-4'>
              <span className='flex items-center gap-1.5 uppercase'>
                <div className='size-1.5 rounded-full bg-primary' />
                {t('trading.requirements.drawer.realtimeNotice')}
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <Share2 className='size-3 hover:text-primary cursor-pointer transition-colors' />
              <span>{t('trading.requirements.drawer.shareLink')}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
