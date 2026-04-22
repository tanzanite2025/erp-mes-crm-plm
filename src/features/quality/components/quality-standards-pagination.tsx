import { ChevronLeft, ChevronRight } from 'lucide-react'
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

interface QualityStandardsPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function QualityStandardsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: QualityStandardsPaginationProps) {
  const { t } = useLanguage()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = total === 0 ? 0 : Math.min(page * pageSize, total)
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className='flex flex-col gap-4 rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-4 lg:flex-row lg:items-center lg:justify-between lg:px-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
        <div className='rounded-full border border-dashed border-muted/50 bg-background/70 px-4 py-2 text-[10px] font-black tracking-widest text-muted-foreground/65 uppercase'>
          {t('quality.standards.page.paginationSummary', {
            start,
            end,
            total,
          })}
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('quality.standards.page.pageSizeLabel')}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className='h-10 w-[90px] rounded-2xl border-none bg-background/80 text-[11px] font-black shadow-inner'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-2xl border-white/10 bg-background'>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={String(option)}
                  className='text-[11px] font-black'
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
        <div className='flex items-center justify-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-9 rounded-xl'
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className='size-4' />
          </Button>

          {pageNumbers.map((item, index) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className='px-2 text-sm font-black text-muted-foreground/40'
                >
                  ...
                </span>
              )
            }

            const pageNumber = Number(item)
            const isActive = pageNumber === page

            return (
              <Button
                key={pageNumber}
                type='button'
                variant='ghost'
                className={cn(
                  'h-9 min-w-9 rounded-xl px-3 text-[11px] font-black',
                  isActive &&
                    'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            )
          })}

          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-9 rounded-xl'
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>

        <div className='text-center text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
          {t('quality.standards.page.pageIndicator', {
            page,
            totalPages,
          })}
        </div>
      </div>
    </div>
  )
}
