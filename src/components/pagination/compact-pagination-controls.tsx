import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { cn, getPageNumbers } from '@/lib/utils'

type CompactPaginationControlsProps = {
  page: number
  totalPages: number
  total?: number
  disabled?: boolean
  showPageNumbers?: boolean
  className?: string
  summaryClassName?: string
  onPageChange: (page: number) => void
}

export function CompactPaginationControls({
  page,
  totalPages,
  total,
  disabled = false,
  showPageNumbers = false,
  className,
  summaryClassName,
  onPageChange,
}: CompactPaginationControlsProps) {
  const { t } = useLanguage()
  const normalizedTotalPages = Math.max(Math.floor(totalPages), 0)
  const hasPages = normalizedTotalPages > 0
  const currentPage = hasPages
    ? Math.min(Math.max(Math.floor(page), 1), normalizedTotalPages)
    : 0
  const pageNumbers = showPageNumbers && hasPages
    ? getPageNumbers(currentPage, normalizedTotalPages)
    : []
  const pageSummary = typeof total === 'number'
    ? t('common.table.pageSummaryWithTotal', {
        current: currentPage,
        totalPages: normalizedTotalPages,
        total,
      })
    : t('common.table.pageSummary', {
        current: currentPage,
        total: normalizedTotalPages,
      })

  const goToPage = (nextPage: number) => {
    if (!hasPages) return
    onPageChange(Math.min(Math.max(nextPage, 1), normalizedTotalPages))
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 text-[11px] font-semibold text-muted-foreground',
        className
      )}
    >
      <Button
        type='button'
        variant='outline'
        size='icon'
        disabled={disabled || currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        className='size-8 rounded-xl border-border/70 p-0 text-muted-foreground shadow-none'
      >
        <span className='sr-only'>{t('common.table.previousPage')}</span>
        <ChevronLeftIcon className='size-4' />
      </Button>

      {showPageNumbers ? (
        <div className='flex items-center gap-1'>
          {pageNumbers.map((item, index) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className='px-1 text-[11px] font-semibold text-muted-foreground/50'
                >
                  ...
                </span>
              )
            }

            const pageNumber = Number(item)
            return (
              <Button
                key={pageNumber}
                type='button'
                variant={pageNumber === currentPage ? 'default' : 'outline'}
                disabled={disabled}
                onClick={() => goToPage(pageNumber)}
                className='h-8 min-w-8 rounded-xl px-2 text-[11px] font-bold shadow-none'
              >
                <span className='sr-only'>
                  {t('common.table.goToPage', { page: pageNumber })}
                </span>
                {pageNumber}
              </Button>
            )
          })}
        </div>
      ) : (
        <span className={cn('min-w-[78px] text-center tracking-tight', summaryClassName)}>
          {pageSummary}
        </span>
      )}

      <Button
        type='button'
        variant='outline'
        size='icon'
        disabled={disabled || currentPage >= normalizedTotalPages}
        onClick={() => goToPage(currentPage + 1)}
        className='size-8 rounded-xl border-border/70 p-0 text-muted-foreground shadow-none'
      >
        <span className='sr-only'>{t('common.table.nextPage')}</span>
        <ChevronRightIcon className='size-4' />
      </Button>
    </div>
  )
}
