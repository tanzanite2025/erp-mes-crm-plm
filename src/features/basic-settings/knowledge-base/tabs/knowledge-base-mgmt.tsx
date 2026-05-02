import { AlertCircle, BookOpenText } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { KnowledgeBaseEntryEditor } from '../components/knowledge-base-entry-editor'
import { KnowledgeBaseEntryList } from '../components/knowledge-base-entry-list'
import { KnowledgeBaseToolbar } from '../components/knowledge-base-toolbar'
import { useKnowledgeBase } from '../hooks/use-knowledge-base'

export function KnowledgeBaseMgmt() {
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

  return (
    <div className='flex flex-col gap-4 p-1 md:p-2'>
      <IndustrialHeader
        icon={BookOpenText}
        title={t('basicSettings.knowledgeBase.page.title')}
        description={t('basicSettings.knowledgeBase.page.subtitle')}
        gradient
        statusBadge={
          <div className='flex w-fit shrink-0 items-center gap-3 rounded-full border border-primary/10 bg-primary/5 px-4 py-1'>
            <span className='text-[10px] font-black uppercase tracking-widest text-primary/60'>
              {t('basicSettings.knowledgeBase.page.entryCount', { count: entries.length })}
            </span>
            <div className='size-1.5 rounded-full bg-emerald-500' />
          </div>
        }
      />

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
