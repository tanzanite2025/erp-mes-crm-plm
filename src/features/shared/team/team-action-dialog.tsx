import { useMemo, useCallback } from 'react'
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
import type { DeltaSet } from '@/lib/delta/types'
import type { TeamModuleTexts, TeamRecord } from './types'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

type TeamActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: TeamRecord | null
  texts: TeamModuleTexts['dialog']
  onSave: (params: { 
    data: TeamRecord; 
    isPatch: boolean; 
    delta?: DeltaSet; 
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
  texts,
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
  }, [team])

  const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

  const setFormData = useCallback((updater: Partial<TeamRecord> | ((prev: TeamRecord) => TeamRecord)) => {
    if (typeof updater === 'function') {
      Object.assign(formData, updater(formData))
      return
    }

    Object.assign(formData, updater)
  }, [formData])

  const handleSave = () => {
    if (!formData.code || !formData.name || !formData.section) {
      toast.error(texts.validationRequired)
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
          {isEdit ? texts.titleEdit : texts.titleCreate}
        </>
      )}
      description={texts.description}
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
            {texts.footerTracking}
          </p>
          <div className="flex items-center gap-3">
            <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="font-black text-[10px] uppercase tracking-widest rounded-full px-6"
            >
                {texts.cancel}
            </Button>
            <Button 
                disabled={isLoading}
                onClick={handleSave} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all gap-2"
            >
                {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
                {texts.save}
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
              <Hash className='size-3' /> {texts.fields.code}
            </Label>
            <Input
              placeholder={texts.placeholders.code}
              className='h-12 font-mono font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-primary/20 px-5'
              value={formData.code}
              onChange={(e) => { setFormData({ code: e.target.value }) }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Tag className='size-3' /> {texts.fields.name}
            </Label>
            <Input
              placeholder={texts.placeholders.name}
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-primary/20 px-5'
              value={formData.name}
              onChange={(e) => { setFormData({ name: e.target.value }) }}
            />
          </div>
        </div>

        {/* 排序与简称 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{texts.fields.shortName}</Label>
            <Input
              placeholder={texts.placeholders.shortName}
              className='h-11 font-medium text-xs bg-muted/20 border-none rounded-2xl px-5'
              value={formData.shortName}
              onChange={(e) => { setFormData({ shortName: e.target.value }) }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{texts.fields.step}</Label>
            <Input
              type='number'
              className='h-11 font-mono font-black text-xs bg-muted/20 border-none rounded-2xl px-5'
              value={formData.step}
              onChange={(e) => { setFormData({ step: Number.parseInt(e.target.value, 10) || 0 }) }}
            />
          </div>
        </div>

        {/* 类型与区段 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Layers className='size-3' /> {texts.fields.section}
            </Label>
            <Select
              value={formData.section}
              onValueChange={(val) => { setFormData({ section: val }) }}
            >
              <SelectTrigger className='h-12 font-black text-xs bg-muted/40 border-none rounded-2xl px-5'>
                <SelectValue placeholder={texts.placeholders.section} />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                <SelectItem value='生管段' className="text-[10px] font-black uppercase py-3">{texts.sectionOptions.productionControl}</SelectItem>
                <SelectItem value='备料段' className="text-[10px] font-black uppercase py-3">{texts.sectionOptions.materialPrep}</SelectItem>
                <SelectItem value='配料段' className="text-[10px] font-black uppercase py-3">{texts.sectionOptions.batching}</SelectItem>
                <SelectItem value='成型段' className="text-[10px] font-black uppercase py-3">{texts.sectionOptions.molding}</SelectItem>
                <SelectItem value='机加段' className="text-[10px] font-black uppercase py-3">{texts.sectionOptions.machining}</SelectItem>
                <SelectItem value='精细段' className="text-[10px] font-black uppercase py-3">{texts.sectionOptions.finishing}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{texts.fields.type}</Label>
            <Select
              value={formData.type}
              onValueChange={(val) => { setFormData({ type: val as TeamRecord['type'] }) }}
            >
              <SelectTrigger className='h-12 font-black text-xs bg-muted/40 border-none rounded-2xl px-5 italic'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                <SelectItem value='dispatch' className="text-[10px] font-black uppercase py-3">{texts.typeOptions.dispatch}</SelectItem>
                <SelectItem value='quality' className="text-[10px] font-black uppercase py-3 text-emerald-600">{texts.typeOptions.quality}</SelectItem>
                <SelectItem value='transfer' className="text-[10px] font-black uppercase py-3 text-orange-600">{texts.typeOptions.transfer}</SelectItem>
                <SelectItem value='receive' className="text-[10px] font-black uppercase py-3 text-purple-600">{texts.typeOptions.receive}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 状态开关 */}
        <div className='grid grid-cols-2 gap-6 p-6 rounded-3xl bg-muted/10 border border-dashed border-muted/50'>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <Label className='text-[10px] font-black uppercase tracking-widest'>{texts.fields.maintenance}</Label>
              <p className='text-[8px] font-bold text-muted-foreground uppercase'>{texts.maintenanceDescription}</p>
            </div>
            <Switch
              checked={formData.isMaintenance}
              onCheckedChange={(checked) => { setFormData({ isMaintenance: checked }) }}
            />
          </div>
          <div className='flex items-center justify-between border-l border-dashed border-muted/50 pl-6'>
            <div className='space-y-1'>
              <Label className='text-[10px] font-black uppercase tracking-widest'>{texts.fields.status}</Label>
              <p className='text-[8px] font-bold text-muted-foreground uppercase'>{texts.statusDescription}</p>
            </div>
            <Select
              value={formData.status}
              onValueChange={(val) => { setFormData({ status: val as TeamRecord['status'] }) }}
            >
              <SelectTrigger className='w-[100px] h-9 text-[10px] font-black bg-background border-none rounded-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-xl border-none'>
                <SelectItem value='active' className="text-[10px] font-black py-2">{texts.statusOptions.active}</SelectItem>
                <SelectItem value='inactive' className="text-[10px] font-black py-2 text-destructive">{texts.statusOptions.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 备注 */}
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
            <Info className='size-3' /> {texts.fields.remarks}
          </Label>
          <Textarea
            placeholder={texts.placeholders.remarks}
            className='bg-muted/40 border-none resize-none font-medium h-24 rounded-3xl p-5 text-sm transition-all focus-visible:ring-primary/20'
            value={formData.remarks}
            onChange={(e) => { setFormData({ remarks: e.target.value }) }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
