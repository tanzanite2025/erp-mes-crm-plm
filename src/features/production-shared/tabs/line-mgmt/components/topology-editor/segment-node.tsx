import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Layout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Segment, ProcessStep } from '../../types'
import { ProcessNode } from './job-category-node.tsx'
import { useLanguage } from '@/context/language-provider'

interface SegmentNodeProps {
  segment: Segment
  index: number
  onUpdate: (segment: Segment) => void
  onRemove: () => void
}

export function SegmentNode({ segment, index, onUpdate, onRemove }: SegmentNodeProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(true)

  const handleAddProcess = () => {
    const newProcess: ProcessStep = {
      id: crypto.randomUUID(),
      name: `${t('orgPersonnel.lineMgmt.editor.newProcessName')} ${segment.processes.length + 1}`,
    }
    onUpdate({
      ...segment,
      processes: [...segment.processes, newProcess],
    })
  }

  const handleUpdateProcess = (updatedProcess: ProcessStep) => {
    onUpdate({
      ...segment,
      processes: segment.processes.map(process => process.id === updatedProcess.id ? updatedProcess : process),
    })
  }

  const handleRemoveProcess = (id: string) => {
    onUpdate({
      ...segment,
      processes: segment.processes.filter(process => process.id !== id),
    })
  }

  return (
    <Card className='border-l-4 border-l-slate-800 shadow-sm dark:border-white/10 dark:border-l-slate-200'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 bg-slate-50/30 p-4 dark:bg-white/3'>
        <div className='flex items-center gap-3 flex-1'>
          <Button 
            variant='ghost' 
            size='icon' 
            className='size-6' 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className='size-4' /> : <ChevronRight className='size-4' />}
          </Button>
          <div className='flex items-center gap-2'>
            <div className='flex size-6 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-white dark:bg-slate-200 dark:text-slate-900'>
              {index + 1}
            </div>
            <Layout className='size-4 text-slate-500' />
            <Input 
              value={segment.name}
              onChange={(e) => onUpdate({ ...segment, name: e.target.value })}
              className='h-8 w-48 border-transparent bg-transparent font-bold hover:border-slate-200 focus:border-slate-300 dark:text-slate-100 dark:hover:border-white/10 dark:focus:border-white/15'
            />
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='ghost' onClick={handleAddProcess} className='h-8 text-xs gap-1'>
            <Plus className='size-3' /> {t('orgPersonnel.lineMgmt.editor.addProcess')}
          </Button>
          <Button size='sm' variant='ghost' onClick={onRemove} className='h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'>
            <Trash2 className='size-3' />
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className='p-4 pt-0 space-y-4'>
          <div className='mt-2 space-y-4 border-l-2 border-slate-100 pl-8 dark:border-white/10'>
             {segment.processes.length === 0 ? (
               <p className='text-xs text-muted-foreground italic py-2'>{t('orgPersonnel.lineMgmt.editor.noProcesses')}</p>
             ) : (
               segment.processes.map((process) => (
                 <ProcessNode 
                   key={process.id}
                   process={process}
                   onUpdate={handleUpdateProcess}
                   onRemove={() => handleRemoveProcess(process.id)}
                 />
               ))
             )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
