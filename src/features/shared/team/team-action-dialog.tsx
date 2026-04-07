import { useMemo } from 'react'
import { Users, Hash, Layers, Tag, Info, Save } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { TeamRecord } from './types'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

type TeamActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: TeamRecord | null
  onSave: (params: { 
    data: TeamRecord; 
    isPatch: boolean; 
    delta?: any; 
    version?: number 
  }) => void
  isLoading?: boolean
}

const DEFAULT_TEAM: Partial<TeamRecord> = {
  code: '',
  name: '',
  shortName: '',
  step: 0,
  section: '',
  type: 'dispatch',
  isMaintenance: false,
  status: 'active',
  remarks: '',
  version: 1,
}

/**
 * 班组管理详细资料弹窗 (UDS 1.0 + SDRTS)
 */
export function TeamActionDialog({
  open,
  onOpenChange,
  team,
  onSave,
  isLoading,
}: TeamActionDialogProps) {
  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[650px] rounded-[32px] overflow-hidden',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8',
    footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const isEdit = !!team
  const initialFormData = useMemo(() => {
    if (team) return team
    return { 
      ...DEFAULT_TEAM, 
      id: crypto.randomUUID(),
      operateTime: new Date().toISOString() 
    } as TeamRecord
  }, [team, open])

  const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

  const handleSave = () => {
    if (!formData.code || !formData.name || !formData.section) {
      toast.error('请完整填写核心参数（编码、名称、区段）')
      return
    }

    if (isEdit && team) {
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }
      onSave({ 
        data: formData, 
        isPatch: true, 
        delta, 
        version: team.version 
      })
    } else {
      onSave({ data: formData, isPatch: false })
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={(
        <>
          <div className='p-2 bg-primary/10 rounded-xl'>
            <Users className='size-5 text-primary' />
          </div>
          {isEdit ? '编辑班组定义' : '建立全新工作团队'}
        </>
      )}
      description="TEAM_GOVERNANCE / 定义生产协作单元，优化车间排产与计件核算链路。"
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <p className='text-[10px] text-muted-foreground flex items-center gap-2 font-black uppercase tracking-widest opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-primary animate-pulse' />
            Sync_to_ERP_Nodes
          </p>
          <div className="flex items-center gap-3">
            <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="font-black text-[10px] uppercase tracking-widest rounded-full px-6"
            >
                取消 / CANCEL
            </Button>
            <Button 
                disabled={isLoading}
                onClick={handleSave} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all gap-2"
            >
                {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
                同步保存 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />

      <div className='grid gap-8 relative'>
        {/* 核心标识组 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Hash className='size-3' /> 群组编码 / TEAM_CODE
            </Label>
            <Input
              placeholder='例如: G001'
              className='h-12 font-mono font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-primary/20 px-5'
              value={formData.code}
              onChange={(e) => { formData.code = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Tag className='size-3' /> 群组名称 / DISPLAY_NAME
            </Label>
            <Input
              placeholder='例如: 生管派工组'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-primary/20 px-5'
              value={formData.name}
              onChange={(e) => { formData.name = e.target.value }}
            />
          </div>
        </div>

        {/* 排序与简称 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>群组简称 / SHORT_NAME</Label>
            <Input
              placeholder='输入外部系统识别码'
              className='h-11 font-medium text-xs bg-muted/20 border-none rounded-2xl px-5'
              value={formData.shortName}
              onChange={(e) => { formData.shortName = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>显示序列 / ORDER_STEP</Label>
            <Input
              type='number'
              className='h-11 font-mono font-black text-xs bg-muted/20 border-none rounded-2xl px-5'
              value={formData.step}
              onChange={(e) => { formData.step = Number.parseInt(e.target.value, 10) || 0 }}
            />
          </div>
        </div>

        {/* 类型与区段 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Layers className='size-3' /> 归属区段 / SECTION_DOMAIN
            </Label>
            <Select
              value={formData.section}
              onValueChange={(val) => { formData.section = val }}
            >
              <SelectTrigger className='h-12 font-black text-xs bg-muted/40 border-none rounded-2xl px-5'>
                <SelectValue placeholder='请选择业务区段' />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                <SelectItem value='生管段' className="text-[10px] font-black uppercase py-3">生管段 / PMC</SelectItem>
                <SelectItem value='备料段' className="text-[10px] font-black uppercase py-3">备料段 / PREP</SelectItem>
                <SelectItem value='配料段' className="text-[10px] font-black uppercase py-3">配料段 / BATCH</SelectItem>
                <SelectItem value='成型段' className="text-[10px] font-black uppercase py-3">成型段 / MOLD</SelectItem>
                <SelectItem value='机加段' className="text-[10px] font-black uppercase py-3">机加段 / MACH</SelectItem>
                <SelectItem value='精细段' className="text-[10px] font-black uppercase py-3">精细段 / FINISH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>群组类型 / CORE_TYPE</Label>
            <Select
              value={formData.type}
              onValueChange={(val: any) => { formData.type = val }}
            >
              <SelectTrigger className='h-12 font-black text-xs bg-muted/40 border-none rounded-2xl px-5 italic'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                <SelectItem value='dispatch' className="text-[10px] font-black uppercase py-3">派工系统 / DISPATCH</SelectItem>
                <SelectItem value='quality' className="text-[10px] font-black uppercase py-3 text-emerald-600">品质检验 / QUALITY</SelectItem>
                <SelectItem value='transfer' className="text-[10px] font-black uppercase py-3 text-orange-600">生产移转 / TRANSFER</SelectItem>
                <SelectItem value='receive' className="text-[10px] font-black uppercase py-3 text-purple-600">物料接收 / RECEIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 状态开关 */}
        <div className='grid grid-cols-2 gap-6 p-6 rounded-3xl bg-muted/10 border border-dashed border-muted/50'>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <Label className='text-[10px] font-black uppercase tracking-widest'>维修权限 / MAINT</Label>
              <p className='text-[8px] font-bold text-muted-foreground uppercase'>具备返修任务流转权限</p>
            </div>
            <Switch
              checked={formData.isMaintenance}
              onCheckedChange={(checked) => { formData.isMaintenance = checked }}
            />
          </div>
          <div className='flex items-center justify-between border-l border-dashed border-muted/50 pl-6'>
            <div className='space-y-1'>
              <Label className='text-[10px] font-black uppercase tracking-widest'>激活状态 / ACTIVE</Label>
              <p className='text-[8px] font-bold text-muted-foreground uppercase'>是否允许参与排产调度</p>
            </div>
            <Select
              value={formData.status}
              onValueChange={(val: any) => { formData.status = val }}
            >
              <SelectTrigger className='w-[100px] h-9 text-[10px] font-black bg-background border-none rounded-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-xl border-none'>
                <SelectItem value='active' className="text-[10px] font-black py-2">启用</SelectItem>
                <SelectItem value='inactive' className="text-[10px] font-black py-2 text-destructive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 备注 */}
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
            <Info className='size-3' /> 备注说明 / REMARKS
          </Label>
          <Textarea
            placeholder='输入群组的其他描述或特殊规则...'
            className='bg-muted/40 border-none resize-none font-medium h-24 rounded-3xl p-5 text-sm transition-all focus-visible:ring-primary/20'
            value={formData.remarks}
            onChange={(e) => { formData.remarks = e.target.value }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
