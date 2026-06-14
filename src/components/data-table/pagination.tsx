import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { cn, getPageNumbers } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  className?: string
}

export function DataTablePagination<TData>({
  table,
  className,
}: DataTablePaginationProps<TData>) {
  const { t } = useLanguage()
  const pageCount = table.getPageCount()
  const hasPages = pageCount > 0
  const totalPages = hasPages ? pageCount : 0
  const currentPage = hasPages
    ? Math.min(table.getState().pagination.pageIndex + 1, totalPages)
    : 0
  const pageNumbers = hasPages ? getPageNumbers(currentPage, totalPages) : []
  const pageSummary = t('common.table.pageSummary', {
    current: currentPage,
    total: totalPages,
  })

  return (
    <div
      className={cn(
        'flex items-center justify-between overflow-clip px-2 text-[11px] font-semibold text-muted-foreground',
        '@max-2xl/content:flex-col-reverse @max-2xl/content:gap-4',
        className
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className='flex w-full items-center justify-between'>
        <div className='flex w-[96px] items-center justify-center text-[11px] font-semibold tracking-tight @2xl/content:hidden'>
          {pageSummary}
        </div>
        <div className='flex items-center gap-2 @max-2xl/content:flex-row-reverse'>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className='h-8 w-[68px] rounded-xl border-border/70 bg-background text-[11px] font-bold shadow-none'>
              <SelectValue
                placeholder={`${table.getState().pagination.pageSize}`}
              />
            </SelectTrigger>
            <SelectContent side='top' className='rounded-xl'>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem
                  key={pageSize}
                  value={`${pageSize}`}
                  className='text-[11px] font-semibold'
                >
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='hidden text-[11px] font-semibold tracking-tight sm:block'>
            {t('common.table.rowsPerPage')}
          </p>
        </div>
      </div>

      <div className='flex items-center sm:space-x-6 lg:space-x-8'>
        <div className='flex w-[96px] items-center justify-center text-[11px] font-semibold tracking-tight @max-3xl/content:hidden'>
          {pageSummary}
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            className='size-8 rounded-xl border-border/70 p-0 text-muted-foreground shadow-none @max-md/content:hidden'
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>{t('common.table.firstPage')}</span>
            <DoubleArrowLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 rounded-xl border-border/70 p-0 text-muted-foreground shadow-none'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>{t('common.table.previousPage')}</span>
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>

          {/* Page number buttons */}
          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className='flex items-center'>
              {pageNumber === '...' ? (
                <span className='px-1 text-sm text-muted-foreground'>...</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className='h-8 min-w-8 rounded-xl px-2 text-[11px] font-bold shadow-none'
                  onClick={() => table.setPageIndex((pageNumber as number) - 1)}
                >
                  <span className='sr-only'>
                    {t('common.table.goToPage', { page: pageNumber })}
                  </span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant='outline'
            className='size-8 rounded-xl border-border/70 p-0 text-muted-foreground shadow-none'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>{t('common.table.nextPage')}</span>
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 rounded-xl border-border/70 p-0 text-muted-foreground shadow-none @max-md/content:hidden'
            onClick={() =>
              table.setPageIndex(Math.max(table.getPageCount() - 1, 0))
            }
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>{t('common.table.lastPage')}</span>
            <DoubleArrowRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
