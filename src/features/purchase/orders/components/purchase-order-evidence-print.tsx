import React from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type { PurchaseOrder } from '../data/schema'
import {
  buildCurrentUserIdentityText,
  PurchasePrintDocument,
  PurchasePrintInfoGrid,
  PurchasePrintPhotoCard,
  PurchasePrintSection,
  PurchasePrintSignatureGrid,
  formatPurchasePrintDateTime,
} from './purchase-print-shared'

interface PurchaseOrderEvidencePrintProps {
  order: PurchaseOrder
}

export const PurchaseOrderEvidencePrint = React.forwardRef<
  HTMLDivElement,
  PurchaseOrderEvidencePrintProps
>(({ order }, ref) => {
  const user = useAuthStore((state) => state.user)
  const evidences = order.evidences || []
  const currentIdentity = buildCurrentUserIdentityText(user || undefined)

  return (
    <div ref={ref}>
      <PurchasePrintDocument
        title='采购订单照片附件页'
        documentNoLabel='采购单号'
        documentNo={order.orderNo}
        footerNote='本附件页用于采购订单照片留档与纸质传递，照片顺序与系统中保存顺序保持一致。'
      >
        <PurchasePrintInfoGrid
          items={[
            { label: '供应商', value: order.supplierName },
            { label: '采购经办', value: order.purchaser },
            { label: '下单日期', value: order.orderDate },
            { label: '预计到货', value: order.expectedDate },
            { label: '订单备注', value: order.note, span: 2 },
          ]}
        />

        <PurchasePrintSection
          title='订单照片清单'
          description='照片下方自动带出系统已有的图片备注与上传时间，不额外扩展采购业务字段。'
        >
          {evidences.length > 0 ? (
            <div className='purchase-print-photo-grid'>
              {evidences.map((evidence, index) => (
                <PurchasePrintPhotoCard
                  key={evidence.id}
                  title={`订单照片 ${String(index + 1).padStart(2, '0')}`}
                  photoLabel={`PO-${String(index + 1).padStart(2, '0')}`}
                  photoName={evidence.name}
                  photoUrl={evidence.url}
                  metaRows={[
                    { label: '图片备注', value: evidence.note },
                    {
                      label: '上传时间',
                      value: formatPurchasePrintDateTime(evidence.uploadedAt),
                    },
                  ]}
                />
              ))}
            </div>
          ) : (
            <div className='border border-dashed border-black/40 px-4 py-10 text-center text-sm text-black/60'>
              暂无订单照片
            </div>
          )}
        </PurchasePrintSection>

        <PurchasePrintSignatureGrid
          entries={[
            { label: '当前账号', value: currentIdentity },
            { label: '来料品检' },
            { label: '供应商代表' },
          ]}
        />
      </PurchasePrintDocument>
    </div>
  )
})

PurchaseOrderEvidencePrint.displayName = 'PurchaseOrderEvidencePrint'
