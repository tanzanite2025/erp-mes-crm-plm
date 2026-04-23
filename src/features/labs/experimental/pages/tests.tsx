import { useState } from 'react'
import {
  Archive,
  Boxes,
  CheckCircle2,
  Clock,
  Fingerprint,
  FlaskConical,
  PlayCircle,
  Search,
  User,
} from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLabExperimentalMutations, useLabExperimentalTasks } from '../hooks/use-lab-experimental'

type LabExperimentalTaskSummary = {
  id: string
  code?: string
  sampleId?: string
  name?: string
  executor?: string
  scheduledAt?: string
  status?: string
}

export function LabTestsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('PRESSURE')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: taskData, isLoading, error } = useLabExperimentalTasks(1, 50, activeTab)
  const tasks: LabExperimentalTaskSummary[] = Array.isArray(taskData?.items) ? taskData.items : []
  const { saveTaskMutation } = useLabExperimentalMutations()

  const handleStartTest = (taskId: string) => {
    saveTaskMutation.mutate({ id: taskId, status: 'TESTING' })
  }

  if (isLoading && tasks.length === 0) {
    return (
      <div className='flex flex-col gap-8 animate-pulse'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='h-12 w-96 rounded-full bg-muted/10' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {[1, 2, 4].map((i) => (
            <div key={i} className='h-48 rounded-[32px] bg-muted/5' />
          ))}
        </div>
      </div>
    )
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={FlaskConical}
        title={t('labExperimental.tests.title')}
        description={t('labExperimental.tests.description')}
      />

      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1'>
        <SegmentedTabs
          tabs={[
            { value: 'PRESSURE', label: t('labExperimental.tests.tabPressure') },
            { value: 'TEMPERATURE', label: t('labExperimental.tests.tabTemperature') },
            { value: 'DESTRUCTION', label: t('labExperimental.tests.tabDestruction') },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
        />

        <div className='relative group flex-1 max-w-sm'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors' />
          <Input
            placeholder={t('labExperimental.tests.searchPlaceholder')}
            className='h-11 w-full pl-11 rounded-full bg-muted/40 border-none shadow-inner text-[10px] font-black uppercase tracking-widest focus:bg-background transition-all'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className='relative rounded-[40px] border border-dashed border-muted/50 bg-muted/5 h-[400px] flex flex-col items-center justify-center overflow-hidden shadow-inner'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <FlaskConical className='size-16 mb-6 opacity-5 stroke-[1.5px] text-primary animate-pulse' />
          <p className='text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/20 italic'>
            {t('labExperimental.tests.empty')}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          {tasks.map((task) => (
            <Card
              key={task.id}
              className='group relative rounded-[32px] border-none bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:scale-[1.01] transition-all duration-500 overflow-hidden cursor-pointer'
            >
              <div
                className={cn(
                  'absolute top-0 bottom-0 left-0 w-1.5 transition-colors duration-500',
                  task.status === 'PENDING'
                    ? 'bg-amber-500/20'
                    : task.status === 'TESTING'
                      ? 'bg-blue-500 animate-pulse'
                      : task.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                )}
              />

              <CardContent className='p-8 flex items-center gap-8'>
                <div className='flex-1 space-y-5'>
                  <div className='flex items-center gap-3'>
                    <Badge
                      variant='outline'
                      className='rounded-md border-dashed bg-muted/20 text-[9px] font-black font-mono tracking-tighter py-0 h-5 px-2'
                    >
                      {task.code}
                    </Badge>
                    <div className='flex items-center gap-1.5 opacity-30'>
                      <Fingerprint className='size-3' />
                      <span className='text-[9px] font-black uppercase tracking-widest'>
                        SAMPLE: {task.sampleId}
                      </span>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <h3 className='text-base font-black italic uppercase tracking-tighter text-slate-800 line-clamp-1'>
                      {task.name}
                    </h3>
                    <div className='flex items-center gap-4 text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]'>
                      <div className='flex items-center gap-1.5'>
                        <User className='size-3' /> {task.executor || 'TBD'}
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <Clock className='size-3' /> {task.scheduledAt ? new Date(task.scheduledAt).toLocaleDateString() : 'TBD'}
                      </div>
                    </div>
                  </div>

                  <div className='relative pt-2'>
                    <div className='h-1.5 w-full bg-muted/20 rounded-full overflow-hidden flex'>
                      <div
                        className={cn(
                          'h-full transition-all duration-1000',
                          task.status === 'PENDING'
                            ? 'w-1/4 bg-amber-500'
                            : task.status === 'TESTING'
                              ? 'w-1/2 bg-blue-500'
                              : 'w-full bg-emerald-500'
                        )}
                      />
                    </div>
                    <div className='flex justify-between mt-2 text-[8px] font-black uppercase tracking-widest opacity-30'>
                      <span>QUEUED</span>
                      <span>ACTIVE</span>
                      <span>ARCHIVED</span>
                    </div>
                  </div>
                </div>

                <div className='shrink-0 flex flex-col items-center gap-4'>
                  <div className='size-14 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner group-hover:shadow-[0_8px_20px_rgba(59,130,246,0.3)]'>
                    <Boxes className='size-7 opacity-20 group-hover:opacity-100' />
                  </div>
                  {task.status === 'PENDING' ? (
                    <Button
                      size='sm'
                      className='rounded-full h-9 px-5 bg-blue-500 hover:bg-blue-600 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 group-hover:scale-110 active:scale-95 transition-all gap-2'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartTest(task.id)
                      }}
                    >
                      <PlayCircle className='size-3.5' /> START
                    </Button>
                  ) : (
                    <div
                      className={cn(
                        'text-[10px] font-black italic uppercase flex items-center gap-1.5',
                        task.status === 'ARCHIVED' ? 'text-slate-400' : 'text-emerald-500'
                      )}
                    >
                      {task.status === 'ARCHIVED' ? (
                        <Archive className='size-3.5' />
                      ) : (
                        <CheckCircle2 className='size-3.5' />
                      )}
                      {task.status}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
