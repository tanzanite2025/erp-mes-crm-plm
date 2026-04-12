'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowDown, Activity, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { type Product, type ProductProcessRouting, type ProductProcessRoutingNode } from '../../data/schema'
import { createProductRoutingDraft } from '../../utils/default-builders'
import { normalizeProductRoutingEntity } from '../../utils/product-code-normalization'
import { useProductionProcessesQuery } from '@/features/production-shared/hooks/use-production-resources'

interface ProductRoutingViewProps {
    product: Product
}

export function ProductRoutingView({ product }: ProductRoutingViewProps) {
    // Mock a current routing state, later to be hooked up with real backend query
    const [currentBlueprint, setCurrentBlueprint] = useState<ProductProcessRouting>(createProductRoutingDraft({
        targetProductId: product.id,
    }))
    const normalizedCurrentBlueprint = useMemo(
        () => normalizeProductRoutingEntity(currentBlueprint),
        [currentBlueprint]
    )
    const { data: globalProcessResourcePool } = useProductionProcessesQuery()
    const availableProcesses = useMemo(() => globalProcessResourcePool ?? [], [globalProcessResourcePool])
    const displayedRouteNodes = useMemo(() => {
        if (normalizedCurrentBlueprint.routeNodes.length > 0 || availableProcesses.length < 2) {
            return normalizedCurrentBlueprint.routeNodes
        }

        return [
            {
                id: crypto.randomUUID(),
                sequenceNumber: 10,
                processStepId: availableProcesses[0].id,
                processStepName: availableProcesses[0].name,
                standardTimeValueInSeconds: 360,
                requiredJobCategoryTitle: '核心制造组',
                qualityInspectionRequired: false,
            },
            {
                id: crypto.randomUUID(),
                sequenceNumber: 20,
                processStepId: availableProcesses[1].id,
                processStepName: availableProcesses[1].name,
                standardTimeValueInSeconds: 120,
                requiredJobCategoryTitle: '外观检视组',
                qualityInspectionRequired: true,
            }
        ]
    }, [availableProcesses, normalizedCurrentBlueprint.routeNodes])
    const sortedDisplayedRouteNodes = useMemo(
        () => [...displayedRouteNodes].sort((a, b) => a.sequenceNumber - b.sequenceNumber),
        [displayedRouteNodes]
    )

    const handleSimulateAddNode = () => {
        if (availableProcesses.length === 0) {
            toast.error('全局工序库为空，请先在拓扑管理中定义标准工序。')
            return
        }
        const newNode: ProductProcessRoutingNode = {
            id: crypto.randomUUID(),
            sequenceNumber: (displayedRouteNodes.length + 1) * 10,
            processStepId: availableProcesses[0].id,
            processStepName: availableProcesses[0].name,
            standardTimeValueInSeconds: 0,
            qualityInspectionRequired: false
        }
        setCurrentBlueprint(prev => normalizeProductRoutingEntity({ ...prev, routeNodes: [...displayedRouteNodes, newNode] }))
        toast.info('挂载了新的空白前置节点，请填写具体指引')
    }

    return (
        <div className='flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-4xl'>
            <div className='flex items-end justify-between border-b-2 border-dashed border-muted pb-4'>
                <div className='space-y-1'>
                     <div className='flex items-center gap-2'>
                        <div className='size-2 bg-purple-600 rounded-full animate-pulse' />
                        <span className='text-[9px] font-black uppercase tracking-widest text-purple-600/60 leading-none'>
                            PRODUCT_EXECUTION_ROUTING
                        </span>
                    </div>
                    <div className='flex items-center gap-3'>
                        <h2 className='text-3xl font-black tracking-tighter uppercase italic text-slate-800 leading-none'>
                            工艺流转规划
                        </h2>
                    </div>
                </div>
                <div className='flex items-center gap-3'>
                    <Badge variant='outline' className='bg-purple-50 text-purple-700 border-purple-200 uppercase text-[10px] tracking-widest font-black py-1 px-4 rounded-full'>
                        {normalizedCurrentBlueprint.versionControlTag}
                    </Badge>
                </div>
            </div>

            <div className='relative ml-4 md:ml-12 border-l-2 border-dashed border-blue-200/60 pb-8'>
                <div className='absolute -left-3 -top-2 flex size-6 items-center justify-center rounded-full bg-blue-100 border border-blue-300'>
                    <Activity className='size-3 text-blue-600' />
                </div>

                <div className='pl-8 pt-4 space-y-4'>
                    {sortedDisplayedRouteNodes.map((node, index) => (
                        <div key={node.id} className='relative group'>
                            <div className='absolute -left-[45px] top-4 flex size-5 items-center justify-center rounded-full bg-white border-2 border-slate-300 text-[10px] font-black text-slate-500 shadow-sm transition-colors group-hover:border-blue-500 group-hover:text-blue-600'>
                                {(index + 1).toString().padStart(2, '0')}
                            </div>

                            <Card className='p-0 overflow-hidden border border-dashed border-slate-300 group-hover:border-blue-400 group-hover:shadow-md transition-all bg-white rounded-2xl'>
                                <div className='flex flex-row items-stretch'>
                                    <div className='bg-slate-50 border-r border-dashed border-slate-200 flex flex-col justify-center px-4 py-3 shrink-0 items-center min-w-[80px]'>
                                        <span className='text-[10px] uppercase font-black tracking-widest text-muted-foreground/60'>SEQ_NO</span>
                                        <span className='text-xl font-black italic tracking-tighter text-slate-700'>{node.sequenceNumber}</span>
                                    </div>
                                    <div className='flex-1 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4'>
                                        <div className='space-y-1.5'>
                                            <div className='flex items-center gap-2'>
                                                <h3 className='text-lg font-black text-slate-800 tracking-tight'>
                                                    {node.processStepName}
                                                </h3>
                                                {node.qualityInspectionRequired && (
                                                    <Badge variant='outline' className='bg-rose-50 text-rose-600 border-rose-200 text-[9px] px-1.5 py-0 h-4'>质检拦截 (QA_GATE)</Badge>
                                                )}
                                            </div>
                                            <div className='flex items-center gap-3 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest'>
                                                <span>STANDARD_TIME: {node.standardTimeValueInSeconds}s</span>
                                                <span className='w-1 h-1 rounded-full bg-slate-300' />
                                                <span>REQUIRED: {node.requiredJobCategoryTitle || 'GENERIC_OPERATOR'}</span>
                                            </div>
                                        </div>
                                        <Button variant='ghost' size='icon' className='text-muted-foreground/30 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity'>
                                            <Settings2 className='size-4' />
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {index !== sortedDisplayedRouteNodes.length - 1 && (
                                <div className='absolute -left-[35px] bottom-[-24px] z-10'>
                                     <ArrowDown className='size-3 text-slate-300' />
                                </div>
                            )}
                        </div>
                    ))}

                    <div className='relative pt-2'>
                       <div className='absolute -left-[45px] top-6 flex size-5 items-center justify-center rounded-full bg-slate-100 border-2 border-dashed border-slate-300 text-[10px] font-black text-slate-400'>
                            +
                        </div>
                        <Button 
                            variant='outline' 
                            className='w-full border-dashed border-2 py-8 rounded-2xl bg-muted/5 hover:bg-blue-50/50 hover:border-blue-300 hover:text-blue-600 transition-all font-black text-muted-foreground'
                            onClick={handleSimulateAddNode}
                        >
                            <Plus className='size-4 mr-2' /> APPEND NEW OPERATIONAL NODE
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
