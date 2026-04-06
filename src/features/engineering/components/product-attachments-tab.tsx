'use client'

import { useRef } from 'react'
import { FileUp, FileText, Download, X, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type Product } from '../data/schema'

type ProductAttachmentsTabProps = {
    product: Product
    onUpdateProduct: (updatedProduct: Product) => void
}

type ProductAttachmentItem = NonNullable<Product['attachments']>[number]

export function ProductAttachmentsTab({ product, onUpdateProduct }: ProductAttachmentsTabProps) {
    const { t } = useLanguage()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 1024 * 1024 * 50) {
            toast.error(t('engineering.productMgmt.attachments.errorSize'))
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            const newAttachment = {
                id: '',
                name: file.name,
                url: reader.result as string,
                type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
                size: file.size,
                createdAt: new Date().toISOString()
            }

            const updatedProduct = {
                ...product,
                attachments: [...(product.attachments || []), newAttachment]
            }

            onUpdateProduct(updatedProduct)
            toast.success(t('engineering.productMgmt.attachments.success'))
            // 重置 input
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
        reader.readAsDataURL(file)
    }

    const handleDeleteAttachment = (fileId: string) => {
        const updatedProduct = {
            ...product,
            attachments: product.attachments?.filter(a => a.id !== fileId) || []
        }

        onUpdateProduct(updatedProduct)
        toast.success(t('engineering.productMgmt.attachments.remove'))
    }

    const handleDownloadAttachment = (file: ProductAttachmentItem) => {
        const link = document.createElement('a')
        link.href = file.url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className='max-w-5xl mx-auto py-8 space-y-8'>
            {/* 真实的上传区 */}
            <div
                className='group relative border-2 border-dashed border-muted-foreground/20 rounded-3xl p-12 transition-all hover:border-blue-600/40 hover:bg-blue-600/2 cursor-pointer bg-card overflow-hidden'
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type='file'
                    className='hidden'
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept='.pdf,.jpg,.jpeg,.png,.step,.zip,.docx'
                />
                <div className='absolute inset-0 bg-linear-to-br from-blue-600/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
                <div className='relative flex flex-col items-center justify-center text-center'>
                    <div className='size-16 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-blue-600/10 group-hover:text-blue-600'>
                        <FileUp className='size-8' />
                    </div>
                    <h3 className='text-lg font-bold'>{t('engineering.productMgmt.attachments.uploadTitle')}</h3>
                    <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                        {t('engineering.productMgmt.attachments.uploadDescPrefix')} <span className='text-blue-600 font-bold'>{t('engineering.productMgmt.attachments.uploadDescLink')}</span>
                    </p>
                    <p className='text-[10px] text-muted-foreground/50 mt-4 uppercase font-black tracking-widest'>{t('engineering.productMgmt.attachments.uploadLimit')}</p>
                </div>
            </div>

            {/* 已上传列表 */}
            <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <HardDrive className='size-4 text-blue-600' />
                        <h4 className='text-sm font-black uppercase tracking-widest'>
                            {t('engineering.productMgmt.attachments.archiveTitle', { count: product.attachments?.length || 0 })}
                        </h4>
                    </div>
                </div>

                <div className='grid grid-cols-1 gap-3'>
                    {product.attachments && product.attachments.length > 0 ? (
                        product.attachments.map(file => (
                            <div key={file.id} className='flex items-center gap-4 p-4 rounded-2xl border bg-card hover:shadow-lg hover:shadow-blue-600/5 transition-all group'>
                                <div className='size-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-blue-600/10 group-hover:text-blue-600 transition-colors'>
                                    <FileText className='size-6' />
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <h5 className='text-sm font-bold truncate'>{file.name}</h5>
                                    <div className='flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground font-medium uppercase'>
                                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <span className='size-1 rounded-full bg-muted-foreground/30' />
                                        <span>{file.type}</span>
                                        <span className='size-1 rounded-full bg-muted-foreground/30' />
                                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        className='size-9 rounded-xl hover:bg-blue-50 hover:text-blue-600'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadAttachment(file);
                                        }}
                                        title={t('engineering.productMgmt.attachments.download')}
                                    >
                                        <Download className='size-4' />
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        className='size-9 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAttachment(file.id);
                                        }}
                                        title={t('engineering.productMgmt.attachments.delete')}
                                    >
                                        <X className='size-4' />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className='py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5'>
                            <HardDrive className='size-10 opacity-10 mb-2' />
                            <p className='text-xs font-bold opacity-30 tracking-widest uppercase'>{t('engineering.productMgmt.attachments.noData')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
