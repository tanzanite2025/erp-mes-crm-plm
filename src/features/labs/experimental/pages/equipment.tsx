import { useEffect, useState } from 'react'
import { Microscope, Settings2 } from 'lucide-react'
import { type DeltaSet } from '@/lib/delta/types'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { CategoryActionDialog } from '../components/category-action-dialog'
import { EquipmentActionDialog } from '../components/equipment-action-dialog'
import { EquipmentCategoryNav } from '../components/equipment-category-nav'
import { EquipmentHierarchy } from '../components/equipment-hierarchy'
import { type EquipmentCategory, type Equipment } from '../data/schema'
import {
  useLabExperimentalMutations,
  useLabExperimentalCategories,
} from '../hooks/use-lab-experimental'

export function LabEquipmentPage() {
  const { t } = useLanguage()
  const {
    data: categories = [],
    isLoading,
    error,
  } = useLabExperimentalCategories()
  const {
    saveCategoryMutation,
    patchCategoryMutation,
    deleteCategoryMutation,
    saveEquipmentMutation,
    patchEquipmentMutation,
    deleteEquipmentMutation,
  } = useLabExperimentalMutations()

  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(
    undefined
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] =
    useState<EquipmentCategory | null>(null)
  const [pendingParentId, setPendingParentId] = useState<string | undefined>(
    undefined
  )

  // 设备相关状态
  const [isEquipDialogOpen, setIsEquipDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  )

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

  const handleSaveCategory = async ({
    data,
    isPatch,
    delta,
    version,
  }: {
    data: EquipmentCategory
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => {
    if (isPatch && delta && version !== undefined) {
      patchCategoryMutation.mutate({
        id: data.id,
        delta,
        version,
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

  const handleSaveEquipment = async ({
    data,
    isPatch,
    delta,
    version,
  }: {
    data: Equipment
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => {
    if (isPatch && delta && version !== undefined) {
      patchEquipmentMutation.mutate({
        id: data.id,
        delta,
        version,
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
      <div className='flex animate-pulse flex-col gap-8'>
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
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
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
          <div className='relative overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-8 shadow-inner'>
            <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
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
          <div className='group relative flex h-[400px] flex-col items-center justify-center overflow-hidden rounded-[40px] border-2 border-dashed border-muted-foreground/10 bg-muted/5 text-muted-foreground/20'>
            <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
            <Settings2 className='mb-6 size-16 opacity-20 transition-transform duration-1000 group-hover:rotate-90' />
            <p className='mb-6 text-[11px] font-black tracking-[0.4em] uppercase italic'>
              {t('labExperimental.equipment.noAssetVectors')}
            </p>
            <Button
              variant='outline'
              onClick={() => {
                setEditingCategory(null)
                setPendingParentId(undefined)
                setIsDialogOpen(true)
              }}
              className='h-12 rounded-full border-2 border-dashed px-10 text-[10px] font-black tracking-widest uppercase transition-all hover:border-primary hover:bg-primary hover:text-white active:scale-95'
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
        isLoading={
          saveCategoryMutation.isPending || patchCategoryMutation.isPending
        }
      />

      <EquipmentActionDialog
        open={isEquipDialogOpen}
        onOpenChange={setIsEquipDialogOpen}
        equipment={editingEquipment}
        categoryId={activeCategoryId}
        onSave={handleSaveEquipment}
        onDelete={handleDeleteEquipment}
        isLoading={
          saveEquipmentMutation.isPending || patchEquipmentMutation.isPending
        }
      />
    </div>
  )
}
