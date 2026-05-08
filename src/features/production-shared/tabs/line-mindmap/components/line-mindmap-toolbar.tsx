import { FilePenLine, GitBranchPlus, Route, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LineMindmapToolbarProps } from '../types'

export function LineMindmapToolbar({
  activeLine,
  level1Name,
  level2Name,
  level3Name,
  lineOptions,
  resolvedLineId,
  selectedNode,
  title,
  onCreateLevel1,
  onCreateLevel2,
  onCreateLevel3,
  onEditNode,
  onSelectLine,
}: LineMindmapToolbarProps) {
  return (
    <Card className='sticky top-0 z-30 rounded-[20px] border border-dashed border-muted/35 bg-background shadow-sm'>
      <CardContent className='overflow-x-auto p-2'>
        <div className='flex min-w-max items-center gap-1.5 whitespace-nowrap'>
          <span className='shrink-0 text-[10px] font-black italic uppercase tracking-tighter text-foreground'>
            {title}
          </span>
          <span className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/55'>当前产线</span>
          <Select value={resolvedLineId || undefined} onValueChange={onSelectLine}>
            <SelectTrigger className='h-8 w-[200px] shrink-0 rounded-2xl border-none bg-background/80 px-3 text-[9px] font-black shadow-none sm:w-[220px]'>
              <SelectValue placeholder='选择要查看的产线' />
            </SelectTrigger>
            <SelectContent>
              {lineOptions.map((lineOption) => (
                <SelectItem key={lineOption.id} value={lineOption.id} className='text-[9px] font-black'>
                  {lineOption.label} · {lineOption.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type='button'
            className='h-8 shrink-0 rounded-full px-3 text-[8px] font-black uppercase tracking-widest'
            onClick={onCreateLevel1}
            disabled={!activeLine}
          >
            <GitBranchPlus className='size-3.5' /> 新建{level1Name}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-8 shrink-0 rounded-full border-dashed px-3 text-[8px] font-black uppercase tracking-widest'
            onClick={onCreateLevel2}
            disabled={!activeLine}
          >
            <Route className='size-3.5' /> 新建{level2Name}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-8 shrink-0 rounded-full border-dashed px-3 text-[8px] font-black uppercase tracking-widest'
            onClick={onCreateLevel3}
            disabled={!activeLine}
          >
            <Workflow className='size-3.5' /> 新建{level3Name}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-8 shrink-0 rounded-full border-dashed px-3 text-[8px] font-black uppercase tracking-widest'
            onClick={onEditNode}
            disabled={!selectedNode}
          >
            <FilePenLine className='size-3.5' /> 编辑当前节点
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
