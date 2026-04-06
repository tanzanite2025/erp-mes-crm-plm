import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Settings2, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { type Material, type MaterialCategory } from '../data/schema'
import { resolveMaterialCategoryLabel } from '../utils/material-mgmt-utils'

interface UseMaterialColumnsParams {
  category?: MaterialCategory
  onEdit: (material: Material) => void
  onDelete: (id: string) => void
}

export function useMaterialColumns({ category, onEdit, onDelete }: UseMaterialColumnsParams) {
  const { t } = useLanguage()


  return useMemo<ColumnDef<Material>[]>(() => {
    const columns: ColumnDef<Material>[] = [
      {
        accessorKey: 'code',
        header: () => (
          <div className='w-[140px] pl-8 text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.columns.code')}
          </div>
        ),
        cell: ({ row }) => (
          <div className='pl-8 font-mono text-[10px] font-black text-muted-foreground'>
            {row.original.code || t('materialArchive.columns.noCode')}
          </div>
        ),
      },
      {
        accessorKey: 'name',
        header: () => (
          <div className='min-w-[150px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.columns.name')}
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-sm font-bold tracking-tight'>
            {row.original.name || t('materialArchive.columns.unnamed')}
          </div>
        ),
      },
      {
        id: 'spec',
        header: () => (
          <div className='min-w-[180px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.columns.spec')}
          </div>
        ),
        cell: ({ row }) => {
          const material = row.original

          return (
            <div className='flex flex-col gap-1 py-3'>
              {material.internalDimensions ? (
                <div className='flex flex-wrap gap-1.5'>
                  <Badge
                    variant='outline'
                    className='h-4 rounded-full border-none bg-primary/10 px-2 py-0 font-mono text-[8px] font-black tracking-tighter text-primary'
                  >
                    {t('materialArchive.columns.internalTag')}: {material.internalDimensions.length}x
                    {material.internalDimensions.width}x{material.internalDimensions.height}
                  </Badge>
                  {material.externalDimensions && (
                    <Badge
                      variant='outline'
                      className='h-4 rounded-full border-none bg-muted/40 px-2 py-0 font-mono text-[8px] font-black tracking-tighter text-muted-foreground'
                    >
                      {t('materialArchive.columns.externalTag')}: {material.externalDimensions.length}x
                      {material.externalDimensions.width}x{material.externalDimensions.height}
                    </Badge>
                  )}
                </div>
              ) : material.spec ? (
                <div className='text-[10px] font-bold tracking-wide text-muted-foreground/70'>
                  {material.spec}
                </div>
              ) : (
                <span className='text-[8px] font-black tracking-widest opacity-20'>
                  {t('materialArchive.columns.pendingSpec')}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'uom',
        header: () => (
          <div className='w-[100px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.columns.unit')}
          </div>
        ),
        cell: ({ row }) => (
          <Badge
            variant='secondary'
            className='h-5 rounded-full border-none bg-muted/30 text-[8px] font-black tracking-widest text-muted-foreground/50'
          >
            {row.original.uom}
          </Badge>
        ),
      },
    ]

    if (category === 'all' || !category) {
      columns.push({
        accessorKey: 'category',
        header: () => (
          <div className='w-[140px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.columns.category')}
          </div>
        ),
        cell: ({ row }) => {
          const resolved = resolveMaterialCategoryLabel(
            row.original.category,
            dictionaryService.getOptions('MATERIAL_CATEGORY')
          )

          const categoryLabel =
            resolved && resolved !== row.original.category
              ? resolved
              : row.original.category || t('materialArchive.columns.unknownCategory')

          return (
            <Badge
              variant='outline'
              className='h-4 rounded-full border-none bg-primary/5 px-2 text-[8px] font-black tracking-widest text-primary/60'
            >
              {categoryLabel}
            </Badge>
          )
        },
      })
    }

    columns.push({
      id: 'actions',
      header: () => (
        <div className='w-[100px] pr-8 text-right text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.columns.actions')}
        </div>
      ),
      cell: ({ row }) => {
        const material = row.original

        return (
          <div className='flex justify-end gap-2 pr-8'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-lg transition-all hover:bg-primary/5 hover:text-primary'
              onClick={(event) => {
                event.stopPropagation()
                onEdit(material)
              }}
            >
              <Settings2 className='size-4 text-muted-foreground/40 transition-colors group-hover:text-primary' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-lg text-destructive/40 transition-all hover:bg-destructive/10 hover:text-destructive'
              onClick={(event) => {
                event.stopPropagation()
                onDelete(material.id)
              }}
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        )
      },
    })

    return columns
  }, [category, onDelete, onEdit, t])
}
