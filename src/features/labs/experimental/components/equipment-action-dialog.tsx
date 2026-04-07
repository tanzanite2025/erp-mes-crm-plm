import { useState, useRef, useMemo } from 'react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type Equipment } from '../data/schema'
import { Upload, Trash2, ImagePlus, Microscope, Loader2, Save, Fingerprint, Activity } from 'lucide-react'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

interface EquipmentActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    equipment?: Equipment | null
    categoryId?: string
    onSave: (payload: { data: Equipment; isPatch: boolean; delta?: any; version?: number }) => void
    onDelete?: (id: string) => void
    isLoading?: boolean
}

const DEFAULT_EQUIPMENT: Partial<Equipment> = {
    name: '',
    sn: '',
    model: '',
    spec: '',
    status: 'Active',
    description: '',
    imageUrl: '',
    version: 1,
}

/**
 * 实验设备详细资料弹窗 (UDS 1.0 + SDRTS)
 */
export function EquipmentActionDialog({
    open,
    onOpenChange,
    equipment,
    categoryId,
    onSave,
    onDelete,
    isLoading,
}: EquipmentActionDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

    const shellClasses = buildActionDialogShellClasses({
        content: 'sm:max-w-[700px] rounded-[32px] overflow-hidden',
        header: 'p-8 pb-4 border-none bg-muted/5',
        title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
        description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
        body: 'p-8 pt-4 space-y-8',
        footer: 'p-8 pt-4 flex items-center justify-between sm:justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
    })

    const isEdit = !!equipment
    const initialFormData = useMemo(() => {
        if (equipment) return equipment
        return { 
            ...DEFAULT_EQUIPMENT, 
            categoryId, 
            createdAt: new Date().toISOString() 
        } as Equipment
    }, [equipment, categoryId, open])

    const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

    const handleSave = () => {
        if (!formData.name || !formData.sn) {
            toast.error('请填写设备名称和序列号')
            return
        }

        const isPatch = isEdit
        if (isPatch && equipment) {
            const delta = tracker.commit()
            if (Object.keys(delta).length === 0) {
                onOpenChange(false)
                return
            }
            onSave({ data: formData, isPatch: true, delta, version: equipment.version })
        } else {
            onSave({ data: formData, isPatch: false })
        }
    }

    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                formData.imageUrl = reader.result as string
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <ActionDialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={(
                <>
                    <Microscope className='size-5 text-primary' />
                    {equipment ? '编辑设备详细档案' : '建立全新实验资产'}
                </>
            )}
            description="ASSET_GOVERNANCE / 集中化治理实验设备、精密仪器与检测资产档案。"
            contentClassName={shellClasses.content}
            headerClassName={shellClasses.header}
            bodyClassName={shellClasses.body}
            footerClassName={shellClasses.footer}
            titleClassName={shellClasses.title}
            descriptionClassName={shellClasses.description}
            footer={(
                <>
                    {equipment && onDelete && (
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="text-destructive hover:bg-destructive/10 rounded-full font-black text-[10px] uppercase tracking-widest px-6"
                        >
                            <Trash2 className="mr-2 size-3.5" />
                            永久下线 / DECOMMISSION
                        </Button>
                    )}
                    <div className="flex items-center gap-3 ms-auto">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black text-[10px] uppercase tracking-widest rounded-full px-6">取消 / CANCEL</Button>
                        <Button 
                            disabled={isLoading}
                            onClick={handleSave} 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all gap-2"
                        >
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            保存更改 / SYNC_ARCHIVE
                        </Button>
                    </div>
                </>
            )}
        >
            <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none' />
            
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 relative">
                {/* 左侧：图片上传与核心状态 */}
                <div className="space-y-8">
                    <div
                        onClick={handleUploadClick}
                        className="aspect-square rounded-[32px] bg-muted/30 border-2 border-dashed flex flex-col items-center justify-center p-0 text-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all group relative overflow-hidden shadow-inner"
                    >
                        {formData.imageUrl ? (
                            <>
                                <img src={formData.imageUrl} alt="Equipment" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                                <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                                    <ImagePlus className="size-6 text-primary mb-1" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">更换实物图</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-primary/10 p-5 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="size-6 text-primary" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 leading-tight px-4 tracking-widest italic">
                                    点击上传<br />设备实物配图
                                </span>
                            </>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                            <Activity className="size-3" />
                            资产运行状态 / STATUS
                        </Label>
                        <Select 
                            value={formData.status} 
                            onValueChange={(val: any) => { formData.status = val }}
                        >
                            <SelectTrigger className="h-12 rounded-2xl border-none bg-muted/40 font-black text-[11px] uppercase tracking-widest px-5 italic focus:ring-primary/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="Active" className="text-[10px] font-black uppercase tracking-widest py-3">运行中 / ACTIVE</SelectItem>
                                <SelectItem value="Maintenance" className="text-[10px] font-black uppercase tracking-widest py-3 text-amber-600">维保中 / MAINTENANCE</SelectItem>
                                <SelectItem value="Inactive" className="text-[10px] font-black uppercase tracking-widest py-3 text-rose-600">已停用 / INACTIVE</SelectItem>
                            </SelectContent>
                        </Select>
                        {formData.status === 'Maintenance' && (
                            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-600 animate-pulse italic">
                                警告：当前设备处于例行巡检或维修状态。
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧：详细参数 */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="sn" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <Fingerprint className="size-3" />
                                序列号 / S.SERIAL_NUMBER
                            </Label>
                            <Input
                                id="sn"
                                placeholder="SN_XXXX_XXXX"
                                className="h-12 font-mono text-sm rounded-2xl border-none bg-muted/40 focus-visible:ring-primary/30 px-5"
                                value={formData.sn}
                                onChange={e => { formData.sn = e.target.value }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">设备名称 / ASSET_NAME</Label>
                            <Input
                                id="name"
                                placeholder="例如：精密分析电子天平"
                                className="h-12 font-black text-sm rounded-2xl border-none bg-muted/40 focus-visible:ring-primary/30 px-5"
                                value={formData.name}
                                onChange={e => { formData.name = e.target.value }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="model" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">型号规格 / MODEL_TYPE</Label>
                            <Input
                                id="model"
                                placeholder="GEN-IV 2026"
                                className="h-12 font-medium text-sm rounded-2xl border-none bg-muted/40 focus-visible:ring-primary/30 px-5 uppercase"
                                value={formData.model}
                                onChange={e => { formData.model = e.target.value }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="spec" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">技术指标 / SPECIFICATIONS</Label>
                            <Input
                                id="spec"
                                placeholder="精度 0.0001g / 量程 200g"
                                className="h-12 font-medium text-[11px] rounded-2xl border-none bg-muted/40 focus-visible:ring-primary/30 px-5"
                                value={formData.spec}
                                onChange={e => { formData.spec = e.target.value }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">功能说明与技术备注 / FUNCTIONAL_DESC</Label>
                        <Textarea
                            id="description"
                            placeholder="请输入设备的详细描述、操作规程及校准周期等关键信息..."
                            rows={5}
                            className="resize-none font-medium text-[11px] leading-relaxed rounded-3xl border-none bg-muted/40 focus-visible:ring-primary/30 p-6"
                            value={formData.description}
                            onChange={e => { formData.description = e.target.value }}
                        />
                    </div>
                </div>
            </div>

            {/* 删除确认对话框（内置） */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-background rounded-[40px] shadow-2xl border border-dashed p-10 max-w-md w-full scale-in-95 duration-300">
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-destructive mb-4">确认永久下线受控资产？</h3>
                        <p className="text-[11px] font-medium text-muted-foreground leading-relaxed mb-8 uppercase tracking-wide">
                            此操作将从资产库中移除 <span className="text-foreground font-black">[{formData.name}]</span>。该操作不可撤销，且会同步清理所有关联的校准记录。
                        </p>
                        <div className="flex gap-4">
                            <Button 
                                variant="outline" 
                                className="flex-1 rounded-full h-12 font-black text-[10px] uppercase tracking-widest"
                                onClick={() => setIsDeleteConfirmOpen(false)}
                            >
                                取消操作
                            </Button>
                            <Button 
                                variant="destructive" 
                                className="flex-1 rounded-full h-12 font-black text-[10px] uppercase tracking-widest bg-destructive shadow-xl shadow-destructive/20"
                                onClick={() => {
                                    if (equipment && onDelete) onDelete(equipment.id)
                                    setIsDeleteConfirmOpen(false)
                                    onOpenChange(false)
                                }}
                            >
                                确认下线 / PURGE
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ActionDialogShell>
    )
}
