import { useEffect, useMemo, useState } from 'react'
import { Factory } from 'lucide-react'
import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { useLanguage } from '@/context/language-provider'
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
import { Textarea } from '@/components/ui/textarea'
import type { ProductionLineMutationPayload } from '../contracts/production-line-mutation'
import type { ProductionLine } from '../data/production-line'
import {
  normalizeProductionLineCode,
  normalizeProductionLineEntity,
} from '../utils/production-code-normalization'

interface ProductionLineProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingLine: ProductionLine | null
  lines: ProductionLine[]
  onSubmit: (payload: ProductionLineMutationPayload) => void | Promise<void>
}

interface ProductionLineProfileForm {
  name: string
  code: string
  description: string
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

function createForm(line: ProductionLine | null): ProductionLineProfileForm {
  return {
    name: line?.name ?? '',
    code: line?.code ?? '',
    description: line?.description ?? '',
  }
}

export function ProductionLineProfileDialog({
  open,
  onOpenChange,
  editingLine,
  lines,
  onSubmit,
}: ProductionLineProfileDialogProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<ProductionLineProfileForm>(() =>
    createForm(editingLine)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = Boolean(editingLine)
  const initialForm = useMemo(() => createForm(editingLine), [editingLine])

  useEffect(() => {
    if (open) {
      setForm(initialForm)
      setIsSubmitting(false)
    }
  }, [initialForm, open])

  const generateLineCode = (name: string) => {
    let prefix = ''
    Object.entries(KEYWORD_MAP).forEach(([keyword, value]) => {
      if (name.includes(keyword)) {
        prefix += value
      }
    })

    if (!prefix) {
      prefix = 'line'
    }
    if (!prefix.endsWith('line')) {
      prefix += 'line'
    }

    const usedCodes = new Set(lines.map((line) => line.code))
    let index = lines.length + 1
    let candidate = normalizeProductionLineCode(
      `${prefix.toLowerCase()}-${String(index).padStart(3, '0')}`
    )
    while (usedCodes.has(candidate)) {
      index += 1
      candidate = normalizeProductionLineCode(
        `${prefix.toLowerCase()}-${String(index).padStart(3, '0')}`
      )
    }
    return candidate
  }

  const handleNameChange = (name: string) => {
    setForm((current) => ({
      ...current,
      name,
      code: isEditing
        ? current.code
        : name.trim()
          ? generateLineCode(name)
          : '',
    }))
  }

  const handleSubmit = async () => {
    const name = form.name.trim()
    if (!name) {
      return
    }

    setIsSubmitting(true)
    try {
      const code = normalizeProductionLineCode(form.code)
      const description = form.description.trim()

      if (editingLine) {
        const delta = buildFlattenDelta(
          {
            name: editingLine.name,
            code: editingLine.code,
            description: editingLine.description,
          },
          { name, code, description }
        )

        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }

        await onSubmit({
          type: 'UPDATE',
          id: editingLine.id,
          delta,
          version: editingLine.version,
        })
      } else {
        const now = new Date().toISOString()
        await onSubmit({
          type: 'CREATE',
          data: normalizeProductionLineEntity({
            id: '',
            code,
            name,
            description,
            version: 1,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            segments: [],
          }),
        })
      }
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[620px] rounded-[32px] border-none p-0 shadow-2xl'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative space-y-6 p-5 md:p-7'>
          <DialogHeader className='space-y-2 text-left'>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/30 bg-primary/10'>
                <Factory className='size-4 text-primary' />
              </div>
              <div className='space-y-1'>
                <DialogTitle className='text-sm font-black tracking-tighter uppercase italic'>
                  {isEditing
                    ? t('orgPersonnel.lineMgmt.dialog.editTitle')
                    : t('orgPersonnel.lineMgmt.dialog.createTitle')}
                </DialogTitle>
                <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('orgPersonnel.lineMgmt.dialog.description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label
                htmlFor='production-line-profile-name'
                className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
              >
                {t('orgPersonnel.lineMgmt.dialog.nameLabel')}
              </Label>
              <Input
                id='production-line-profile-name'
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder={t('orgPersonnel.lineMgmt.dialog.namePlaceholder')}
                className='h-11 rounded-2xl border-none bg-muted/50 font-medium shadow-none focus-visible:ring-1 focus-visible:ring-primary/20'
              />
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor='production-line-profile-code'
                className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
              >
                {t('orgPersonnel.lineMgmt.dialog.codeLabel')}
              </Label>
              <Input
                id='production-line-profile-code'
                value={form.code}
                readOnly={!isEditing}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder={t('orgPersonnel.lineMgmt.dialog.codePlaceholder')}
                className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-black tracking-tight shadow-none focus-visible:ring-1 focus-visible:ring-primary/20'
              />
              <p className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                {t('orgPersonnel.lineMgmt.dialog.codeHint')}
              </p>
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label
                htmlFor='production-line-profile-description'
                className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'
              >
                {t('orgPersonnel.lineMgmt.dialog.descLabel')}
              </Label>
              <Textarea
                id='production-line-profile-description'
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={t('orgPersonnel.lineMgmt.dialog.descPlaceholder')}
                className='min-h-24 resize-none rounded-2xl border-none bg-muted/50 font-medium shadow-none focus-visible:ring-1 focus-visible:ring-primary/20'
              />
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className='h-11 rounded-full border-muted px-8 text-[10px] font-black tracking-widest uppercase'
            >
              {t('orgPersonnel.lineMgmt.dialog.cancel')}
            </Button>
            <Button
              type='button'
              onClick={() => void handleSubmit()}
              disabled={!form.name.trim() || isSubmitting}
              className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20'
            >
              {isEditing
                ? t('orgPersonnel.lineMgmt.dialog.save')
                : t('orgPersonnel.lineMgmt.dialog.confirm')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
