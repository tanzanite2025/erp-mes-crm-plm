'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, Download, ExternalLink, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PDFViewerProps {
    fileUrl: string;
    className?: string;
}

/**
 * PDFViewer 组件
 * 基于原生 iframe 和 Blob URL 提供 PDF 在线预览
 */
export function PDFViewer({ fileUrl, className }: PDFViewerProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [displayUrl, setDisplayUrl] = useState<string>('')

    useEffect(() => {
        const preparePdf = async () => {
            setIsLoading(true)
            
            // 移除模拟延迟，直接载入本地资源
            
            // 如果是演示用的相对路径，直接使用
            // 真实场景下会是类似: const blob = await fetch(fileUrl).then(r => r.blob()); setDisplayUrl(URL.createObjectURL(blob));
            setDisplayUrl(fileUrl)
            setIsLoading(false)
        }

        preparePdf()
    }, [fileUrl])

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = fileUrl.split('/').pop() || 'blueprint.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className={`relative w-full h-full bg-muted/10 rounded-[20px] overflow-hidden border bg-card/50 backdrop-blur-sm ${className}`}>
            {/* 加载状态 */}
            {isLoading && (
                <div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'>
                    <Loader2 className='size-10 text-indigo-500 animate-spin mb-4' />
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>正在载入技术蓝图...</p>
                </div>
            )}

            {/* 内容渲染区 */}
            {!isLoading && displayUrl && (
                (() => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(displayUrl) || 
                                   (displayUrl.startsWith('data:image/') || displayUrl.startsWith('blob:') && fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/));
                    
                    if (isImage) {
                        return (
                            <div className="w-full h-full flex items-center justify-center p-4 bg-muted/20">
                                <img 
                                    src={displayUrl} 
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
                                    alt="Preview" 
                                    onError={() => setIsLoading(false)} // Simple error fallback
                                />
                            </div>
                        )
                    }

                    return (
                        <iframe
                            src={`${displayUrl}#toolbar=0&navpanes=0`}
                            className='w-full h-full border-none'
                            title='PDF Preview'
                            onLoad={() => setIsLoading(false)}
                        />
                    )
                })()
            )}

            {!isLoading && !displayUrl && (
                <div className="flex flex-col items-center justify-center h-full text-destructive p-12">
                    <AlertTriangle className="size-12 mb-4" />
                    <p className="font-black uppercase tracking-tighter">文件内容解析失败或文件损坏</p>
                </div>
            )}

            {/* 浮动控制工具 (仅在非加载时展示) */}
            {!isLoading && (
                <div className='absolute top-4 right-4 flex items-center gap-2'>
                    <Button 
                        variant='outline' 
                        size='sm' 
                        className='h-8 rounded-full bg-white/80 backdrop-blur-sm border-none shadow-sm hover:bg-white'
                        onClick={handleDownload}
                    >
                        <Download className='size-3.5 mr-2' /> 下载原件
                    </Button>
                    <Button 
                        variant='outline' 
                        size='icon' 
                        className='size-8 rounded-full bg-white/80 backdrop-blur-sm border-none shadow-sm hover:bg-white'
                        onClick={() => window.open(fileUrl, '_blank')}
                    >
                        <ExternalLink className='size-3.5' />
                    </Button>
                </div>
            )}

            {/* 底部版权/安全信息 */}
            {!isLoading && (
                <div className='absolute bottom-4 left-4 right-4 py-2 px-4 rounded-full bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between text-[8px] font-bold text-indigo-900/40 uppercase tracking-tighter'>
                    <div className='flex items-center gap-2'>
                        <FileText className='size-3' />
                        TECHNICAL BLUEPRINT OVERVIEW
                    </div>
                    <span>CONFIDENTIAL - INTELLECTUAL PROPERTY OF XDFC</span>
                </div>
            )}
        </div>
    )
}
