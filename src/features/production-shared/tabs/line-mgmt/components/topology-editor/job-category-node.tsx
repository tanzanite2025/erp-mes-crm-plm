import { Users, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProcessStep } from '../../types'

interface ProcessNodeProps {
  process: ProcessStep
  onUpdate: (process: ProcessStep) => void
  onRemove: () => void
}

export function ProcessNode({ process, onUpdate, onRemove }: ProcessNodeProps) {

  return (
    <div className='overflow-hidden rounded-lg border border-slate-200 bg-background dark:border-white/10 dark:bg-white/4'>
      <div className='flex items-center justify-between bg-slate-50/50 p-3 dark:bg-white/3'>
        <div className='flex items-center gap-2 flex-1'>
          <div className='flex items-center gap-2 pl-2'>
            <Users className='size-3.5 text-blue-500' />
            <Input 
              value={process.name}
              onChange={(e) => onUpdate({ ...process, name: e.target.value })}
              className='h-7 w-40 border-transparent bg-transparent text-sm font-medium hover:border-slate-200 focus:border-slate-300 dark:text-slate-100 dark:hover:border-white/10 dark:focus:border-white/15'
            />
          </div>
        </div>
        <div className='flex items-center gap-1'>
          <Button size='sm' variant='ghost' onClick={onRemove} className='h-7 px-2 text-[10px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'>
            <Trash2 className='size-3' />
          </Button>
        </div>
      </div>
    </div>
  )
}
