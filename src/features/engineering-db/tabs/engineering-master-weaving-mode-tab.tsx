import { useMemo, useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { WeavingModeActionDialog } from '../components/weaving-mode-action-dialog'
import { WeavingModeListCard } from '../components/weaving-mode-list-card'
import { WeavingModeToolbar } from '../components/weaving-mode-toolbar'
import { type WeavingMode } from '../data/weaving-mode-schema'
import { useWeavingModeMgmt } from '../hooks/use-weaving-mode-mgmt'

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
    if (
      !window.confirm(
        t('engineering.masterData.weavingMode.toasts.deleteConfirm', {
          name: item.label,
        })
      )
    ) {
      return
    }

    await deleteWeavingMode(item)
  }

  return (
    <div className='flex animate-in flex-col gap-3.5 duration-700 fade-in'>
      <WeavingModeToolbar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onCreate={handleCreate}
        metrics={metrics}
      />

      <WeavingModeListCard
        data={filteredData}
        isLoading={isLoading}
        isLoadError={isLoadError}
        onRetry={() => void refetchWeavingModes()}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

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
