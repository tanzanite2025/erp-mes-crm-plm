import { useState } from 'react'
import type { TranslationKey } from '@/locales'
import { Database, Loader2, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { type IssuedProductCodeRecord } from '@/lib/product-code/issued-product-code-inventory-contracts'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductCodeLinearBarcodeAndQrCodePreview } from '@/components/product-code-linear-barcode-and-qr-code-preview'
import {
  canReprintIssuedProductCodeLabel,
  reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels,
} from '../services/reprint-issued-product-code-linear-barcode-and-qr-code-labels'
import { resolveLinearBarcodePrintErrorMessage } from '../utils/linear-barcode-print-feedback'

interface LinearBarcodeInventoryPanelProps {
  items: IssuedProductCodeRecord[]
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

function getStatusClassName(status: IssuedProductCodeRecord['status']) {
  if (status === 'AVAILABLE') return 'bg-emerald-500/10 text-emerald-700'
  if (status === 'BOUND') return 'bg-sky-500/10 text-sky-700'
  if (status === 'EXPIRED') return 'bg-amber-500/10 text-amber-700'
  return 'bg-rose-500/10 text-rose-700'
}

function getStatusTranslationKey(
  status: IssuedProductCodeRecord['status']
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
  const [reprintingItemId, setReprintingItemId] = useState<string>()
  const availableCount = items.filter(
    (item) => item.status === 'AVAILABLE'
  ).length

  const handleReprintIssuedProductCodeLabel = async (
    item: IssuedProductCodeRecord
  ) => {
    if (reprintingItemId) return
    setReprintingItemId(item.id)
    try {
      await reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels([item])
    } catch (error) {
      toast.error(resolveLinearBarcodePrintErrorMessage(error, t))
    } finally {
      setReprintingItemId(undefined)
    }
  }

  return (
    <section className='rounded-xl border border-dashed border-muted/50 bg-muted/5 p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2 text-base font-black tracking-tight'>
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
            <table className='w-full min-w-[1200px] border-collapse text-left text-[11px]'>
              <thead className='sticky top-0 z-10 bg-muted/90 backdrop-blur'>
                <tr>
                  <th className='px-3 py-2 font-black'>
                    {t('codeCenter.linearBarcode.symbols.pairedSymbols')}
                  </th>
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
                  <th className='px-3 py-2 font-black'>
                    {t(
                      'codeCenter.linearBarcode.print.sections.inventory.actions.reprint'
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className='border-t'>
                    <td className='px-3 py-2'>
                      <ProductCodeLinearBarcodeAndQrCodePreview
                        code={item.code}
                        compact
                      />
                    </td>
                    <td className='px-3 py-2 font-maple-ui font-bold whitespace-nowrap text-foreground'>
                      {item.code}
                    </td>
                    <td className='px-3 py-2 font-maple-ui'>{item.batchNo}</td>
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
                    <td className='px-3 py-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={
                          Boolean(reprintingItemId) ||
                          !canReprintIssuedProductCodeLabel(item)
                        }
                        aria-label={t(
                          'codeCenter.linearBarcode.print.sections.inventory.actions.reprintCode',
                          { code: item.code }
                        )}
                        onClick={() =>
                          void handleReprintIssuedProductCodeLabel(item)
                        }
                      >
                        {reprintingItemId === item.id ? (
                          <Loader2 className='mr-1 size-3.5 animate-spin' />
                        ) : (
                          <Printer className='mr-1 size-3.5' />
                        )}
                        {t(
                          'codeCenter.linearBarcode.print.sections.inventory.actions.reprint'
                        )}
                      </Button>
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
