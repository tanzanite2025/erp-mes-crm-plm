import { Download, MinusSquare, Search, SquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'

interface BusinessEventSourceListHeaderProps {
  sources: BusinessEventSource[]
  visibleCount: number
  connectedCount: number
  preconnectedCount: number
  searchValue: string
  onSearchChange: (value: string) => void
  allExpanded: boolean
  onExpandAll: () => void
  onCollapseAll: () => void
  templateOptions: Array<{ code: string; name: string }>
  templateCode: string
  onTemplateChange: (code: string) => void
  onImportTemplate: () => void
}

export function BusinessEventSourceListHeader({
  sources,
  visibleCount,
  connectedCount,
  preconnectedCount,
  searchValue,
  onSearchChange,
  allExpanded,
  onExpandAll,
  onCollapseAll,
  templateOptions,
  templateCode,
  onTemplateChange,
  onImportTemplate,
}: BusinessEventSourceListHeaderProps) {
  const enabledCount = sources.filter((source) => source.enabled).length

  return (
    <div className='rounded-[24px] border border-dashed border-muted/40 bg-muted/5 px-5 py-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <p className='text-xs font-bold text-muted-foreground'>
          已启用 {enabledCount} / {sources.length} 个事件源，当前显示{' '}
          {visibleCount} 个，已接入执行链 {connectedCount} 个，预接入{' '}
          {preconnectedCount} 个
        </p>

        <div className='flex flex-wrap items-center justify-end gap-2'>
          <div className='relative min-w-56 flex-1 sm:min-w-64'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder='搜索事件源名称或编码'
              className='h-10 rounded-2xl pl-9 text-xs font-black'
            />
          </div>
          <Button
            size='lg'
            variant='outline'
            className='h-10 gap-2 rounded-2xl px-4 text-xs font-black'
            onClick={allExpanded ? onCollapseAll : onExpandAll}
          >
            {allExpanded ? (
              <MinusSquare className='size-4' />
            ) : (
              <SquarePlus className='size-4' />
            )}
            {allExpanded ? '全部收起' : '全部展开'}
          </Button>
          <select
            value={templateCode}
            onChange={(event) => onTemplateChange(event.target.value)}
            className='h-10 min-w-48 rounded-2xl border border-input bg-background px-3 text-xs font-black'
          >
            {templateOptions.map((template) => (
              <option key={template.code} value={template.code}>
                {template.name} / {template.code}
              </option>
            ))}
          </select>
          <Button
            size='lg'
            className='h-10 gap-2 rounded-2xl px-4 text-xs font-black'
            onClick={onImportTemplate}
          >
            <Download className='size-4' />
            添加到列表
          </Button>
        </div>
      </div>
    </div>
  )
}
