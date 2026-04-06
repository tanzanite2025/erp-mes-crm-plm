import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ForbiddenState } from '@/components/forbidden-state'
import {
    Search,
    Download,
    Calendar as CalendarIcon,
    ArrowUpRight,
    ArrowDownLeft,
    Filter,
    ShieldCheck
} from 'lucide-react'
import { InboundReportTable, ShipmentReportTable } from '../components/report-tables'
import { useReport } from '../hooks/use-report'
import { useLanguage } from '@/context/language-provider'
import { PageHeader } from '@/components/layout/page-header'
import { isForbiddenError } from '@/lib/error-status'

export function WarehouseReports() {
    const { t } = useLanguage()
    const {
        activeTab,
        setActiveTab,
        error,
        filters,
        setFilters,
        filteredInbound,
        filteredShipment,
        masterDataMap,
        handleExport,
        handleReconcile,
        resetFilters,
        hasData
    } = useReport()

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <PageHeader title={t('warehouse.reports.title')} description={t('warehouse.reports.subtitle')} icon={Filter}>
                <div className='flex flex-wrap items-center gap-2 md:gap-3 justify-end'>
                        <Button
                            variant='ghost'
                            className='h-10 md:h-11 px-4 md:px-6 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-blue-500/5 text-blue-600 border border-blue-500/10 hover:bg-blue-500/10 transition-all gap-2 shrink-0'
                            onClick={handleReconcile}
                        >
                            <ShieldCheck className='size-3.5' />
                            <span className='hidden xs:inline'>{t('warehouse.reports.reconcile')}</span>
                        </Button>
                        <Button
                            className='h-10 md:h-11 px-4 md:px-8 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white disabled:bg-slate-300 transition-all gap-2 shrink-0'
                            onClick={handleExport}
                            disabled={!hasData}
                        >
                            <Download className='size-3.5' />
                            <span className='truncate'>{hasData ? t('warehouse.reports.exportReport') : t('warehouse.reports.noData')}</span>
                        </Button>
                </div>
            </PageHeader>

            <div className='relative rounded-2xl md:rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-6 transition-all'>
                <div className='absolute top-0 left-6 md:left-10 -translate-y-1/2 bg-background px-3 py-0.5 border border-dashed border-muted/50 rounded-full flex items-center gap-2'>
                    <Filter className='size-3 text-muted-foreground/40' />
                    <span className='text-[8px] md:text-[9px] font-black text-muted-foreground/40 tracking-widest uppercase italic'>{t('warehouse.reports.dynamicFilter')}</span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-4 md:gap-6'>
                    <div className='space-y-1.5'>
                        <Label className='text-[8px] md:text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest flex items-center gap-2'>
                            <CalendarIcon className='size-3' /> {t('warehouse.reports.startDate')}
                        </Label>
                        <Input
                            type='date'
                            className='h-10 md:h-12 text-sm w-full lg:w-44 bg-background border-none rounded-xl md:rounded-2xl focus-visible:ring-primary/20 font-bold shadow-inner'
                            value={filters.startDate}
                            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <Label className='text-[8px] md:text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest flex items-center gap-2'>
                            <CalendarIcon className='size-3' /> {t('warehouse.reports.endDate')}
                        </Label>
                        <Input
                            type='date'
                            className='h-10 md:h-12 text-sm w-full lg:w-44 bg-background border-none rounded-xl md:rounded-2xl focus-visible:ring-primary/20 font-bold shadow-inner'
                            value={filters.endDate}
                            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                        />
                    </div>
                    <div className='sm:col-span-2 lg:flex-1 space-y-1.5'>
                        <Label className='text-[8px] md:text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest flex items-center gap-2'>
                            <Search className='size-3' /> {t('warehouse.reports.masterLocator')}
                        </Label>
                        <div className='relative group'>
                            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/20 group-focus-within:text-primary transition-colors' />
                            <Input
                                placeholder={t('warehouse.reports.queryPlaceholder')}
                                className='h-10 md:h-12 pl-12 text-sm bg-background border-none rounded-xl md:rounded-2xl focus-visible:ring-primary/20 font-bold placeholder:text-muted-foreground/20 shadow-inner'
                                value={filters.query}
                                onChange={e => setFilters(f => ({ ...f, query: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className='sm:col-span-2 lg:col-span-1'>
                        <Button
                            variant='ghost'
                            className='h-10 md:h-12 px-6 w-full lg:w-auto rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/5 transition-all'
                            onClick={resetFilters}
                        >
                            {t('warehouse.reports.reset')}
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                    <div className='overflow-x-auto scrollbar-hide'>
                        <TabsList className='bg-muted/50 p-1 rounded-xl h-10 border-none inline-flex'>
                            <TabsTrigger value='inbound' className='gap-2 px-4 md:px-8 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm whitespace-nowrap'>
                                <ArrowDownLeft className='size-3.5 shrink-0' />
                                {t('warehouse.reports.inbound')}
                                <Badge className='ml-1 h-3.5 md:h-4 px-1 text-[7px] md:text-[8px] font-black bg-blue-500/10 text-blue-600 border-none rounded-full'>{filteredInbound.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value='shipment' className='gap-2 px-4 md:px-8 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm whitespace-nowrap'>
                                <ArrowUpRight className='size-3.5 shrink-0' />
                                {t('warehouse.reports.shipment')}
                                <Badge className='ml-1 h-3.5 md:h-4 px-1 text-[7px] md:text-[8px] font-black bg-orange-500/10 text-orange-600 border-none rounded-full'>{filteredShipment.length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className='flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/30'>
                        <Filter className='size-3' />
                        {t('warehouse.reports.nodes', {
                            count: activeTab === 'inbound' ? filteredInbound.length : filteredShipment.length
                        })}
                    </div>
                </div>

                <TabsContent value='inbound' className='m-0 border-none focus-visible:ring-0'>
                    <InboundReportTable data={filteredInbound} masterDataMap={masterDataMap} />
                </TabsContent>

                <TabsContent value='shipment' className='m-0 border-none focus-visible:ring-0'>
                    <ShipmentReportTable data={filteredShipment} masterDataMap={masterDataMap} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
