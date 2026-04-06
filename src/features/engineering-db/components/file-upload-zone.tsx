'use client'

import { useState, useRef } from 'react'
import { Upload, FolderPlus, FileCode, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface FileUploadZoneProps {
    fileUrl?: string
    fileName?: string
    fileExtension?: string
    onFileSelected: (name: string, ext: string, url: string) => void
    onFileClear: () => void
}

export function FileUploadZone({
    fileUrl,
    fileName,
    fileExtension,
    onFileSelected,
    onFileClear,
}: FileUploadZoneProps) {
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)

    const processFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return

        const file = files[0]
        const name = file.name.split('.').slice(0, -1).join('.')
        const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF'
        
        // 生成基于时间戳和文件名的唯一 ID
        const fileId = `file-${Date.now()}-${file.name}`
        
        try {
            // 真正将二进制流存入 IndexedDB
            const { StorageService } = await import('@/features/system-mgmt/services/storage-service')
            await StorageService.setItem(fileId, file)
            
            onFileSelected(name, ext, fileId)
            toast.success(`文件已永久存入本地库: ${file.name}`)
        } catch (e) {
            console.error('Failed to save file binary', e)
            toast.error('文件存入本地失败，请重试')
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFiles(e.dataTransfer.files)
        }
    }

    return (
        <div 
            className={`relative border-2 border-dashed rounded-[20px] p-10 transition-all duration-300 flex flex-col items-center justify-center gap-4 group cursor-pointer
                ${dragActive ? 'border-teal-500 bg-teal-500/5 scale-[0.98]' : 'border-muted-foreground/20 hover:border-teal-500/50 hover:bg-muted/40'}
                ${fileUrl ? 'bg-teal-500/5 border-teal-500/30' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !fileUrl && fileInputRef.current?.click()}
        >
            <input
                ref={fileInputRef}
                type='file'
                className='hidden'
                onChange={(e) => processFiles(e.target.files)}
                accept=".dwg,.dxf,.stp,.step,.pdf"
            />
            <input
                ref={folderInputRef}
                type='file'
                className='hidden'
                // @ts-ignore
                webkitdirectory=""
                directory=""
                onChange={(e) => processFiles(e.target.files)}
            />

            {fileUrl ? (
                <div className='flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500'>
                    <div className='size-20 rounded-3xl bg-teal-500/10 flex items-center justify-center text-teal-600 mb-2 relative group'>
                        <FileCode className='size-10 transition-transform group-hover:scale-110' />
                        <div className='absolute -top-1 -right-1 size-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg border-2 border-card'>
                            <div className='size-2 bg-white rounded-full animate-pulse' />
                        </div>
                    </div>
                    <div className='text-center'>
                        <p className='text-sm font-black tracking-tight text-foreground/80 truncate max-w-[200px]'>
                            {fileName}
                        </p>
                        <Badge variant='outline' className='mt-1 bg-teal-500/5 text-teal-600 border-teal-500/20 font-mono font-bold text-[10px]'>
                            .{fileExtension}
                        </Badge>
                    </div>
                    <Button 
                        type='button' 
                        variant='ghost' 
                        size='sm' 
                        className='mt-4 h-8 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 transition-all'
                        onClick={(e) => {
                            e.stopPropagation();
                            onFileClear()
                        }}
                    >
                        <X className='size-3 mr-1' /> 移除并重新导入
                    </Button>
                </div>
            ) : (
                <>
                    <div className='size-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-teal-600 group-hover:bg-teal-500/10 transition-all duration-300'>
                        <Upload className='size-7' />
                    </div>
                    <div className='text-center space-y-1'>
                        <p className='text-sm font-black tracking-tight'>拖拽文件或文件夹到此处</p>
                        <p className='text-[11px] text-muted-foreground font-medium opacity-60 italic'>识别系统将提取文件名并解析格式</p>
                    </div>
                    <div className='flex gap-3 mt-2' onClick={(e) => e.stopPropagation()}>
                        <Button 
                            type='button' 
                            variant='secondary' 
                            size='sm' 
                            className='h-9 px-4 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm'
                            onClick={() => fileInputRef.current?.click()}
                        >
                            选择图档
                        </Button>
                        <Button 
                            type='button' 
                            variant='outline' 
                            size='sm' 
                            className='h-9 px-4 rounded-full text-[11px] font-black bg-muted/20 gap-2 uppercase tracking-wider'
                            onClick={() => folderInputRef.current?.click()}
                        >
                            <FolderPlus className='size-3.5 text-teal-600' /> 导入文件夹
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}
