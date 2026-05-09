import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import {
  createEmptyHoleCodeSourceBundle,
  SHARED_HOLE_CODE_SOURCE_QUERY_KEY,
  type HoleCodeCountDraft,
  type HoleCodeCountItem,
  type HoleCodePrefixDraft,
  type HoleCodePrefixItem,
} from './data/hole-code-source'
import { useHoleCodeSource } from './hooks/use-hole-code-source'
import { holeCodeSourceService } from './services/hole-code-source-service'

const dialogShellClasses = buildActionDialogShellClasses({
  content: 'w-[95vw] max-w-[900px] rounded-[32px] border-none bg-background p-0 shadow-2xl',
  header: 'border-b border-dashed border-muted/50 bg-muted/10 px-5 py-5 text-left sm:px-8 sm:py-7',
  body: 'space-y-6 p-5 sm:p-8',
  footer:
    'border-t border-dashed border-muted/50 bg-muted/5 px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end',
  title: 'text-left',
  description: 'mt-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/60',
})

const emptyPrefixDraft: HoleCodePrefixDraft = {
  code: 'R',
  label: '',
  description: '',
  active: true,
  sortOrder: 0,
}

const emptyCountDraft: HoleCodeCountDraft = {
  value: '14',
  label: '',
  description: '',
  active: true,
  sortOrder: 0,
}

function toPrefixDraft(item?: HoleCodePrefixItem | null): HoleCodePrefixDraft {
  if (!item) {
    return emptyPrefixDraft
  }

  return {
    id: item.id,
    code: item.code,
    label: item.label,
    description: item.description,
    active: item.active,
    sortOrder: item.sortOrder,
    version: item.version,
  }
}

function toCountDraft(item?: HoleCodeCountItem | null): HoleCodeCountDraft {
  if (!item) {
    return emptyCountDraft
  }

  return {
    id: item.id,
    value: item.value,
    label: item.label,
    description: item.description,
    active: item.active,
    sortOrder: item.sortOrder,
    version: item.version,
  }
}

export function SharedHoleCodeSourceMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data, isLoading } = useHoleCodeSource()
  const bundle = data ?? createEmptyHoleCodeSourceBundle()
  const prefixes = bundle.prefixes
  const counts = bundle.counts
  const [prefixDialogOpen, setPrefixDialogOpen] = useState(false)
  const [countDialogOpen, setCountDialogOpen] = useState(false)
  const [editingPrefix, setEditingPrefix] = useState<HoleCodePrefixItem | null>(null)
  const [editingCount, setEditingCount] = useState<HoleCodeCountItem | null>(null)
  const [prefixDraft, setPrefixDraft] = useState<HoleCodePrefixDraft>(emptyPrefixDraft)
  const [countDraft, setCountDraft] = useState<HoleCodeCountDraft>(emptyCountDraft)

  const activePrefixCount = useMemo(() => prefixes.filter((item) => item.active).length, [prefixes])
  const activeCountCount = useMemo(() => counts.filter((item) => item.active).length, [counts])

  const savePrefixMutation = useMutation({
    mutationFn: (nextDraft: HoleCodePrefixDraft) => holeCodeSourceService.saveHoleCodePrefix(nextDraft),
    onSuccess: async (nextBundle) => {
      queryClient.setQueryData(SHARED_HOLE_CODE_SOURCE_QUERY_KEY, nextBundle)
      toast.success(t('codeCenter.sharedCodeSource.holeCodes.toasts.prefixSaveSuccess'))
      setPrefixDialogOpen(false)
      setEditingPrefix(null)
      setPrefixDraft(emptyPrefixDraft)
    },
    onError: (error) => {
      const message = error instanceof Error && error.message === 'Duplicated hole code prefix'
        ? t('codeCenter.sharedCodeSource.holeCodes.toasts.duplicatePrefixError')
        : t('codeCenter.sharedCodeSource.holeCodes.toasts.prefixSaveFailed')
      toast.error(message)
    },
  })

  const saveCountMutation = useMutation({
    mutationFn: (nextDraft: HoleCodeCountDraft) => holeCodeSourceService.saveHoleCodeCount(nextDraft),
    onSuccess: async (nextBundle) => {
      queryClient.setQueryData(SHARED_HOLE_CODE_SOURCE_QUERY_KEY, nextBundle)
      toast.success(t('codeCenter.sharedCodeSource.holeCodes.toasts.countSaveSuccess'))
      setCountDialogOpen(false)
      setEditingCount(null)
      setCountDraft(emptyCountDraft)
    },
    onError: (error) => {
      const message = error instanceof Error && error.message === 'Duplicated hole code count'
        ? t('codeCenter.sharedCodeSource.holeCodes.toasts.duplicateCountError')
        : t('codeCenter.sharedCodeSource.holeCodes.toasts.countSaveFailed')
      toast.error(message)
    },
  })

  const deletePrefixMutation = useMutation({
    mutationFn: (id: string) => holeCodeSourceService.deleteHoleCodePrefix(id),
    onSuccess: async (nextBundle) => {
      queryClient.setQueryData(SHARED_HOLE_CODE_SOURCE_QUERY_KEY, nextBundle)
      toast.success(t('codeCenter.sharedCodeSource.holeCodes.toasts.prefixDeleteSuccess'))
    },
    onError: () => {
      toast.error(t('codeCenter.sharedCodeSource.holeCodes.toasts.prefixDeleteFailed'))
    },
  })

  const deleteCountMutation = useMutation({
    mutationFn: (id: string) => holeCodeSourceService.deleteHoleCodeCount(id),
    onSuccess: async (nextBundle) => {
      queryClient.setQueryData(SHARED_HOLE_CODE_SOURCE_QUERY_KEY, nextBundle)
      toast.success(t('codeCenter.sharedCodeSource.holeCodes.toasts.countDeleteSuccess'))
    },
    onError: () => {
      toast.error(t('codeCenter.sharedCodeSource.holeCodes.toasts.countDeleteFailed'))
    },
  })

  const openCreatePrefixDialog = () => {
    setEditingPrefix(null)
    setPrefixDraft(emptyPrefixDraft)
    setPrefixDialogOpen(true)
  }

  const openEditPrefixDialog = (item: HoleCodePrefixItem) => {
    setEditingPrefix(item)
    setPrefixDraft(toPrefixDraft(item))
    setPrefixDialogOpen(true)
  }

  const openCreateCountDialog = () => {
    setEditingCount(null)
    setCountDraft(emptyCountDraft)
    setCountDialogOpen(true)
  }

  const openEditCountDialog = (item: HoleCodeCountItem) => {
    setEditingCount(item)
    setCountDraft(toCountDraft(item))
    setCountDialogOpen(true)
  }

  const handleSavePrefix = () => {
    void savePrefixMutation.mutateAsync(prefixDraft)
  }

  const handleSaveCount = () => {
    void saveCountMutation.mutateAsync(countDraft)
  }

  return (
    <div className='flex min-h-[calc(100vh-14rem)] flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Database}
        title={t('codeCenter.sharedCodeSource.holeCodes.page.title')}
        description={t('codeCenter.sharedCodeSource.holeCodes.page.description')}
        gradient
        statusBadge={(
          <div className='inline-flex items-center gap-3 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary/70'>
            <span>{t('codeCenter.sharedCodeSource.holeCodes.page.total', { count: prefixes.length + counts.length })}</span>
            <span className='opacity-40'>/</span>
            <span>{t('codeCenter.sharedCodeSource.holeCodes.page.active', { count: activePrefixCount + activeCountCount })}</span>
          </div>
        )}
      />

      {isLoading ? (
        <div className='flex min-h-[420px] flex-1 items-center justify-center rounded-[28px] border border-dashed border-muted/50 bg-muted/10 p-10 text-center'>
          <div className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60'>
            {t('codeCenter.sharedCodeSource.holeCodes.states.loading')}
          </div>
        </div>
      ) : (
        <div className='grid flex-1 grid-cols-1 gap-6 min-h-0 xl:grid-cols-2 xl:items-stretch'>
          <div className='flex min-h-[520px] flex-col rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-5 shadow-sm sm:p-6'>
            <div className='flex flex-col gap-4 border-b border-dashed border-muted/40 pb-5 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-2'>
                <div className='text-base font-black text-foreground'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.prefix.title')}
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.prefix.description')}
                </div>
                <div className='inline-flex items-center gap-3 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary/70'>
                  <span>{t('codeCenter.sharedCodeSource.holeCodes.sections.prefix.total', { count: prefixes.length })}</span>
                  <span className='opacity-40'>/</span>
                  <span>{t('codeCenter.sharedCodeSource.holeCodes.sections.prefix.active', { count: activePrefixCount })}</span>
                </div>
              </div>
              <Button className='h-11 rounded-full px-8 text-[10px] font-black uppercase tracking-widest' onClick={openCreatePrefixDialog}>
                <Plus className='mr-2 size-4' />
                {t('codeCenter.sharedCodeSource.holeCodes.actions.createPrefix')}
              </Button>
            </div>

            {prefixes.length > 0 ? (
              <div className='mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
                {prefixes.map((item) => (
                  <div key={item.id} className='rounded-[20px] border border-dashed border-muted/40 bg-background/85 px-4 py-3 shadow-sm'>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <div className='inline-flex rounded-full border border-dashed border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-primary/70'>
                            {item.code}
                          </div>
                          <div className='text-sm font-black text-foreground'>{item.label}</div>
                          <div className='inline-flex rounded-full border border-dashed border-muted/40 bg-muted/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/80'>
                            {t('codeCenter.sharedCodeSource.holeCodes.fields.sortOrder')} {item.sortOrder}
                          </div>
                          <div className='inline-flex rounded-full border border-dashed border-muted/40 bg-muted/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/80'>
                            {item.active
                              ? t('codeCenter.sharedCodeSource.holeCodes.states.enabled')
                              : t('codeCenter.sharedCodeSource.holeCodes.states.disabled')}
                          </div>
                        </div>
                        {item.description ? (
                          <div className='mt-2 truncate text-[11px] text-muted-foreground'>{item.description}</div>
                        ) : null}
                      </div>
                      <div className='flex items-center gap-2 self-end lg:self-auto'>
                        <Button variant='outline' size='sm' className='h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest' onClick={() => openEditPrefixDialog(item)}>
                          <Pencil className='mr-1.5 size-3.5' />
                          {t('codeCenter.sharedCodeSource.holeCodes.actions.edit')}
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest text-destructive'
                          onClick={() => void deletePrefixMutation.mutateAsync(item.id)}
                        >
                          <Trash2 className='mr-1.5 size-3.5' />
                          {t('codeCenter.sharedCodeSource.holeCodes.actions.delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='mt-5 flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-dashed border-muted/40 bg-muted/10 p-8 text-center'>
                <div className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.prefix.emptyTitle')}
                </div>
                <div className='mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.prefix.emptyDescription')}
                </div>
              </div>
            )}
          </div>

          <div className='flex min-h-[520px] flex-col rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-5 shadow-sm sm:p-6'>
            <div className='flex flex-col gap-4 border-b border-dashed border-muted/40 pb-5 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-2'>
                <div className='text-base font-black text-foreground'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.count.title')}
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.count.description')}
                </div>
                <div className='inline-flex items-center gap-3 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary/70'>
                  <span>{t('codeCenter.sharedCodeSource.holeCodes.sections.count.total', { count: counts.length })}</span>
                  <span className='opacity-40'>/</span>
                  <span>{t('codeCenter.sharedCodeSource.holeCodes.sections.count.active', { count: activeCountCount })}</span>
                </div>
              </div>
              <Button className='h-11 rounded-full px-8 text-[10px] font-black uppercase tracking-widest' onClick={openCreateCountDialog}>
                <Plus className='mr-2 size-4' />
                {t('codeCenter.sharedCodeSource.holeCodes.actions.createCount')}
              </Button>
            </div>

            {counts.length > 0 ? (
              <div className='mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
                {counts.map((item) => (
                  <div key={item.id} className='rounded-[20px] border border-dashed border-muted/40 bg-background/85 px-4 py-3 shadow-sm'>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <div className='inline-flex rounded-full border border-dashed border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-primary/70'>
                            {item.value}
                          </div>
                          <div className='text-sm font-black text-foreground'>{item.label}</div>
                          <div className='inline-flex rounded-full border border-dashed border-muted/40 bg-muted/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/80'>
                            {t('codeCenter.sharedCodeSource.holeCodes.fields.sortOrder')} {item.sortOrder}
                          </div>
                          <div className='inline-flex rounded-full border border-dashed border-muted/40 bg-muted/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/80'>
                            {item.active
                              ? t('codeCenter.sharedCodeSource.holeCodes.states.enabled')
                              : t('codeCenter.sharedCodeSource.holeCodes.states.disabled')}
                          </div>
                        </div>
                        {item.description ? (
                          <div className='mt-2 truncate text-[11px] text-muted-foreground'>{item.description}</div>
                        ) : null}
                      </div>
                      <div className='flex items-center gap-2 self-end lg:self-auto'>
                        <Button variant='outline' size='sm' className='h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest' onClick={() => openEditCountDialog(item)}>
                          <Pencil className='mr-1.5 size-3.5' />
                          {t('codeCenter.sharedCodeSource.holeCodes.actions.edit')}
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest text-destructive'
                          onClick={() => void deleteCountMutation.mutateAsync(item.id)}
                        >
                          <Trash2 className='mr-1.5 size-3.5' />
                          {t('codeCenter.sharedCodeSource.holeCodes.actions.delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='mt-5 flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-dashed border-muted/40 bg-muted/10 p-8 text-center'>
                <div className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.count.emptyTitle')}
                </div>
                <div className='mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground'>
                  {t('codeCenter.sharedCodeSource.holeCodes.sections.count.emptyDescription')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ActionDialogShell
        open={prefixDialogOpen}
        onOpenChange={setPrefixDialogOpen}
        title={editingPrefix ? t('codeCenter.sharedCodeSource.holeCodes.dialog.prefixEditTitle') : t('codeCenter.sharedCodeSource.holeCodes.dialog.prefixCreateTitle')}
        description={t('codeCenter.sharedCodeSource.holeCodes.dialog.prefixDescription')}
        contentClassName={dialogShellClasses.content}
        headerClassName={dialogShellClasses.header}
        bodyClassName={dialogShellClasses.body}
        footerClassName={dialogShellClasses.footer}
        titleClassName={dialogShellClasses.title}
        descriptionClassName={dialogShellClasses.description}
        footer={(
          <>
            <Button variant='ghost' onClick={() => setPrefixDialogOpen(false)} className='h-11 rounded-full px-8 text-[10px] font-black uppercase tracking-widest'>
              {t('codeCenter.sharedCodeSource.holeCodes.actions.cancel')}
            </Button>
            <Button onClick={handleSavePrefix} className='h-11 rounded-full px-10 text-[10px] font-black uppercase tracking-widest'>
              {t('codeCenter.sharedCodeSource.holeCodes.actions.save')}
            </Button>
          </>
        )}
      >
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2 md:col-span-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-primary/80'>
              {t('codeCenter.sharedCodeSource.holeCodes.fields.label')}
            </Label>
            <Input
              className='h-11 rounded-2xl border-none bg-background/90 shadow-sm'
              value={prefixDraft.label}
              onChange={(event) => setPrefixDraft((prev) => ({ ...prev, label: event.target.value }))}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-primary/80'>
              {t('codeCenter.sharedCodeSource.holeCodes.fields.prefix')}
            </Label>
            <Input
              className='h-11 rounded-2xl border-none bg-background/90 shadow-sm uppercase'
              value={prefixDraft.code}
              maxLength={1}
              onChange={(event) => setPrefixDraft((prev) => ({ ...prev, code: event.target.value.toUpperCase().slice(0, 1) }))}
            />
          </div>
          <div className='space-y-2 md:col-span-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              {t('codeCenter.sharedCodeSource.holeCodes.fields.description')}
            </Label>
            <Textarea
              className='min-h-24 rounded-[24px] border-none bg-background/90 shadow-sm'
              value={prefixDraft.description}
              onChange={(event) => setPrefixDraft((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className='flex h-full items-end md:col-span-2'>
            <div className='flex w-full items-center justify-between rounded-[24px] border border-dashed border-primary/20 bg-background/80 px-5 py-4 shadow-sm'>
              <div className='space-y-1'>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                  {t('codeCenter.sharedCodeSource.holeCodes.fields.active')}
                </div>
                <div className='text-xs font-black text-foreground'>
                  {prefixDraft.active
                    ? t('codeCenter.sharedCodeSource.holeCodes.states.enabled')
                    : t('codeCenter.sharedCodeSource.holeCodes.states.disabled')}
                </div>
              </div>
              <Switch checked={prefixDraft.active} onCheckedChange={(checked) => setPrefixDraft((prev) => ({ ...prev, active: checked }))} />
            </div>
          </div>
        </div>
      </ActionDialogShell>

      <ActionDialogShell
        open={countDialogOpen}
        onOpenChange={setCountDialogOpen}
        title={editingCount ? t('codeCenter.sharedCodeSource.holeCodes.dialog.countEditTitle') : t('codeCenter.sharedCodeSource.holeCodes.dialog.countCreateTitle')}
        description={t('codeCenter.sharedCodeSource.holeCodes.dialog.countDescription')}
        contentClassName={dialogShellClasses.content}
        headerClassName={dialogShellClasses.header}
        bodyClassName={dialogShellClasses.body}
        footerClassName={dialogShellClasses.footer}
        titleClassName={dialogShellClasses.title}
        descriptionClassName={dialogShellClasses.description}
        footer={(
          <>
            <Button variant='ghost' onClick={() => setCountDialogOpen(false)} className='h-11 rounded-full px-8 text-[10px] font-black uppercase tracking-widest'>
              {t('codeCenter.sharedCodeSource.holeCodes.actions.cancel')}
            </Button>
            <Button onClick={handleSaveCount} className='h-11 rounded-full px-10 text-[10px] font-black uppercase tracking-widest'>
              {t('codeCenter.sharedCodeSource.holeCodes.actions.save')}
            </Button>
          </>
        )}
      >
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2 md:col-span-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-primary/80'>
              {t('codeCenter.sharedCodeSource.holeCodes.fields.label')}
            </Label>
            <Input
              className='h-11 rounded-2xl border-none bg-background/90 shadow-sm'
              value={countDraft.label}
              onChange={(event) => setCountDraft((prev) => ({ ...prev, label: event.target.value }))}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-primary/80'>
              {t('codeCenter.sharedCodeSource.holeCodes.fields.holes')}
            </Label>
            <Input
              className='h-11 rounded-2xl border-none bg-background/90 shadow-sm'
              value={countDraft.value}
              maxLength={2}
              onChange={(event) => setCountDraft((prev) => ({ ...prev, value: event.target.value.replace(/\D/g, '').slice(0, 2) }))}
            />
          </div>
          <div className='space-y-2 md:col-span-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              {t('codeCenter.sharedCodeSource.holeCodes.fields.description')}
            </Label>
            <Textarea
              className='min-h-24 rounded-[24px] border-none bg-background/90 shadow-sm'
              value={countDraft.description}
              onChange={(event) => setCountDraft((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className='flex h-full items-end md:col-span-2'>
            <div className='flex w-full items-center justify-between rounded-[24px] border border-dashed border-primary/20 bg-background/80 px-5 py-4 shadow-sm'>
              <div className='space-y-1'>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                  {t('codeCenter.sharedCodeSource.holeCodes.fields.active')}
                </div>
                <div className='text-xs font-black text-foreground'>
                  {countDraft.active
                    ? t('codeCenter.sharedCodeSource.holeCodes.states.enabled')
                    : t('codeCenter.sharedCodeSource.holeCodes.states.disabled')}
                </div>
              </div>
              <Switch checked={countDraft.active} onCheckedChange={(checked) => setCountDraft((prev) => ({ ...prev, active: checked }))} />
            </div>
          </div>
        </div>
      </ActionDialogShell>
    </div>
  )
}
