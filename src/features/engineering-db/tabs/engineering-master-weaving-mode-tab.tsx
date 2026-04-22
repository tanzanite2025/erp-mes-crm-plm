import { useMemo, useState } from 'react'
import { GitBranch } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { type WeavingMode } from '../data/weaving-mode-schema'
import { useWeavingModeMgmt } from '../hooks/use-weaving-mode-mgmt'
import { WeavingModeActionDialog } from '../components/weaving-mode-action-dialog'
import { WeavingModeToolbar } from '../components/weaving-mode-toolbar'
import { WeavingModeListCard } from '../components/weaving-mode-list-card'

export function EngineeringMasterWeavingModeTab() {
  const { t } = useLanguage()
  const {
    filteredData,
    isLoading,
    isLoadError,
    searchTerm,
    setSearchTerm,
    refetchWeavingModes,
    saveWeavingMode,
    deleteWeavingMode,
    isSaving,
  } = useWeavingModeMgmt()
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<WeavingMode | null>(null)

  const metrics = useMemo(() => {
    return {
      total: filteredData.length,
      active: filteredData.filter((item) => item.active).length,
      presets: filteredData.filter((item) => item.isSystemPreset).length,
    }
  }, [filteredData])

  const handleCreate = () => {
    setCurrentRow(null)
    setOpen(true)
  }

  const handleEdit = (item: WeavingMode) => {
    setCurrentRow(item)
    setOpen(true)
  }

  const handleDelete = async (item: WeavingMode) => {
    if (!window.confirm(t('engineering.masterData.weavingMode.toasts.deleteConfirm', { name: item.label }))) {
      return
    }

    await deleteWeavingMode(item)
  }

  return (
    <div className='flex flex-col gap-6 animate-in fade-in duration-700'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='space-y-3'>
            <div className='flex items-center gap-3 text-primary'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10'>
                <GitBranch className='size-5' />
              </div>
              <div>
                <div className='text-lg font-black tracking-tight italic'>
                  {t('engineering.masterData.weavingMode.overview.title')}
                </div>
                <div className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
                  {t('engineering.masterData.weavingMode.overview.description')}
                </div>
              </div>
            </div>
            <div className='inline-flex flex-wrap items-center gap-3 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary/70'>
              <span>{t('engineering.masterData.weavingMode.metrics.total', { count: metrics.total })}</span>
              <span className='opacity-40'>/</span>
              <span>{t('engineering.masterData.weavingMode.metrics.active', { count: metrics.active })}</span>
              <span className='opacity-40'>/</span>
              <span>{t('engineering.masterData.weavingMode.metrics.presets', { count: metrics.presets })}</span>
            </div>
          </div>
        </div>
      </div>

      <WeavingModeToolbar searchTerm={searchTerm} onSearchTermChange={setSearchTerm} onCreate={handleCreate} />

      <WeavingModeListCard data={filteredData} isLoading={isLoading} isLoadError={isLoadError} onRetry={() => void refetchWeavingModes()} onEdit={handleEdit} onDelete={handleDelete} />

      <WeavingModeActionDialog
        key={`${currentRow?.id ?? 'create'}-${open ? 'open' : 'closed'}`}
        open={open}
        onOpenChange={setOpen}
        currentRow={currentRow}
        onSave={async (draft) => {
          await saveWeavingMode(draft)
        }}
        isLoading={isSaving}
      />
    </div>
  )
}
