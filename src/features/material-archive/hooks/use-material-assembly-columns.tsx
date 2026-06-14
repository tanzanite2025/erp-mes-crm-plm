import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Settings2, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type PackagingRule } from '../data/schema'
import { type MaterialAssemblyRow } from './use-material-assembly-manager'

interface UseMaterialAssemblyColumnsParams {
  onEdit: (rule: PackagingRule, baseUnit: string) => void
  onDelete: (id: string) => void
}

/** Returns the memoized column definition for the packaging assembly table. */
export function useMaterialAssemblyColumns({
  onEdit,
  onDelete,
}: UseMaterialAssemblyColumnsParams) {
  const { t } = useLanguage()

  return useMemo<ColumnDef<MaterialAssemblyRow>[]>(() => {
    return [
      {
        accessorKey: 'materialCode',
        header: () => (
          <div className='w-[120px] pl-8 text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.assemblyManager.table.code')}
          </div>
        ),
        cell: ({ row }) => (
          <div className='pl-8 font-mono text-[10px] font-black text-muted-foreground'>
            {row.original.materialCode}
          </div>
        ),
      },
      {
        accessorKey: 'materialName',
        header: () => (
          <div className='text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.assemblyManager.table.name')}
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-sm font-bold tracking-tight'>
            {row.original.materialName}
          </div>
        ),
      },
      {
        accessorKey: 'baseUnit',
        header: () => (
          <div className='w-[100px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.assemblyManager.table.baseUnit')}
          </div>
        ),
        cell: ({ row }) => (
          <Badge
            variant='outline'
            className='h-5 rounded-full border-none bg-muted/5 text-[8px] font-black tracking-widest text-muted-foreground/50'
          >
            {row.original.baseUnit}
          </Badge>
        ),
      },
      {
        accessorKey: 'packUnit',
        header: () => (
          <div className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.assemblyManager.table.packUnit')}
          </div>
        ),
        cell: ({ row }) => (
          <Badge className='h-5 rounded-full border-none bg-primary/10 px-3 text-[8px] font-black tracking-widest text-primary'>
            {row.original.packUnit}
          </Badge>
        ),
      },
      {
        accessorKey: 'conversionFactor',
        header: () => (
          <div className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.assemblyManager.table.factor')}
          </div>
        ),
        cell: ({ row }) => (
          <div className='font-mono text-xs font-black tracking-tighter text-primary'>
            x {row.original.conversionFactor}
          </div>
        ),
      },
      {
        accessorKey: 'relation',
        header: () => (
          <div className='text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.assemblyManager.table.preview')}
          </div>
        ),
        cell: ({ row }) => (
          <div className='font-mono text-[9px] font-black tracking-widest text-muted-foreground/40'>
            {row.original.relation}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => (
          <div className='w-[100px] pr-8 text-right text-[10px] font-black tracking-widest text-muted-foreground/50'>
            {t('materialArchive.assemblyManager.table.actions')}
          </div>
        ),
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-2 pr-8'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-lg transition-all hover:bg-primary/5 hover:text-primary'
              onClick={() => onEdit(row.original.rule, row.original.baseUnit)}
            >
              <Settings2 className='size-4 text-muted-foreground/30 transition-colors group-hover:text-primary' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-lg text-destructive/40 transition-all hover:bg-destructive/10 hover:text-destructive'
              onClick={() => onDelete(row.original.rule.id)}
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        ),
      },
    ]
  }, [onDelete, onEdit, t])
}
