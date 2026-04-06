import { useState } from 'react'
import { Search, Check, Info, BellRing } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useCommands } from '../../workflow-core/hooks/use-commands'

interface CommandBindingProps {
    selectedIds: string[]
    onChange: (ids: string[]) => void
}

/**
 * 指令绑定原子组件：处理大规模指令集的选择与搜索
 */
export function CommandBinding({ selectedIds, onChange }: CommandBindingProps) {
    const { commands } = useCommands()
    const [search, setSearch] = useState('')

    const filtered = commands.filter(c => 
        c.title.toLowerCase().includes(search.toLowerCase()) || 
        c.content.toLowerCase().includes(search.toLowerCase())
    )

    const toggleCmd = (id: string) => {
        const next = selectedIds.includes(id) 
            ? selectedIds.filter(i => i !== id) 
            : [...selectedIds, id]
        onChange(next)
    }

    return (
        <div className='space-y-3'>
            {/* 1. 搜索与统计 */}
            <div className='flex items-center gap-3'>
                <div className='relative flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
                    <Input 
                        placeholder='搜索指令名称或内容模板...'
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className='pl-9 h-9 text-[11px] rounded-xl border-muted/20 bg-muted/10 focus-visible:ring-primary/30'
                    />
                </div>
                <Badge variant='secondary' className='h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary/5 text-primary border-primary/10'>
                    已选 {selectedIds.length} 项
                </Badge>
            </div>

            {/* 2. 指令列表 (高密度卡片) */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar'>
                {filtered.length === 0 && (
                    <div className='col-span-full py-12 flex flex-col items-center justify-center gap-2 opacity-40 border-2 border-dashed border-muted/20 rounded-[30px]'>
                        <BellRing className='size-8' />
                        <p className='text-[10px] font-bold uppercase tracking-widest'>未找到匹配的通知指令</p>
                    </div>
                )}
                
                {filtered.map(cmd => {
                    const isSelected = selectedIds.includes(cmd.id)
                    return (
                        <div
                            key={cmd.id}
                            onClick={() => toggleCmd(cmd.id)}
                            className={cn(
                                'flex items-start gap-2.5 p-3 rounded-2xl cursor-pointer transition-all border-2 group',
                                isSelected 
                                    ? 'border-primary/40 bg-primary/5 shadow-sm' 
                                    : 'border-transparent bg-muted/20 hover:border-muted-foreground/20'
                            )}
                        >
                            {/* 选择指示器 */}
                            <div className={cn(
                                'size-4.5 rounded-lg mt-0.5 border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                isSelected ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-muted-foreground/20 bg-card'
                            )}>
                                {isSelected && <Check className='size-2.5 text-white stroke-[3px]' />}
                            </div>

                            {/* 指令内容 */}
                            <div className='min-w-0 flex-1'>
                                <p className={cn(
                                    'text-[11px] font-black leading-tight mb-1 truncate group-hover:text-primary transition-colors',
                                    isSelected ? 'text-primary' : 'text-foreground'
                                )}>
                                    {cmd.title}
                                </p>
                                <div className='flex items-center gap-1.5 opacity-60'>
                                    <Info className='size-3 flex-shrink-0' />
                                    <p className='text-[9px] font-bold truncate italic'>{cmd.content}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* 3. 底部预览摘要 */}
            {selectedIds.length > 0 && (
                <div className='flex flex-wrap gap-1.5 pt-1'>
                    {selectedIds.map(id => {
                        const cmd = commands.find(c => c.id === id)
                        if (!cmd) return null
                        return (
                            <Badge 
                                key={id} 
                                variant='outline' 
                                className='text-[8px] font-black bg-primary/5 text-primary border-primary/20 px-1.5 py-0'
                            >
                                {cmd.title}
                            </Badge>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
