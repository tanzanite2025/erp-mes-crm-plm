import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TranslationKey } from '@/locales'
import {
  AlertTriangle,
  CalendarRange,
  Download,
  Factory,
  Filter,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { BusinessAnalysisService } from '../services/business-analysis-service'

type CapacityFilters = {
  from: string
  to: string
  customerId: string
  productId: string
  status: string
  includeCanceled: boolean
}

const STATUS_VALUES = [
  'ALL',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const

const STATUS_LABEL_KEYS = {
  ALL: 'businessAnalysis.productionCapacity.statuses.ALL',
  SCHEDULED: 'businessAnalysis.productionCapacity.statuses.SCHEDULED',
  IN_PROGRESS: 'businessAnalysis.productionCapacity.statuses.IN_PROGRESS',
  COMPLETED: 'businessAnalysis.productionCapacity.statuses.COMPLETED',
  CANCELED: 'businessAnalysis.productionCapacity.statuses.CANCELED',
} as const

const DATA_QUALITY_NOTE_LABEL_KEYS: Record<string, TranslationKey> = {
  QUALITY_SCRAP_QUANTITY_MISSING:
    'businessAnalysis.productionCapacity.qualityQuantityMissing',
  QUALITY_PRODUCTION_LINKAGE_MISSING:
    'businessAnalysis.productionCapacity.qualityLinkageMissing',
  QUALITY_OCCURRENCE_TIMESTAMP_MISSING:
    'businessAnalysis.productionCapacity.qualityOccurrenceTimestampMissing',
  QUALITY_QUALIFIED_QUANTITY_MISSING:
    'businessAnalysis.productionCapacity.qualifiedQuantityMissing',
}

function getCurrentMonthRange(): Pick<CapacityFilters, 'from' | 'to'> {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    from: formatDateInputValue(from),
    to: formatDateInputValue(to),
  }
}

function formatDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatQuantity(value: number, locale: string) {
  return value.toLocaleString(locale, {
    maximumFractionDigits: 2,
  })
}

function formatRate(value: number | null, locale: string) {
  if (value === null || !Number.isFinite(value)) return '—'
  return value.toLocaleString(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  })
}

export function ProductionCapacityAnalysisTab() {
  const { locale, t } = useLanguage()
  const defaultRange = useMemo(() => getCurrentMonthRange(), [])
  const [filters, setFilters] = useState<CapacityFilters>({
    ...defaultRange,
    customerId: '',
    productId: '',
    status: 'ALL',
    includeCanceled: false,
  })
  const [isExporting, setIsExporting] = useState(false)

  const capacityQuery = useQuery({
    queryKey: ['business-analysis', 'production-capacity', filters],
    queryFn: () =>
      BusinessAnalysisService.getProductionCapacity({
        ...filters,
        status: filters.status === 'ALL' ? undefined : filters.status,
      }),
    enabled: Boolean(filters.from && filters.to && filters.from < filters.to),
    staleTime: 30_000,
  })

  const optionsQuery = useQuery({
    queryKey: ['business-analysis', 'production-capacity', 'options'],
    queryFn: BusinessAnalysisService.getProductionCapacityOptions,
    staleTime: 5 * 60_000,
  })

  const response = capacityQuery.data
  const summary = response?.summary
  const dataQuality = response?.dataQuality
  const numberLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US'

  const updateFilter = <K extends keyof CapacityFilters>(
    key: K,
    value: CapacityFilters[K]
  ) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const normalizedQuery = {
    ...filters,
    status: filters.status === 'ALL' ? undefined : filters.status,
  }

  const canExport = Boolean(filters.from && filters.to && filters.from < filters.to)

  const handleExportCurrentAggregation = async () => {
    if (!canExport || isExporting) return

    try {
      setIsExporting(true)
      await BusinessAnalysisService.downloadProductionCapacityCSV(
        normalizedQuery
      )
    } catch (err) {
      handleServerError(err)
    } finally {
      setIsExporting(false)
    }
  }

  const metricCards = [
    {
      key: 'plannedQuantity',
      label: t('businessAnalysis.productionCapacity.plannedQuantity'),
      value: summary
        ? formatQuantity(summary.plannedQuantity, numberLocale)
        : '…',
    },
    {
      key: 'completedQuantity',
      label: t('businessAnalysis.productionCapacity.completedQuantity'),
      value: summary
        ? formatQuantity(summary.completedQuantity, numberLocale)
        : '…',
    },
    {
      key: 'achievementRate',
      label: t('businessAnalysis.productionCapacity.achievementRate'),
      value: summary ? formatRate(summary.achievementRate, numberLocale) : '…',
    },
    {
      key: 'scrapQuantity',
      label: t('businessAnalysis.productionCapacity.scrapQuantity'),
      value: summary
        ? summary.scrapQuantity === null
          ? t('businessAnalysis.productionCapacity.unavailable')
          : formatQuantity(summary.scrapQuantity, numberLocale)
        : '…',
    },
  ]

  return (
    <div className='flex animate-in flex-col gap-4 duration-500 fade-in'>
      <IndustrialHeader
        icon={Factory}
        title={t('businessAnalysis.productionCapacity.title')}
        description={t('businessAnalysis.productionCapacity.description')}
        gradient
        statusBadge={
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={!canExport || isExporting}
            onClick={() => void handleExportCurrentAggregation()}
            className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
          >
            {isExporting ? (
              <Loader2 className='mr-2 size-3.5 animate-spin' />
            ) : (
              <Download className='mr-2 size-3.5' />
            )}
            {isExporting
              ? t('businessAnalysis.productionCapacity.exportingCsv')
              : t('businessAnalysis.productionCapacity.exportCsv')}
          </Button>
        }
      />

      <Card className='rounded-[24px] border bg-background shadow-none'>
        <CardHeader className='p-4 pb-2'>
          <CardTitle className='flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
            <Filter className='size-3.5 text-primary' />
            {t('businessAnalysis.productionCapacity.filtersTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-6'>
          <label className='space-y-1'>
            <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('businessAnalysis.productionCapacity.from')}
            </span>
            <Input
              type='date'
              value={filters.from}
              onChange={(event) => updateFilter('from', event.target.value)}
            />
          </label>
          <label className='space-y-1'>
            <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('businessAnalysis.productionCapacity.toExclusive')}
            </span>
            <Input
              type='date'
              value={filters.to}
              onChange={(event) => updateFilter('to', event.target.value)}
            />
          </label>
          <label className='space-y-1'>
            <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('businessAnalysis.productionCapacity.customer')}
            </span>
            <Select
              value={filters.customerId || 'ALL'}
              onValueChange={(value) =>
                updateFilter('customerId', value === 'ALL' ? '' : value)
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>
                  {t('businessAnalysis.productionCapacity.allCustomers')}
                </SelectItem>
                {optionsQuery.data?.customers.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label || option.code || option.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className='space-y-1'>
            <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('businessAnalysis.productionCapacity.product')}
            </span>
            <Select
              value={filters.productId || 'ALL'}
              onValueChange={(value) =>
                updateFilter('productId', value === 'ALL' ? '' : value)
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>
                  {t('businessAnalysis.productionCapacity.allProducts')}
                </SelectItem>
                {optionsQuery.data?.products.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label || option.code || option.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className='space-y-1'>
            <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('businessAnalysis.productionCapacity.statusFilter')}
            </span>
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(STATUS_LABEL_KEYS[status])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className='flex items-end gap-2 pb-2 text-xs font-bold text-muted-foreground'>
            <input
              type='checkbox'
              checked={filters.includeCanceled}
              onChange={(event) =>
                updateFilter('includeCanceled', event.target.checked)
              }
              className='size-4 accent-primary'
            />
            {t('businessAnalysis.productionCapacity.includeCanceled')}
          </label>
        </CardContent>
      </Card>

      {capacityQuery.isError && (
        <Card className='rounded-[24px] border border-destructive/30 bg-destructive/5 shadow-none'>
          <CardContent className='flex items-center gap-2 p-4 text-xs font-bold text-destructive'>
            <AlertTriangle className='size-4 shrink-0' />
            {t('businessAnalysis.productionCapacity.loadError')}
          </CardContent>
        </Card>
      )}

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {metricCards.map((metric) => (
          <Card
            key={metric.key}
            className='rounded-[20px] border bg-muted/5 shadow-none'
          >
            <CardContent className='flex min-h-20 items-center justify-between gap-3 p-4'>
              <span className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {metric.label}
              </span>
              <span className='font-mono text-xl font-black text-foreground'>
                {metric.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card
        className={cn(
          'rounded-[24px] shadow-none',
          dataQuality?.isComplete
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        )}
      >
        <CardContent className='space-y-3 p-4'>
          <div className='flex items-center gap-2'>
            {dataQuality?.isComplete ? (
              <ShieldCheck className='size-4 text-emerald-600' />
            ) : (
              <AlertTriangle className='size-4 text-amber-600' />
            )}
            <p className='text-xs font-black tracking-wide'>
              {t('businessAnalysis.productionCapacity.dataQualityTitle')}
            </p>
          </div>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            {dataQuality
              ? t('businessAnalysis.productionCapacity.dataQualitySummary', {
                  scrapRecords: dataQuality.qualityScrapRecordCount,
                  missingQuantity: dataQuality.missingQuantityRecords,
                  unlinkedQuality: dataQuality.unlinkedQualityRecords,
                })
              : t('businessAnalysis.productionCapacity.dataQualityLoading')}
          </p>
          {dataQuality?.notes.length ? (
            <ul className='list-disc space-y-1 pl-4 text-xs text-muted-foreground'>
              {dataQuality.notes.map((note) => (
                <li key={note}>
                  {t(
                    DATA_QUALITY_NOTE_LABEL_KEYS[note] ??
                      'businessAnalysis.productionCapacity.qualityNoteFallback'
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-2'>
        <BreakdownTable
          title={t('businessAnalysis.productionCapacity.byProductTitle')}
          emptyLabel={t('businessAnalysis.productionCapacity.noRows')}
          firstColumn={t('businessAnalysis.productionCapacity.product')}
          rows={response?.breakdowns.byProduct.map((row) => ({
            label: row.productName || row.productId || '—',
            planned: row.plannedQuantity,
            completed: row.completedQuantity,
          }))}
          locale={numberLocale}
          plannedLabel={t(
            'businessAnalysis.productionCapacity.plannedQuantity'
          )}
          completedLabel={t(
            'businessAnalysis.productionCapacity.completedQuantity'
          )}
        />
        <BreakdownTable
          title={t('businessAnalysis.productionCapacity.byCustomerTitle')}
          emptyLabel={t('businessAnalysis.productionCapacity.noRows')}
          firstColumn={t('businessAnalysis.productionCapacity.customer')}
          rows={response?.breakdowns.byCustomer.map((row) => ({
            label:
              row.customerName ||
              row.customerId ||
              t('businessAnalysis.productionCapacity.unlinked'),
            planned: row.plannedQuantity,
            completed: row.completedQuantity,
          }))}
          locale={numberLocale}
          plannedLabel={t(
            'businessAnalysis.productionCapacity.plannedQuantity'
          )}
          completedLabel={t(
            'businessAnalysis.productionCapacity.completedQuantity'
          )}
        />
      </div>

      <Card className='rounded-[24px] border bg-background shadow-none'>
        <CardHeader className='flex flex-row items-center justify-between p-4 pb-2'>
          <CardTitle className='flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
            <CalendarRange className='size-3.5 text-primary' />
            {t('businessAnalysis.productionCapacity.byDayTitle')}
          </CardTitle>
          <button
            type='button'
            onClick={() => void capacityQuery.refetch()}
            className='inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase hover:text-foreground'
          >
            <RefreshCw
              className={cn(
                'size-3',
                capacityQuery.isFetching && 'animate-spin'
              )}
            />
            {t('businessAnalysis.productionCapacity.refresh')}
          </button>
        </CardHeader>
        <CardContent className='px-4 pb-4'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t('businessAnalysis.productionCapacity.date')}
                </TableHead>
                <TableHead className='text-end'>
                  {t('businessAnalysis.productionCapacity.plannedQuantity')}
                </TableHead>
                <TableHead className='text-end'>
                  {t('businessAnalysis.productionCapacity.completedQuantity')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {response?.breakdowns.byDay.length ? (
                response.breakdowns.byDay.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className='font-mono text-xs'>
                      {row.date}
                    </TableCell>
                    <TableCell className='text-end font-mono text-xs'>
                      {formatQuantity(row.plannedQuantity, numberLocale)}
                    </TableCell>
                    <TableCell className='text-end font-mono text-xs'>
                      {formatQuantity(row.completedQuantity, numberLocale)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className='py-8 text-center text-xs text-muted-foreground'
                  >
                    {capacityQuery.isLoading
                      ? t('businessAnalysis.productionCapacity.loading')
                      : t('businessAnalysis.productionCapacity.noRows')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function BreakdownTable({
  title,
  emptyLabel,
  firstColumn,
  rows,
  locale,
  plannedLabel,
  completedLabel,
}: {
  title: string
  emptyLabel: string
  firstColumn: string
  rows:
    | {
        label: string
        planned: number
        completed: number
      }[]
    | undefined
  locale: string
  plannedLabel: string
  completedLabel: string
}) {
  return (
    <Card className='rounded-[24px] border bg-background shadow-none'>
      <CardHeader className='p-4 pb-2'>
        <CardTitle className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className='px-4 pb-4'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{firstColumn}</TableHead>
              <TableHead className='text-end'>{plannedLabel}</TableHead>
              <TableHead className='text-end'>{completedLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.length ? (
              rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className='max-w-56 truncate text-xs font-bold'>
                    {row.label}
                  </TableCell>
                  <TableCell className='text-end font-mono text-xs'>
                    {formatQuantity(row.planned, locale)}
                  </TableCell>
                  <TableCell className='text-end font-mono text-xs'>
                    {formatQuantity(row.completed, locale)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className='py-8 text-center text-xs text-muted-foreground'
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
