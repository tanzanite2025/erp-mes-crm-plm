'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Check, ArrowRightLeft, Settings2 } from 'lucide-react'
import type { ProcessStep } from './process-utils'

interface CapabilityMappingDialogProps {
  nodeId: string
  nodeName: string
  isOpen: boolean
  onClose: () => void
  allProcesses: ProcessStep[]
  assignedProcessIds: string[]
  onAssignProcess: (nodeId: string, processId: string) => Promise<void>
  onRemoveProcess: (nodeId: string, processId: string) => Promise<void>
}

export function CapabilityMappingDialog({
  nodeId,
  nodeName,
  isOpen,
  onClose,
  allProcesses,
  assignedProcessIds,
  onAssignProcess,
  onRemoveProcess,
}: CapabilityMappingDialogProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const assignedSet = useMemo(() => new Set(assignedProcessIds), [assignedProcessIds])
  const unassignedProcesses = allProcesses.filter(p => !assignedSet.has(p.id))
  const assignedProcesses = allProcesses.filter(p => assignedSet.has(p.id))

  const handleToggle = async (processId: string, isAssigned: boolean) => {
    setIsProcessing(processId)
    try {
      if (isAssigned) {
        await onRemoveProcess(nodeId, processId)
      } else {
        await onAssignProcess(nodeId, processId)
      }
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl'>
        <DialogHeader className='border-b border-dashed border-slate-200 bg-muted/5 px-8 py-6'>
          <DialogTitle className='flex items-center gap-3'>
            <div className='flex size-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600'>
              <Settings2 className='size-4' />
            </div>
            <div>
              <h2 className='text-xl font-black italic tracking-tighter uppercase text-slate-800'>
                {nodeName} <span className='font-mono text-[11px] tracking-widest text-muted-foreground/40'>[{nodeId.substring(0, 8)}]</span>
              </h2>
              <p className='mt-1 text-[10px] font-black tracking-widest uppercase text-muted-foreground/60'>
                PROCESS_CAPABILITY_MAPPING
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='flex h-[60vh] flex-col md:h-[500px] md:flex-row'>
          <div className='flex flex-1 flex-col bg-slate-50/50'>
            <div className='px-6 pb-3 pt-5'>
              <h3 className='text-[11px] font-black tracking-widest uppercase text-slate-500'>
                GLOBAL_PROCESS_POOL (未装配)
              </h3>
            </div>
            <ScrollArea className='flex-1 px-6 pb-6'>
              <div className='flex flex-wrap gap-2'>
                {unassignedProcesses.map(p => (
                  <Button
                    key={p.id}
                    variant='outline'
                    disabled={isProcessing === p.id}
                    onClick={() => handleToggle(p.id, false)}
                    className='h-auto justify-start rounded-xl border-dashed bg-white px-3 py-2 font-bold transition-all hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700'
                  >
                    {p.name}
                  </Button>
                ))}
                {unassignedProcesses.length === 0 && (
                  <span className='text-[10px] font-black italic uppercase text-muted-foreground/30'>已全盘吸纳</span>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className='z-10 hidden flex-col items-center justify-center border-x border-dashed border-slate-200 bg-white px-4 md:flex'>
            <div className='flex size-10 items-center justify-center rounded-full border-2 border-dashed border-slate-200 shadow-inner'>
              <ArrowRightLeft className='size-4 text-slate-300' />
            </div>
          </div>

          <div className='flex flex-1 flex-col bg-muted/5'>
            <div className='flex items-center justify-between px-6 pb-3 pt-5'>
              <h3 className='text-[11px] font-black tracking-widest uppercase text-purple-700'>
                ACTIVATED_CAPABILITIES (已赋能)
              </h3>
              <Badge className='bg-purple-600 text-[9px] font-black hover:bg-purple-600'>{assignedProcesses.length}</Badge>
            </div>
            <ScrollArea className='flex-1 px-6 pb-6'>
              <div className='flex flex-col gap-2'>
                {assignedProcesses.map(p => (
                  <div key={p.id} className='group flex items-center justify-between rounded-2xl border border-purple-100 bg-white p-3 shadow-sm transition-all hover:border-rose-200'>
                    <div className='flex items-center gap-2'>
                      <div className='flex size-5 items-center justify-center rounded-full bg-purple-100'>
                        <Check className='size-3 text-purple-600' />
                      </div>
                      <span className='text-sm font-black text-slate-700'>{p.name}</span>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={isProcessing === p.id}
                      onClick={() => handleToggle(p.id, true)}
                      className='h-7 rounded-lg text-[10px] font-black tracking-widest uppercase text-rose-500 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100'
                    >
                      DETACH
                    </Button>
                  </div>
                ))}
                {assignedProcesses.length === 0 && (
                  <div className='mt-10 flex h-full flex-col items-center justify-center opacity-30'>
                    <Settings2 className='mb-2 size-12' />
                    <span className='text-[10px] font-black tracking-widest uppercase'>NO_CAPABILITIES_ASSIGNED</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
