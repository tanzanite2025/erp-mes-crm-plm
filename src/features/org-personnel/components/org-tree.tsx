'use client'

import * as React from 'react'
import {
  ChevronRight,
  ChevronDown,
  Warehouse,
  Building2,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { type OrgNode } from '../data/org-schema'

interface OrgTreeProps {
  data: OrgNode[]
  selectedId?: string
  onSelect: (node: OrgNode) => void
  level?: number
}

const getIcon = (type: OrgNode['type']) => {
  switch (type) {
    case 'company':
      return <Building2 className='size-4 text-primary' />
    case 'department':
      return <Warehouse className='size-4 text-blue-500' />
    case 'team':
      return <Users className='size-4 text-orange-400' />
    default:
      return <Warehouse className='size-4' />
  }
}

export function OrgTree({
  data,
  selectedId,
  onSelect,
  level = 0,
}: OrgTreeProps) {
  return (
    <div
      className={cn('flex flex-col gap-1', level > 0 && 'ml-4 border-l pl-2')}
    >
      {data.map((node) => (
        <OrgTreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level}
        />
      ))}
    </div>
  )
}

function OrgTreeNode({
  node,
  selectedId,
  onSelect,
  level,
}: {
  node: OrgNode
  selectedId?: string
  onSelect: (node: OrgNode) => void
  level: number
}) {
  const [isOpen, setIsOpen] = React.useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
      <div
        className={cn(
          'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
        onClick={() => onSelect(node)}
      >
        <div className='flex size-4 items-center justify-center'>
          {hasChildren ? (
            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
              <div className='rounded-sm transition-transform hover:bg-muted'>
                {isOpen ? (
                  <ChevronDown className='size-3.5' />
                ) : (
                  <ChevronRight className='size-3.5' />
                )}
              </div>
            </CollapsibleTrigger>
          ) : null}
        </div>

        {getIcon(node.type)}

        <span className='flex-1 truncate font-medium italic'>{node.name}</span>

        {hasChildren && !isSelected && (
          <span className='text-[10px] text-muted-foreground opacity-60 group-hover:text-accent-foreground'>
            {node.children?.length}
          </span>
        )}
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <OrgTree
            data={node.children!}
            selectedId={selectedId}
            onSelect={onSelect}
            level={level + 1}
          />
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}
