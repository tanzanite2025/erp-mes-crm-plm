'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

/**
 * 简易手风琴实现 (基于 Collapsible)
 */
interface AccordionProps {
  children: React.ReactNode
  className?: string
  type?: 'single' | 'multiple'
  defaultValue?: string | string[]
}

const AccordionContext = React.createContext<{
  activeItems: string[]
  toggleItem: (id: string) => void
} | null>(null)

export function Accordion({
  children,
  className,
  type = 'single',
  defaultValue,
}: AccordionProps) {
  const [activeItems, setActiveItems] = React.useState<string[]>(
    Array.isArray(defaultValue)
      ? defaultValue
      : defaultValue
        ? [defaultValue]
        : []
  )

  const toggleItem = (id: string) => {
    if (type === 'single') {
      setActiveItems((prev) => (prev.includes(id) ? [] : [id]))
    } else {
      setActiveItems((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      )
    }
  }

  return (
    <AccordionContext.Provider value={{ activeItems, toggleItem }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function AccordionItem({
  value,
  children,
  className,
}: AccordionItemProps) {
  const context = React.useContext(AccordionContext)
  if (!context) throw new Error('AccordionItem must be used within Accordion')

  const isOpen = context.activeItems.includes(value)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={() => context.toggleItem(value)}
      className={cn('overflow-hidden rounded-lg border bg-card', className)}
    >
      {children}
    </Collapsible>
  )
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  // 获取当前 Item 的上下文状态 (简单起见，这里直接传递样式)
  return (
    <CollapsibleTrigger asChild>
      <div
        className={cn(
          'group flex flex-1 cursor-pointer items-center justify-between p-4 text-sm font-semibold transition-all hover:bg-muted/50',
          className
        )}
      >
        {children}
        <ChevronDown className='size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
      </div>
    </CollapsibleTrigger>
  )
}

export function AccordionContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <CollapsibleContent className='overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
      <div className={cn('p-4 pt-0', className)}>{children}</div>
    </CollapsibleContent>
  )
}
