import { Layers3, RefreshCw, Save } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { HierarchyConfigEditor } from './components/hierarchy-config-editor'
import { useHierarchyConfigEditor } from './hooks/use-hierarchy-config-editor'

export function HierarchyConfig() {
  const {
    levels,
    optionCatalogs,
    isDirty,
    isLoading,
    isSaving,
    saveConfig,
    resetConfig,
    updateLevelName,
    addLevelOption,
    updateLevelOption,
    toggleLevelOptionEnabled,
    moveLevelOption,
    removeLevelOption,
  } = useHierarchyConfigEditor()

  if (isLoading) {
    return <div className='px-1 py-10 text-center text-sm text-muted-foreground animate-pulse'>正在加载层级配置...</div>
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Layers3}
        title='层级配置'
        description='Hierarchy Naming / 独立定义生产架构的三级命名方式'
        statusBadge={
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              className='h-11 rounded-full border-dashed text-[10px] font-black uppercase tracking-widest'
              onClick={() => void resetConfig()}
              disabled={isSaving}
            >
              <RefreshCw className='mr-2 size-4' /> 恢复默认
            </Button>
            <Button
              type='button'
              className='h-11 rounded-full text-[10px] font-black uppercase tracking-widest'
              onClick={() => void saveConfig()}
              disabled={isSaving || !isDirty}
            >
              <Save className='mr-2 size-4' /> 保存配置
            </Button>
          </div>
        }
      />

      <div className='px-1'>
        <p className='max-w-3xl text-[11px] leading-relaxed text-muted-foreground/75'>此页面用于统一维护生产架构的层级命名。当前版本已开始驱动现有产线管理中的一级与二级层级名称，但尚未全面接入模板、APS 与底层模型。</p>
      </div>

      <HierarchyConfigEditor
        editor={{
          levels,
          optionCatalogs,
          updateLevelName,
          addLevelOption,
          updateLevelOption,
          toggleLevelOptionEnabled,
          moveLevelOption,
          removeLevelOption,
        }}
      />
    </div>
  )
}
