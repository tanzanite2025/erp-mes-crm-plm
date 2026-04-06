import { useState } from 'react'
import { 
    Trash2, ChevronDown, ChevronUp, Pencil, 
    Check, X, Plus, Layers, Settings2, BellRing 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { 
    type NotificationRule, 
    type RuleSegment,
} from '../../workflow-core/data/notification-rule-schema'
import { SegmentForm } from './segment-form'

interface RuleCardProps {
    rule: NotificationRule
    onUpdate: (id: string, updates: Partial<NotificationRule>) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onToggle: (id: string) => Promise<void>
}

/**
 * 单个规则卡片组件：支持多分支 (Tab) 配置
 */
export function RuleCard({ rule, onUpdate, onDelete, onToggle }: RuleCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isEditingHeader, setIsEditingHeader] = useState(false)
    const [editName, setEditName] = useState(rule.name)
    const [activeTab, setActiveTab] = useState(rule.segments[0]?.id || '')

    // ─── 头部编辑 ────────────────────────────────────────────────────────────
    const handleSaveHeader = async () => {
        await onUpdate(rule.id, { name: editName })
        setIsEditingHeader(false)
    }

    // ─── 分支操作 (Tabs) ─────────────────────────────────────────────────────
    const handleUpdateSegment = async (segId: string, updates: Partial<RuleSegment>) => {
        const nextSegments = rule.segments.map(s => s.id === segId ? { ...s, ...updates } : s)
        await onUpdate(rule.id, { segments: nextSegments })
    }

    const handleAddSegment = async () => {
        const newSeg: RuleSegment = {
            id: '',
            title: `新阶段 ${rule.segments.length + 1}`,
            targetStatuses: [],
            commandIds: [],
            assigneeRoles: [],
            resolveOnStatuses: ['Done', 'Canceled'],
            dynamicRoleField: null
        }
        const nextSegments = [...rule.segments, newSeg]
        await onUpdate(rule.id, { segments: nextSegments })
        setActiveTab(newSeg.id)
        setIsExpanded(true)
    }

    const handleDeleteSegment = async (segId: string) => {
        if (rule.segments.length <= 1) return
        const nextSegments = rule.segments.filter(s => s.id !== segId)
        await onUpdate(rule.id, { segments: nextSegments })
        if (activeTab === segId) setActiveTab(nextSegments[0].id)
    }

    const handleRenameSegment = async (segId: string, newTitle: string) => {
        const nextSegments = rule.segments.map(s => s.id === segId ? { ...s, title: newTitle } : s)
        await onUpdate(rule.id, { segments: nextSegments })
    }

    return (
        <div className={cn(
            'group rounded-3xl border-2 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md',
            rule.enabled ? 'border-muted/40 bg-card' : 'border-muted/20 bg-muted/5 opacity-70'
        )}>
            {/* 1. 卡片头部 (总控) */}
            <div className='flex items-center gap-4 px-6 py-4'>
                <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => onToggle(rule.id)}
                    className='data-[state=checked]:bg-primary'
                />

                <div className='flex-1 min-w-0 pr-2'>
                    {isEditingHeader ? (
                        <div className='flex items-center gap-2'>
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className='bg-muted/40 border-none rounded-xl px-3 py-1.5 text-[13px] font-black outline-none focus:ring-1 ring-primary w-full max-w-sm'
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSaveHeader()}
                            />
                            <Button size='icon' variant='ghost' className='size-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20' onClick={handleSaveHeader}>
                                <Check className='size-4' />
                            </Button>
                            <Button size='icon' variant='ghost' className='size-8 rounded-full' onClick={() => { setIsEditingHeader(false); setEditName(rule.name) }}>
                                <X className='size-4' />
                            </Button>
                        </div>
                    ) : (
                        <div className='flex items-center gap-3'>
                            <h3 className='text-[13px] font-black tracking-tight truncate flex items-center gap-2'>
                                {rule.name}
                                <Button variant='ghost' size='icon' className='size-5 opacity-0 group-hover:opacity-100 transition-opacity' onClick={() => setIsEditingHeader(true)}>
                                    <Pencil className='size-3 text-muted-foreground' />
                                </Button>
                            </h3>
                            <Badge variant='outline' className='text-[9px] font-black tracking-widest uppercase px-2 py-0.5 bg-purple-50 text-purple-600 border-purple-100 shadow-sm'>
                                {rule.entity}
                            </Badge>
                        </div>
                    )}
                    
                    <div className='flex items-center gap-4 mt-1 opacity-60'>
                        <span className='text-[10px] font-bold flex items-center gap-1.5'>
                            <Layers className='size-3' /> 分支：{rule.segments.length}
                        </span>
                        <span className='text-[10px] font-bold flex items-center gap-1.5'>
                            <Settings2 className='size-3' /> 触发：{rule.segments.map(s => s.targetStatuses.length).reduce((a, b) => a + b, 0)}
                        </span>
                        <span className='text-[10px] font-bold flex items-center gap-1.5'>
                            <BellRing className='size-3' /> 指令：{rule.segments.map(s => s.commandIds.length).reduce((a, b) => a + b, 0)}
                        </span>
                    </div>
                </div>

                <div className='flex items-center gap-2'>
                    <Button
                        variant='ghost' size='icon'
                        className='size-9 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/5'
                        onClick={handleAddSegment}
                        title='添加业务分支'
                    >
                        <Plus className='size-4' />
                    </Button>
                    <Button
                        variant='ghost' size='icon'
                        className='size-9 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/5'
                        onClick={() => onDelete(rule.id)}
                        title='删除整个规则'
                    >
                        <Trash2 className='size-4' />
                    </Button>
                    <Button
                        variant='ghost' size='icon'
                        className='size-9 rounded-2xl text-muted-foreground'
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronUp className='size-5' /> : <ChevronDown className='size-5' />}
                    </Button>
                </div>
            </div>

            {/* 2. 展开内容 (Tabs 分支管理) */}
            {isExpanded && (
                <div className='px-6 pb-6 pt-2 border-t border-muted/10 bg-muted/5 animate-in slide-in-from-top-2 duration-300'>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
                        <div className='flex items-center justify-between mb-4'>
                            <TabsList className='bg-transparent h-auto p-0 gap-2 flex-wrap justify-start'>
                                {rule.segments.map(seg => (
                                    <TabsTrigger
                                        key={seg.id}
                                        value={seg.id}
                                        className={cn(
                                            'px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2',
                                            'data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-lg shadow-primary/20',
                                            'data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-transparent data-[state=inactive]:hover:bg-muted/60'
                                        )}
                                    >
                                        {seg.title}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {rule.segments.map(seg => (
                            <TabsContent key={seg.id} value={seg.id} className='mt-0'>
                                <div className='rounded-3xl border-2 border-primary/10 bg-card/80 p-5 space-y-4'>
                                    {/* 分支标题快速编辑 */}
                                    <div className='flex items-center justify-between border-b border-muted/20 pb-4'>
                                        <div className='flex items-center gap-2'>
                                            <input
                                                value={seg.title}
                                                onChange={e => handleRenameSegment(seg.id, e.target.value)}
                                                className='bg-transparent border-none p-0 text-[12px] font-black tracking-tight text-primary outline-none focus:ring-0 max-w-[120px]'
                                            />
                                            <Badge className='bg-primary/10 text-primary border-none text-[8px] font-black uppercase'>Active Branch</Badge>
                                        </div>
                                        {rule.segments.length > 1 && (
                                            <Button 
                                                variant='ghost' size='icon' 
                                                className='size-7 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5'
                                                onClick={() => handleDeleteSegment(seg.id)}
                                            >
                                                <Trash2 className='size-3.5' />
                                            </Button>
                                        )}
                                    </div>

                                    {/* 配置表单 */}
                                    <SegmentForm 
                                        segment={seg} 
                                        onChange={updates => handleUpdateSegment(seg.id, updates)} 
                                    />
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            )}
        </div>
    )
}
