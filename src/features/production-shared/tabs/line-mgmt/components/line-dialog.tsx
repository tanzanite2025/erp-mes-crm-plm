import { useCallback, useMemo } from 'react'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
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
  normalizeProductionLineCode,
  normalizeProductionLineEntity,
} from '../../../utils/production-code-normalization'
import type { ProductionLine } from '../types'

interface LineDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingLine: ProductionLine | null
  lines: ProductionLine[]
  onConfirm: (
    payload:
      | { type: 'CREATE'; data: ProductionLine }
      | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number }
  ) => void
}

const KEYWORD_MAP: Record<string, string> = {
  碳纤维: 'carbon',
  车圈: 'rim',
  前叉: 'fork',
  组装: 'assembly',
  成型: 'forming',
  产线: 'line',
  自动化: 'auto',
  手动: 'manual',
}

export function LineDialog({
  isOpen,
  onOpenChange,
  editingLine,
  lines,
  onConfirm,
}: LineDialogProps) {
  const { t } = useLanguage()

  // 1. 初始化数据模板
  const initialData = useMemo<ProductionLine>(() => {
    if (editingLine) return normalizeProductionLineEntity(editingLine)
    return normalizeProductionLineEntity({
      id: '',
      code: '',
      name: '',
      description: '',
      version: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      segments: [],
    })
  }, [editingLine])

  // 2. 引入 Delta Tracker 引擎
  const tracker = useDeltaTracker(initialData, isOpen)
  const { data: form, commit, isDirty } = tracker

  const setForm = useCallback(
    (updater: ProductionLine | ((prev: ProductionLine) => ProductionLine)) => {
      if (typeof updater === 'function') {
        const next = updater(form)
        Object.assign(form, next)
      } else {
        Object.assign(form, updater)
      }
    },
    [form]
  )

  // 3. 自动生成编号逻辑
  const generateLineCode = (name: string) => {
    let prefix = ''
    Object.entries(KEYWORD_MAP).forEach(([cn, en]) => {
      if (name.includes(cn)) {
        prefix += en
      }
    })

    if (!prefix) prefix = 'line'
    if (!prefix.endsWith('line')) prefix += 'line'

    const nextIndex = lines.length + 1
    const suffix = nextIndex.toString().padStart(3, '0')

    return normalizeProductionLineCode(`${prefix.toLowerCase()}-${suffix}`)
  }

  const handleNameChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      name: val,
      code: !editingLine && val.trim() ? generateLineCode(val) : prev.code,
    }))
  }

  const handleConfirm = () => {
    if (editingLine) {
      // 更新模式：提交 Delta
      const delta = commit()
      if (Object.keys(delta).length > 0) {
        onConfirm({
          type: 'UPDATE',
          id: editingLine.id,
          delta,
          version: editingLine.version,
        })
      } else {
        onOpenChange(false)
      }
    } else {
      // 新增模式：提交全量数据
      onConfirm({
        type: 'CREATE',
        data: { ...form },
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg overflow-hidden rounded-[32px] border-none shadow-2xl'>
        <DialogHeader className='space-y-4'>
          <div className='flex items-center gap-2 text-primary'>
            <DialogTitle className='text-lg font-black tracking-tighter uppercase italic'>
              {editingLine
                ? t('orgPersonnel.lineMgmt.dialog.editTitle')
                : t('orgPersonnel.lineMgmt.dialog.createTitle')}
            </DialogTitle>
          </div>
          <DialogDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {t('orgPersonnel.lineMgmt.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-5 py-4'>
          <div className='space-y-2'>
            <Label
              htmlFor='line-name'
              className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
            >
              {t('orgPersonnel.lineMgmt.dialog.nameLabel')}
            </Label>
            <Input
              id='line-name'
              placeholder={t('orgPersonnel.lineMgmt.dialog.namePlaceholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label
              htmlFor='line-code'
              className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
            >
              {t('orgPersonnel.lineMgmt.dialog.codeLabel')}
            </Label>
            <div className='relative'>
              <Input
                id='line-code'
                placeholder={t('orgPersonnel.lineMgmt.dialog.codePlaceholder')}
                value={form.code}
                readOnly
                className='h-12 cursor-not-allowed rounded-2xl border-dashed border-none border-muted/50 bg-background/50 pr-20 font-mono font-black tracking-tighter text-primary shadow-inner'
              />
              {!editingLine && (
                <div className='absolute top-1/2 right-4 -translate-y-1/2'>
                  <span className='rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] font-black text-primary'>
                    {t('orgPersonnel.lineMgmt.dialog.autoGen')}
                  </span>
                </div>
              )}
            </div>
            <p className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
              {t('orgPersonnel.lineMgmt.dialog.codeHint')}
            </p>
          </div>
          <div className='space-y-2'>
            <Label
              htmlFor='line-desc'
              className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
            >
              {t('orgPersonnel.lineMgmt.dialog.descLabel')}
            </Label>
            <Input
              id='line-desc'
              placeholder={t('orgPersonnel.lineMgmt.dialog.descPlaceholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter className='gap-2 pt-4'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='h-11 rounded-full border-muted px-8 text-[10px] font-black tracking-widest uppercase'
          >
            {t('orgPersonnel.lineMgmt.dialog.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!!editingLine && !isDirty()}
            className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95'
          >
            {editingLine
              ? t('orgPersonnel.lineMgmt.dialog.save')
              : t('orgPersonnel.lineMgmt.dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
