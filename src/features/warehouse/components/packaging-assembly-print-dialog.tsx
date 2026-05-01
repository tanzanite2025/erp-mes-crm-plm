import { useEffect, useRef } from 'react'
import { Barcode, Printer, QrCode } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
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

type PackagingAssemblyPrintDialogCopy = {
  title: string
  description: string
  packageCode: string
  qrLabel: string
  barcodeLabel: string
  labelType: string
  print: string
  close: string
  empty: string
}

const copyByLocale: Record<
  'zh-CN' | 'en-US',
  PackagingAssemblyPrintDialogCopy
> = {
  'zh-CN': {
    title: '打印装箱码',
    description:
      '预览当前装箱码标签，可直接打印后贴到外箱，不会离开当前作业页面。',
    packageCode: '装箱码',
    qrLabel: '二维码',
    barcodeLabel: '一维码',
    labelType: '标签类型',
    print: '打印',
    close: '关闭',
    empty: '暂无可打印的装箱码',
  },
  'en-US': {
    title: 'Print Package Code',
    description:
      'Preview and print the package label without leaving the current workflow.',
    packageCode: 'Package Code',
    qrLabel: 'QR Code',
    barcodeLabel: 'Linear Barcode',
    labelType: 'Label Type',
    print: 'Print',
    close: 'Close',
    empty: 'No package code to print',
  },
}

export type PackagingLabelType = 'code128' | 'qrcode'

function PrintableBarcodeCanvas({
  code,
  type,
  className,
}: {
  code: string
  type: 'qrcode' | 'code128'
  className: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!code || !canvasRef.current) return
    let cancelled = false
    const render = async () => {
      try {
        if (!canvasRef.current || cancelled) return
        await renderBwipBarcode({
          canvas: canvasRef.current,
          code,
          type,
        })
      } catch {
        return
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [code, type])

  return <canvas ref={canvasRef} className={className} />
}

interface PackagingAssemblyPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageCode: string
  barcodeValue: string
  labelType: PackagingLabelType
}

export function PackagingAssemblyPrintDialog({
  open,
  onOpenChange,
  packageCode,
  barcodeValue,
  labelType,
}: PackagingAssemblyPrintDialogProps) {
  const { locale } = useLanguage()
  const copy = copyByLocale[locale]
  const printRef = useRef<HTMLDivElement>(null)
  const normalizedPackageCode = packageCode.trim()
  const normalizedBarcodeValue = barcodeValue.trim()
  const isLinearLabel = labelType === 'code128'
  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: normalizedPackageCode
      ? `${normalizedPackageCode}_package_label`
      : 'package_label',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='4xl' className='gap-5'>
        <DialogHeader className='pr-8'>
          <DialogTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
            <Printer className='size-4 text-primary' />
            {copy.title}
          </DialogTitle>
          <DialogDescription className='text-xs leading-5 font-semibold'>
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        {normalizedPackageCode ? (
          <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]'>
            <div className='overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 p-4'>
              <div
                ref={printRef}
                className='package-label-print-root mx-auto aspect-[8/5] w-full max-w-[560px] overflow-hidden bg-white p-5 text-black'
              >
                <style>
                  {`
                    @media print {
                      @page {
                        size: 80mm 50mm;
                        margin: 0;
                      }
                      .package-label-print-root {
                        width: 80mm;
                        height: 50mm;
                        padding: 5mm !important;
                        box-sizing: border-box;
                        color: #000 !important;
                        background: #fff !important;
                        print-color-adjust: exact;
                      }
                      .package-label-print-root canvas {
                        break-inside: avoid;
                        max-width: 100%;
                      }
                      .package-label-frame {
                        padding: 4mm !important;
                      }
                      .package-label-header {
                        min-height: 6mm !important;
                      }
                      .package-label-code128 {
                        width: 100% !important;
                        height: 17mm !important;
                      }
                      .package-label-qrcode {
                        width: 24mm !important;
                        height: 24mm !important;
                      }
                    }
                  `}
                </style>
                <div className='package-label-frame flex h-full min-w-0 flex-col overflow-hidden rounded-md border-2 border-black p-4'>
                  <div className='package-label-header flex min-w-0 shrink-0 items-start justify-between gap-4'>
                    <div className='text-[10px] font-black tracking-[0.22em] uppercase'>
                      {copy.packageCode}
                    </div>
                  </div>

                  <div className='flex min-h-0 flex-1 items-center justify-center pt-2'>
                    {isLinearLabel ? (
                      <div className='w-full min-w-0 space-y-1 text-center'>
                        <div className='text-[10px] font-black tracking-widest uppercase'>
                          {copy.barcodeLabel}
                        </div>
                        <PrintableBarcodeCanvas
                          code={normalizedBarcodeValue || normalizedPackageCode}
                          type='code128'
                          className='package-label-code128 block h-[92px] w-full max-w-full'
                        />
                        <div className='overflow-hidden font-mono text-[10px] leading-tight font-black text-ellipsis whitespace-nowrap'>
                          {normalizedPackageCode}
                        </div>
                      </div>
                    ) : (
                      <div className='space-y-1 text-center'>
                        <div className='text-[10px] font-black tracking-widest uppercase'>
                          {copy.qrLabel}
                        </div>
                        <PrintableBarcodeCanvas
                          code={normalizedBarcodeValue || normalizedPackageCode}
                          type='qrcode'
                          className='package-label-qrcode mx-auto size-32 max-w-full'
                        />
                        <div className='max-w-[220px] overflow-hidden font-mono text-[10px] leading-tight font-black text-ellipsis whitespace-nowrap'>
                          {normalizedPackageCode}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-col justify-between rounded-lg border border-border bg-background p-4'>
              <div className='space-y-3'>
                <div className='flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  {isLinearLabel ? (
                    <Barcode className='size-5' />
                  ) : (
                    <QrCode className='size-5' />
                  )}
                </div>
                <div>
                  <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    {copy.packageCode}
                  </div>
                  <div className='mt-2 font-mono text-sm leading-5 font-black break-all xl:text-base'>
                    {normalizedPackageCode}
                  </div>
                </div>
                <div className='space-y-2'>
                  <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    {copy.labelType}
                  </div>
                  <div className='inline-flex h-9 items-center gap-2 rounded-full border border-border bg-muted/30 px-3 text-xs font-black'>
                    {isLinearLabel ? (
                      <Barcode className='size-3.5' />
                    ) : (
                      <QrCode className='size-3.5' />
                    )}
                    {isLinearLabel ? copy.barcodeLabel : copy.qrLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm font-bold text-muted-foreground'>
            {copy.empty}
          </div>
        )}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            className='rounded-full text-xs font-black'
            onClick={() => onOpenChange(false)}
          >
            {copy.close}
          </Button>
          <Button
            type='button'
            className='rounded-full text-xs font-black'
            disabled={!normalizedPackageCode}
            onClick={() => reactToPrint()}
          >
            <Printer className='size-4' />
            {copy.print}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
