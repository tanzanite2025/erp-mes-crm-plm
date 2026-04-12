import { ImageIcon, FileText, Cpu, Box, Eye, Edit, Trash2 } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type SpokeLength } from '../data/schema'
import { type SpokeLengthRowViewModel } from './use-spoke-length-mgmt'

interface SpokeLengthColumnProps {
    t: (key: string) => string
    onPreview: (item: SpokeLength) => void
    onEdit: (item: SpokeLength) => void
    onDelete: (item: SpokeLength) => void
}

export function useSpokeLengthColumns({
    t,
    onPreview,
    onEdit,
    onDelete
}: SpokeLengthColumnProps): ColumnDef<SpokeLengthRowViewModel>[] {
    return [
        {
            accessorKey: 'item.name',
            header: t('engineering.spokeLength.table.name'),
            cell: ({ row }) => (
                <div className='flex items-center gap-3'>
                    <div className='size-10 rounded-lg border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center shrink-0 shadow-sm'>
                        {row.original.item.fileUrl ? <ImageIcon className='size-5 text-indigo-600' /> : <FileText className='size-5 text-muted-foreground/40' />}
                    </div>
                    <div className='flex flex-col'>
                        <span className='font-bold text-sm text-foreground'>{row.original.item.name}</span>
                        <div className='flex items-center gap-2 mt-0.5'>
                            <span className='text-[10px] text-muted-foreground uppercase font-mono tracking-widest'>
                                {row.original.item.id}
                            </span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: t('engineering.spokeLength.table.product'),
            cell: ({ row }) => (
                <div className='flex flex-col'>
                    <span className='text-[12px] font-bold text-indigo-600 font-mono italic'>
                        {row.original.productSku || 'UNKNOWN'}
                    </span>
                    <span className='text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]'>
                        {row.original.productName || t('engineering.spokeLength.table.unlinked')}
                    </span>
                </div>
            )
        },
        {
            header: t('engineering.spokeLength.table.masterData'),
            cell: ({ row }) => (
                <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-1.5'>
                        <Cpu className='size-3 text-indigo-500 opacity-40' />
                        <span className='text-[10px] font-bold truncate max-w-[120px]'>{row.original.hubName || '--'}</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <Box className='size-3 text-orange-500 opacity-40' />
                        <span className='text-[10px] font-bold truncate max-w-[120px]'>{row.original.nippleName || '--'}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'item.length',
            header: t('engineering.spokeLength.table.length'),
            cell: ({ row }) => (
                <div className='flex items-center gap-2'>
                    <span className='font-black text-sm text-foreground italic'>
                        {row.original.item.length}
                    </span>
                    <Badge variant='outline' className='h-4 px-1 text-[8px] bg-muted/50 border-none uppercase font-mono'>mm</Badge>
                </div>
            )
        },
        {
            accessorKey: 'item.material',
            header: t('engineering.spokeLength.table.material'),
            cell: ({ row }) => (
                <span className='text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight'>
                    {row.original.item.material || '--'}
                </span>
            )
        },
        {
            id: 'actions',
            header: t('engineering.spokeLength.table.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-indigo-500/10 hover:text-indigo-600' onClick={() => onPreview(row.original.item)}><Eye className='size-3.5' /></Button>
                    <div className='w-px h-4 bg-border mx-1' />
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={() => onEdit(row.original.item)}><Edit className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full text-destructive hover:bg-destructive/10' onClick={() => onDelete(row.original.item)}><Trash2 className='size-3.5' /></Button>
                </div>
            )
        }
    ]
}
