import { type ColumnDef } from '@tanstack/react-table'
import type { TranslationKey } from '@/locales'
import { ImageIcon, FileText, Cpu, Box, Eye, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type SpokeLength } from '../data/schema'
import { type SpokeLengthRowViewModel } from './use-spoke-length-mgmt'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

interface SpokeLengthColumnProps {
  t: TranslateFn
  onPreview: (item: SpokeLength) => void
  onEdit: (item: SpokeLength) => void
  onDelete: (item: SpokeLength) => void
}

export function useSpokeLengthColumns({
  t,
  onPreview,
  onEdit,
  onDelete,
}: SpokeLengthColumnProps): ColumnDef<SpokeLengthRowViewModel>[] {
  return [
    {
      accessorKey: 'item.name',
      header: t('engineering.spokeLength.table.name'),
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 shadow-sm'>
            {row.original.item.fileUrl ? (
              <ImageIcon className='size-5 text-indigo-600' />
            ) : (
              <FileText className='size-5 text-muted-foreground/40' />
            )}
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-bold text-foreground'>
              {row.original.item.name}
            </span>
            <div className='mt-0.5 flex items-center gap-2'>
              <span className='font-mono text-[10px] tracking-widest text-muted-foreground uppercase'>
                {row.original.item.id}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: t('engineering.spokeLength.table.product'),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='font-mono text-[12px] font-bold text-indigo-600 italic'>
            {row.original.productSku || 'UNKNOWN'}
          </span>
          <span className='mt-0.5 max-w-[120px] truncate text-[10px] text-muted-foreground'>
            {row.original.productName ||
              t('engineering.spokeLength.table.unlinked')}
          </span>
        </div>
      ),
    },
    {
      header: t('engineering.spokeLength.table.masterData'),
      cell: ({ row }) => (
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-1.5'>
            <Cpu className='size-3 text-indigo-500 opacity-40' />
            <span className='max-w-[120px] truncate text-[10px] font-bold'>
              {row.original.hubName || '--'}
            </span>
          </div>
          <div className='flex items-center gap-1.5'>
            <Box className='size-3 text-orange-500 opacity-40' />
            <span className='max-w-[120px] truncate text-[10px] font-bold'>
              {row.original.nippleName || '--'}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'item.length',
      header: t('engineering.spokeLength.table.length'),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <span className='text-sm font-black text-foreground italic'>
            {row.original.item.length}
          </span>
          <Badge
            variant='outline'
            className='h-4 border-none bg-muted/50 px-1 font-mono text-[8px] uppercase'
          >
            mm
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'item.material',
      header: t('engineering.spokeLength.table.material'),
      cell: ({ row }) => (
        <span className='text-[10px] font-bold tracking-tight text-muted-foreground/60 uppercase'>
          {row.original.item.material || '--'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('engineering.spokeLength.table.actions'),
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full hover:bg-indigo-500/10 hover:text-indigo-600'
            onClick={() => onPreview(row.original.item)}
          >
            <Eye className='size-3.5' />
          </Button>
          <div className='mx-1 h-4 w-px bg-border' />
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full'
            onClick={() => onEdit(row.original.item)}
          >
            <Edit className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full text-destructive hover:bg-destructive/10'
            onClick={() => onDelete(row.original.item)}
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ]
}
