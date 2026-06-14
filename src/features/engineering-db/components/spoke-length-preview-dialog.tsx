import { ImageIcon } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SpokeLengthPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  previewFile: { url: string; name: string } | null
}

export function SpokeLengthPreviewDialog({
  open,
  onOpenChange,
  previewFile,
}: SpokeLengthPreviewDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-3xl'>
        <DialogHeader className='border-b border-dashed border-muted-foreground/10 bg-muted/5 p-6'>
          <DialogTitle className='flex items-center gap-2 text-sm font-black tracking-widest uppercase italic'>
            <ImageIcon className='size-4 text-indigo-600' />
            {previewFile?.name} / {t('engineering.spokeLength.table.preview')}
          </DialogTitle>
        </DialogHeader>
        <div className='flex min-h-[300px] items-center justify-center bg-muted/10 p-4'>
          {previewFile?.url.toLowerCase().endsWith('.pdf') ? (
            <iframe
              src={previewFile.url}
              className='h-[600px] w-full rounded-2xl border-none shadow-inner'
              title='blueprint-preview'
            />
          ) : (
            <img
              src={previewFile?.url}
              alt='blueprint'
              className='max-h-[70vh] max-w-full rounded-2xl border-4 border-white object-contain shadow-2xl'
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
