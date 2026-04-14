import { useMemo } from 'react'
import { Box, Edit, Trash2 } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type TranslationKey } from '@/locales'
import { type Product, type ProductType } from '../data/schema'
import { getProductAttributes } from '../utils/product-utils'

type TranslateProductArchive = (key: TranslationKey, params?: Record<string, string | number>) => string

export function useProductColumns(
    t: TranslateProductArchive,
    productTypes: ProductType[],
    onEdit: (product: Product) => void,
    onDelete: (product: Product) => void | Promise<void>
): ColumnDef<Product>[] {
    const typeNameMap = useMemo(
        () =>
            new Map(
                productTypes.map((type) => [type.id, type.name])
            ),
        [productTypes]
    )

    return useMemo(() => [
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
                                {typeNameMap.get(row.original.typeId) ||
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
                const { restrictions } = row.original
                const productView = getProductAttributes(row.original)

                return (
                    <div className='flex flex-col gap-2'>
                        <div className='flex gap-1 flex-wrap'>
                            <Badge variant='outline' className='bg-blue-50 text-blue-700 border-blue-200'>
                                {row.original.depth}mm
                            </Badge>
                            <Badge variant='outline' className='bg-slate-50 text-slate-700 border-slate-200'>
                                {row.original.widthExternal}mm
                            </Badge>
                            <Badge variant='outline' className='bg-purple-50 text-purple-700 border-purple-200'>
                                {productView.tireType}
                            </Badge>
                            <Badge variant='outline' className='bg-rose-50 text-rose-700 border-rose-200'>
                                {productView.weight}
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
                        onClick={() => void onDelete(row.original)}
                    >
                        <Trash2 className='size-4' />
                    </Button>
                </div>
            ),
        },
    ], [onDelete, onEdit, t, typeNameMap])
}
