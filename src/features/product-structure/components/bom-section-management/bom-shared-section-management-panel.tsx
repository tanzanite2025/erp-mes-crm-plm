import { useState } from 'react'
import { Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBOMSharedSectionManagementEditor } from '../../hooks/use-bom-shared-section-management-editor'
import { BOMSharedSectionInlineEditor } from './bom-shared-section-inline-editor'

/** Reused by the configuration page and BOM dialog. All catalog edits stay in this panel. */
export function BOMSharedSectionManagementPanel({
  className,
}: {
  className?: string
}) {
  const { t } = useLanguage()
  const editor = useBOMSharedSectionManagementEditor()
  const [searchTerm, setSearchTerm] = useState('')
  const keyword = searchTerm.trim().toLocaleLowerCase()
  const filteredSections = editor.sortedSections.filter((section) =>
    [
      section.code,
      section.name,
      section.description,
      ...section.legacyNames,
    ].some((value) => value.toLocaleLowerCase().includes(keyword))
  )

  if (editor.readResource.status === 'loading')
    return (
      <div
        role='status'
        className='flex min-h-40 flex-1 items-center justify-center gap-2'
      >
        <Loader2 className='size-4 animate-spin' />
        {t('engineering.bomSectionConfig.loading')}
      </div>
    )
  if (editor.readResource.status === 'error')
    return (
      <div
        role='alert'
        className='flex flex-1 flex-col items-center justify-center gap-3 p-5'
      >
        <p>{t('engineering.bomSectionConfig.toasts.loadFailed')}</p>
        <Button
          type='button'
          variant='outline'
          onClick={() => void editor.refetch()}
        >
          {t('engineering.bomSectionConfig.actions.retry')}
        </Button>
      </div>
    )

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-3 md:grid md:grid-cols-[230px_minmax(0,1fr)]',
        className
      )}
    >
      <aside
        aria-label={t('engineering.bomSectionConfig.listLabel')}
        className='flex min-h-0 shrink-0 flex-col gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-2.5 md:shrink'
      >
        <div className='relative shrink-0'>
          <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            aria-label={t('engineering.bomSectionConfig.searchPlaceholder')}
            placeholder={t('engineering.bomSectionConfig.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className='h-9 rounded-xl border-transparent bg-muted/40 pl-9 text-xs'
          />
        </div>
        <div className='custom-scrollbar max-h-28 min-h-0 space-y-1 overflow-y-auto md:max-h-none md:flex-1'>
          {filteredSections.map((section) => (
            <button
              key={section.id}
              type='button'
              aria-label={section.name}
              aria-pressed={editor.selectedSection?.id === section.id}
              disabled={editor.isActionLoading}
              onClick={() =>
                editor.selectBOMSharedSectionForInlineEditing(section)
              }
              className={cn(
                'flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                editor.selectedSection?.id === section.id
                  ? 'border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-300'
                  : 'border-transparent bg-background/60 hover:bg-muted/50'
              )}
            >
              <span className='min-w-0'>
                <span className='block truncate text-sm font-semibold'>
                  {section.name}
                </span>
                <span className='block truncate text-[10px] text-muted-foreground'>
                  {section.code}
                </span>
              </span>
              {section.isDefault ? (
                <span className='shrink-0 text-[10px]'>
                  {t('engineering.bomSectionConfig.fields.isDefault')}
                </span>
              ) : !section.active ? (
                <span className='shrink-0 text-[10px] text-muted-foreground'>
                  {t('engineering.bomSectionConfig.inactiveLabel')}
                </span>
              ) : null}
            </button>
          ))}
          {filteredSections.length === 0 && (
            <p className='p-3 text-xs text-muted-foreground'>
              {t('engineering.bomSectionConfig.emptyTitle')}
            </p>
          )}
        </div>
        <Button
          type='button'
          variant='outline'
          className='h-10 shrink-0 rounded-full'
          disabled={!editor.canManage || editor.isActionLoading}
          onClick={editor.startCreatingBOMSharedSection}
        >
          <Plus className='mr-1 size-4' />
          {t('engineering.bomSectionConfig.actions.add')}
        </Button>
      </aside>
      <section
        aria-label={t('engineering.bomSectionConfig.editorLabel')}
        className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-dashed border-border/60'
      >
        <div className='custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4'>
          {!editor.canManage && (
            <p className='rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground'>
              {t('engineering.bomSectionConfig.readOnlyHint')}
            </p>
          )}
          <BOMSharedSectionInlineEditor editor={editor} />
        </div>
        <div className='shrink-0 space-y-2 border-t border-dashed border-border/60 p-3'>
          {editor.isConfirmingDeletion && (
            <div
              role='alert'
              className='flex flex-wrap items-center justify-between gap-2 rounded-xl bg-destructive/5 p-2.5 text-xs'
            >
              <p>
                {t('engineering.bomSectionConfig.deleteConfirmDesc', {
                  name: editor.selectedSection?.name ?? '',
                })}
              </p>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={editor.isActionLoading}
                  onClick={() => editor.setIsConfirmingDeletion(false)}
                >
                  {t('engineering.bomSectionConfig.actions.cancel')}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='destructive'
                  disabled={editor.isActionLoading}
                  onClick={() => void editor.deleteSelectedBOMSharedSection()}
                >
                  {t('engineering.bomSectionConfig.actions.confirmDelete')}
                </Button>
              </div>
            </div>
          )}
          <div className='flex items-center justify-between gap-2'>
            <Button
              type='button'
              variant='ghost'
              className='h-10 rounded-full text-destructive hover:text-destructive'
              disabled={
                !editor.canDeleteSelectedSection || editor.isActionLoading
              }
              onClick={() => editor.setIsConfirmingDeletion(true)}
            >
              <Trash2 className='mr-1 size-4' />
              {t('engineering.bomSectionConfig.actions.delete')}
            </Button>
            <Button
              type='button'
              className='h-10 rounded-full px-5'
              disabled={!editor.canManage || editor.isActionLoading}
              onClick={() => void editor.saveBOMSharedSectionEditorDraft()}
            >
              {editor.isActionLoading && (
                <Loader2 className='mr-1 size-4 animate-spin' />
              )}
              {t('engineering.bomSectionConfig.actions.save')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
