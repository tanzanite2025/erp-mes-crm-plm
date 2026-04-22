import { useMemo, useState } from 'react'
import { GitBranch, Info, Save } from 'lucide-react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { type WeavingMode, type WeavingModeDraft } from '../data/weaving-mode-schema'
import { normalizeWeavingRatio } from '../data/weaving-mode-utils'

interface WeavingModeActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: WeavingMode | null
  onSave: (draft: WeavingModeDraft) => Promise<void>
  isLoading?: boolean
}

const shellClasses = buildActionDialogShellClasses({
  content: 'sm:max-w-[720px] rounded-[32px] overflow-hidden',
  header: 'p-8 pb-4 border-none bg-muted/5',
  title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
  description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
  body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
  footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
})

function buildDefaultDraft(): WeavingModeDraft {
  return {
    ratioNumerator: 1,
    ratioDenominator: 1,
    description: '',
    active: true,
  }
}

function buildDraftFromRow(currentRow?: WeavingMode | null): WeavingModeDraft {
  if (!currentRow) {
    return buildDefaultDraft()
  }

  return {
    id: currentRow.id,
    ratioNumerator: currentRow.ratioNumerator,
    ratioDenominator: currentRow.ratioDenominator,
    description: currentRow.description,
    active: currentRow.active,
    isSystemPreset: currentRow.isSystemPreset,
    sortOrder: currentRow.sortOrder,
    version: currentRow.version,
    createdAt: currentRow.createdAt,
  }
}

export function WeavingModeActionDialog({
  open,
  onOpenChange,
  currentRow,
  onSave,
  isLoading,
}: WeavingModeActionDialogProps) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState<WeavingModeDraft>(() => buildDraftFromRow(currentRow))

  const normalizedPreview = useMemo(() => {
    return normalizeWeavingRatio(draft.ratioNumerator, draft.ratioDenominator).normalizedRatioKey
  }, [draft.ratioNumerator, draft.ratioDenominator])

  const ratioLocked = Boolean(currentRow?.isSystemPreset)

  const handleSubmit = async () => {
    await onSave(draft)
    onOpenChange(false)
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={(
        <>
          <div className='rounded-xl bg-primary/10 p-2'>
            <GitBranch className='size-5 text-primary' />
          </div>
          {currentRow
            ? t('engineering.masterData.weavingMode.dialog.editTitle')
            : t('engineering.masterData.weavingMode.dialog.createTitle')}
        </>
      )}
      description={t('engineering.masterData.weavingMode.dialog.description')}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <p className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-primary animate-pulse' />
            Engineering_Master_Weaving_Mode
          </p>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
            >
              {t('engineering.masterData.weavingMode.actions.cancel')}
            </Button>
            <Button
              disabled={isLoading}
              onClick={() => void handleSubmit()}
              className='h-11 gap-2 rounded-full px-10 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20'
            >
              <Save className='size-4' />
              {t('engineering.masterData.weavingMode.actions.save')}
            </Button>
          </div>
        </>
      )}
    >
      <div className='grid gap-8'>
        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              {t('engineering.masterData.weavingMode.fields.ratioNumerator')}
            </Label>
            <Input
              type='number'
              min={1}
              disabled={ratioLocked}
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner'
              value={draft.ratioNumerator}
              onChange={(event) => setDraft((prev) => ({ ...prev, ratioNumerator: Math.max(1, Number(event.target.value) || 1) }))}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              {t('engineering.masterData.weavingMode.fields.ratioDenominator')}
            </Label>
            <Input
              type='number'
              min={1}
              disabled={ratioLocked}
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner'
              value={draft.ratioDenominator}
              onChange={(event) => setDraft((prev) => ({ ...prev, ratioDenominator: Math.max(1, Number(event.target.value) || 1) }))}
            />
          </div>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              {t('engineering.masterData.weavingMode.fields.normalizedResult')}
            </Label>
            <div className='flex h-12 items-center rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-5 text-sm font-black text-primary'>
              {normalizedPreview}
            </div>
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              {t('engineering.masterData.weavingMode.fields.active')}
            </Label>
            <div className='flex h-12 items-center rounded-2xl border border-dashed border-muted/30 bg-background px-5 text-sm font-black text-foreground shadow-sm'>
              {draft.active
                ? t('engineering.masterData.weavingMode.badges.active')
                : t('engineering.masterData.weavingMode.badges.inactive')}
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
            {t('engineering.masterData.weavingMode.fields.description')}
          </Label>
          <Textarea
            className='min-h-[120px] resize-none rounded-[24px] border-none bg-muted/40 p-5 text-sm font-bold shadow-inner'
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>

        {ratioLocked ? (
          <div className='rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 p-5'>
            <div className='flex items-start gap-3'>
              <Info className='mt-0.5 size-4 text-amber-500' />
              <div className='space-y-2'>
                <div className='text-[10px] font-black uppercase tracking-widest text-amber-600/80'>
                  {t('engineering.masterData.weavingMode.hints.presetLockedTitle')}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {t('engineering.masterData.weavingMode.hints.presetLockedDescription')}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className='rounded-[24px] border border-dashed border-primary/20 bg-background/80 px-5 py-4 shadow-sm'>
          <div className='flex items-center justify-between gap-4'>
            <div className='space-y-1'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                {t('engineering.masterData.weavingMode.fields.active')}
              </div>
              <div className='text-xs font-black text-foreground'>
                {draft.active
                  ? t('engineering.masterData.weavingMode.badges.active')
                  : t('engineering.masterData.weavingMode.badges.inactive')}
              </div>
            </div>
            <Switch
              checked={draft.active}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, active: checked }))}
            />
          </div>
        </div>
      </div>
    </ActionDialogShell>
  )
}
