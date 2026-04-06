'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getStoredProcesses, type ProcessStep } from './process-utils.ts'
import { CapabilityMappingDialog } from './capability-mapping-dialog'
import { useWorkArchitecture } from '../../../hooks/use-work-architecture'

interface CapabilityMappingNode {
    id: string
    code: string
    name: string
}

interface CapabilityMappingNodeProps {
    mappingNode: CapabilityMappingNode
    processes: ProcessStep[]
    onClick?: (mappingNode: CapabilityMappingNode) => void
}

export function CapabilityMappingNode({ mappingNode, processes, onClick }: CapabilityMappingNodeProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [allProcesses, setAllProcesses] = useState<ProcessStep[]>([])
    const { assignProcessCapability, removeProcessCapability } = useWorkArchitecture()

    useEffect(() => {
        if (isDialogOpen && allProcesses.length === 0) {
            getStoredProcesses().then(setAllProcesses)
        }
    }, [isDialogOpen, allProcesses.length])

    return (
        <>
        <Card
            className={`group relative border-slate-200 bg-white px-3 py-2 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
            onClick={() => {
                onClick?.(mappingNode)
            }}
        >
            <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5'>
                        <span className='size-1 rounded-full bg-slate-400 shrink-0' />
                        <span className='font-mono text-[9px] text-muted-foreground'>
                            {mappingNode.code}
                        </span>
                        <span className='font-medium text-[11px] leading-tight'>
                            {mappingNode.name}
                        </span>
                    </div>
                    <Button 
                        variant='ghost' 
                        size='icon' 
                        className='size-5 opacity-0 group-hover:opacity-100 hover:bg-purple-100 rounded-lg text-muted-foreground hover:text-purple-600 transition-opacity absolute right-2 top-2'
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsDialogOpen(true)
                        }}
                    >
                        <Settings2 className='size-3' />
                    </Button>
                </div>

                <div className='flex flex-wrap gap-1'>
                    {processes.length === 0 ? (
                        <span className='text-[9px] text-muted-foreground/50 italic'>
                            暂未绑定工序
                        </span>
                    ) : (
                        processes.map(p => (
                            <Badge
                                key={p.id}
                                variant='secondary'
                                className='px-1 py-0 text-[10px] bg-purple-50 text-purple-700 border-purple-100 h-4'
                            >
                                {p.name}
                            </Badge>
                        ))
                    )}
                </div>
            </div>
        </Card>
        
        <CapabilityMappingDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            nodeId={mappingNode.id}
            nodeName={mappingNode.name}
            allProcesses={allProcesses}
            assignedProcessIds={processes.map(p => p.id)}
            onAssignProcess={assignProcessCapability}
            onRemoveProcess={removeProcessCapability}
        />
        </>
    )
}
