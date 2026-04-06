import { useState, useEffect } from 'react'
import { Lightbulb, Edit2, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { StorageService } from '@/features/system-mgmt/services/storage-service'

const DICT_MEMO_KEY = 'xdfc_dict_design_memo'

const DEFAULT_MEMO = `建议引入规则：
1. 适合放入字典：非计算项（如胎型、气嘴）、高频分类属性、行业专有规格。
2. 避免放入字典：涉及物理公式运算的字段（如框高、内宽、重量）、唯一性流水号。
3. 命名规范：使用清晰的中文标题，键值建议使用大写英文以便代码对接。`

export function DictMemoSection() {
    const [memo, setMemo] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        const loadMemo = async () => {
            const storedMemo = await StorageService.getItem<string>(DICT_MEMO_KEY)
            setMemo(storedMemo || DEFAULT_MEMO)
        }
        loadMemo()
    }, [])

    const handleSave = async () => {
        await StorageService.setItem(DICT_MEMO_KEY, memo)
        setIsEditing(false)
        toast.success('设计备忘录已保存 / SCHEMA_SYNC_SUCCESS')
    }

    return (
        <Alert className='bg-amber-500/5 border-amber-500/20 rounded-[24px] border-dashed shadow-none group relative overflow-hidden py-4 animate-in fade-in duration-500'>
            <Lightbulb className='size-4 text-amber-600 mt-1' />
            <div className='flex-1 ml-3'>
                <AlertTitle className='text-amber-700 dark:text-amber-500 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest italic'>
                    设计师备忘录 DESIGN_MEMO_PROTOCOL
                    {!isEditing && (
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setIsEditing(true)}
                            className='h-6 px-3 rounded-full text-[9px] font-black uppercase text-amber-700 hover:bg-amber-100 opacity-0 group-hover:opacity-100 transition-opacity ml-auto italic'
                        >
                            <Edit2 className='size-3 mr-1.5' /> EDIT_SCHEMA / 编辑规范
                        </Button>
                    )}
                </AlertTitle>
                
                <div className='mt-2 leading-relaxed'>
                    {isEditing ? (
                        <div className='space-y-4 pt-2'>
                            <textarea
                                className='w-full min-h-[140px] p-5 text-sm font-medium rounded-2xl border-none focus:ring-1 focus:ring-amber-500/20 bg-background/50 outline-none transition-all shadow-inner'
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                            />
                            <div className='flex justify-end gap-2'>
                                <Button 
                                    size='sm' 
                                    variant='ghost' 
                                    onClick={() => setIsEditing(false)} 
                                    className='h-9 rounded-full text-xs font-bold px-6'
                                >
                                    <X className='size-3 mr-2 text-rose-500' /> CANCEL
                                </Button>
                                <Button 
                                    size='sm' 
                                    onClick={handleSave} 
                                    className='h-9 rounded-full bg-amber-600 hover:bg-amber-700 text-white border-none font-black text-[10px] uppercase shadow-xl shadow-amber-600/20 px-8'
                                >
                                    <CheckCircle2 className='size-4 mr-2' /> COMMIT_SYNC / 保存同步分析
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className='whitespace-pre-wrap text-[11px] font-bold tracking-tight text-amber-900/60 dark:text-amber-400/80 leading-relaxed italic'>
                            {memo}
                        </div>
                    )}
                </div>
            </div>
        </Alert>
    )
}
