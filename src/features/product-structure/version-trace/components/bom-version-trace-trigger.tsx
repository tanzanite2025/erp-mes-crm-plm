'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BOMVersionTraceDialog } from './bom-version-trace-dialog'

interface BOMVersionTraceTriggerProps {
  bomId?: string
  productId?: string
  targetName?: string
  label?: string
  iconOnly?: boolean
  className?: string
}

export function BOMVersionTraceTrigger({
  bomId,
  productId,
  targetName,
  label = 'BOM追溯',
  iconOnly = false,
  className,
}: BOMVersionTraceTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => setOpen(true)}
        aria-label={label}
        className={cn(
          'h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase',
          iconOnly && 'size-8 rounded-full px-0',
          className
        )}
      >
        <History className='size-3.5' />
        {iconOnly ? null : label}
      </Button>
      <BOMVersionTraceDialog
        open={open}
        onOpenChange={setOpen}
        bomId={bomId}
        productId={productId}
        targetName={targetName}
      />
    </>
  )
}
