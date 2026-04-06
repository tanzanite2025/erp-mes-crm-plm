import { flexRender, type Table as ReactTableInstance } from '@tanstack/react-table'
import { type Material } from '../data/schema'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'

interface MaterialTableProps {
    table: ReactTableInstance<Material>
    columnsLength: number
    isLoading: boolean
    materialsCount: number
    currentCategoryLabel: string
    onEdit: (material: Material) => void
}

export function MaterialTable({
    table,
    columnsLength,
    isLoading,
    materialsCount,
    currentCategoryLabel,
    onEdit
}: MaterialTableProps) {
    return (
        <div className='hidden md:block relative rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner shrink-0'>
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
            <Table>
                <TableHeader className='bg-muted/30 h-14'>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className='hover:bg-transparent border-b border-dashed border-muted/50'>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className='p-0 align-middle'>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={columnsLength} className='h-32 text-center text-muted-foreground animate-pulse'>加载档案中...</TableCell></TableRow>
                    ) : materialsCount === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columnsLength} className='h-64'>
                                <div className='flex flex-col items-center justify-center opacity-30'>
                                    <h4 className='text-sm font-black tracking-tight italic'>{currentCategoryLabel}</h4>
                                    <p className='text-[10px] font-black text-muted-foreground uppercase mt-0.5 tracking-widest opacity-60'>暂无定义</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} className='h-16 group hover:bg-muted/30 transition-all border-b border-dashed border-muted/50 cursor-pointer' onClick={() => onEdit(row.original)}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className='p-0 align-middle'>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
