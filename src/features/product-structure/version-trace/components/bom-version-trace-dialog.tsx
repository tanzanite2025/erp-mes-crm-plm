'use client'

import { History } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BOMVersionTraceContent } from './bom-version-trace-content'

interface BOMVersionTraceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bomId?: string
  productId?: string
  targetName?: string
}

export function BOMVersionTraceDialog({
  open,
  onOpenChange,
  bomId,
  productId,
  targetName,
}: BOMVersionTraceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton={false}
        className='grid h-[92vh] max-w-[min(1600px,calc(100%-2rem))] grid-rows-[auto_1fr] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'
        overlayClassName='bg-background/80 backdrop-blur-sm'
      >
        <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
        <DialogHeader className='relative border-b border-dashed bg-muted/5 px-6 py-5 text-left'>
          <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-primary'>
                <History className='size-4' />
                <DialogTitle className='text-lg font-black tracking-tighter italic uppercase'>BOM追溯</DialogTitle>
              </div>
              <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
                {targetName ? `${targetName} / 版本记录、差异比对与结构追踪` : '按 BOM 或产品查看版本记录、差异比对与结构追踪'}
              </DialogDescription>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'>
                {bomId ? '当前 BOM' : productId ? '当前产品' : '全量范围'}
              </Badge>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                className='h-11 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'
              >
                关闭
              </Button>
            </div>
          </div>
        </DialogHeader>
 
        <BOMVersionTraceContent open={open} bomId={bomId} productId={productId} className='min-h-0' />
      </DialogContent>
    </Dialog>
  )
}
