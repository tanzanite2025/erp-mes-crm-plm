'use client'

import { useMemo, useState } from 'react'
import {
  Edit2,
  Layers3,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { isConflictError } from '@/lib/handle-server-error'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { type BOMSectionConfig } from '../data/bom-section-schema'
import { useBOMSectionConfig } from '../hooks/use-bom-section-config'

type BOMSectionFormState = Omit<
  BOMSectionConfig,
  'id' | 'version' | 'createdAt' | 'updatedAt' | 'legacyNames'
>

const DEFAULT_FORM_DATA: BOMSectionFormState = {
  code: '',
  name: '',
  description: '',
  isSystem: false,
  active: true,
  sortOrder: 0,
  isDefault: false,
}

function sortSections(items: BOMSectionConfig[]) {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.code.localeCompare(b.code)
  })
}

function extractBOMSectionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim()
  }
  if (!error || typeof error !== 'object') {
    return ''
  }

  const shape = error as {
    error?: unknown
    message?: unknown
    response?: {
      data?: {
        error?: unknown
        message?: unknown
      }
    }
  }

  const candidates = [
    shape.error,
    shape.message,
    shape.response?.data?.error,
    shape.response?.data?.message,
  ]
  const resolved = candidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  )
  return typeof resolved === 'string' ? resolved.trim() : ''
}

function isBOMSectionIdentifierConflictError(error: unknown) {
  return extractBOMSectionErrorMessage(error)
    .toLowerCase()
    .includes('bom section identifier conflict')
}

function isBOMSectionRequiresActiveError(error: unknown) {
  return extractBOMSectionErrorMessage(error)
    .toLowerCase()
    .includes('at least one active bom section is required')
}

function isBOMSectionDeleteProtectedError(error: unknown) {
  return extractBOMSectionErrorMessage(error).includes(
    '系统 BOM section 不允许删除'
  )
}

function isBOMSectionDeleteLinkedError(error: unknown) {
  return extractBOMSectionErrorMessage(error).includes(
    'BOM section 已被配方引用，无法删除'
  )
}

export function BOMSectionConfigTab() {
  const { allowsAction } = useNonBlockingPermissionActions()
  const { t } = useLanguage()
  const {
    readResource,
    sections,
    createSection,
    patchSection,
    deleteSection,
    refetch,
    isActionLoading,
  } = useBOMSectionConfig()

  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<BOMSectionConfig | null>(
    null
  )
  const [formData, setFormData] =
    useState<BOMSectionFormState>(DEFAULT_FORM_DATA)
  const [deleteTarget, setDeleteTarget] = useState<BOMSectionConfig | null>(
    null
  )

  const canManage = allowsAction('perm_manage')

  const filteredSections = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return sortSections(sections).filter((section) => {
      if (!keyword) return true
      return [
        section.code,
        section.name,
        section.description,
        ...section.legacyNames,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    })
  }, [searchTerm, sections])

  const activeSectionCount = useMemo(
    () => sections.filter((section) => section.active).length,
    [sections]
  )
  const isEditingLastActiveSection = Boolean(
    editingSection?.active && activeSectionCount <= 1
  )

  const updateForm = (patch: Partial<BOMSectionFormState>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch }
      if (!next.active) {
        next.isDefault = false
      }
      if (next.isDefault) {
        next.active = true
      }
      return next
    })
  }

  const handleAdd = () => {
    if (!canManage) return
    setEditingSection(null)
    setFormData({
      ...DEFAULT_FORM_DATA,
      sortOrder: sortSections(sections).length + 1,
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (section: BOMSectionConfig) => {
    if (!canManage) return
    setEditingSection(section)
    setFormData({
      code: section.code,
      name: section.name,
      description: section.description || '',
      isSystem: section.isSystem,
      active: section.active,
      sortOrder: section.sortOrder,
      isDefault: section.isDefault,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!canManage) return
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error(t('engineering.bomSectionConfig.toasts.formIncomplete'))
      return
    }
    if (editingSection?.active && activeSectionCount <= 1 && !formData.active) {
      toast.error(t('engineering.bomSectionConfig.toasts.lastActiveBlocked'))
      return
    }

    try {
      if (editingSection) {
        const tracker = trackDelta(editingSection)
        const draft = tracker.data as BOMSectionConfig
        Object.assign(draft, {
          ...editingSection,
          name: formData.name.trim(),
          description: (formData.description ?? '').trim(),
          active: formData.active,
          sortOrder: formData.sortOrder,
          isDefault: formData.isDefault,
        })
        const delta = tracker.commit()
        delete delta.code
        delete delta.isSystem
        if (Object.keys(delta).length === 0) {
          setIsDialogOpen(false)
          return
        }
        await patchSection({
          id: editingSection.id,
          delta,
          version: editingSection.version,
        })
      } else {
        await createSection({
          ...formData,
          code: normalizeMachineCode(formData.code),
          name: formData.name.trim(),
          description: (formData.description ?? '').trim(),
          isSystem: false,
        })
      }

      toast.success(t('engineering.bomSectionConfig.toasts.saveSuccess'))
      setIsDialogOpen(false)
    } catch (error) {
      if (isBOMSectionIdentifierConflictError(error)) {
        toast.error(t('engineering.bomSectionConfig.toasts.identifierConflict'))
        return
      }
      if (isBOMSectionRequiresActiveError(error)) {
        toast.error(t('engineering.bomSectionConfig.toasts.lastActiveBlocked'))
        return
      }
      if (editingSection && isConflictError(error)) {
        toast.error(t('engineering.bomSectionConfig.toasts.conflict'))
        return
      }
      failLoudly(error, 'BOMSectionConfigTab.handleSave', { silentUI: true })
      toast.error(t('engineering.bomSectionConfig.toasts.saveFailed'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.active && activeSectionCount <= 1) {
      toast.error(t('engineering.bomSectionConfig.toasts.lastActiveBlocked'))
      return
    }
    try {
      await deleteSection(deleteTarget.id)
      toast.success(t('engineering.bomSectionConfig.toasts.deleteSuccess'))
      setDeleteTarget(null)
    } catch (error) {
      if (isBOMSectionRequiresActiveError(error)) {
        toast.error(t('engineering.bomSectionConfig.toasts.lastActiveBlocked'))
        return
      }
      if (isBOMSectionDeleteProtectedError(error)) {
        toast.error(t('engineering.bomSectionConfig.toasts.deleteProtected'))
        return
      }
      if (isBOMSectionDeleteLinkedError(error)) {
        toast.error(t('engineering.bomSectionConfig.toasts.deleteLinked'))
        return
      }
      failLoudly(error, 'BOMSectionConfigTab.handleDelete', { silentUI: true })
      toast.error(t('engineering.bomSectionConfig.toasts.deleteFailed'))
    }
  }

  if (readResource.status === 'error') {
    return (
      <div className='rounded-[32px] border border-dashed border-rose-200 bg-rose-50/60 p-8 text-center'>
        <div className='mx-auto flex max-w-xl flex-col items-center gap-3'>
          <Settings2 className='size-8 text-rose-500' />
          <h2 className='text-lg font-black tracking-tighter text-rose-700 uppercase italic'>
            {t('engineering.bomSectionConfig.title')}
          </h2>
          <p className='text-[11px] font-bold text-rose-700'>
            {readResource.error.message ||
              t('engineering.bomSectionConfig.toasts.loadFailed')}
          </p>
          <Button
            variant='outline'
            onClick={() => void refetch()}
            className='rounded-full'
          >
            {t('engineering.bomSectionConfig.actions.retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div className='space-y-2'>
            <div className='flex items-center gap-3 text-primary'>
              <Settings2 className='size-5' />
              <h1 className='text-lg font-black tracking-tighter uppercase italic'>
                {t('engineering.bomSectionConfig.title')}
              </h1>
            </div>
            <p className='text-[9px] font-black tracking-widest uppercase opacity-60'>
              {t('engineering.bomSectionConfig.description')}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='relative min-w-[240px]'>
              <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t(
                  'engineering.bomSectionConfig.searchPlaceholder'
                )}
                className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-[11px] font-bold'
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!canManage || isActionLoading}
              className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            >
              <Plus className='mr-2 size-4' />
              {t('engineering.bomSectionConfig.actions.add')}
            </Button>
          </div>
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {(readResource.status === 'loading'
          ? Array.from({ length: 4 })
          : filteredSections
        ).map((item, index) => {
          if (readResource.status === 'loading') {
            return (
              <div
                key={`loading-${index}`}
                className='rounded-[24px] border border-dashed border-muted/50 bg-background/80 p-6'
              >
                <div className='flex items-center gap-3 text-muted-foreground/50'>
                  <Loader2 className='size-4 animate-spin' />
                  <span className='text-[10px] font-black tracking-widest uppercase'>
                    {t('engineering.bomSectionConfig.loading')}
                  </span>
                </div>
              </div>
            )
          }

          const section = item as BOMSectionConfig
          return (
            <div
              key={section.id}
              className='relative overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background/80 p-6 shadow-sm'
            >
              <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
              <div className='relative flex flex-col gap-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h2 className='text-sm font-black tracking-tighter italic'>
                        {section.name}
                      </h2>
                      <Badge
                        variant='outline'
                        className='h-5 rounded-full border-none bg-muted/40 font-mono text-[8px]'
                      >
                        {section.code}
                      </Badge>
                      {section.isDefault ? (
                        <Badge className='h-5 rounded-full bg-emerald-500/10 font-mono text-[8px] text-emerald-600'>
                          DEFAULT
                        </Badge>
                      ) : null}
                      {section.isSystem ? (
                        <Badge className='h-5 rounded-full bg-slate-500/10 font-mono text-[8px] text-slate-600'>
                          SYSTEM
                        </Badge>
                      ) : null}
                      {!section.active ? (
                        <Badge className='h-5 rounded-full bg-amber-500/10 font-mono text-[8px] text-amber-600'>
                          INACTIVE
                        </Badge>
                      ) : null}
                    </div>
                    <div className='font-mono text-[8px] text-muted-foreground'>
                      SORT {section.sortOrder.toString().padStart(2, '0')} /
                      VERSION {section.version}
                    </div>
                    <p className='text-[11px] font-bold text-muted-foreground/70'>
                      {section.description ||
                        t('engineering.bomSectionConfig.emptyDescription')}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={() => handleEdit(section)}
                      disabled={!canManage || isActionLoading}
                      className='rounded-full'
                    >
                      <Edit2 className='size-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={() => setDeleteTarget(section)}
                      disabled={
                        !canManage ||
                        section.isSystem ||
                        isActionLoading ||
                        (section.active && activeSectionCount <= 1)
                      }
                      className='rounded-full'
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {readResource.status === 'ready' && filteredSections.length === 0 ? (
        <div className='rounded-[24px] border border-dashed border-muted/50 bg-background/70 p-10 text-center'>
          <Layers3 className='mx-auto size-10 text-muted-foreground/30' />
          <div className='mt-4 text-sm font-black tracking-tighter italic'>
            {t('engineering.bomSectionConfig.emptyTitle')}
          </div>
          <p className='mt-2 text-[11px] font-bold text-muted-foreground/60'>
            {t('engineering.bomSectionConfig.emptyDescription')}
          </p>
        </div>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='rounded-[32px] border-none shadow-2xl'>
          <DialogHeader>
            <DialogTitle className='text-sm font-black tracking-tighter italic'>
              {editingSection
                ? t('engineering.bomSectionConfig.dialog.editTitle')
                : t('engineering.bomSectionConfig.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
              {t('engineering.bomSectionConfig.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-5 py-2'>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('engineering.bomSectionConfig.fields.code')}
              </Label>
              <Input
                value={formData.code}
                disabled={Boolean(editingSection)}
                onChange={(event) =>
                  updateForm({ code: normalizeMachineCode(event.target.value) })
                }
                placeholder={t(
                  'engineering.bomSectionConfig.placeholders.code'
                )}
                className='h-12 rounded-2xl border-none bg-muted/50 font-mono placeholder:text-[10px] placeholder:font-black placeholder:tracking-wide placeholder:text-muted-foreground/40'
              />
            </div>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('engineering.bomSectionConfig.fields.name')}
              </Label>
              <Input
                value={formData.name}
                onChange={(event) => updateForm({ name: event.target.value })}
                placeholder={t(
                  'engineering.bomSectionConfig.placeholders.name'
                )}
                className='h-12 rounded-2xl border-none bg-muted/50 placeholder:text-[10px] placeholder:font-black placeholder:tracking-wide placeholder:text-muted-foreground/40'
              />
            </div>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('engineering.bomSectionConfig.fields.description')}
              </Label>
              <Textarea
                value={formData.description}
                onChange={(event) =>
                  updateForm({ description: event.target.value })
                }
                placeholder={t(
                  'engineering.bomSectionConfig.placeholders.description'
                )}
                className='min-h-24 rounded-2xl border-none bg-muted/50 placeholder:text-[10px] placeholder:font-black placeholder:tracking-wide placeholder:text-muted-foreground/40'
              />
            </div>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('engineering.bomSectionConfig.fields.sortOrder')}
              </Label>
              <Input
                type='number'
                value={formData.sortOrder}
                onChange={(event) =>
                  updateForm({ sortOrder: Number(event.target.value || 0) })
                }
                className='h-12 rounded-2xl border-none bg-muted/50'
              />
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='flex items-center justify-between rounded-[24px] border border-dashed border-muted/50 bg-muted/10 p-4'>
                <div>
                  <div className='text-[10px] font-black tracking-widest uppercase'>
                    {t('engineering.bomSectionConfig.fields.active')}
                  </div>
                  <div className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                    {isEditingLastActiveSection
                      ? t(
                          'engineering.bomSectionConfig.fields.activeLockedHint'
                        )
                      : t('engineering.bomSectionConfig.fields.activeHint')}
                  </div>
                </div>
                <Switch
                  checked={formData.active}
                  disabled={
                    isActionLoading ||
                    (isEditingLastActiveSection && formData.active)
                  }
                  onCheckedChange={(checked) => updateForm({ active: checked })}
                />
              </div>
              <div className='flex items-center justify-between rounded-[24px] border border-dashed border-muted/50 bg-muted/10 p-4'>
                <div>
                  <div className='text-[10px] font-black tracking-widest uppercase'>
                    {t('engineering.bomSectionConfig.fields.isDefault')}
                  </div>
                  <div className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                    {t('engineering.bomSectionConfig.fields.isDefaultHint')}
                  </div>
                </div>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    updateForm({ isDefault: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDialogOpen(false)}
              className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            >
              {t('engineering.bomSectionConfig.actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!canManage || isActionLoading}
              className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            >
              {t('engineering.bomSectionConfig.actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={t('engineering.bomSectionConfig.deleteConfirmTitle')}
        desc={t('engineering.bomSectionConfig.deleteConfirmDesc', {
          name: deleteTarget?.name || '',
        })}
        confirmText={t('engineering.bomSectionConfig.actions.delete')}
        cancelBtnText={t('engineering.bomSectionConfig.actions.cancel')}
        destructive
        isLoading={isActionLoading}
        handleConfirm={() => void handleDelete()}
      />
    </div>
  )
}
