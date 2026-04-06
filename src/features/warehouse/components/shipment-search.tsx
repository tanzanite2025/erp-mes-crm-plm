'use client'

import { Search, Package, TrendingDown, Database, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { MasterDataSearchResult } from '../services/inventory-service'

interface ShipmentSearchProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
    isSearching: boolean
    searchResults: MasterDataSearchResult[]
    onSelect: (item: MasterDataSearchResult) => void
}

export function ShipmentSearch({
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    onSelect
}: ShipmentSearchProps) {
    const { t } = useLanguage()

    return (
        <div className='relative rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-6 transition-all hover:bg-muted/10 animate-in fade-in duration-500'>
            <div className='absolute top-0 right-6 md:right-12 -translate-y-1/2 bg-background px-2 md:px-3 py-1 border border-dashed border-muted/80 rounded-full flex items-center gap-1.5 md:gap-2'>
                <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-blue-500 animate-pulse' />
                <span className='text-[7px] md:text-[9px] font-black text-muted-foreground/60 tracking-widest uppercase italic truncate max-w-[100px] md:max-w-none'>{t('warehouse.shipment.search.locator')}</span>
            </div>

            <div className='space-y-4 md:space-y-6'>
                <div className='relative group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 transition-colors group-focus-within:text-blue-500 pointer-events-none' />
                    <input
                        placeholder={t('warehouse.shipment.search.placeholder')}
                        className='w-full h-11 md:h-12 pl-10 pr-10 text-xs md:text-sm bg-muted/50 rounded-xl md:rounded-2xl border-none focus-visible:ring-1 focus-visible:ring-primary/20 font-medium placeholder:text-muted-foreground/30 transition-all outline-none'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                        <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none'>
                            <RefreshCw className='size-3.5 md:size-4 text-blue-500 animate-spin' />
                        </div>
                    )}
                </div>

                <div className='rounded-xl md:rounded-[24px] border border-dashed border-muted/50 bg-background/50 overflow-hidden shadow-inner'>
                    <div className='bg-muted/20 px-4 md:px-6 py-2.5 md:py-3 border-b border-dashed border-muted/50 flex justify-between items-center'>
                        <span className='text-[8px] md:text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest italic truncate md:max-w-none'>{t('warehouse.shipment.search.results')}</span>
                        <span className='text-[7px] md:text-[8px] font-mono font-black text-muted-foreground/60 shrink-0'>
                            {t('warehouse.shipment.search.resultCount', { count: searchResults.length })}
                        </span>
                    </div>
                    <div className='h-[300px] md:h-[360px] overflow-y-auto divide-y divide-dashed divide-muted px-2 md:px-4 py-1 md:py-2 scrollbar-hide'>
                        {searchResults.length > 0 ? (
                            searchResults.map((item) => (
                                <div
                                    key={item.id}
                                    className='flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 hover:bg-blue-500/5 cursor-pointer transition-all group rounded-xl md:rounded-2xl my-1 gap-3 sm:gap-4'
                                    onClick={() => onSelect(item)}
                                >
                                    <div className='flex items-center gap-3 md:gap-4 overflow-hidden'>
                                        <div className='size-10 md:size-12 rounded-xl bg-background border border-muted/50 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 group-hover:scale-105 transition-all'>
                                            <Package className='size-5 text-muted-foreground/30 group-hover:text-blue-500 transition-colors' />
                                        </div>
                                        <div className='overflow-hidden space-y-0.5'>
                                            <div className='flex items-center gap-2 md:gap-3'>
                                                <h4 className='font-black text-sm text-slate-800 tracking-tighter uppercase transition-colors group-hover:text-blue-700 italic truncate max-w-[140px] md:max-w-xs'>{item.name}</h4>
                                                <Badge className={cn(
                                                    'h-3.5 md:h-4 text-[7px] md:text-[8px] font-black px-1.5 md:px-2 uppercase tracking-widest border-none rounded-full shrink-0',
                                                    item.sourceModule === 'PRODUCT' ? 'bg-blue-500/10 text-blue-600' : 'bg-teal-500/10 text-teal-600'
                                                )}>
                                                    {item.sourceModule === 'PRODUCT' ? t('warehouse.shipment.search.product') : t('warehouse.shipment.search.material')}
                                                </Badge>
                                            </div>
                                            <div className='flex items-center gap-2 md:gap-3 truncate'>
                                                <span className='text-[8px] md:text-[9px] font-black font-mono text-muted-foreground/30 uppercase tracking-widest shrink-0'>
                                                    {t('warehouse.shipment.search.sku', { code: item.code })}
                                                </span>
                                                <div className='flex items-center gap-1 ml-1 md:ml-2'>
                                                    <span className='text-[8px] md:text-[9px] font-black uppercase text-muted-foreground/20 tracking-widest'>{t('warehouse.shipment.search.stock')}</span>
                                                    <span className={cn(
                                                        'text-[8px] md:text-[9px] font-black font-mono',
                                                        item.stock > 0 ? 'text-blue-600' : 'text-rose-500'
                                                    )}>
                                                        {item.stock} {item.uom}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button size='sm' variant='ghost' className='h-9 px-4 rounded-full text-[9px] font-black uppercase tracking-widest gap-2 bg-blue-500/5 text-blue-600 border border-blue-500/20 sm:opacity-0 group-hover:opacity-100 transition-all sm:translate-x-1 group-hover:translate-x-0 shadow-lg shadow-blue-500/10 self-start sm:self-auto shrink-0'>
                                        {t('warehouse.shipment.search.initiate')} <TrendingDown className='size-3' />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className='h-full flex flex-col items-center justify-center text-muted-foreground/30'>
                                <div className='relative mb-4'>
                                    <Search className='size-16 opacity-5' />
                                    <div className='absolute inset-0 flex items-center justify-center'>
                                        <Database className='size-8 opacity-10 animate-pulse' />
                                    </div>
                                </div>
                                <p className='text-[10px] font-black uppercase tracking-widest'>{t('warehouse.shipment.search.idleTitle')}</p>
                                <p className='text-[9px] text-muted-foreground/40 mt-1'>{t('warehouse.shipment.search.idleHint')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
