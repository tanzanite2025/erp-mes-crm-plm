'use client'

import { useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssetService } from '@/services/asset-service'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
    value?: string
    onChange: (value: string) => void
    label: string
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
    const { t } = useLanguage()
    const isMobile = useIsMobile()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setIsUploading(true)
            const res = await AssetService.uploadFile(file)
            onChange(res.url)
            toast.success(t('equipmentTooling.imageUpload.toast.uploaded'))
        } catch (err) {
            const message = err instanceof Error ? err.message : t('equipmentTooling.common.unknownError')
            toast.error(t('equipmentTooling.imageUpload.toast.failed', { message }))
        } finally {
            setIsUploading(false)
        }
    }

    const removeImage = () => {
        onChange('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className='space-y-3'>
            <div className='flex items-center gap-2 mb-1'>
                <Camera className='size-3.5 text-muted-foreground/40' />
                <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{label}</span>
            </div>
            {value ? (
                <div className='relative group rounded-[24px] overflow-hidden border border-dashed border-primary/20 bg-muted/5 aspect-video flex items-center justify-center'>
                    <img src={value} alt={t('equipmentTooling.imageUpload.previewAlt')} className='w-full h-full object-cover rounded-[20px] m-1' />
                    <div className={cn('absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm', isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                        <Button
                            variant='secondary'
                            size='sm'
                            className='rounded-full h-10 px-6 font-black text-[10px] uppercase tracking-widest'
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {t('equipmentTooling.imageUpload.actions.replace')}
                        </Button>
                        <Button variant='destructive' size='icon' className='rounded-full size-10' onClick={removeImage}>
                            <X className='size-4' />
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    className={`border border-dashed border-muted-foreground/20 rounded-[24px] p-6 sm:p-8 bg-muted/5 transition-all flex flex-col items-center justify-center gap-4 group ${isUploading ? 'cursor-not-allowed' : 'hover:bg-primary/5 hover:border-primary/50 cursor-pointer'}`}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                    <div className='size-12 sm:size-14 rounded-full bg-white shadow-xl flex items-center justify-center text-muted-foreground/40 group-hover:scale-110 transition-transform'>
                        {isUploading ? <Loader2 className='size-6 text-primary animate-spin' /> : <Camera className='size-6 group-hover:text-primary transition-colors' />}
                    </div>
                    <div className='text-center space-y-1 px-4'>
                        <p className='text-[10px] sm:text-[11px] font-black text-foreground uppercase tracking-widest'>
                            {isUploading ? t('equipmentTooling.imageUpload.state.uploading') : t('equipmentTooling.imageUpload.state.captureOrUpload')}
                        </p>
                        <p className='text-[8px] sm:text-[9px] font-bold text-muted-foreground/40 uppercase tabular-nums tracking-tighter'>
                            {isUploading ? t('equipmentTooling.imageUpload.state.waitForSync') : t('equipmentTooling.imageUpload.state.formatHint')}
                        </p>
                    </div>
                </div>
            )}

            <input type='file' ref={fileInputRef} onChange={handleFileChange} accept='image/*' capture='environment' className='hidden' />
        </div>
    )
}
