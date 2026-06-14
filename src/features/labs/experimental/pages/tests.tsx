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
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ForbiddenState } from '@/components/forbidden-state'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  useLabExperimentalMutations,
  useLabExperimentalTasks,
} from '../hooks/use-lab-experimental'

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

  const {
    data: taskData,
    isLoading,
    error,
  } = useLabExperimentalTasks(1, 50, activeTab)
  const tasks: LabExperimentalTaskSummary[] = Array.isArray(taskData?.items)
    ? taskData.items
    : []
  const { saveTaskMutation } = useLabExperimentalMutations()

  const handleStartTest = (taskId: string) => {
    saveTaskMutation.mutate({ id: taskId, status: 'TESTING' })
  }

  if (isLoading && tasks.length === 0) {
    return (
      <div className='flex animate-pulse flex-col gap-8'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='h-12 w-96 rounded-full bg-muted/10' />
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
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
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={FlaskConical}
        title={t('labExperimental.tests.title')}
        description={t('labExperimental.tests.description')}
      />

      <div className='flex flex-col justify-between gap-6 px-1 lg:flex-row lg:items-center'>
        <SegmentedTabs
          tabs={[
            {
              value: 'PRESSURE',
              label: t('labExperimental.tests.tabPressure'),
            },
            {
              value: 'TEMPERATURE',
              label: t('labExperimental.tests.tabTemperature'),
            },
            {
              value: 'DESTRUCTION',
              label: t('labExperimental.tests.tabDestruction'),
            },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
        />

        <div className='group relative max-w-sm flex-1'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
          <Input
            placeholder={t('labExperimental.tests.searchPlaceholder')}
            className='h-11 w-full rounded-full border-none bg-muted/40 pl-11 text-[10px] font-black tracking-widest uppercase shadow-inner transition-all focus:bg-background'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className='relative flex h-[400px] flex-col items-center justify-center overflow-hidden rounded-[40px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <FlaskConical className='mb-6 size-16 animate-pulse stroke-[1.5px] text-primary opacity-5' />
          <p className='text-[11px] font-black tracking-[0.4em] text-muted-foreground/20 uppercase italic'>
            {t('labExperimental.tests.empty')}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
          {tasks.map((task) => (
            <Card
              key={task.id}
              className='group relative cursor-pointer overflow-hidden rounded-[32px] border-none bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl'
            >
              <div
                className={cn(
                  'absolute top-0 bottom-0 left-0 w-1.5 transition-colors duration-500',
                  task.status === 'PENDING'
                    ? 'bg-amber-500/20'
                    : task.status === 'TESTING'
                      ? 'animate-pulse bg-blue-500'
                      : task.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                )}
              />

              <CardContent className='flex items-center gap-8 p-8'>
                <div className='flex-1 space-y-5'>
                  <div className='flex items-center gap-3'>
                    <Badge
                      variant='outline'
                      className='h-5 rounded-md border-dashed bg-muted/20 px-2 py-0 font-mono text-[9px] font-black tracking-tighter'
                    >
                      {task.code}
                    </Badge>
                    <div className='flex items-center gap-1.5 opacity-30'>
                      <Fingerprint className='size-3' />
                      <span className='text-[9px] font-black tracking-widest uppercase'>
                        SAMPLE: {task.sampleId}
                      </span>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <h3 className='line-clamp-1 text-base font-black tracking-tighter text-slate-800 uppercase italic'>
                      {task.name}
                    </h3>
                    <div className='flex items-center gap-4 text-[9px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase'>
                      <div className='flex items-center gap-1.5'>
                        <User className='size-3' /> {task.executor || 'TBD'}
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <Clock className='size-3' />{' '}
                        {task.scheduledAt
                          ? new Date(task.scheduledAt).toLocaleDateString()
                          : 'TBD'}
                      </div>
                    </div>
                  </div>

                  <div className='relative pt-2'>
                    <div className='flex h-1.5 w-full overflow-hidden rounded-full bg-muted/20'>
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
                    <div className='mt-2 flex justify-between text-[8px] font-black tracking-widest uppercase opacity-30'>
                      <span>QUEUED</span>
                      <span>ACTIVE</span>
                      <span>ARCHIVED</span>
                    </div>
                  </div>
                </div>

                <div className='flex shrink-0 flex-col items-center gap-4'>
                  <div className='flex size-14 items-center justify-center rounded-2xl bg-muted/10 shadow-inner transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(59,130,246,0.3)]'>
                    <Boxes className='size-7 opacity-20 group-hover:opacity-100' />
                  </div>
                  {task.status === 'PENDING' ? (
                    <Button
                      size='sm'
                      className='h-9 gap-2 rounded-full bg-blue-500 px-5 text-[9px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/20 transition-all group-hover:scale-110 hover:bg-blue-600 active:scale-95'
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
                        'flex items-center gap-1.5 text-[10px] font-black uppercase italic',
                        task.status === 'ARCHIVED'
                          ? 'text-slate-400'
                          : 'text-emerald-500'
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
