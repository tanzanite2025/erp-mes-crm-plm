'use client'

import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBOMReadData } from '../hooks/use-bom-read-data'
import { filterBOMsByProductId } from '../utils/bom-identity'
import { BOMVersionTraceContent } from '../version-trace/components/bom-version-trace-content'

const ALL_FILTER_VALUE = '__all__'

function resolveProductLabel(params: { id: string; name: string }, productDisplayLabelMap: Map<string, string>) {
  return productDisplayLabelMap.get(params.id) || params.name
}

export function BOMRecordsTab() {
  const { t } = useLanguage()
  const readResource = useBOMReadData()
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedBomId, setSelectedBomId] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')

  const readyResource = readResource.status === 'ready' ? readResource : null

  const productOptions = useMemo(
    () => [...(readyResource?.products ?? [])]
      .map((product) => ({
        id: product.id,
        label: resolveProductLabel(product, readyResource?.productDisplayLabelMap ?? new Map<string, string>()),
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN')),
    [readyResource]
  )

  const bomOptions = useMemo(
    () => filterBOMsByProductId(readyResource?.data ?? [], selectedProductId)
      .map((bom) => ({
        id: bom.id,
        bomNo: bom.bomNo,
        productId: bom.productId,
      }))
      .sort((left, right) => left.bomNo.localeCompare(right.bomNo, 'en')),
    [readyResource, selectedProductId]
  )

  const selectedProductLabel = useMemo(
    () => productOptions.find((option) => option.id === selectedProductId)?.label || '',
    [productOptions, selectedProductId]
  )

  const selectedBomLabel = useMemo(
    () => bomOptions.find((option) => option.id === selectedBomId)?.bomNo || readyResource?.data.find((bom) => bom.id === selectedBomId)?.bomNo || '',
    [bomOptions, readyResource, selectedBomId]
  )

  const hasActiveFilters = Boolean(selectedProductId || selectedBomId || createdFrom || createdTo)

  const handleProductChange = (value: string) => {
    const nextProductId = value === ALL_FILTER_VALUE ? '' : value
    setSelectedProductId(nextProductId)
    if (!selectedBomId) {
      return
    }
    const matchingBoms = filterBOMsByProductId(readyResource?.data ?? [], nextProductId)
    const bomStillValid = matchingBoms.some((bom) => bom.id === selectedBomId)
    if (!bomStillValid) {
      setSelectedBomId('')
    }
  }

  const resetFilters = () => {
    setSelectedProductId('')
    setSelectedBomId('')
    setCreatedFrom('')
    setCreatedTo('')
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-3 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-6'>
        <div className='flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-primary'>
              <History className='size-4 text-primary' />
              <h3 className='text-lg font-black tracking-tighter italic uppercase'>
                {t('engineering.bomRecords.header.title')}
              </h3>
            </div>
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('engineering.bomRecords.header.description')}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'>
              正式入口
            </Badge>
            <Badge variant='outline' className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'>
              页面聚合
            </Badge>
            <Badge variant='outline' className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'>
              {readResource.status === 'ready' ? '筛选就绪' : readResource.status === 'loading' ? '筛选加载中' : '筛选降级'}
            </Badge>
          </div>
        </div>
      </div>

      <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
            <div className='space-y-2'>
              <div className='text-sm font-black tracking-tighter italic'>最小筛选</div>
              <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                按产品、BOM 与创建时间快速收束追溯范围
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {selectedProductLabel ? (
                <Badge variant='outline' className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'>
                  产品 · {selectedProductLabel}
                </Badge>
              ) : null}
              {selectedBomLabel ? (
                <Badge variant='outline' className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'>
                  BOM · {selectedBomLabel}
                </Badge>
              ) : null}
              {createdFrom || createdTo ? (
                <Badge variant='outline' className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'>
                  时间 · {createdFrom || '—'} ~ {createdTo || '—'}
                </Badge>
              ) : null}
              <Button
                type='button'
                variant='outline'
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className='h-11 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'
              >
                清空筛选
              </Button>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_220px_220px]'>
            <div className='rounded-[24px] border border-dashed bg-background/80 p-4'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>按产品</div>
              <Select value={selectedProductId || ALL_FILTER_VALUE} onValueChange={handleProductChange}>
                <SelectTrigger aria-label='按产品筛选' className='mt-3 h-12 w-full rounded-2xl border-none bg-muted/50 px-4'>
                  <SelectValue placeholder='全部产品' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>全部产品</SelectItem>
                  {productOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='rounded-[24px] border border-dashed bg-background/80 p-4'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>按 BOM</div>
              <Select value={selectedBomId || ALL_FILTER_VALUE} onValueChange={(value) => setSelectedBomId(value === ALL_FILTER_VALUE ? '' : value)}>
                <SelectTrigger aria-label='按BOM筛选' className='mt-3 h-12 w-full rounded-2xl border-none bg-muted/50 px-4'>
                  <SelectValue placeholder='全部 BOM' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>全部 BOM</SelectItem>
                  {bomOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.bomNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='rounded-[24px] border border-dashed bg-background/80 p-4'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>开始时间</div>
              <Input
                data-testid='bom-trace-created-from'
                aria-label='开始时间'
                type='date'
                value={createdFrom}
                max={createdTo || undefined}
                onChange={(event) => setCreatedFrom(event.target.value)}
                className='mt-3 h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-bold md:text-[11px] [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:text-[11px] [&::-webkit-datetime-edit]:font-bold'
              />
            </div>

            <div className='rounded-[24px] border border-dashed bg-background/80 p-4'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>结束时间</div>
              <Input
                data-testid='bom-trace-created-to'
                aria-label='结束时间'
                type='date'
                value={createdTo}
                min={createdFrom || undefined}
                onChange={(event) => setCreatedTo(event.target.value)}
                className='mt-3 h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-bold md:text-[11px] [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:text-[11px] [&::-webkit-datetime-edit]:font-bold'
              />
            </div>
          </div>

          {readResource.status === 'error' ? (
            <div className='rounded-[24px] border border-dashed border-amber-400/40 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700'>
              筛选基准读取失败，当前仍可继续使用追溯工作区，但产品与 BOM 下拉可能不完整。
            </div>
          ) : null}
        </div>
      </div>

      <div className='h-[calc(100vh-440px)] min-h-[560px] overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-background/80'>
        <BOMVersionTraceContent
          open
          bomId={selectedBomId || undefined}
          productId={selectedProductId || undefined}
          createdFrom={createdFrom || undefined}
          createdTo={createdTo || undefined}
          className='h-full'
        />
      </div>
    </div>
  )
}
