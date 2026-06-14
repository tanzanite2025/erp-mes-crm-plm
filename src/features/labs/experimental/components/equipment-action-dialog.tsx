import { useState, useRef, useMemo } from 'react'
import {
  Upload,
  Trash2,
  ImagePlus,
  Microscope,
  Loader2,
  Save,
  Fingerprint,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { type Equipment } from '../data/schema'

interface EquipmentActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment?: Equipment | null
  categoryId?: string
  onSave: (payload: {
    data: Equipment
    isPatch: boolean
    delta?: any
    version?: number
  }) => void
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
    title:
      'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8',
    footer:
      'p-8 pt-4 flex items-center justify-between sm:justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const isEdit = !!equipment
  const initialFormData = useMemo(() => {
    if (equipment) return equipment
    return {
      ...DEFAULT_EQUIPMENT,
      categoryId,
      createdAt: new Date().toISOString(),
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
      onSave({
        data: formData,
        isPatch: true,
        delta,
        version: equipment.version,
      })
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
      title={
        <>
          <Microscope className='size-5 text-primary' />
          {equipment ? '编辑设备详细档案' : '建立全新实验资产'}
        </>
      }
      description='ASSET_GOVERNANCE / 集中化治理实验设备、精密仪器与检测资产档案。'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          {equipment && onDelete && (
            <Button
              variant='ghost'
              onClick={() => setIsDeleteConfirmOpen(true)}
              className='rounded-full px-6 text-[10px] font-black tracking-widest text-destructive uppercase hover:bg-destructive/10'
            >
              <Trash2 className='mr-2 size-3.5' />
              永久下线 / DECOMMISSION
            </Button>
          )}
          <div className='ms-auto flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              取消 / CANCEL
            </Button>
            <Button
              disabled={isLoading}
              onClick={handleSave}
              className='h-11 gap-2 rounded-full bg-primary px-10 text-[10px] font-black tracking-widest text-primary-foreground uppercase shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95'
            >
              {isLoading ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Save className='size-4' />
              )}
              保存更改 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      }
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />

      <div className='relative grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr]'>
        {/* 左侧：图片上传与核心状态 */}
        <div className='space-y-8'>
          <div
            onClick={handleUploadClick}
            className='group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[32px] border-2 border-dashed bg-muted/30 p-0 text-center shadow-inner transition-all hover:border-primary/50 hover:bg-muted/50'
          >
            {formData.imageUrl ? (
              <>
                <img
                  src={formData.imageUrl}
                  alt='Equipment'
                  className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-110'
                />
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-primary/20 opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:opacity-100'>
                  <ImagePlus className='mb-1 size-6 text-primary' />
                  <span className='text-[10px] font-black tracking-widest text-primary uppercase'>
                    更换实物图
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className='mb-3 rounded-full bg-primary/10 p-5 transition-transform group-hover:scale-110'>
                  <Upload className='size-6 text-primary' />
                </div>
                <span className='px-4 text-[9px] leading-tight font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                  点击上传
                  <br />
                  设备实物配图
                </span>
              </>
            )}
            <input
              type='file'
              ref={fileInputRef}
              className='hidden'
              accept='image/*'
              onChange={handleFileChange}
            />
          </div>

          <div className='space-y-4'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              <Activity className='size-3' />
              资产运行状态 / STATUS
            </Label>
            <Select
              value={formData.status}
              onValueChange={(val: any) => {
                formData.status = val
              }}
            >
              <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-[11px] font-black tracking-widest uppercase italic focus:ring-primary/30'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                <SelectItem
                  value='Active'
                  className='py-3 text-[10px] font-black tracking-widest uppercase'
                >
                  运行中 / ACTIVE
                </SelectItem>
                <SelectItem
                  value='Maintenance'
                  className='py-3 text-[10px] font-black tracking-widest text-amber-600 uppercase'
                >
                  维保中 / MAINTENANCE
                </SelectItem>
                <SelectItem
                  value='Inactive'
                  className='py-3 text-[10px] font-black tracking-widest text-rose-600 uppercase'
                >
                  已停用 / INACTIVE
                </SelectItem>
              </SelectContent>
            </Select>
            {formData.status === 'Maintenance' && (
              <div className='animate-pulse rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[9px] font-black tracking-widest text-amber-600 uppercase italic'>
                警告：当前设备处于例行巡检或维修状态。
              </div>
            )}
          </div>
        </div>

        {/* 右侧：详细参数 */}
        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label
                htmlFor='sn'
                className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'
              >
                <Fingerprint className='size-3' />
                序列号 / S.SERIAL_NUMBER
              </Label>
              <Input
                id='sn'
                placeholder='SN_XXXX_XXXX'
                className='h-12 rounded-2xl border-none bg-muted/40 px-5 font-mono text-sm focus-visible:ring-primary/30'
                value={formData.sn}
                onChange={(e) => {
                  formData.sn = e.target.value
                }}
              />
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor='name'
                className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'
              >
                设备名称 / ASSET_NAME
              </Label>
              <Input
                id='name'
                placeholder='例如：精密分析电子天平'
                className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black focus-visible:ring-primary/30'
                value={formData.name}
                onChange={(e) => {
                  formData.name = e.target.value
                }}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label
                htmlFor='model'
                className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'
              >
                型号规格 / MODEL_TYPE
              </Label>
              <Input
                id='model'
                placeholder='GEN-IV 2026'
                className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-medium uppercase focus-visible:ring-primary/30'
                value={formData.model}
                onChange={(e) => {
                  formData.model = e.target.value
                }}
              />
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor='spec'
                className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'
              >
                技术指标 / SPECIFICATIONS
              </Label>
              <Input
                id='spec'
                placeholder='精度 0.0001g / 量程 200g'
                className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-[11px] font-medium focus-visible:ring-primary/30'
                value={formData.spec}
                onChange={(e) => {
                  formData.spec = e.target.value
                }}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label
              htmlFor='description'
              className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'
            >
              功能说明与技术备注 / FUNCTIONAL_DESC
            </Label>
            <Textarea
              id='description'
              placeholder='请输入设备的详细描述、操作规程及校准周期等关键信息...'
              rows={5}
              className='resize-none rounded-3xl border-none bg-muted/40 p-6 text-[11px] leading-relaxed font-medium focus-visible:ring-primary/30'
              value={formData.description}
              onChange={(e) => {
                formData.description = e.target.value
              }}
            />
          </div>
        </div>
      </div>

      {/* 删除确认对话框（内置） */}
      {isDeleteConfirmOpen && (
        <div className='fixed inset-0 z-50 flex animate-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm duration-300 fade-in'>
          <div className='scale-in-95 w-full max-w-md rounded-[40px] border border-dashed bg-background p-10 shadow-2xl duration-300'>
            <h3 className='mb-4 text-xl font-black tracking-tighter text-destructive uppercase italic'>
              确认永久下线受控资产？
            </h3>
            <p className='mb-8 text-[11px] leading-relaxed font-medium tracking-wide text-muted-foreground uppercase'>
              此操作将从资产库中移除{' '}
              <span className='font-black text-foreground'>
                [{formData.name}]
              </span>
              。该操作不可撤销，且会同步清理所有关联的校准记录。
            </p>
            <div className='flex gap-4'>
              <Button
                variant='outline'
                className='h-12 flex-1 rounded-full text-[10px] font-black tracking-widest uppercase'
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                取消操作
              </Button>
              <Button
                variant='destructive'
                className='h-12 flex-1 rounded-full bg-destructive text-[10px] font-black tracking-widest uppercase shadow-xl shadow-destructive/20'
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
