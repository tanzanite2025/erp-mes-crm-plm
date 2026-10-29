import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ScanLine, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type {
  OutsourceOrder,
  OutsourceOrderLine,
} from '../data/outsource-order'
import { outsourceOrderQueryKeys } from '../query-keys'
import { saveOutsourceOrderLineOptionalBarcodeRegistration } from '../services/outsource-order-line-optional-barcode-registration-and-execution-review-service'

export function OutsourceOrderLineOptionalBarcodeRegistrationDialog({
  order,
  line,
  canEdit,
  onClose,
}: {
  order: OutsourceOrder
  line: OutsourceOrderLine
  canEdit: boolean
  onClose: () => void
}) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [barcodes, setBarcodes] = useState(line.registeredProductBarcodes ?? [])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const saveMutation = useMutation({
    mutationFn: (productBarcodes: string[]) =>
      saveOutsourceOrderLineOptionalBarcodeRegistration(
        line.id,
        line.version,
        productBarcodes
      ),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: outsourceOrderQueryKeys.all,
      })
      toast.success(t('productionOutsourcing.barcodeRegistration.saved'))
      onClose()
    },
    onError: (failure) => setError(failure.message),
  })
  const savingRef = useRef(false)

  function appendPendingProductBarcodeToSelectedLine() {
    const barcode = input.trim().toUpperCase()
    if (!barcode) return barcodes
    if (
      Array.from(barcode).length > 120 ||
      Array.from(barcode).some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      )
    ) {
      setError(t('productionOutsourcing.barcodeRegistration.invalidBarcode'))
      return null
    }
    if (barcodes.includes(barcode)) {
      setError(t('productionOutsourcing.barcodeRegistration.duplicate'))
      inputRef.current?.select()
      return null
    }
    if (barcodes.length >= 1000) {
      setError(t('productionOutsourcing.barcodeRegistration.limit'))
      return null
    }
    const next = [...barcodes, barcode]
    setBarcodes(next)
    setInput('')
    setError('')
    inputRef.current?.focus()
    return next
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveMutation.isPending) onClose()
      }}
    >
      <DialogContent
        size='lg'
        data-mobile-floating-surface-layout='column'
        className='flex max-h-[90dvh] flex-col'
      >
        <DialogHeader>
          <DialogTitle>
            {t('productionOutsourcing.barcodeRegistration.title')}
          </DialogTitle>
          <DialogDescription>
            {order.orderNo} · {order.partnerNameSnapshot} ·{' '}
            {t('productionOutsourcing.orders.fields.lineNo', {
              no: line.lineNo,
            })}
          </DialogDescription>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 space-y-4 overflow-y-auto'
        >
          <div className='rounded-md border bg-muted/30 p-3 text-sm'>
            <p className='font-semibold'>
              {line.productName || line.productCode} · {line.productCode}
            </p>
            <p className='mt-1 text-muted-foreground'>
              {t('productionOutsourcing.orders.fields.quantity')}:{' '}
              {line.quantity} {line.uom} ·{' '}
              {line.processName ||
                t('productionOutsourcing.barcodeRegistration.processUnbound')}
            </p>
          </div>
          <p className='text-sm text-muted-foreground'>
            {t('productionOutsourcing.barcodeRegistration.optionalExplanation')}
          </p>
          {canEdit && (
            <form
              className='flex gap-2'
              onSubmit={(event) => {
                event.preventDefault()
                appendPendingProductBarcodeToSelectedLine()
              }}
            >
              <Input
                ref={inputRef}
                autoFocus
                aria-label={t(
                  'productionOutsourcing.execution.fields.productBarcode'
                )}
                placeholder={t(
                  'productionOutsourcing.barcodeRegistration.scanPlaceholder'
                )}
                value={input}
                disabled={saveMutation.isPending}
                onChange={(event) => {
                  setInput(event.target.value)
                  setError('')
                }}
              />
              <Button
                type='submit'
                variant='outline'
                disabled={saveMutation.isPending || !input.trim()}
              >
                <ScanLine className='mr-2 size-4' />
                {t('productionOutsourcing.barcodeRegistration.add')}
              </Button>
            </form>
          )}
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <p className='text-sm font-medium'>
            {t('productionOutsourcing.barcodeRegistration.count', {
              count: barcodes.length,
            })}
          </p>
          <div className='max-h-64 overflow-y-auto rounded-md border'>
            {barcodes.length === 0 ? (
              <p className='p-5 text-center text-sm text-muted-foreground'>
                {t('productionOutsourcing.barcodeRegistration.empty')}
              </p>
            ) : (
              barcodes.map((barcode) => (
                <div
                  key={barcode}
                  className='flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0'
                >
                  <span className='font-mono min-w-0 text-sm break-all'>
                    {barcode}
                  </span>
                  {canEdit && (
                    <Button
                      variant='ghost'
                      size='icon'
                      disabled={saveMutation.isPending}
                      aria-label={t(
                        'productionOutsourcing.barcodeRegistration.remove',
                        { barcode }
                      )}
                      onClick={() => {
                        setBarcodes(
                          barcodes.filter((value) => value !== barcode)
                        )
                        setError('')
                      }}
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            disabled={saveMutation.isPending}
            onClick={onClose}
          >
            {t('common.actions.close')}
          </Button>
          {canEdit && (
            <Button
              disabled={saveMutation.isPending}
              onClick={async () => {
                if (savingRef.current) return
                const next = appendPendingProductBarcodeToSelectedLine()
                if (!next) return
                savingRef.current = true
                try {
                  await saveMutation.mutateAsync(next)
                } catch {
                  /* Retain input and show the server error. */
                } finally {
                  savingRef.current = false
                }
              }}
            >
              {t('common.actions.save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
