'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, Edit2, Database } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { type DictionaryEntry, type DictionaryOption } from '../data/schema'
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

    const applySnapshot = () => setEntries(DictionaryCoreService.getEntries())

    useEffect(() => {
        const refreshData = async () => {
            await DictionaryCoreService.init()
            applySnapshot()
        }

        void refreshData()
        window.addEventListener('xdfc_dictionary_updated', applySnapshot)
        return () => window.removeEventListener('xdfc_dictionary_updated', applySnapshot)
    }, [groupId])

    const filteredEntries = useMemo(() => {
        const keyword = searchTerm.toLowerCase()
        return entries
            .filter((entry) => entry.groupId === groupId)
            .filter((entry) => {
                if (entry.label.toLowerCase().includes(keyword)) return true
                return (entry.options || []).some((opt) => {
                    const option = typeof opt === 'string' ? opt : opt.label
                    return option.toLowerCase().includes(keyword)
                })
            })
    }, [entries, groupId, searchTerm])

    const handleAddEntry = () => {
        setEditingEntry({
            id: '',
            groupId,
            label: '',
            code: `ATTR_${Date.now()}`,
            description: '',
            options: [],
            sortOrder: 0,
            active: true,
            isSystem: false,
        })
        setIsEntryDialogOpen(true)
    }

    const handleEditEntry = (entry: DictionaryEntry) => {
        setEditingEntry(entry)
        setIsEntryDialogOpen(true)
    }

    const handleConfirmEntry = async (data: DictionaryEntry) => {
        if (editingEntry?.id) {
            if (!editingEntry.code || !editingEntry.updatedAt) {
                throw new Error('Missing entry version for conflict-safe update')
            }
            await DictionaryMaintenanceService.patchEntry(editingEntry.code, {
                label: data.label,
                description: data.description,
                options: (data.options ?? []) as DictionaryOption[],
                sortOrder: data.sortOrder,
                active: data.active,
                version: editingEntry.updatedAt,
            })
            toast.success(`属性“${data.label}”已更新`)
        } else {
            await DictionaryMaintenanceService.createEntry({
                groupId,
                label: data.label,
                code: data.code || `ATTR_${Date.now()}`,
                description: data.description,
                options: (data.options ?? []) as DictionaryOption[],
                sortOrder: data.sortOrder,
                active: data.active,
            })
            toast.success(`属性“${data.label}”已添加`)
        }
    }

    const handleDeleteEntry = async (entryId: string) => {
        const entry = entries.find((item) => item.id === entryId)
        if (!entry?.code) return

        if (confirm('确定要删除该属性定义吗？')) {
            await DictionaryMaintenanceService.deleteEntry(entry.code)
            toast.info('字典项已移除')
        }
    }

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
                                placeholder='搜索属性或选项...'
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
                            filteredEntries.map((entry) => (
                                <div key={entry.id} className='flex items-center justify-between p-4 hover:bg-muted/5 transition-colors group'>
                                    <div className='space-y-2'>
                                        <div className='text-sm font-semibold text-foreground flex items-center gap-2'>
                                            {entry.label}
                                            <span className='text-[10px] text-muted-foreground font-mono font-normal py-0.5 px-1.5 bg-muted rounded'>
                                                {entry.code || 'NO_CODE'}
                                            </span>
                                        </div>
                                        <div className='flex flex-wrap gap-1.5'>
                                            {(entry.options || []).map((opt, idx) => {
                                                const label = typeof opt === 'string' ? opt : opt.label
                                                return (
                                                    <Badge key={idx} variant='secondary' className='text-[11px] font-normal'>
                                                        {label}
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                        <Button variant='ghost' size='icon' onClick={() => handleEditEntry(entry)}>
                                            <Edit2 className='size-3.5' />
                                        </Button>
                                        <Button variant='ghost' size='icon' onClick={() => void handleDeleteEntry(entry.id)}>
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
