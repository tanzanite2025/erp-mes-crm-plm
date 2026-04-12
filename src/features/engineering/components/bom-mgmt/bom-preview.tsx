'use client'

import { useMemo, useRef } from 'react'
import { ChevronLeft, Printer } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { deriveBomDisplayVersion, normalizeBomChangeType, normalizeBomEffectiveDate } from '@/lib/codecs/code-normalization'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BOMDetailTable } from '../bom-detail-table'
import { BOMPrintTemplate } from '@/features/print-mgmt/components/templates/bom-print-template'
import { PrintRecordService } from '@/features/print-mgmt/services/print-record-service'
import { type BOM, type Product } from '../../data/schema'
import { getProductAttributes } from '../../utils/product-utils'
import { type MaterialOption } from '@/features/material-archive/data/schema'

interface BOMPreviewProps {
  bom: BOM
  products: Product[]
  materials: MaterialOption[]
  onBack: () => void
}

export function BOMPreview({
  bom,
  products,
  materials,
  onBack,
}: BOMPreviewProps) {
  const { t } = useLanguage()
  const printRef = useRef<HTMLDivElement>(null)
  const productMap = useMemo(
    () => new Map(products.map((entry) => [entry.id, entry])),
    [products]
  )
  const product = bom.product || productMap.get(bom.productId)
  const productView = product ? getProductAttributes(product) : null
  const productName = productView?.displayName || t('printMgmt.bomPreview.unknownProduct')
  const bomDisplayVersion = deriveBomDisplayVersion(bom.bomVersion || bom.bomDisplayVersion)
  const bomChangeType = normalizeBomChangeType(bom.changeType)
  const effectiveFrom = normalizeBomEffectiveDate(bom.effectiveFrom)

  const printItems = bom.items.map((item) => ({
    section: item.section || t('printMgmt.bomPreview.defaultSection'),
    materialCode: item.materialId,
    materialName: item.materialName || '',
    materialSpec: item.materialSpec || '',
    unit: item.unit || '',
    unitPrice: item.unitPrice || 0,
    unitUsage: item.unitUsage || 0,
    wastagePercent: item.wastagePercent || 0,
    standardUsage: item.standardUsage || 0,
    supplyChannel: item.supplyChannel || '',
  }))

  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${bom.bomNo}_BOM`,
    onAfterPrint: () => toast.success(t('printMgmt.bomPreview.afterPrint')),
  })

  const handlePrint = async () => {
    try {
      await PrintRecordService.atomicPrint({
        templateName: `BOM - ${bom.bomNo}`,
        productId: bom.productId,
        bomId: bom.id,
        quantity: 1,
      })
      reactToPrint()
    } catch (error) {
      failLoudly(error, 'BOMPreview.handlePrint', { silentUI: true })
      reactToPrint()
    }
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='hidden'>
        <BOMPrintTemplate
          ref={printRef}
          productName={productName}
          bomNo={bom.bomNo}
          bomDisplayVersion={bomDisplayVersion}
          revisionNo={bom.revisionNo}
          changeOrderNo={bom.changeOrderNo}
          items={printItems}
        />
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' size='icon' onClick={onBack}>
            <ChevronLeft className='size-4' />
          </Button>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='text-xl font-bold'>{bom.bomNo}</h3>
              <Badge className='bg-blue-600'>{bomDisplayVersion}</Badge>
              {bom.revisionNo && <Badge variant='outline'>{bom.revisionNo}</Badge>}
              {bom.siteCode && <Badge variant='outline'>{bom.siteCode}</Badge>}
              <Badge variant='outline'>
                {bomChangeType || t('printMgmt.bomPreview.defaultChangeType')}
              </Badge>
            </div>
            <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground'>
              <span className='text-slate-500'>{t('printMgmt.bomPreview.productLabel')}:</span>
              <span className='font-bold text-slate-900'>{productName}</span>
              <span className='font-mono text-xs text-slate-500'>
                {bom.changeOrderNo || t('printMgmt.bomPreview.noEcoEcn')}
              </span>
              <span className='text-xs text-slate-500'>
                {effectiveFrom
                  ? t('printMgmt.bomPreview.effectivePrefix', { date: effectiveFrom })
                  : t('printMgmt.bomPreview.noEffectiveDate')}
              </span>
              <div className='flex items-center gap-1.5'>
                {productView && (
                  <>
                    <Badge
                      variant='secondary'
                      className='border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-50'
                    >
                      {productView.version}
                    </Badge>
                    <Badge
                      variant='outline'
                      className='border-slate-200 bg-slate-50 text-slate-600'
                    >
                      {productView.series}
                    </Badge>
                    <Badge
                      variant='outline'
                      className='border-slate-200 bg-slate-50 text-slate-600'
                    >
                      {productView.brake}
                    </Badge>
                    <span className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500'>
                      {productView.sku}
                    </span>
                    <span className='text-xs font-medium text-slate-400'>{productView.weight}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={handlePrint}>
            <Printer className='mr-2 size-4' /> {t('printMgmt.bomPreview.print')}
          </Button>
        </div>
      </div>

      <BOMDetailTable items={bom.items} materials={materials} />
    </div>
  )
}
