import { Box, Edit, Trash2 } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type Product, type ProductType } from '../data/schema'
import { ProductMaintenanceService } from '../services/product-maintenance-service'
import { toast } from 'sonner'

export function useProductColumns(
    t: (key: string, options?: any) => string,
    productTypes: ProductType[],
    onEdit: (product: Product) => void,
    onDeleteSuccess: () => void
): ColumnDef<Product>[] {
    const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '')

    return [
        {
            accessorKey: 'sku',
            header: t('engineering.productArchive.columns.product'),
            cell: ({ row }) => (
                <div className='flex items-center gap-3'>
                    <div className='size-10 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0'>
                        {row.original.image ? (
                            <img src={row.original.image} alt='' className='size-full object-cover' />
                        ) : (
                            <Box className='size-5 text-muted-foreground' />
                        )}
                    </div>
                    <div className='flex flex-col'>
                        <span className='font-mono font-bold leading-tight'>{row.original.sku}</span>
                        <div className='flex items-center gap-2 mt-0.5'>
                            <span className='text-xs text-muted-foreground'>{row.original.name}</span>
                            <Badge variant='secondary' className='text-[10px] h-4 px-1 py-0 bg-slate-100 text-slate-600 border-none'>
                                {productTypes.find((type) => type.id === row.original.typeId)?.name ||
                                    t('engineering.productArchive.filters.uncategorized')}
                            </Badge>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            header: t('engineering.productArchive.columns.coreSpecs'),
            cell: ({ row }) => {
                const { depth, widthExternal, tireType, weight, restrictions } = row.original

                return (
                    <div className='flex flex-col gap-2'>
                        <div className='flex gap-1 flex-wrap'>
                            <Badge variant='outline' className='bg-blue-50 text-blue-700 border-blue-200'>
                                {depth}mm
                            </Badge>
                            <Badge variant='outline' className='bg-slate-50 text-slate-700 border-slate-200'>
                                {widthExternal}mm
                            </Badge>
                            <Badge variant='outline' className='bg-purple-50 text-purple-700 border-purple-200'>
                                {tireType}
                            </Badge>
                            <Badge variant='outline' className='bg-rose-50 text-rose-700 border-rose-200'>
                                {weight}g
                            </Badge>
                        </div>
                        {restrictions && restrictions.length > 0 && (
                            <div className='flex gap-1 flex-wrap'>
                                {restrictions.map((tag) => (
                                    <Badge key={tag} variant='outline' className='text-[10px] bg-red-50 text-red-600 border-red-200 px-1 py-0 h-4'>
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: 'moldGroup',
            header: t('engineering.productArchive.columns.moldGroup'),
            cell: ({ row }) => (
                <span className='text-xs text-muted-foreground'>
                    {row.original.moldGroup || t('engineering.categoryArchive.labels.noDescription')}
                </span>
            ),
        },
        {
            id: 'actions',
            header: t('engineering.productArchive.columns.actions'),
            cell: ({ row }) => (
                <div className='flex items-center gap-2'>
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => onEdit(row.original)}
                    >
                        <Edit className='size-4' />
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='text-destructive'
                        onClick={async () => {
                            const confirmed = window.confirm(t('engineering.productArchive.toasts.deleteConfirm'))
                            if (!confirmed) return

                            try {
                                await ProductMaintenanceService.deleteProduct(row.original.id)
                                window.dispatchEvent(new CustomEvent('xdfc_products_data_updated'))
                                toast.success(t('engineering.productArchive.toasts.deleteSuccess'))
                                onDeleteSuccess()
                            } catch (error) {
                                toast.error(
                                    t('engineering.productArchive.toasts.deleteFailed', {
                                        message: getErrorMessage(error),
                                    })
                                )
                            }
                        }}
                    >
                        <Trash2 className='size-4' />
                    </Button>
                </div>
            ),
        },
    ]
}
