import { useEffect, useState } from 'react'
import { Microscope, Settings2 } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { CategoryActionDialog } from '../components/category-action-dialog'
import { EquipmentActionDialog } from '../components/equipment-action-dialog'
import { EquipmentCategoryNav } from '../components/equipment-category-nav'
import { EquipmentHierarchy } from '../components/equipment-hierarchy'
import { type EquipmentCategory, type Equipment } from '../data/schema'
import { useLabExperimentalMutations, useLabExperimentalCategories } from '../hooks/use-lab-experimental'
import { isForbiddenError } from '@/lib/error-status'

export function LabEquipmentPage() {
  const { t } = useLanguage()
  const { data: categories = [], isLoading, error } = useLabExperimentalCategories()
  const { 
    saveCategoryMutation, 
    patchCategoryMutation, 
    deleteCategoryMutation,
    saveEquipmentMutation,
    patchEquipmentMutation,
    deleteEquipmentMutation
  } = useLabExperimentalMutations()

  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null)
  const [pendingParentId, setPendingParentId] = useState<string | undefined>(undefined)

  // 设备相关状态
  const [isEquipDialogOpen, setIsEquipDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      const firstTopLevel = categories.find((category) => !category.parentId)
      if (firstTopLevel) {
        const syncTimer = globalThis.setTimeout(() => {
          setActiveCategoryId(firstTopLevel.id)
        }, 0)

        return () => {
          globalThis.clearTimeout(syncTimer)
        }
      }
    }
  }, [categories, activeCategoryId])

  const handleSaveCategory = async ({ data, isPatch, delta, version }: { data: EquipmentCategory; isPatch: boolean; delta?: any; version?: number }) => {
    if (isPatch && delta && version !== undefined) {
      patchCategoryMutation.mutate({
        id: data.id,
        delta,
        version
      })
    } else {
      saveCategoryMutation.mutate({
        ...data,
        parentId: pendingParentId || data.parentId,
      })
    }
    setIsDialogOpen(false)
  }

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategoryMutation.mutate(categoryId)
    if (categoryId === activeCategoryId) {
      setActiveCategoryId(undefined)
    }
  }

  const handleSaveEquipment = async ({ data, isPatch, delta, version }: { data: Equipment; isPatch: boolean; delta?: any; version?: number }) => {
    if (isPatch && delta && version !== undefined) {
      patchEquipmentMutation.mutate({
        id: data.id,
        delta,
        version
      })
    } else {
      saveEquipmentMutation.mutate(data)
    }
    setIsEquipDialogOpen(false)
  }

  const handleDeleteEquipment = (id: string) => {
    deleteEquipmentMutation.mutate(id)
  }

  if (isLoading && categories.length === 0) {
    return (
      <div className='flex flex-col gap-8 animate-pulse'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='h-20 rounded-2xl bg-muted/10' />
        <div className='h-[400px] rounded-[32px] bg-muted/5' />
      </div>
    )
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        title={t('labExperimental.equipment.title')}
        description={t('labExperimental.equipment.description')}
        icon={Microscope}
      />

      <div className='space-y-8'>
        <div className='px-1'>
          <EquipmentCategoryNav
            categories={categories}
            activeCategoryId={activeCategoryId || ''}
            onCategoryChange={setActiveCategoryId}
            onAddTopCategory={() => {
              setEditingCategory(null)
              setPendingParentId(undefined)
              setIsDialogOpen(true)
            }}
          />
        </div>

        {activeCategoryId ? (
          <div className='relative rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner p-8'>
            <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
            <EquipmentHierarchy
              categories={categories}
              parentCategoryId={activeCategoryId}
              onEditCategory={(category) => {
                setEditingCategory(category)
                setPendingParentId(undefined)
                setIsDialogOpen(true)
              }}
              onAddSubCategory={(parentId) => {
                setEditingCategory(null)
                setPendingParentId(parentId)
                setIsDialogOpen(true)
              }}
              onDeleteCategory={handleDeleteCategory}
              onAddEquipment={() => {
                setEditingEquipment(null)
                setIsEquipDialogOpen(true)
              }}
              onEditEquipment={(equip) => {
                setEditingEquipment(equip)
                setIsEquipDialogOpen(true)
              }}
            />
          </div>
        ) : (
          <div className='rounded-[40px] border-2 border-dashed border-muted-foreground/10 h-[400px] flex flex-col items-center justify-center text-muted-foreground/20 bg-muted/5 group overflow-hidden relative'>
            <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
            <Settings2 className='size-16 mb-6 opacity-20 group-hover:rotate-90 transition-transform duration-1000' />
            <p className='text-[11px] font-black uppercase tracking-[0.4em] italic mb-6'>
              {t('labExperimental.equipment.noAssetVectors')}
            </p>
            <Button
              variant='outline'
              onClick={() => {
                setEditingCategory(null)
                setPendingParentId(undefined)
                setIsDialogOpen(true)
              }}
              className='h-12 rounded-full border-dashed border-2 font-black text-[10px] uppercase tracking-widest px-10 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95'
            >
              {t('labExperimental.equipment.initializeFirstDomain')}
            </Button>
          </div>
        )}
      </div>

      <CategoryActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={editingCategory}
        parentId={pendingParentId}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
        isLoading={saveCategoryMutation.isPending || patchCategoryMutation.isPending}
      />

      <EquipmentActionDialog
        open={isEquipDialogOpen}
        onOpenChange={setIsEquipDialogOpen}
        equipment={editingEquipment}
        categoryId={activeCategoryId}
        onSave={handleSaveEquipment}
        onDelete={handleDeleteEquipment}
        isLoading={saveEquipmentMutation.isPending || patchEquipmentMutation.isPending}
      />
    </div>
  )
}
