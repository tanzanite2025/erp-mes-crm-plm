import { Layers3, RefreshCw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HierarchyConfigEditor } from '../../hierarchy-config/components/hierarchy-config-editor'
import { useHierarchyConfigEditor } from '../../hierarchy-config/hooks/use-hierarchy-config-editor'

interface HierarchyConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HierarchyConfigDialog({
  open,
  onOpenChange,
}: HierarchyConfigDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        className='w-[95vw] max-w-[1120px] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'
      >
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />

        <div className='relative flex max-h-[85vh] flex-col bg-background'>
          <div className='border-b border-dashed border-muted/30 px-5 py-5 md:px-8 md:py-6'>
            <DialogHeader className='text-left'>
              <DialogTitle className='flex items-center gap-2 text-lg font-black tracking-tighter uppercase italic'>
                <Layers3 className='size-5 text-primary' /> 维护层级配置
              </DialogTitle>
              <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                在脑图内开放一级、二级与第三级层级配置维护，第三级作为真实作业层可在此就地维护。
              </DialogDescription>
            </DialogHeader>

            <div className='mt-4 rounded-[24px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
              当前弹窗开放一级、二级与第三级层级名称及候选项池维护。这里维护的是第三级层级配置，不等同于
              `process library / capability` 本体与关系编辑。
            </div>
          </div>

          <div className='flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6'>
            {isLoading ? (
              <div className='animate-pulse rounded-[24px] border border-dashed border-muted/40 bg-muted/5 px-4 py-10 text-center text-sm text-muted-foreground'>
                正在加载层级配置...
              </div>
            ) : (
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
                scopedLevels={[1, 2, 3]}
                showPreview={false}
                layoutVariant='dialog'
              />
            )}
          </div>

          <DialogFooter className='border-t border-dashed border-muted/30 px-5 py-4 md:px-8'>
            <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                className='h-11 rounded-full border-dashed text-[10px] font-black tracking-widest uppercase'
                onClick={() => void resetConfig()}
                disabled={isSaving}
              >
                <RefreshCw className='mr-2 size-4' /> 恢复默认
              </Button>
              <Button
                type='button'
                className='h-11 rounded-full text-[10px] font-black tracking-widest uppercase'
                onClick={() => void saveConfig()}
                disabled={isSaving || !isDirty}
              >
                <Save className='mr-2 size-4' /> 保存配置
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
