import { useEffect, useState } from 'react'
import { Users, Hash, Layers, Tag, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

type TeamActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: TeamRecord | null
  onSave: (data: Partial<TeamRecord>) => void
}

function getDefaultFormData(): Partial<TeamRecord> {
  return {
    code: '',
    name: '',
    shortName: '',
    step: 0,
    section: '',
    type: 'dispatch',
    isMaintenance: false,
    status: 'active',
    remarks: '',
  }
}

export function TeamActionDialog({
  open,
  onOpenChange,
  team,
  onSave,
}: TeamActionDialogProps) {
  const [formData, setFormData] = useState<Partial<TeamRecord>>(getDefaultFormData())

  useEffect(() => {
    if (team) {
      setFormData(team)
      return
    }
    setFormData(getDefaultFormData())
  }, [team, open])

  const handleSave = () => {
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px] border-none shadow-2xl overflow-hidden rounded-3xl'>
        <div className='absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50' />

        <DialogHeader className='pt-4'>
          <DialogTitle className='text-2xl font-black tracking-tighter flex items-center gap-3'>
            <div className='p-2 bg-primary/10 rounded-xl'>
              <Users className='size-6 text-primary' />
            </div>
            {team ? '编辑班组定义' : '建立全新工作团队'}
          </DialogTitle>
          <DialogDescription className='text-xs font-bold uppercase tracking-widest opacity-70'>
            {team
              ? `正在调整群组 [${team.code}] 的核心参数`
              : '定义新的生产协作单元，优化车间排产链路'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-6 py-6'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
                <Hash className='size-3' /> 群组编码
              </Label>
              <Input
                placeholder='例如: G001'
                className='h-11 font-mono font-bold bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20'
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
                <Tag className='size-3' /> 群组名称
              </Label>
              <Input
                placeholder='例如: 生管派工组'
                className='h-11 font-bold bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20'
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>群组简称</Label>
              <Input
                placeholder='输入易于识别的简称'
                className='h-11 font-medium bg-muted/10 border-none'
                value={formData.shortName}
                onChange={(e) => setFormData((prev) => ({ ...prev, shortName: e.target.value }))}
              />
            </div>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>群组步骤 (排序)</Label>
              <Input
                type='number'
                placeholder='0'
                className='h-11 font-bold bg-muted/10 border-none'
                value={formData.step}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, step: Number.parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
                <Layers className='size-3' /> 归属区段
              </Label>
              <Select
                value={typeof formData.section === 'string' ? formData.section : ''}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, section: val }))}
              >
                <SelectTrigger className='h-11 font-bold bg-muted/30 border-none'>
                  <SelectValue placeholder='请选择区段' />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-none shadow-xl'>
                  <SelectItem value='生管段'>生管段</SelectItem>
                  <SelectItem value='备料段'>备料段</SelectItem>
                  <SelectItem value='配料段'>配料段</SelectItem>
                  <SelectItem value='成型段'>成型段</SelectItem>
                  <SelectItem value='机加段'>机加段</SelectItem>
                  <SelectItem value='精细段'>精细段</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>群组类型</Label>
              <Select
                value={typeof formData.type === 'string' ? formData.type : 'dispatch'}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, type: val as TeamRecord['type'] }))
                }
              >
                <SelectTrigger className='h-11 font-bold bg-muted/30 border-none'>
                  <SelectValue placeholder='选择类型' />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-none shadow-xl'>
                  <SelectItem value='dispatch'>派工系统</SelectItem>
                  <SelectItem value='quality'>品质检验</SelectItem>
                  <SelectItem value='transfer'>生产移转</SelectItem>
                  <SelectItem value='receive'>物料接收</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4 items-center bg-muted/10 p-4 rounded-2xl border border-white/5'>
            <div className='flex items-center justify-between space-x-4'>
              <div className='space-y-0.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>是否维修组</Label>
                <p className='text-[10px] text-muted-foreground'>开启后具备返修作业权限</p>
              </div>
              <Switch
                checked={Boolean(formData.isMaintenance)}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isMaintenance: checked }))}
              />
            </div>
            <div className='flex items-center justify-between space-x-4 border-l pl-4 border-white/10'>
              <div className='space-y-0.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>运行状态</Label>
                <p className='text-[10px] text-muted-foreground'>群组是否允许在排产中使用</p>
              </div>
              <Select
                value={typeof formData.status === 'string' ? formData.status : 'active'}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, status: val as TeamRecord['status'] }))
                }
              >
                <SelectTrigger className='w-[100px] h-9 text-xs font-bold bg-background border-none rounded-lg'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='rounded-lg border-none'>
                  <SelectItem value='active'>启用</SelectItem>
                  <SelectItem value='inactive'>停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid gap-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
              <Info className='size-3' /> 备注说明
            </Label>
            <Textarea
              placeholder='输入群组的其他描述或特殊规则...'
              className='bg-muted/10 border-none resize-none font-medium h-24 rounded-2xl p-4 text-xs'
              value={typeof formData.remarks === 'string' ? formData.remarks : ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className='bg-muted/30 p-6 -mx-6 -mb-6 mt-2 flex items-center justify-between'>
          <p className='text-[10px] text-muted-foreground flex items-center gap-2 font-medium'>
            <span className='inline-block size-1.5 rounded-full bg-primary animate-pulse' />
            数据将同步至全线 ERP 节点
          </p>
          <div className='flex gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 font-bold text-xs uppercase hover:bg-white/5'
            >
              取消操作
            </Button>
            <Button
              onClick={handleSave}
              className='rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase shadow-lg shadow-primary/20 transition-all active:scale-95'
            >
              提交保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
