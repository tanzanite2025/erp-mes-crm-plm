import {
  Search,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  InboundReportTable,
  ShipmentReportTable,
} from '../components/report-tables'
import { useReport } from '../hooks/use-report'

export function WarehouseReports() {
  const { t } = useLanguage()
  const {
    activeTab,
    setActiveTab,
    readResource,
    filters,
    setFilters,
    resetFilters,
    retryRead,
  } = useReport()

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          title={t('warehouse.reports.title')}
          description={t('warehouse.reports.subtitle')}
          icon={Filter}
        />

        <div className='flex flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-200 bg-rose-50/60 px-6 py-14 text-center'>
          <AlertTriangle className='mb-4 size-10 text-rose-500' />
          <p className='text-sm font-black tracking-widest text-foreground'>
            {t('warehouse.reports.title')}
          </p>
          <p className='mt-2 text-[11px] font-bold text-muted-foreground'>
            {readResource.error.message}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={() => void retryRead()}
          >
            <RefreshCw className='size-3.5' />
            重试
          </Button>
        </div>
      </div>
    )
  }

  const filteredInbound =
    readResource.status === 'ready' ? readResource.filteredInbound : []
  const filteredShipment =
    readResource.status === 'ready' ? readResource.filteredShipment : []
  const masterDataMap =
    readResource.status === 'ready' ? readResource.masterDataMap : {}
  const isLoading = readResource.status === 'loading'

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title={t('warehouse.reports.title')}
        description={t('warehouse.reports.subtitle')}
        icon={Filter}
      />

      {isLoading ? (
        <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/40 bg-muted/5 px-6 py-14 text-center'>
          <RefreshCw className='mb-4 size-10 animate-spin text-primary/40' />
          <p className='text-sm font-black tracking-widest text-foreground'>
            {t('warehouse.reports.title')}
          </p>
          <p className='mt-2 text-[11px] font-bold text-muted-foreground'>
            {t('warehouse.reports.subtitle')}
          </p>
        </div>
      ) : (
        <>
          <div className='relative rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-4 transition-all md:rounded-[24px] md:p-6'>
            <div className='absolute top-0 left-6 flex -translate-y-1/2 items-center gap-2 rounded-full border border-dashed border-muted/50 bg-background px-3 py-0.5 md:left-10'>
              <Filter className='size-3 text-muted-foreground/40' />
              <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase italic md:text-[9px]'>
                {t('warehouse.reports.dynamicFilter')}
              </span>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:flex lg:items-end'>
              <div className='space-y-1.5'>
                <Label className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[9px]'>
                  <CalendarIcon className='size-3' />{' '}
                  {t('warehouse.reports.startDate')}
                </Label>
                <Input
                  type='date'
                  className='h-10 w-full rounded-xl border-none bg-background text-sm font-bold shadow-inner focus-visible:ring-primary/20 md:h-12 md:rounded-2xl lg:w-44'
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[9px]'>
                  <CalendarIcon className='size-3' />{' '}
                  {t('warehouse.reports.endDate')}
                </Label>
                <Input
                  type='date'
                  className='h-10 w-full rounded-xl border-none bg-background text-sm font-bold shadow-inner focus-visible:ring-primary/20 md:h-12 md:rounded-2xl lg:w-44'
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-1.5 sm:col-span-2 lg:flex-1'>
                <Label className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[9px]'>
                  <Search className='size-3' />{' '}
                  {t('warehouse.reports.masterLocator')}
                </Label>
                <div className='group relative'>
                  <Search className='absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/20 transition-colors group-focus-within:text-primary' />
                  <Input
                    placeholder={t('warehouse.reports.queryPlaceholder')}
                    className='h-10 rounded-xl border-none bg-background pl-12 text-sm font-bold shadow-inner placeholder:text-muted-foreground/20 focus-visible:ring-primary/20 md:h-12 md:rounded-2xl'
                    value={filters.query}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, query: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className='sm:col-span-2 lg:col-span-1'>
                <Button
                  variant='ghost'
                  className='h-10 w-full rounded-xl px-6 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase transition-all hover:bg-rose-500/5 hover:text-rose-500 md:h-12 md:rounded-2xl md:text-[9px] lg:w-auto'
                  onClick={resetFilters}
                >
                  {t('warehouse.reports.reset')}
                </Button>
              </div>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-6'
          >
            <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
              <div className='scrollbar-hide overflow-x-auto'>
                <TabsList className='inline-flex h-10 rounded-xl border-none bg-muted/50 p-1'>
                  <TabsTrigger
                    value='inbound'
                    className='gap-2 rounded-lg px-4 text-[9px] font-black tracking-widest whitespace-nowrap uppercase data-[state=active]:bg-background data-[state=active]:text-blue-600 data-[state=active]:shadow-sm md:px-8 md:text-[10px]'
                  >
                    <ArrowDownLeft className='size-3.5 shrink-0' />
                    {t('warehouse.reports.inbound')}
                    <Badge className='ml-1 h-3.5 rounded-full border-none bg-blue-500/10 px-1 text-[7px] font-black text-blue-600 md:h-4 md:text-[8px]'>
                      {filteredInbound.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value='shipment'
                    className='gap-2 rounded-lg px-4 text-[9px] font-black tracking-widest whitespace-nowrap uppercase data-[state=active]:bg-background data-[state=active]:text-orange-600 data-[state=active]:shadow-sm md:px-8 md:text-[10px]'
                  >
                    <ArrowUpRight className='size-3.5 shrink-0' />
                    {t('warehouse.reports.shipment')}
                    <Badge className='ml-1 h-3.5 rounded-full border-none bg-orange-500/10 px-1 text-[7px] font-black text-orange-600 md:h-4 md:text-[8px]'>
                      {filteredShipment.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase md:text-[9px]'>
                <Filter className='size-3' />
                {t('warehouse.reports.nodes', {
                  count:
                    activeTab === 'inbound'
                      ? filteredInbound.length
                      : filteredShipment.length,
                })}
              </div>
            </div>

            <TabsContent
              value='inbound'
              className='m-0 border-none focus-visible:ring-0'
            >
              <InboundReportTable
                data={filteredInbound}
                masterDataMap={masterDataMap}
              />
            </TabsContent>

            <TabsContent
              value='shipment'
              className='m-0 border-none focus-visible:ring-0'
            >
              <ShipmentReportTable
                data={filteredShipment}
                masterDataMap={masterDataMap}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
