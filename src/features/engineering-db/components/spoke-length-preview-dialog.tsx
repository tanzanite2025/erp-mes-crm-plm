import { ImageIcon } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'

interface SpokeLengthPreviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    previewFile: { url: string; name: string } | null
}

export function SpokeLengthPreviewDialog({
    open,
    onOpenChange,
    previewFile
}: SpokeLengthPreviewDialogProps) {
    const { t } = useLanguage()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-3xl rounded-[32px] p-0 overflow-hidden bg-background border-none shadow-2xl'>
                <DialogHeader className='p-6 border-b border-dashed border-muted-foreground/10 bg-muted/5'>
                    <DialogTitle className='text-sm font-black italic uppercase tracking-widest flex items-center gap-2'>
                        <ImageIcon className='size-4 text-indigo-600' />
                        {previewFile?.name} / {t('engineering.spokeLength.table.preview')}
                    </DialogTitle>
                </DialogHeader>
                <div className='p-4 flex items-center justify-center bg-muted/10 min-h-[300px]'>
                    {previewFile?.url.toLowerCase().endsWith('.pdf') ? (
                        <iframe src={previewFile.url} className='w-full h-[600px] rounded-2xl border-none shadow-inner' title='blueprint-preview' />
                    ) : (
                        <img src={previewFile?.url} alt='blueprint' className='max-w-full max-h-[70vh] rounded-2xl shadow-2xl object-contain border-4 border-white' />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
