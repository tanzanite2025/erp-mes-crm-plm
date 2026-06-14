import { useState } from 'react'
import { Search, Check, Info, BellRing } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getStandardCommandDisplayTitle } from '../../workflow-core/data/schema'
import { useBusinessEventSources } from '../../workflow-core/hooks/use-business-event-sources'
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
  const { sources } = useBusinessEventSources()
  const [search, setSearch] = useState('')

  const filtered = commands.filter(
    (c) =>
      getStandardCommandDisplayTitle(c, sources)
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      c.content.toLowerCase().includes(search.toLowerCase())
  )

  const toggleCmd = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id]
    onChange(next)
  }

  return (
    <div className='space-y-3'>
      {/* 1. 搜索与统计 */}
      <div className='flex items-center gap-3'>
        <div className='relative flex-1'>
          <Search className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='搜索指令名称或内容模板...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-9 rounded-xl border-muted/20 bg-muted/10 pl-9 text-[11px] focus-visible:ring-primary/30'
          />
        </div>
        <Badge
          variant='secondary'
          className='h-8 rounded-xl border-primary/10 bg-primary/5 px-3 text-[10px] font-black tracking-wider text-primary uppercase'
        >
          已选 {selectedIds.length} 项
        </Badge>
      </div>

      {/* 2. 指令列表 (高密度卡片) */}
      <div className='custom-scrollbar grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2'>
        {filtered.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center gap-2 rounded-[30px] border-2 border-dashed border-muted/20 py-12 opacity-40'>
            <BellRing className='size-8' />
            <p className='text-[10px] font-bold tracking-widest uppercase'>
              未找到匹配的通知指令
            </p>
          </div>
        )}

        {filtered.map((cmd) => {
          const isSelected = selectedIds.includes(cmd.id)
          return (
            <div
              key={cmd.id}
              onClick={() => toggleCmd(cmd.id)}
              className={cn(
                'group flex cursor-pointer items-start gap-2.5 rounded-2xl border-2 p-3 transition-all',
                isSelected
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-transparent bg-muted/20 hover:border-muted-foreground/20'
              )}
            >
              {/* 选择指示器 */}
              <div
                className={cn(
                  'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary shadow-lg shadow-primary/20'
                    : 'border-muted-foreground/20 bg-card'
                )}
              >
                {isSelected && (
                  <Check className='size-2.5 stroke-[3px] text-white' />
                )}
              </div>

              {/* 指令内容 */}
              <div className='min-w-0 flex-1'>
                <p
                  className={cn(
                    'mb-1 truncate text-[11px] leading-tight font-black transition-colors group-hover:text-primary',
                    isSelected ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {getStandardCommandDisplayTitle(cmd, sources)}
                </p>
                <div className='flex items-center gap-1.5 opacity-60'>
                  <Info className='size-3 shrink-0' />
                  <p className='truncate text-[9px] font-bold italic'>
                    {cmd.content}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. 底部预览摘要 */}
      {selectedIds.length > 0 && (
        <div className='flex flex-wrap gap-1.5 pt-1'>
          {selectedIds.map((id) => {
            const cmd = commands.find((c) => c.id === id)
            if (!cmd) return null
            return (
              <Badge
                key={id}
                variant='outline'
                className='border-primary/20 bg-primary/5 px-1.5 py-0 text-[8px] font-black text-primary'
              >
                {getStandardCommandDisplayTitle(cmd, sources)}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
