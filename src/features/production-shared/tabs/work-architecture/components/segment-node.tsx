'use client'

import { Badge } from '@/components/ui/badge'
import { Layers, MessageSquarePlus, Activity } from 'lucide-react'
import type { Segment } from '../../line-mgmt/types.ts'
import { ProcessCapabilityNode } from './process-capability-node.tsx'
import type { ProcessStep } from './process-utils.ts'
import { useCommands } from '@/features/system-mgmt/workflow-core/hooks/use-commands'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useState } from 'react'
import { type StandardCommand } from '@/features/system-mgmt/workflow-core/data/schema'

interface SegmentNodeProps {
    segment: Segment
    resolvedProcesses: Record<string, ProcessStep[]>
}

export function SegmentNode({ segment, resolvedProcesses }: SegmentNodeProps) {
    const { commands } = useCommands()
    const [assignedCmds, setAssignedCmds] = useState<string[]>([])
    const isEmpty = (segment.processes || []).length === 0
    const directProcesses = resolvedProcesses[segment.id] || []

    return (
        <div className='group/segment'>
            <div className='flex items-center gap-3 px-5 py-2 bg-slate-50/50 group-hover/segment:bg-blue-50/30 transition-colors'>
                <Badge variant='outline' className='bg-blue-600 border-blue-600 text-white gap-1 px-1.5 py-0 h-5 shadow-sm'>
                    <Layers className='size-3' />
                    <span className='text-[10px]'>工段</span>
                </Badge>
                <span className='font-bold text-sm text-slate-700'>{segment.name}</span>
                
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant='ghost' size='icon' className='size-6 rounded-lg hover:bg-blue-100/50 text-blue-500/40 hover:text-blue-600 transition-all'>
                            <MessageSquarePlus className='size-3.5' />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-64 p-2 rounded-xl border-2' align='start'>
                        <div className='space-y-2'>
                            <p className='text-[10px] font-black uppercase text-muted-foreground px-1 tracking-widest'>分配业务指令 / Assign Action</p>
                            <div className='max-h-48 overflow-y-auto space-y-1'>
                                {commands.filter((c: StandardCommand) => c.bindType === 'SECTION' || c.bindType === 'GLOBAL').map((cmd: StandardCommand) => (
                                    <Button 
                                        key={cmd.id} 
                                        variant='ghost' 
                                        className='w-full justify-start text-[11px] h-auto py-2 px-2 font-bold hover:bg-blue-50'
                                        onClick={() => {
                                            setAssignedCmds(prev => Array.from(new Set([...prev, cmd.title])))
                                            toast.success(`指令 [${cmd.title}] 已成功分配至工段: ${segment.name}`)
                                        }}
                                    >
                                        <div className='flex items-center gap-2'>
                                            <div className='size-1.5 rounded-full bg-blue-500 shrink-0' />
                                            <span>{cmd.title}</span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {assignedCmds.length > 0 && (
                    <div className='flex gap-1 animate-in zoom-in-95'>
                        {assignedCmds.map(title => (
                            <Badge key={title} variant='outline' className='h-4 px-1 text-[8px] border-blue-200 bg-blue-50 text-blue-600 font-black animate-pulse'>
                                <Activity className='size-2 mr-0.5' /> {title}
                            </Badge>
                        ))}
                    </div>
                )}
                
                {directProcesses.length > 0 && (
                    <div className='flex gap-1 items-center ml-2 border-l pl-3 border-slate-200'>
                        {directProcesses.map(p => (
                            <Badge 
                                key={p.id} 
                                variant='secondary' 
                                className='px-1 py-0 text-[10px] bg-purple-50 text-purple-700 border-purple-100 h-4'
                            >
                                {p.name}
                            </Badge>
                        ))}
                    </div>
                )}

                {isEmpty && directProcesses.length === 0 && (
                    <span className='text-[10px] text-muted-foreground/30 italic ml-1'>
                        (未配置工序)
                    </span>
                )}
            </div>
            
            {!isEmpty && (
                <div className='px-5 pb-4 pt-2 space-y-4'>
                    {segment.processes.map((processNode) => (
                        <ProcessCapabilityNode 
                            key={processNode.id} 
                            processNode={processNode} 
                            resolvedProcesses={resolvedProcesses}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
