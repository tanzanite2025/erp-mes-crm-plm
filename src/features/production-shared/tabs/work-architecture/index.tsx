'use client'

import { useEffect, useState } from 'react'
import { LayoutGrid, Search } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/forbidden-state'
import { useProductionLinesQuery } from '../../hooks/use-production-resources'
import { ProcessLibraryPanel } from './components/process-library-panel.tsx'
import { WorkArchitectureTree } from './components/work-architecture-tree.tsx'

const logger = createLogger('WorkArchitecture')

export function WorkArchitecture() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const { data: lines, isLoading, error } = useProductionLinesQuery()
  const availableLines = lines ?? []

  useEffect(() => {
    if (!error) {
      return
    }

    logger.error('Failed to load production lines from backend', error)
    toast.error(t('productionShared.workArchitecture.loadFailed'))
  }, [error, t])

  const filteredLines = availableLines.filter(
    (line) =>
      line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <LayoutGrid className='size-4' />
          <h3 className='text-lg font-black tracking-tighter italic'>
            {t('productionShared.workArchitecture.title')}
          </h3>
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground opacity-60'>
          {t('productionShared.workArchitecture.description')}
        </p>
      </div>

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='relative max-w-sm flex-1'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t(
              'productionShared.workArchitecture.searchPlaceholder'
            )}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <ProcessLibraryPanel />

      <div className='flex-1 space-y-6 overflow-y-auto'>
        {isLoading && availableLines.length === 0 ? (
          <div className='space-y-4'>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className='space-y-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-6'
              >
                <div className='flex items-center gap-3'>
                  <Skeleton className='size-10 rounded-2xl' />
                  <div className='space-y-2'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-2 w-16' />
                  </div>
                </div>
                <Skeleton className='h-40 w-full rounded-[22px]' />
              </div>
            ))}
          </div>
        ) : filteredLines.length === 0 ? (
          <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5'>
            <CardContent className='flex flex-col items-center justify-center space-y-4 py-24'>
              <LayoutGrid className='size-12 text-muted-foreground/20' />
              <div className='space-y-1 text-center'>
                <p className='text-base font-black tracking-tighter text-muted-foreground/60 italic'>
                  {t('productionShared.workArchitecture.emptyTitle')}
                </p>
                <p className='text-[9px] font-black tracking-widest text-muted-foreground/40'>
                  {t('productionShared.workArchitecture.emptyDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredLines.map((line) => (
            <div key={line.id} className='group space-y-3'>
              <div className='flex items-center gap-3 px-2'>
                <div className='flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition-transform group-hover:scale-110'>
                  <LayoutGrid className='size-5' />
                </div>
                <div>
                  <h3 className='text-base font-black tracking-tighter text-slate-800 italic'>
                    {line.name}
                  </h3>
                  <p className='font-mono text-[9px] font-black tracking-widest text-muted-foreground/50'>
                    {line.code}
                  </p>
                </div>
              </div>

              <div className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-1 shadow-inner'>
                <div className='overflow-hidden rounded-[22px] bg-background/80'>
                  <WorkArchitectureTree segments={line.segments} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
