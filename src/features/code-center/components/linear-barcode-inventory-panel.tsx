import type { TranslationKey } from '@/locales'
import { Database, Loader2, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type LinearBarcodeInventoryItem } from '@/features/print-mgmt/services/print-record-service'

interface LinearBarcodeInventoryPanelProps {
  items: LinearBarcodeInventoryItem[]
  total: number
  isLoading: boolean
  isRefreshing: boolean
  hasError: boolean
  onRefresh: () => void
}

function formatInventoryTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function getStatusClassName(status: LinearBarcodeInventoryItem['status']) {
  if (status === 'AVAILABLE') return 'bg-emerald-500/10 text-emerald-700'
  if (status === 'BOUND') return 'bg-sky-500/10 text-sky-700'
  if (status === 'EXPIRED') return 'bg-amber-500/10 text-amber-700'
  return 'bg-rose-500/10 text-rose-700'
}

function getStatusTranslationKey(
  status: LinearBarcodeInventoryItem['status']
): TranslationKey {
  switch (status) {
    case 'AVAILABLE':
      return 'codeCenter.linearBarcode.print.sections.inventory.status.AVAILABLE'
    case 'BOUND':
      return 'codeCenter.linearBarcode.print.sections.inventory.status.BOUND'
    case 'EXPIRED':
      return 'codeCenter.linearBarcode.print.sections.inventory.status.EXPIRED'
    case 'SCRAPPED':
      return 'codeCenter.linearBarcode.print.sections.inventory.status.SCRAPPED'
  }
}

export function LinearBarcodeInventoryPanel({
  items,
  total,
  isLoading,
  isRefreshing,
  hasError,
  onRefresh,
}: LinearBarcodeInventoryPanelProps) {
  const { t } = useLanguage()
  const availableCount = items.filter(
    (item) => item.status === 'AVAILABLE'
  ).length

  return (
    <section className='rounded-xl border border-dashed border-muted/50 bg-muted/5 p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2 text-base font-black tracking-tight italic'>
            <Database className='size-4 text-primary' />
            {t('codeCenter.linearBarcode.print.sections.inventory.title')}
          </div>
          <p className='mt-1 text-[11px] leading-5 text-muted-foreground'>
            {t('codeCenter.linearBarcode.print.sections.inventory.description')}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge className='border-none bg-primary/10 text-primary'>
            {t('codeCenter.linearBarcode.print.sections.inventory.total', {
              count: total,
            })}
          </Badge>
          <Badge className='border-none bg-emerald-500/10 text-emerald-700'>
            {t('codeCenter.linearBarcode.print.sections.inventory.available', {
              count: availableCount,
            })}
          </Badge>
          <Button
            type='button'
            size='icon'
            variant='outline'
            onClick={onRefresh}
            disabled={isRefreshing}
            title={t(
              'codeCenter.linearBarcode.print.sections.inventory.refresh'
            )}
            className='size-8'
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <div className='mt-4 overflow-hidden rounded-lg border bg-background'>
        {isLoading ? (
          <div className='flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('codeCenter.linearBarcode.print.sections.inventory.loading')}
          </div>
        ) : hasError ? (
          <div className='flex min-h-36 items-center justify-center text-sm text-rose-700'>
            {t('codeCenter.linearBarcode.print.sections.inventory.loadFailed')}
          </div>
        ) : items.length === 0 ? (
          <div className='flex min-h-36 items-center justify-center text-sm text-muted-foreground'>
            {t('codeCenter.linearBarcode.print.sections.inventory.empty')}
          </div>
        ) : (
          <div className='max-h-[420px] overflow-auto'>
            <table className='w-full min-w-[860px] border-collapse text-left text-[11px]'>
              <thead className='sticky top-0 z-10 bg-muted/90 backdrop-blur'>
                <tr>
                  <th className='px-3 py-2 font-black'>
                    {t(
                      'codeCenter.linearBarcode.print.sections.inventory.fields.code'
                    )}
                  </th>
                  <th className='px-3 py-2 font-black'>
                    {t(
                      'codeCenter.linearBarcode.print.sections.inventory.fields.batchNo'
                    )}
                  </th>
                  <th className='px-3 py-2 font-black'>
                    {t(
                      'codeCenter.linearBarcode.print.sections.inventory.fields.lineNo'
                    )}
                  </th>
                  <th className='px-3 py-2 font-black'>
                    {t(
                      'codeCenter.linearBarcode.print.sections.inventory.fields.status'
                    )}
                  </th>
                  <th className='px-3 py-2 font-black'>
                    {t(
                      'codeCenter.linearBarcode.print.sections.inventory.fields.expiresAt'
                    )}
                  </th>
                  <th className='px-3 py-2 font-black'>
                    {t(
                      'codeCenter.linearBarcode.print.sections.inventory.fields.createdAt'
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className='border-t'>
                    <td className='px-3 py-2 font-mono font-bold text-foreground'>
                      {item.code}
                    </td>
                    <td className='px-3 py-2 font-mono'>{item.batchNo}</td>
                    <td className='px-3 py-2'>#{item.salesOrderLineNo}</td>
                    <td className='px-3 py-2'>
                      <Badge
                        className={`border-none ${getStatusClassName(item.status)}`}
                      >
                        {t(getStatusTranslationKey(item.status))}
                      </Badge>
                    </td>
                    <td className='px-3 py-2'>
                      {formatInventoryTime(item.expiresAt)}
                    </td>
                    <td className='px-3 py-2'>
                      {formatInventoryTime(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
