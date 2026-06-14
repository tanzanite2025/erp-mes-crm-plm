import type { ReactNode } from 'react'

interface MindmapTreeChildrenProps {
  children: ReactNode
}

export function MindmapTreeChildren({ children }: MindmapTreeChildrenProps) {
  return (
    <div className='relative mt-3 pl-6'>
      <div className='absolute top-1.5 bottom-5 left-1 w-px bg-muted-foreground/30' />
      <div className='space-y-3'>{children}</div>
    </div>
  )
}
