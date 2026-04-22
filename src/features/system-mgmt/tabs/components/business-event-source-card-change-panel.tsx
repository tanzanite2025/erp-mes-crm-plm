import { useMemo, useState } from 'react'
import { ChevronRight, LocateFixed, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  type BusinessEventSourceChangedItemSummary,
  type BusinessEventSourceItemChangeKind,
  type BusinessEventSourceSection,
} from './business-event-source-card-diff'
import { ItemChangeBadge } from './business-event-source-card-primitives'

export interface BusinessEventSourceChangeOverviewSection {
  section: BusinessEventSourceSection | 'general'
  title: string
  summary: string
  items: BusinessEventSourceChangedItemSummary[]
  onOpen?: () => void
  actionLabel?: string
  onLocateItem?: (item: BusinessEventSourceChangedItemSummary) => void
}

type ChangeFilter = 'all' | BusinessEventSourceItemChangeKind

const FILTER_OPTIONS: Array<{
  value: ChangeFilter
  label: string
}> = [
  { value: 'all', label: '全部' },
  { value: 'added', label: '新增' },
  { value: 'updated', label: '修改' },
  { value: 'removed', label: '删除' },
  { value: 'reordered', label: '排序' },
]

function getFilteredItems(
  items: BusinessEventSourceChangedItemSummary[],
  filter: ChangeFilter
) {
  if (filter === 'all') return items
  return items.filter((item) => item.changeType === filter)
}

export function BusinessEventSourceChangePanel({
  sections,
  onLocateItem,
}: {
  sections: BusinessEventSourceChangeOverviewSection[]
  onLocateItem?: (
    section: BusinessEventSourceSection | 'general',
    item: BusinessEventSourceChangedItemSummary
  ) => void
}) {
  const [activeFilter, setActiveFilter] = useState<ChangeFilter>('all')

  const filterCounts = useMemo(() => {
    const counts: Record<ChangeFilter, number> = {
      all: 0,
      added: 0,
      updated: 0,
      removed: 0,
      reordered: 0,
    }

    sections.forEach((section) => {
      counts.all += section.items.length
      section.items.forEach((item) => {
        counts[item.changeType] += 1
      })
    })

    return counts
  }, [sections])

  const filteredSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          filteredItems: getFilteredItems(section.items, activeFilter),
        }))
        .filter((section) => section.filteredItems.length > 0),
    [activeFilter, sections]
  )

  if (sections.length === 0) return null

  return (
    <section className='mx-6 mt-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4'>
      <div className='flex flex-wrap items-start gap-3'>
        <div className='flex size-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700'>
          <Sparkles className='size-4' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-sm font-black text-sky-950'>变更总览</h3>
            <Badge
              variant='outline'
              className='rounded-full border-sky-200 bg-white text-xs font-black text-sky-700'
            >
              {filterCounts.all} 项变更
            </Badge>
          </div>
          <p className='mt-1 text-xs font-bold text-sky-800/80'>
            支持按变更类型筛选，也可以直接点某一项跳到对应分区或抽屉。
          </p>
        </div>
      </div>

      <div className='mt-4 flex flex-wrap gap-2'>
        {FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size='sm'
            variant={activeFilter === option.value ? 'default' : 'outline'}
            className='h-8 rounded-2xl text-xs font-black'
            onClick={() => setActiveFilter(option.value)}
          >
            {option.label}
            <Badge
              variant='secondary'
              className='ml-1 rounded-full px-1.5 text-xs'
            >
              {filterCounts[option.value]}
            </Badge>
          </Button>
        ))}
      </div>

      {filteredSections.length === 0 ? (
        <div className='mt-4 rounded-2xl border border-dashed border-sky-200 bg-white/70 p-4 text-xs font-bold text-muted-foreground'>
          当前筛选下没有命中的变更项。
        </div>
      ) : (
        <div className='mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2'>
          {filteredSections.map((section) => (
            <article
              key={`${section.section}-${activeFilter}`}
              className='rounded-2xl border border-sky-200/80 bg-white/90 p-3'
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h4 className='text-xs font-black tracking-tight text-sky-950'>
                      {section.title}
                    </h4>
                    <Badge
                      variant='outline'
                      className='rounded-full border-sky-200 text-xs font-black text-sky-700'
                    >
                      {section.summary}
                    </Badge>
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    当前筛选命中 {section.filteredItems.length} 项
                  </p>
                </div>
                {section.onOpen && (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-8 rounded-2xl px-2 text-xs font-black text-sky-700 hover:bg-sky-100 hover:text-sky-800'
                    onClick={section.onOpen}
                  >
                    {section.actionLabel ?? '查看'}
                    <ChevronRight className='size-3.5' />
                  </Button>
                )}
              </div>

              <div className='mt-3 flex flex-col gap-2'>
                {section.filteredItems.slice(0, 8).map((item) => {
                  const canLocate = Boolean(
                    section.onLocateItem || onLocateItem
                  )
                  return (
                    <button
                      key={`${section.section}-${item.id}-${item.changeType}`}
                      type='button'
                      disabled={!canLocate}
                      onClick={() =>
                        section.onLocateItem?.(item) ??
                        onLocateItem?.(section.section, item)
                      }
                      className='flex flex-wrap items-center gap-2 rounded-2xl border border-muted/30 bg-muted/10 px-3 py-2 text-left transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-default disabled:hover:border-muted/30 disabled:hover:bg-muted/10'
                    >
                      <ItemChangeBadge changeType={item.changeType} />
                      <span className='min-w-0 truncate text-xs font-black'>
                        {item.label}
                      </span>
                      <span className='font-mono text-xs text-muted-foreground'>
                        {item.code}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {item.meta}
                      </span>
                      {canLocate && (
                        <span className='ml-auto flex items-center gap-1 text-xs font-black text-sky-700'>
                          <LocateFixed className='size-3.5' />
                          定位
                        </span>
                      )}
                    </button>
                  )
                })}
                {section.filteredItems.length > 8 && (
                  <Badge
                    variant='secondary'
                    className='w-fit rounded-full text-xs'
                  >
                    还有 {section.filteredItems.length - 8} 项
                  </Badge>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
