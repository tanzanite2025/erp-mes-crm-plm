import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
    type RuleSegment, 
    ORDER_STATUS_OPTIONS 
} from '../../workflow-core/data/notification-rule-schema'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import { CommandBinding } from './command-binding'

interface SegmentFormProps {
    segment: RuleSegment
    onChange: (updates: Partial<RuleSegment>) => void
}

/**
 * 原子表单组件：负责单个分支 (Segment/Tab) 的通知配置
 */
export function SegmentForm({ segment, onChange }: SegmentFormProps) {
    const { roles } = useRoles()

    const toggleStatus = (v: string) => {
        const has = segment.targetStatuses.includes(v)
        onChange({ targetStatuses: has ? segment.targetStatuses.filter(s => s !== v) : [...segment.targetStatuses, v] })
    }

    const toggleResolveStatus = (v: string) => {
        const has = (segment.resolveOnStatuses ?? []).includes(v)
        const cur = segment.resolveOnStatuses ?? []
        onChange({ resolveOnStatuses: has ? cur.filter(s => s !== v) : [...cur, v] })
    }

    const toggleRole = (id: string) => {
        const has = segment.assigneeRoles.includes(id)
        onChange({ assigneeRoles: has ? segment.assigneeRoles.filter(r => r !== id) : [...segment.assigneeRoles, id] })
    }

    return (
        <div className='space-y-4 py-2 text-[11px] animate-in fade-in duration-300'>
            {/* 1. 触发状态 */}
            <div className='space-y-1.5'>
                <label className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
                    触发状态 (匹配任一即可，空=全部)
                </label>
                <div className='flex flex-wrap gap-1.5 p-2 bg-muted/20 rounded-xl border border-muted/20'>
                    {ORDER_STATUS_OPTIONS.map(o => {
                        const sel = segment.targetStatuses.includes(o.value)
                        return (
                            <Badge
                                key={o.value}
                                variant={sel ? 'default' : 'outline'}
                                className={cn('cursor-pointer text-[10px] py-0.5 px-2 transition-all',
                                    sel ? 'bg-primary border-primary' : 'bg-transparent text-muted-foreground hover:bg-muted'
                                )}
                                onClick={() => toggleStatus(o.value)}
                            >
                                {o.label}
                            </Badge>
                        )
                    })}
                </div>
            </div>

            {/* 2. 自动归档状态 */}
            <div className='space-y-1.5'>
                <label className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
                    自动归档 (订单进入以下状态时通知自动消失)
                </label>
                <div className='flex flex-wrap gap-1.5 p-2 bg-muted/20 rounded-xl border border-muted/20'>
                    {ORDER_STATUS_OPTIONS.map(o => {
                        const sel = (segment.resolveOnStatuses ?? []).includes(o.value)
                        return (
                            <Badge
                                key={o.value}
                                variant={sel ? 'secondary' : 'outline'}
                                className={cn('cursor-pointer text-[10px] py-0.5 px-2 transition-all',
                                    sel ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-transparent text-muted-foreground hover:bg-muted'
                                )}
                                onClick={() => toggleResolveStatus(o.value)}
                            >
                                {o.label}
                            </Badge>
                        )
                    })}
                </div>
            </div>

            {/* 3. 接收角色 & 动态角色 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                    <label className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
                        接收角色 (静态指定)
                    </label>
                    <div className='flex flex-wrap gap-1.5 p-2 bg-muted/20 rounded-xl border border-muted/20 min-h-[42px]'>
                        {roles.map(r => {
                            const sel = segment.assigneeRoles.includes(r.id)
                            return (
                                <Badge
                                    key={r.id}
                                    variant={sel ? 'default' : 'outline'}
                                    className={cn('cursor-pointer text-[10px] py-0.5 px-2 transition-all',
                                        sel ? 'bg-blue-600 border-blue-600' : 'bg-transparent text-muted-foreground hover:bg-muted'
                                    )}
                                    onClick={() => toggleRole(r.id)}
                                >
                                    {r.label}
                                </Badge>
                            )
                        })}
                    </div>
                </div>

                <div className='space-y-1.5'>
                    <label className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
                        动态角色 (根据业务数据自动路由)
                    </label>
                    <select
                        value={segment.dynamicRoleField ?? ''}
                        onChange={e => onChange({ dynamicRoleField: (e.target.value || null) as any })}
                        className='w-full bg-muted/40 border border-muted/20 rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:ring-1 ring-primary appearance-none'
                    >
                        <option value=''>不使用动态角色</option>
                        <option value='createdBy'>订单创建人 (createdBy)</option>
                        <option value='claimedBy'>负责人/认领人 (claimedBy)</option>
                        <option value='approval.manager'>直属审批经理 (approval.manager)</option>
                    </select>
                </div>
            </div>

            {/* 4. 指令绑定 (解耦至独立组件) */}
            <div className='space-y-1.5'>
                <label className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
                    绑定通知指令 (多选，支持名称/内容搜索)
                </label>
                <div className='p-4 bg-muted/20 rounded-[30px] border-2 border-muted/20'>
                    <CommandBinding 
                        selectedIds={segment.commandIds} 
                        onChange={ids => onChange({ commandIds: ids })} 
                    />
                </div>
            </div>
        </div>
    )
}
