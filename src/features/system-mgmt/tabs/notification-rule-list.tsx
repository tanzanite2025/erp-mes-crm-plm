import { Plus, Bell, Loader2, ShieldCheck } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { isForbiddenError } from '@/lib/error-status'
import { useNotificationRules } from '../workflow-core/hooks/use-notification-rules'
import { RuleCard } from './components/rule-card'
import { type NotificationRule } from '../workflow-core/data/notification-rule-schema'

/**
 * 通知规则管理中心 (V2)
 * 职责：容器层，负责规则列表的整体布局与生命周期管理
 */
export function NotificationRuleList() {
    const { rules, isLoaded, error, addRule, updateRule, deleteRule, toggleRule } = useNotificationRules()

    const handleAddNewRule = async () => {
        const newRule: Omit<NotificationRule, 'id' | 'createdAt'> = {
            name: '新业务通知规则',
            enabled: true,
            entity: 'ORDER',
            segments: [
                {
                    id: '',
                    title: '新阶段',
                    targetStatuses: ['Pending'],
                    commandIds: [],
                    assigneeRoles: [],
                    resolveOnStatuses: ['Done', 'Canceled'],
                    dynamicRoleField: null,
                }
            ]
        }
        await addRule(newRule)
    }

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    if (!isLoaded) {
        return (
            <div className='h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground'>
                <Loader2 className='size-8 animate-spin text-primary/40' />
                <span className='text-[10px] font-black uppercase tracking-widest opacity-60'>正在同步云端规则库...</span>
            </div>
        )
    }

    return (
        <div className='space-y-6 max-w-6xl mx-auto pb-12 transition-all duration-500'>
            {/* 1. 顶部状态栏 */}
            <div className='flex items-center justify-between px-2'>
                <div className='flex items-center gap-3'>
                    <div className='size-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner'>
                        <ShieldCheck className='size-5 text-primary' />
                    </div>
                    <div>
                        <h2 className='text-[14px] font-black tracking-tight'>通知规则引擎</h2>
                        <span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
                            已激活 {rules.filter(r => r.enabled).length} / {rules.length} 条业务监听
                        </span>
                    </div>
                </div>
                
                <Button
                    size='lg'
                    className='rounded-2xl font-black text-[11px] uppercase gap-2 shadow-xl shadow-primary/20 h-11 px-6 hover:translate-y-[-2px] active:translate-y-0 transition-transform'
                    onClick={handleAddNewRule}
                >
                    <Plus className='size-4' /> 创建监控规则
                </Button>
            </div>

            {/* 2. 规则卡片列表 */}
            {rules.length === 0 ? (
                <div className='h-64 flex flex-col items-center justify-center gap-4 rounded-[40px] border-4 border-dashed border-muted/20 bg-muted/5 group hover:border-primary/20 transition-colors'>
                    <div className='size-16 rounded-3xl bg-muted/20 flex items-center justify-center group-hover:scale-110 transition-transform'>
                        <Bell className='size-8 opacity-20' />
                    </div>
                    <div className='text-center'>
                        <p className='text-[12px] font-black uppercase tracking-widest text-muted-foreground'>当前的监控雷达为空</p>
                        <p className='text-[10px] text-muted-foreground/60 mt-1 italic'>点击上方按钮，开始建立业务通知链路</p>
                    </div>
                </div>
            ) : (
                <div className='grid grid-cols-1 gap-4 stagger-list'>
                    {rules.map(rule => (
                        <RuleCard 
                            key={rule.id}
                            rule={rule}
                            onUpdate={updateRule}
                            onDelete={deleteRule}
                            onToggle={toggleRule}
                        />
                    ))}
                </div>
            )}

            {/* 3. 底部提示 */}
            {rules.length > 0 && (
                <div className='pt-4 px-2'>
                    <p className='text-[10px] text-muted-foreground/60 leading-relaxed max-w-2xl'>
                        <b>提示：</b> 每个规则可以包含多个业务分支（Tab），建议按实体（如：订单、生产计划）归类规则，并在同一规则内通过 Tab 管理不同生命周期阶段的通知配置。
                    </p>
                </div>
            )}
        </div>
    )
}
