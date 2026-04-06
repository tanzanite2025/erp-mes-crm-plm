'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { type DictionaryEntry, type DictionaryOption, dictionaryEntrySchema } from '../data/schema'
import { Info, Settings2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DictionaryEntryActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (data: DictionaryEntry) => void
    editData?: DictionaryEntry | null
    groupId: string
}

export function DictionaryEntryActionDialog({
    open,
    onOpenChange,
    onConfirm,
    editData,
    groupId,
}: DictionaryEntryActionDialogProps) {
    const [bulkOptions, setBulkOptions] = useState('')

    const form = useForm<DictionaryEntry>({
        resolver: zodResolver(dictionaryEntrySchema) as any,
        defaultValues: {
            id: '',
            groupId: '',
            label: '',
            code: '',
            description: '',
            options: [],
            sortOrder: 0,
            active: true,
            createdAt: new Date().toISOString(),
        } as any,
    })

    useEffect(() => {
        if (open) {
            if (editData) {
                form.reset({
                    ...editData,
                    options: (editData.options || []) as any
                })
                // 将对象数组转回字符串显示在批量输入框
                const optionsText = (editData.options || []).map(opt =>
                    typeof opt === 'string' ? opt : `${opt.label}|${opt.value}`
                ).join('\n')
                setBulkOptions(optionsText)
            } else {
                form.reset({
                    id: '',
                    groupId,
                    label: '',
                    code: `ATTR_${Date.now()}`,
                    description: '',
                    options: [],
                    sortOrder: 0,
                    active: true,
                    createdAt: new Date().toISOString(),
                } as any)
                setBulkOptions('')
            }
        }
    }, [open, editData, groupId, form])

    const onSubmit = (data: DictionaryEntry) => {
        // 解析批量选项
        const lines = bulkOptions.split('\n').filter(line => line.trim() !== '')
        const parsedOptions: DictionaryOption[] = lines.map(line => {
            if (line.includes('|')) {
                const [label, value] = line.split('|').map(s => s.trim())
                return { label: label || value, value: value || label }
            }
            return { label: line.trim(), value: line.trim().toUpperCase() }
        })

        onConfirm({
            ...data,
            options: parsedOptions
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-[550px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl'>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none" />
                <div className="relative p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-black tracking-tighter italic uppercase text-primary flex items-center gap-2">
                            <Settings2 className='size-5' />
                            {editData ? 'EDIT_ATTRIBUTE_DEFINITION / 编辑属性定义' : 'ADD_ATTRIBUTE_DEFINITION / 新增属性定义'}
                        </DialogTitle>
                        <DialogDescription className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                            DEFINE_ATTRIBUTE_NAME_AND_MULTI_SELECT_KEY_VALUE_PAIRS / 定义属性名称及多选键值对。中文用于界面显示，英文键值用于代码对接。
                        </DialogDescription>
                    </DialogHeader>

                    <Alert className='bg-primary/5 border-none py-3 mb-6 rounded-2xl'>
                        <Info className='size-4 text-primary' />
                        <AlertDescription className='text-[10px] text-primary/70 font-black uppercase tracking-widest'>
                            BULK_INPUT_FORMAT: `NAME|VALUE` (ONE_PER_LINE). EXAMPLE: `法式气嘴|VALVE_PRESTA`
                        </AlertDescription>
                    </Alert>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                            <div className='grid grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='label'
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                                                01. ATTRIBUTE_NAME (ZH) / 属性名称
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder='如：胎型' 
                                                    className="h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm font-bold shadow-inner"
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='code'
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                                                02. ATTRIBUTE_CODE (OPT) / 编码
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder='如：TIRE_TYPE' 
                                                    className="h-12 rounded-2xl border-none bg-muted/40 font-mono text-[10px] font-black"
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className='space-y-2'>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                                    03. OPTIONS_LIST (KEY-VALUE) / 备选项列表
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder='每行一个选项，格式为：名称|键值&#10;有钩|HOOK&#10;无钩|HOOKLESS'
                                        className='min-h-[150px] font-mono text-xs rounded-2xl border-none bg-muted/50 p-4 shadow-inner'
                                        value={bulkOptions}
                                        onChange={(e) => setBulkOptions(e.target.value)}
                                    />
                                </FormControl>
                                <p className='text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mt-2 ml-1'>
                                    * AUTOMATIC_CODE_GENERATION_IF_MISSING / 如果不带 `|` 符号，系统将自动把名称转为大写作为键值。
                                </p>
                            </div>

                            <DialogFooter className='pt-6 flex gap-3'>
                                <Button 
                                    type='button' 
                                    variant='ghost' 
                                    className="flex-1 h-12 rounded-full font-black text-[10px] uppercase tracking-widest"
                                    onClick={() => onOpenChange(false)}
                                >
                                    CANCEL / 取消
                                </Button>
                                <Button 
                                    type='submit' 
                                    className="flex-1 h-12 rounded-full bg-primary shadow-xl shadow-primary/20 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all text-primary-foreground"
                                >
                                    CONFIRM_SAVE / 确认保存
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
