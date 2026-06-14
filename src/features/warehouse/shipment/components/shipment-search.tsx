'use client'

import {
  Search,
  Package,
  TrendingDown,
  Database,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MasterDataSearchResult } from '../../inventory'
import type { ShipmentSearchResource } from '../hooks/use-shipment-search'

interface ShipmentSearchProps {
  searchQuery: string
  autoFocus?: boolean
  setSearchQuery: (query: string) => void
  searchResource: ShipmentSearchResource
  onRetry: () => void
  onSelect: (item: MasterDataSearchResult) => void
}

export function ShipmentSearch({
  searchQuery,
  autoFocus = false,
  setSearchQuery,
  searchResource,
  onRetry,
  onSelect,
}: ShipmentSearchProps) {
  const { t } = useLanguage()
  const searchResults =
    searchResource.status === 'ready' ? searchResource.data : []
  const isSearching = searchResource.status === 'loading'

  return (
    <div className='relative animate-in rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-4 transition-all duration-500 fade-in hover:bg-muted/10 md:rounded-[32px] md:p-6'>
      <div className='absolute top-0 right-6 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-dashed border-muted/80 bg-background px-2 py-1 md:right-12 md:gap-2 md:px-3'>
        <div className='h-1 w-1 animate-pulse rounded-full bg-blue-500 md:h-1.5 md:w-1.5' />
        <span className='max-w-[100px] truncate text-[7px] font-black tracking-widest text-muted-foreground/60 uppercase italic md:max-w-none md:text-[9px]'>
          {t('warehouse.shipment.search.locator')}
        </span>
      </div>

      <div className='space-y-4 md:space-y-6'>
        <div className='group relative'>
          <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-blue-500' />
          <input
            placeholder={t('warehouse.shipment.search.placeholder')}
            className='h-11 w-full rounded-xl border-none bg-muted/50 pr-10 pl-10 text-xs font-medium transition-all outline-none placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/20 md:h-12 md:rounded-2xl md:text-sm'
            autoFocus={autoFocus}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <div className='pointer-events-none absolute top-1/2 right-4 -translate-y-1/2'>
              <RefreshCw className='size-3.5 animate-spin text-blue-500 md:size-4' />
            </div>
          )}
        </div>

        <div className='overflow-hidden rounded-xl border border-dashed border-muted/50 bg-background/50 shadow-inner md:rounded-[24px]'>
          <div className='flex items-center justify-between border-b border-dashed border-muted/50 bg-muted/20 px-4 py-2.5 md:px-6 md:py-3'>
            <span className='truncate text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase italic md:max-w-none md:text-[9px]'>
              {t('warehouse.shipment.search.results')}
            </span>
            <span className='shrink-0 font-mono text-[7px] font-black text-muted-foreground/60 md:text-[8px]'>
              {t('warehouse.shipment.search.resultCount', {
                count: searchResults.length,
              })}
            </span>
          </div>
          <div className='scrollbar-hide h-[300px] divide-y divide-dashed divide-muted overflow-y-auto px-2 py-1 md:h-[360px] md:px-4 md:py-2'>
            {searchResource.status === 'error' ? (
              <div className='flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-rose-500/80'>
                <AlertTriangle className='size-10' />
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {t('warehouse.errors.queryFailed')}
                </p>
                <p className='text-[9px] text-muted-foreground'>
                  {searchResource.error.message}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  className='h-9 rounded-full px-4 text-[9px] font-black tracking-widest uppercase'
                  onClick={onRetry}
                >
                  {t('common.actions.retry')}
                </Button>
              </div>
            ) : searchResource.status === 'idle' ? (
              <div className='flex h-full flex-col items-center justify-center text-muted-foreground/30'>
                <div className='relative mb-4'>
                  <Search className='size-16 opacity-5' />
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <Database className='size-8 animate-pulse opacity-10' />
                  </div>
                </div>
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {t('warehouse.shipment.search.idleTitle')}
                </p>
                <p className='mt-1 text-[9px] text-muted-foreground/40'>
                  {t('warehouse.shipment.search.idleHint')}
                </p>
              </div>
            ) : searchResource.status === 'loading' ? (
              <div className='flex h-full flex-col items-center justify-center text-muted-foreground/30'>
                <div className='relative mb-4'>
                  <Search className='size-16 opacity-5' />
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <RefreshCw className='size-8 animate-spin' />
                  </div>
                </div>
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {t('warehouse.shipment.search.results')}
                </p>
                <p className='mt-1 text-[9px] text-muted-foreground/40'>
                  {t('warehouse.shipment.search.placeholder')}
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) => (
                <div
                  key={item.id}
                  className='group my-1 flex cursor-pointer flex-col justify-between gap-3 rounded-xl p-3 transition-all hover:bg-blue-500/5 sm:flex-row sm:items-center sm:gap-4 md:rounded-2xl md:p-4'
                  onClick={() => onSelect(item)}
                >
                  <div className='flex items-center gap-3 overflow-hidden md:gap-4'>
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-muted/50 bg-background transition-all group-hover:scale-105 group-hover:border-blue-500/30 md:size-12'>
                      <Package className='size-5 text-muted-foreground/30 transition-colors group-hover:text-blue-500' />
                    </div>
                    <div className='space-y-0.5 overflow-hidden'>
                      <div className='flex items-center gap-2 md:gap-3'>
                        <h4 className='max-w-[140px] truncate text-sm font-black tracking-tighter text-slate-800 uppercase italic transition-colors group-hover:text-blue-700 md:max-w-xs'>
                          {item.name}
                        </h4>
                        <Badge
                          className={cn(
                            'h-3.5 shrink-0 rounded-full border-none px-1.5 text-[7px] font-black tracking-widest uppercase md:h-4 md:px-2 md:text-[8px]',
                            item.sourceModule === 'PRODUCT'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-teal-500/10 text-teal-600'
                          )}
                        >
                          {item.sourceModule === 'PRODUCT'
                            ? t('warehouse.shipment.search.product')
                            : t('warehouse.shipment.search.material')}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-2 truncate md:gap-3'>
                        <span className='shrink-0 font-mono text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase md:text-[9px]'>
                          {t('warehouse.shipment.search.sku', {
                            code: item.code,
                          })}
                        </span>
                        <div className='ml-1 flex items-center gap-1 md:ml-2'>
                          <span className='text-[8px] font-black tracking-widest text-muted-foreground/20 uppercase md:text-[9px]'>
                            {t('warehouse.shipment.search.stock')}
                          </span>
                          <span
                            className={cn(
                              'font-mono text-[8px] font-black md:text-[9px]',
                              item.stock > 0 ? 'text-blue-600' : 'text-rose-500'
                            )}
                          >
                            {item.stock} {item.uom}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-9 shrink-0 gap-2 self-start rounded-full border border-blue-500/20 bg-blue-500/5 px-4 text-[9px] font-black tracking-widest text-blue-600 uppercase shadow-lg shadow-blue-500/10 transition-all group-hover:translate-x-0 group-hover:opacity-100 sm:translate-x-1 sm:self-auto sm:opacity-0'
                  >
                    {t('warehouse.shipment.search.initiate')}{' '}
                    <TrendingDown className='size-3' />
                  </Button>
                </div>
              ))
            ) : (
              <div className='flex h-full flex-col items-center justify-center text-muted-foreground/30'>
                <div className='relative mb-4'>
                  <Search className='size-16 opacity-5' />
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <Database className='size-8 animate-pulse opacity-10' />
                  </div>
                </div>
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {t('warehouse.shipment.toast.notFound')}
                </p>
                <p className='mt-1 text-[9px] text-muted-foreground/40'>
                  {t('warehouse.shipment.search.placeholder')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
