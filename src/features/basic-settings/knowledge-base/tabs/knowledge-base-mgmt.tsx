import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { KnowledgeBaseEntryEditor } from '../components/knowledge-base-entry-editor'
import { KnowledgeBaseEntryList } from '../components/knowledge-base-entry-list'
import { KnowledgeBaseToolbar } from '../components/knowledge-base-toolbar'
import { useKnowledgeBase } from '../hooks/use-knowledge-base'

interface KnowledgeBaseMgmtProps {
  search?: {
    action?: 'create'
  }
  onActionConsumed?: () => void
}

export function KnowledgeBaseMgmt({ search, onActionConsumed }: KnowledgeBaseMgmtProps) {
  const { t } = useLanguage()
  const {
    entries,
    filteredEntries,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    editingEntry,
    draft,
    setDraft,
    isEditorOpen,
    isLoading,
    isSaving,
    errorMessage,
    openCreate,
    openEdit,
    closeEditor,
    saveDraft,
    deleteEntry,
  } = useKnowledgeBase()

  useEffect(() => {
    if (search?.action !== 'create') return

    openCreate()
    onActionConsumed?.()
  }, [onActionConsumed, openCreate, search?.action])

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      {/* 顶级标准页眉布局 */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black italic tracking-tighter uppercase'>
            {t('basicSettings.knowledgeBase.page.title')}
          </h2>
          <p className='text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60'>
            {t('basicSettings.knowledgeBase.page.subtitle')}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex h-9 items-center gap-3 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4'>
            <span className='text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 italic'>
              {t('basicSettings.knowledgeBase.page.entryCount', { count: entries.length })}
            </span>
            <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className='flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[12px] font-bold text-destructive'>
          <AlertCircle className='mt-0.5 size-4 shrink-0' />
          <span>{t('basicSettings.knowledgeBase.page.saveFailed')}</span>
        </div>
      ) : null}

      <KnowledgeBaseToolbar
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        onSearchChange={setSearchTerm}
        onCategoryChange={setCategoryFilter}
        onCreate={openCreate}
      />

      <KnowledgeBaseEntryList
        entries={filteredEntries}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={deleteEntry}
      />

      <KnowledgeBaseEntryEditor
        open={isEditorOpen}
        draft={draft}
        isEditing={Boolean(editingEntry)}
        isSaving={isSaving}
        onDraftChange={setDraft}
        onSave={saveDraft}
        onClose={closeEditor}
      />
    </div>
  )
}
