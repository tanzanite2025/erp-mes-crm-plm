import { useLanguage } from '@/context/language-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'

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

  return (
    <div className='flex flex-col gap-3 rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-3 lg:flex-row lg:items-center lg:justify-between lg:px-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
        <div className='rounded-xl border border-dashed border-muted/50 bg-background/70 px-3 py-2 text-[11px] font-semibold text-muted-foreground'>
          {t('quality.standards.page.paginationSummary', {
            start,
            end,
            total,
          })}
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-semibold text-muted-foreground'>
            {t('quality.standards.page.pageSizeLabel')}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className='h-8 w-[76px] rounded-xl border-border/70 bg-background text-[11px] font-bold shadow-none'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-xl bg-background'>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={String(option)}
                  className='text-[11px] font-semibold'
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end'>
        <CompactPaginationControls
          page={page}
          totalPages={totalPages}
          showPageNumbers
          onPageChange={onPageChange}
        />
        <div className='text-center text-[11px] font-semibold text-muted-foreground'>
          {t('quality.standards.page.pageIndicator', {
            page,
            totalPages,
          })}
        </div>
      </div>
    </div>
  )
}
