import { useRef } from 'react'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QuotePrintDocument } from '@/features/quotes/components/quote-print-document'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

type QuotePrintPreviewDialogProps = {
  open: boolean
  detail: QuoteDetail | null
  onOpenChange: (open: boolean) => void
}

export function QuotePrintPreviewDialog({
  open,
  detail,
  onOpenChange,
}: QuotePrintPreviewDialogProps) {
  const printRef = useRef<HTMLDivElement | null>(null)

  const handlePrint = () => {
    if (!printRef.current) return

    const printWindow = window.open('', '_blank', 'width=1024,height=768')
    if (!printWindow) return

    printWindow.document.write(
      '<html><head><title>Quote Print Preview</title></head><body></body></html>'
    )
    printWindow.document.close()

    const cloned = printRef.current.cloneNode(true)
    printWindow.document.body.appendChild(cloned)
    printWindow.focus()
    printWindow.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[92vh] max-w-6xl overflow-hidden rounded-3xl border border-primary/20 p-0'>
        <DialogHeader className='border-b border-dashed border-border/60 px-6 py-5'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <DialogTitle className='text-xl font-black tracking-tight italic'>
                报价打印预览
              </DialogTitle>
              <DialogDescription>
                请确认版式后，通过浏览器打印面板选择“保存为 PDF”。
              </DialogDescription>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                <X className='size-4' />
                关闭
              </Button>
              <Button onClick={handlePrint} disabled={!detail}>
                <Printer className='size-4' />
                打印 / 保存 PDF
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className='overflow-auto bg-muted/20 p-6'>
          {detail ? (
            <div ref={printRef}>
              <QuotePrintDocument detail={detail} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
