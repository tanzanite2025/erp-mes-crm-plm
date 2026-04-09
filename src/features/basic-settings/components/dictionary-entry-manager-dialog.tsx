'use client'

import { useState, useEffect } from 'react'
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { Plus, Edit, Trash2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { DictionaryMaintenanceService } from '@/features/basic-settings/services/dictionary-maintenance-service'
import { type DictionaryOption } from '@/features/basic-settings/data/schema'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage 
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const optionSchema = z.object({
    label: z.string().min(1, '名称不能为空'),
    value: z.string().min(1, '编码不能为空').regex(/^[A-Z0-9_]+$/, '编码必须是大写字母、数字或下划线'),
})

interface DictionaryEntryManagerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entryCode: string
    title?: string
    description?: string
}

export function DictionaryEntryManagerDialog({ 
    open, 
    onOpenChange, 
    entryCode, 
    title = '字段管理', 
    description = '维护系统中的选项列表。' 
}: DictionaryEntryManagerDialogProps) {
    const [options, setOptions] = useState<DictionaryOption[]>([])
    const [entryVersion, setEntryVersion] = useState<string | null>(null)
    const [editingOption, setEditingOption] = useState<DictionaryOption | null>(null)
    const [isAddOpen, setIsAddOpen] = useState(false)

    // 加载数据
    useEffect(() => {
        if (open) {
            const entry = DictionaryCoreService.getEntryByCode(entryCode)
            setOptions([...(entry?.options as DictionaryOption[] ?? [])])
            setEntryVersion(entry?.updatedAt ?? null)
        }
    }, [open, entryCode])

    const saveOptions = async (newOptions: DictionaryOption[]) => {
        if (!entryVersion) {
            throw new Error('Missing entry version for conflict-safe update')
        }
        const updated = await DictionaryMaintenanceService.patchEntry(entryCode, {
            options: newOptions,
            version: entryVersion,
        })
        setOptions((updated.options as DictionaryOption[]) ?? [])
        setEntryVersion(updated.updatedAt ?? null)
        toast.success('配置已更新')
    }

    const handleAdd = () => {
        setEditingOption(null)
        setIsAddOpen(true)
    }

    const handleEdit = (opt: DictionaryOption) => {
        setEditingOption(opt)
        setIsAddOpen(true)
    }

    const handleDelete = (val: string) => {
        if (confirm('确定要删除该选项吗？')) {
            void saveOptions(options.filter(o => o.value !== val)).catch((err) => {
                const message = err instanceof Error ? err.message : '保存失败，请稍后重试'
                toast.error(message)
            })
        }
    }

    const columns: ColumnDef<DictionaryOption>[] = [
        {
            accessorKey: 'label',
            header: '选项显示名称',
            cell: ({ row }) => <span className='font-bold'>{row.original.label}</span>
        },
        {
            accessorKey: 'value',
            header: '存值编码',
            cell: ({ row }) => <code className='bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-mono'>{row.original.value}</code>
        },
        {
            id: 'actions',
            header: '操作',
            cell: ({ row }) => (
                <div className='flex items-center gap-1 justify-end'>
                    <Button variant='ghost' size='icon' className='size-8' onClick={() => handleEdit(row.original)}>
                        <Edit className='size-3.5' />
                    </Button>
                    <Button variant='ghost' size='icon' className='size-8 text-destructive' onClick={() => handleDelete(row.original.value)}>
                        <Trash2 className='size-3.5' />
                    </Button>
                </div>
            )
        }
    ]

    const table = useReactTable({
        data: options,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='sm:max-w-2xl flex flex-col p-0 overflow-hidden'>
                    <DialogHeader className='p-6 pb-0'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <DialogTitle className='flex items-center gap-2'>
                                    <Settings2 className='size-5 text-primary' />
                                    {title}
                                </DialogTitle>
                                <DialogDescription className='mt-1 text-xs'>{description}</DialogDescription>
                            </div>
                            <Button size='sm' onClick={handleAdd} className='h-8'>
                                <Plus className='mr-1.5 size-3.5' /> 新增选项
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className='flex-1 overflow-auto p-6'>
                        <div className='rounded-xl border bg-card/50'>
                            <Table>
                                <TableHeader className='bg-muted/50'>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id} className='text-[10px] font-bold py-3 uppercase'>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className='py-2'>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className='h-32 text-center text-muted-foreground italic text-xs'>
                                                暂无配置项。
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className='mt-4'>
                            <DataTablePagination table={table} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <OptionActionDialog 
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                initialData={editingOption}
                onSubmit={async (data) => {
                    const next = editingOption 
                        ? options.map(o => o.value === editingOption.value ? data : o)
                        : [...options, data]
                    try {
                        await saveOptions(next)
                        setIsAddOpen(false)
                    } catch (err) {
                        const message = err instanceof Error ? err.message : '保存失败，请稍后重试'
                        toast.error(message)
                    }
                }}
            />
        </>
    )
}

function OptionActionDialog({ open, onOpenChange, initialData, onSubmit }: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void,
    initialData: DictionaryOption | null,
    onSubmit: (data: DictionaryOption) => Promise<void> | void
}) {
    const form = useForm<z.infer<typeof optionSchema>>({
        resolver: zodResolver(optionSchema),
        defaultValues: { label: '', value: '' }
    })

    useEffect(() => {
        if (open) {
            form.reset(initialData || { label: '', value: '' })
        }
    }, [open, initialData, form])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{initialData ? '编辑选项' : '新增选项'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                        <FormField
                            control={form.control}
                            name='label'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>显示名称</FormLabel>
                                    <FormControl>
                                        <Input placeholder='如: 辅耗材' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='value'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>存值编码 (英文字符)</FormLabel>
                                    <FormControl>
                                        <Input placeholder='如: CONSUMABLES' {...field} disabled={!!initialData} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className='flex justify-end gap-2 pt-4'>
                            <Button variant='outline' type='button' onClick={() => onOpenChange(false)}>取消</Button>
                            <Button type='submit'>确认保存</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
