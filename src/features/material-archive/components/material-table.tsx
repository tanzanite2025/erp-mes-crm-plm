import {
  flexRender,
  type Table as ReactTableInstance,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type Material } from '../data/schema'

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
  onEdit,
}: MaterialTableProps) {
  return (
    <div className='relative hidden shrink-0 overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-inner md:block'>
      <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
      <Table>
        <TableHeader className='h-14 bg-muted/30'>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className='border-b border-dashed border-muted/50 hover:bg-transparent'
            >
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className='p-0 align-middle'>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columnsLength}
                className='h-32 animate-pulse text-center text-muted-foreground'
              >
                加载档案中...
              </TableCell>
            </TableRow>
          ) : materialsCount === 0 ? (
            <TableRow>
              <TableCell colSpan={columnsLength} className='h-64'>
                <div className='flex flex-col items-center justify-center opacity-30'>
                  <h4 className='text-sm font-black tracking-tight italic'>
                    {currentCategoryLabel}
                  </h4>
                  <p className='mt-0.5 text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
                    暂无定义
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className='group h-16 cursor-pointer border-b border-dashed border-muted/50 transition-all hover:bg-muted/30'
                onClick={() => onEdit(row.original)}
              >
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
