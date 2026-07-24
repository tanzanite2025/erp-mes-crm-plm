import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TranslationKey } from '@/locales'
import {
  AlertTriangle,
  ArrowUpRight,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

type DrilldownSelection = {
  dimension: 'product' | 'customer'
  value: string
  label: string
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
  const [drilldownSelection, setDrilldownSelection] =
    useState<DrilldownSelection | null>(null)

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

  const canExport = Boolean(
    filters.from && filters.to && filters.from < filters.to
  )

  const drilldownQuery = useQuery({
    queryKey: [
      'business-analysis',
      'production-capacity',
      'drilldown',
      normalizedQuery,
      drilldownSelection,
    ],
    queryFn: () => {
      if (!drilldownSelection) {
        return Promise.reject(new Error('drilldown selection is missing'))
      }
      return BusinessAnalysisService.getProductionCapacityDrilldown({
        ...normalizedQuery,
        dimension: drilldownSelection.dimension,
        value: drilldownSelection.value,
      })
    },
    enabled: Boolean(drilldownSelection && canExport),
    staleTime: 30_000,
  })

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
      key: 'qualifiedQuantity',
      label: t('businessAnalysis.productionCapacity.qualifiedQuantity'),
      value: summary
        ? summary.qualifiedQuantity === null
          ? t('businessAnalysis.productionCapacity.unavailable')
          : formatQuantity(summary.qualifiedQuantity, numberLocale)
        : '…',
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

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
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
                  qualifiedFacts: dataQuality.qualifiedQuantityFactCount,
                  missingQualifiedQuantity:
                    dataQuality.missingQualifiedQuantityRecords,
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
          drilldownLabel={t('businessAnalysis.productionCapacity.viewDetails')}
          rows={response?.breakdowns.byProduct.map((row) => ({
            key: row.productId || row.productName || '__unlinked__',
            label: row.productName || row.productId || '—',
            value: row.productId || '__unlinked__',
            planned: row.plannedQuantity,
            completed: row.completedQuantity,
            canDrilldown: true,
          }))}
          onDrilldown={(row) =>
            setDrilldownSelection({
              dimension: 'product',
              value: row.value,
              label: row.label,
            })
          }
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
          drilldownLabel={t('businessAnalysis.productionCapacity.viewDetails')}
          rows={response?.breakdowns.byCustomer.map((row) => ({
            key: row.customerId || '__unlinked__',
            label:
              row.customerName ||
              row.customerId ||
              t('businessAnalysis.productionCapacity.unlinked'),
            value: row.customerId || '__unlinked__',
            planned: row.plannedQuantity,
            completed: row.completedQuantity,
            canDrilldown: true,
          }))}
          onDrilldown={(row) =>
            setDrilldownSelection({
              dimension: 'customer',
              value: row.value,
              label: row.label,
            })
          }
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

      <Dialog
        open={Boolean(drilldownSelection)}
        onOpenChange={(open) => {
          if (!open) setDrilldownSelection(null)
        }}
      >
        <DialogContent
          size='6xl'
          className='max-h-[85vh] overflow-hidden rounded-[24px] p-0'
        >
          <DialogHeader className='border-b px-6 py-5 pe-14'>
            <DialogTitle className='flex items-center gap-2 text-base font-black'>
              <Factory className='size-4 text-primary' />
              {t('businessAnalysis.productionCapacity.drilldownTitle')}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              {drilldownSelection?.label ||
                t('businessAnalysis.productionCapacity.drilldownValueFallback')}
            </DialogDescription>
          </DialogHeader>
          <div className='max-h-[calc(85vh-112px)] overflow-y-auto px-6 py-5'>
            {drilldownQuery.isLoading ? (
              <div className='py-16 text-center text-xs text-muted-foreground'>
                {t('businessAnalysis.productionCapacity.drilldownLoading')}
              </div>
            ) : drilldownQuery.isError ? (
              <div className='py-16 text-center text-xs text-destructive'>
                {t('businessAnalysis.productionCapacity.drilldownError')}
              </div>
            ) : drilldownQuery.data?.items.length ? (
              <div className='space-y-4'>
                {drilldownQuery.data.items.map((plan) => (
                  <Card
                    key={plan.planId}
                    className='rounded-2xl border bg-background shadow-none'
                  >
                    <CardHeader className='space-y-3 p-4 pb-2'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <CardTitle className='text-sm font-black'>
                          {plan.orderNo ||
                            t(
                              'businessAnalysis.productionCapacity.planFallback'
                            )}
                        </CardTitle>
                        <Badge variant='outline' className='text-[10px]'>
                          {STATUS_LABEL_KEYS[
                            plan.status as keyof typeof STATUS_LABEL_KEYS
                          ]
                            ? t(
                                STATUS_LABEL_KEYS[
                                  plan.status as keyof typeof STATUS_LABEL_KEYS
                                ]
                              )
                            : plan.status || '—'}
                        </Badge>
                      </div>
                      <div className='grid gap-2 text-xs text-muted-foreground sm:grid-cols-4'>
                        <span>
                          {t('businessAnalysis.productionCapacity.planDate')}:{' '}
                          <strong className='font-mono text-foreground'>
                            {plan.planDate}
                          </strong>
                        </span>
                        <span>
                          {t('businessAnalysis.productionCapacity.product')}:{' '}
                          <strong className='text-foreground'>
                            {plan.productName || plan.productId || '—'}
                          </strong>
                        </span>
                        <span>
                          {t(
                            'businessAnalysis.productionCapacity.plannedQuantity'
                          )}
                          :{' '}
                          <strong className='font-mono text-foreground'>
                            {formatQuantity(plan.plannedQuantity, numberLocale)}
                          </strong>
                        </span>
                        <span>
                          {t(
                            'businessAnalysis.productionCapacity.completedQuantity'
                          )}
                          :{' '}
                          <strong className='font-mono text-foreground'>
                            {formatQuantity(
                              plan.completedQuantity,
                              numberLocale
                            )}
                          </strong>
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className='px-4 pb-4'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {t('businessAnalysis.productionCapacity.batch')}
                            </TableHead>
                            <TableHead>
                              {t('businessAnalysis.productionCapacity.process')}
                            </TableHead>
                            <TableHead>
                              {t(
                                'businessAnalysis.productionCapacity.taskStatus'
                              )}
                            </TableHead>
                            <TableHead className='text-end'>
                              {t(
                                'businessAnalysis.productionCapacity.targetQuantity'
                              )}
                            </TableHead>
                            <TableHead className='text-end'>
                              {t(
                                'businessAnalysis.productionCapacity.actualQuantity'
                              )}
                            </TableHead>
                            <TableHead>
                              {t(
                                'businessAnalysis.productionCapacity.completedAt'
                              )}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plan.tasks.length ? (
                            plan.tasks.map((task) => (
                              <TableRow key={task.taskId}>
                                <TableCell className='font-mono text-xs'>
                                  {task.batchNo || '—'}
                                </TableCell>
                                <TableCell className='text-xs'>
                                  {task.processName || task.processId || '—'}
                                </TableCell>
                                <TableCell className='text-xs'>
                                  {task.status || '—'}
                                </TableCell>
                                <TableCell className='text-end font-mono text-xs'>
                                  {formatQuantity(
                                    task.targetQuantity,
                                    numberLocale
                                  )}
                                </TableCell>
                                <TableCell className='text-end font-mono text-xs'>
                                  {formatQuantity(
                                    task.actualQuantity,
                                    numberLocale
                                  )}
                                </TableCell>
                                <TableCell className='font-mono text-xs text-muted-foreground'>
                                  {task.completedAt
                                    ? new Date(task.completedAt).toLocaleString(
                                        locale
                                      )
                                    : '—'}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className='py-6 text-center text-xs text-muted-foreground'
                              >
                                {t(
                                  'businessAnalysis.productionCapacity.noTasks'
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className='py-16 text-center text-xs text-muted-foreground'>
                {t('businessAnalysis.productionCapacity.drilldownEmpty')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BreakdownTable({
  title,
  emptyLabel,
  firstColumn,
  rows,
  drilldownLabel,
  onDrilldown,
  locale,
  plannedLabel,
  completedLabel,
}: {
  title: string
  emptyLabel: string
  firstColumn: string
  rows:
    | {
        key: string
        label: string
        value: string
        planned: number
        completed: number
        canDrilldown: boolean
      }[]
    | undefined
  drilldownLabel: string
  onDrilldown: (row: {
    key: string
    label: string
    value: string
    planned: number
    completed: number
    canDrilldown: boolean
  }) => void
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
                <TableRow key={row.key}>
                  <TableCell className='max-w-72 text-xs font-bold'>
                    <div className='flex items-center gap-2'>
                      <span className='min-w-0 truncate'>{row.label}</span>
                      {row.canDrilldown ? (
                        <Button
                          type='button'
                          variant='link'
                          size='sm'
                          className='h-7 shrink-0 px-0 text-[10px] font-black'
                          onClick={() => onDrilldown(row)}
                        >
                          {drilldownLabel}
                          <ArrowUpRight className='size-3' />
                        </Button>
                      ) : null}
                    </div>
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
