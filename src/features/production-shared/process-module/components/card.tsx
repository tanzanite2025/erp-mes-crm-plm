import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { treeNodeStatusMeta, type ProcessCardConfig, type ProcessTreeNodeConfig } from '../config'
import type { ProcessModuleStatus } from '../types'
import { ProcessModuleField } from './field'
import { ProcessStatusBadge } from './status-badge'

const statusMeta: Record<ProcessModuleStatus, { label: string; className: string }> = {
  active: { label: '运行中', className: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20' },
  idle: { label: '待机', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  blocked: { label: '受阻', className: 'bg-rose-500/10 text-rose-700 border-rose-500/20' },
}

type ProcessModuleCardProps = {
  card: ProcessCardConfig
}

function ProcessTree({ nodes, level = 0 }: { nodes: ProcessTreeNodeConfig[]; level?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(nodes.map((node) => [node.key, true])),
  )

  return (
    <div className='space-y-2'>
      {nodes.map((node, index) => {
        const hasChildren = (node.children?.length ?? 0) > 0
        const isExpanded = expanded[node.key] ?? true
        const isLast = index === nodes.length - 1
        const nodeMeta = treeNodeStatusMeta[node.status ?? 'normal']
        const NodeIcon = nodeMeta.icon

        return (
          <div key={node.key} className='relative pl-7'>
            <div
              className={cn(
                'absolute left-3 top-0 h-full w-px border-l border-dashed border-muted/35',
                isLast ? 'opacity-45' : 'opacity-100',
              )}
            />
            <div className='absolute left-3 top-5 h-px w-4 border-t border-dashed border-muted/35' />
            <div className={cn('absolute left-2.5 top-4 size-2 rounded-full border shadow-sm', nodeMeta.dotClassName)} />

            <div className='rounded-2xl border border-dashed border-muted/30 bg-background/70 p-3'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 min-w-0'>
                  <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/35'>
                    {level === 0 ? 'JOB' : 'PRC'}
                  </span>
                  <NodeIcon className={cn('size-3.5 shrink-0', nodeMeta.className)} />
                  <span className='truncate text-sm font-bold text-foreground'>{node.label}</span>
                  <ProcessStatusBadge status={node.status ?? 'normal'} />
                </div>
                {hasChildren ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-7 rounded-full px-3 text-[10px] font-black uppercase tracking-widest'
                    onClick={() => setExpanded((current) => ({ ...current, [node.key]: !isExpanded }))}
                  >
                    {isExpanded ? <ChevronDown className='size-3.5' /> : <ChevronRight className='size-3.5' />}
                  </Button>
                ) : null}
              </div>

              {node.meta ? (
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <ProcessStatusBadge status={node.status ?? 'normal'} label={node.meta} />
                </div>
              ) : null}

              {hasChildren ? (
                isExpanded ? (
                  <div className='mt-3 pl-4 border-l border-dashed border-muted/30'>
                    <ProcessTree nodes={node.children ?? []} level={level + 1} />
                  </div>
                ) : (
                  <div className='mt-3 rounded-xl border border-dashed border-muted/30 bg-muted/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/35'>
                    已折叠 {node.children?.length ?? 0} 个节点
                  </div>
                )
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ProcessModuleCard({ card }: ProcessModuleCardProps) {
  const meta = statusMeta[card.status]
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(card.sections.map((section) => [section.title, true])),
  )

  const sectionTitles = useMemo(() => card.sections.map((section) => section.title), [card.sections])

  return (
    <div className='flex flex-col gap-3 rounded-[22px] border border-dashed border-muted/50 bg-background/80 p-4 md:flex-row md:items-start md:justify-between'>
      <div className='min-w-0 space-y-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <h4 className='text-sm font-black tracking-tight text-slate-800'>{card.name}</h4>
          <Badge variant='outline' className='rounded-full font-mono text-[10px]'>{card.code}</Badge>
          <Badge variant='outline' className={cn('rounded-full text-[10px]', meta.className)}>
            {meta.label}
          </Badge>
          {card.badges.map((badge) => (
            <Badge key={badge.label} variant='outline' className={cn('rounded-full text-[10px]', badge.tone)}>
              {badge.label}
            </Badge>
          ))}
        </div>

        <div className='space-y-3'>
          {card.sections.map((section) => {
            const expanded = expandedSections[section.title] ?? true

            return (
              <div key={section.title} className='rounded-[18px] border border-dashed border-muted/40 bg-muted/10 p-3'>
                <div className='mb-3 flex items-center justify-between gap-2'>
                  <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>{section.title}</p>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-7 rounded-full px-3 text-[10px] font-black uppercase tracking-widest'
                    onClick={() => setExpandedSections((current) => ({ ...current, [section.title]: !expanded }))}
                  >
                    {expanded ? '收起' : '展开'}
                  </Button>
                </div>

                {expanded ? (
                  section.fields ? (
                    <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                      {section.fields.map((field) => (
                        <ProcessModuleField key={field.key} field={field} />
                      ))}
                    </div>
                  ) : section.tree ? (
                    <ProcessTree nodes={section.tree} />
                  ) : null
                ) : (
                  <div className='rounded-2xl border border-dashed border-muted/30 bg-background/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/35'>
                    {sectionTitles.length > 0 ? `${section.title} 已折叠` : '无可显示内容'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
