'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProcessStep as LineProcessStep } from '../../line-mgmt/types'
import { getStoredProcesses, type ProcessStep } from './process-utils'
import { CapabilityMappingDialog } from './capability-mapping-dialog'
import { useWorkArchitecture } from '../../../hooks/use-work-architecture'

interface ProcessCapabilityNodeProps {
    processNode: LineProcessStep
    resolvedProcesses: Record<string, ProcessStep[]>
}

export function ProcessCapabilityNode({ processNode, resolvedProcesses }: ProcessCapabilityNodeProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [allProcesses, setAllProcesses] = useState<ProcessStep[]>([])
    const { assignProcessCapability, removeProcessCapability } = useWorkArchitecture()
    const processes = resolvedProcesses[processNode.id] || []

    useEffect(() => {
        if (isDialogOpen && allProcesses.length === 0) {
            getStoredProcesses().then(setAllProcesses)
        }
    }, [isDialogOpen, allProcesses.length])

    return (
        <div className='space-y-3 relative pl-3 border-l-2 border-slate-100 group/job'>
            <div className='flex items-center justify-between pr-4'>
                <div className='flex items-center gap-3'>
                    <Badge variant='outline' className='bg-orange-500 border-orange-500 text-white gap-1 px-1.5 py-0 h-5 shadow-sm'>
                        <Briefcase className='size-3' />
                        <span className='text-[10px]'>工序</span>
                    </Badge>
                    <span className='font-semibold text-xs text-slate-600'>{processNode.name}</span>
                </div>
                <Button 
                    variant='ghost' 
                    size='icon' 
                    className='size-6 opacity-0 group-hover/job:opacity-100 hover:bg-orange-100 rounded-lg text-muted-foreground hover:text-orange-600 transition-opacity'
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Settings2 className='size-3.5' />
                </Button>
            </div>
            
            <div className='flex flex-wrap gap-1.5'>
                {processes.length === 0 ? (
                    <p className='text-[10px] text-muted-foreground/30 italic py-1 pl-1'>
                        未配置关联工艺能力
                    </p>
                ) : (
                    processes.map(p => (
                        <Badge
                            key={p.id}
                            variant='secondary'
                            className='px-1.5 py-0 text-[10px] bg-sky-50 text-sky-700 border-sky-100 h-5 font-bold transition-all hover:bg-sky-100'
                        >
                            {p.name}
                        </Badge>
                    ))
                )}
            </div>

            <CapabilityMappingDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                nodeId={processNode.id}
                nodeName={processNode.name}
                allProcesses={allProcesses}
                assignedProcessIds={processes.map(p => p.id)}
                onAssignProcess={assignProcessCapability}
                onRemoveProcess={removeProcessCapability}
            />
        </div>
    )
}
