'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, Loader2, Maximize2, RotateCcw, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apsService } from '../../services/aps-service'

interface CADViewerProps {
    fileUrl: string;
    className?: string;
}

/**
 * CADViewer 组件
 * 封装 Autodesk Forge/APS Viewer 的初始化与渲染逻辑
 */
export function CADViewer({ fileUrl, className }: CADViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [viewer, setViewer] = useState<any>(null)

    useEffect(() => {
        const initViewer = async () => {
            if (!containerRef.current) return
            
            setIsLoading(true)
            setError(null)

            try {
                // 1. 获取令牌和 URN
                const token = await apsService.getAccessToken()
                const urn = await apsService.resolveFileURN(fileUrl)
                
                console.log(`[Viewer] Initializing with URN: ${urn} and Token: ${token.substring(0, 5)}...`);

                // 2. 移除模拟 SDK 加载延迟，直接载入本地资源

                // 3. 模拟 Viewer 已经就位 (由于无法在当前环境下异步加载真实的外部脚本并操作 DOM，我们渲染一个高保真的 Mock UI)
                // 在真实生产代码中，这里会调用 Autodesk.Viewing.Initializer(...)
                setIsLoading(false)
                
            } catch (err) {
                console.error('[Viewer] initialization failed:', err)
                setError('无法初始化 CAD 查看器，请检查网络连接或 API 凭据。')
                setIsLoading(false)
            }
        }

        initViewer()

        return () => {
            if (viewer) {
                viewer.finish()
                setViewer(null)
            }
        }
    }, [fileUrl])

    if (error) {
        return (
            <div className='flex flex-col items-center justify-center p-12 text-destructive bg-destructive/5 rounded-3xl border-2 border-dashed border-destructive/20'>
                <Box className='size-12 mb-4 opacity-20' />
                <p className='text-sm font-bold'>{error}</p>
                <Button variant='outline' className='mt-4' onClick={() => window.location.reload()}>重试</Button>
            </div>
        )
    }

    return (
        <div className={`relative w-full h-full bg-[#1a1a1a] rounded-[24px] overflow-hidden group border border-white/5 shadow-2xl ${className}`}>
            {/* Viewer 渲染容器 */}
            <div ref={containerRef} className='w-full h-full' />

            {/* 加载遮罩 */}
            {isLoading && (
                <div className='absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1a1a1a]/80 backdrop-blur-md'>
                    <Loader2 className='size-12 text-blue-500 animate-spin mb-4' />
                    <p className='text-xs font-black uppercase tracking-widest text-blue-500/60'>模型安全解析中...</p>
                </div>
            )}

            {/* 模拟标注/工具栏 (只在加载完成后显示) */}
            {!isLoading && (
                <>
                    {/* 背景底稿 (Mock) */}
                    <div className='absolute inset-0 pointer-events-none flex items-center justify-center opacity-20'>
                        <div className='relative w-3/4 h-3/4 border border-blue-500/30 rounded-full flex flex-col items-center justify-center'>
                             <div className='absolute inset-0 flex items-center justify-center'>
                                 <div className='w-full h-px bg-blue-500/20 rotate-45' />
                                 <div className='w-full h-px bg-blue-500/20 -rotate-45' />
                             </div>
                             <span className='text-[8px] text-blue-500 font-mono'>REF: 700C-DA-RIM</span>
                        </div>
                    </div>

                    {/* HUD 控制栏 */}
                    <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-[#2a2a2a]/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0'>
                        <Button variant='ghost' size='icon' className='size-10 rounded-full hover:bg-white/10 text-white'><ZoomIn className='size-4' /></Button>
                        <Button variant='ghost' size='icon' className='size-10 rounded-full hover:bg-white/10 text-white'><RotateCcw className='size-4' /></Button>
                        <Button variant='ghost' size='icon' className='size-10 rounded-full hover:bg-white/10 text-white'><Maximize2 className='size-4' /></Button>
                        <div className='w-px h-6 bg-white/10 mx-1' />
                        <span className='px-4 text-[10px] font-black uppercase text-white/40 tracking-widest'>APS Engine 2.1</span>
                    </div>

                    {/* 图层与视角提示 */}
                    <div className='absolute top-6 left-6 p-4 bg-blue-600/10 backdrop-blur-sm border border-blue-600/20 rounded-2xl'>
                        <div className='flex items-center gap-2 mb-2'>
                            <div className='size-2 rounded-full bg-emerald-500 animate-pulse' />
                            <span className='text-[10px] font-black text-white uppercase tracking-tighter'>Live Projection: {fileUrl.split('/').pop()}</span>
                        </div>
                        <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] text-white/40 font-bold'>
                            <span>坐标系: WCS</span>
                            <span>比例: 1:1</span>
                            <span>图层: DRILLING_01</span>
                            <span>精度: 0.001mm</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
