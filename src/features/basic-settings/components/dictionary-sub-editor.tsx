'use client'

import { useState, useEffect } from 'react'
import {
    Plus,
    Search,
    Trash2,
    Edit2,
    Database,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    type DictionaryEntry,
} from '../data/schema'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

import { DictionaryCoreService } from '../services/dictionary-core-service'
import { DictionaryMaintenanceService } from '../services/dictionary-maintenance-service'
import { DictionaryEntryActionDialog } from './dictionary-entry-action-dialog'

interface DictionarySubEditorProps {
    groupId: string
    title?: string
    description?: string
}

export function DictionarySubEditor({ groupId, title, description }: DictionarySubEditorProps) {
    const [entries, setEntries] = useState<DictionaryEntry[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)

    // 初始化加载与事件监听
    useEffect(() => {
        const refreshData = () => {
            const currentEntries = DictionaryCoreService.getEntries()
            setEntries(currentEntries)
        }

        // 异步初始化
        DictionaryCoreService.init().then(refreshData)

        // 监听全局更新事件
        window.addEventListener('xdfc_dictionary_updated', refreshData)
        return () => window.removeEventListener('xdfc_dictionary_updated', refreshData)
    }, [groupId])

    const saveEntries = async (newEntries: DictionaryEntry[]) => {
        setEntries(newEntries)
        await DictionaryMaintenanceService.saveEntries(newEntries)
        // 显式触发全局刷新 (Service 内部也会发，这里双保险)
        window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
    }

    const handleAddEntry = () => {
        setEditingEntry(null)
        setIsEntryDialogOpen(true)
    }

    const handleEditEntry = (entry: DictionaryEntry) => {
        setEditingEntry(entry)
        setIsEntryDialogOpen(true)
    }

    const handleConfirmEntry = (data: DictionaryEntry) => {
        if (editingEntry) {
            saveEntries(entries.map(e => e.id === editingEntry.id ? data : e))
            toast.success(`属性 “${data.label}” 已更新`)
        } else {
            saveEntries([...entries, data])
            toast.success(`属性 “${data.label}” 已添加`)
        }
    }

    const handleDeleteEntry = (entryId: string) => {
        if (confirm('确定要删除该属性定义吗？')) {
            saveEntries(entries.filter(e => e.id !== entryId))
            toast.info('字典项已移除')
        }
    }

    const filteredEntries = entries
        .filter(e => e.groupId === groupId)
        .filter(e =>
            e.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.options || []).some((opt: any) =>
                (typeof opt === 'string' ? opt : opt.label).toLowerCase().includes(searchTerm.toLowerCase())
            )
        )

    return (
        <div className='space-y-4'>
            {(title || description) && (
                <div className='mb-2'>
                    {title && <h3 className='text-lg font-bold'>{title}</h3>}
                    {description && <p className='text-sm text-muted-foreground'>{description}</p>}
                </div>
            )}

            <Card className='border shadow-sm bg-card overflow-hidden'>
                <CardContent className='p-0'>
                    <div className='p-4 border-b bg-muted/30 flex items-center justify-between gap-4'>
                        <div className='relative flex-1 max-w-sm'>
                            <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
                            <Input
                                placeholder="搜索属性或选项..."
                                className='pl-9 h-9 bg-background'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button size='sm' onClick={handleAddEntry} className='gap-1.5 h-9 font-medium'>
                            <Plus className='size-4' /> 创建属性
                        </Button>
                    </div>

                    <div className='grid grid-cols-1 divide-y bg-card'>
                        {filteredEntries.length > 0 ? (
                            filteredEntries.map(entry => (
                                <div key={entry.id} className='flex items-center justify-between p-4 hover:bg-muted/5 transition-colors group cursor-default'>
                                    <div className='flex items-center gap-4'>
                                        <div className='size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0'>
                                            {entry.label.charAt(0).toUpperCase()}
                                        </div>
                                        <div className='space-y-1.5'>
                                            <div className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                                {entry.label}
                                                <span className='text-[10px] text-muted-foreground font-mono font-normal py-0.5 px-1.5 bg-muted rounded'>
                                                    {entry.code || 'NO_CODE'}
                                                </span>
                                            </div>
                                            <div className='flex flex-wrap gap-1.5'>
                                                {(entry.options || []).map((opt, idx) => {
                                                    const label = typeof opt === 'string' ? opt : opt.label
                                                    const val = typeof opt === 'string' ? opt.toUpperCase() : opt.value
                                                    return (
                                                        <TooltipProvider key={idx}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge
                                                                        variant='secondary'
                                                                        className='bg-blue-500/5 text-blue-600 dark:text-blue-200 dark:bg-blue-400/10 border-blue-200/50 dark:border-blue-800/10 py-0.5 px-2 text-[11px] font-normal'
                                                                    >
                                                                        {label}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent className='text-[10px] bg-slate-900 text-white'>
                                                                    代码键值: <span className='font-mono font-bold'>{val}</span>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )
                                                })}
                                                <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    onClick={() => handleEditEntry(entry)}
                                                    className='h-5 px-1.5 text-[10px] text-muted-foreground hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity'
                                                >
                                                    <Edit2 className='size-2.5 mr-0.5' /> 编辑选项
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={() => handleEditEntry(entry)}
                                            className='size-8 text-slate-400 hover:text-blue-600'
                                        >
                                            <Edit2 className='size-3.5' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            className='size-8 text-slate-400 hover:text-rose-600'
                                        >
                                            <Trash2 className='size-3.5' />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className='py-12 flex flex-col items-center justify-center text-muted-foreground text-sm italic'>
                                <Database className='size-12 opacity-10 mb-2' />
                                暂无在该分组下的属性，请点击创建。
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <DictionaryEntryActionDialog
                open={isEntryDialogOpen}
                onOpenChange={setIsEntryDialogOpen}
                onConfirm={handleConfirmEntry}
                editData={editingEntry}
                groupId={groupId}
            />
        </div>
    )
}
