import React from 'react'
import { useRoleDisplay } from '@/features/users/hooks/use-role-display'
import { useAuthStore } from '@/stores/auth-store'
import type { PurchaseReturnRecord } from '../../purchase'
import {
  buildCurrentUserIdentityText,
  PurchasePrintDocument,
  PurchasePrintInfoGrid,
  PurchasePrintPhotoCard,
  PurchasePrintSection,
  PurchasePrintSignatureGrid,
  formatPurchasePrintDateTime,
  formatPurchasePrintNumber,
} from './purchase-print-shared'

interface PurchaseReturnPrintProps {
  record: PurchaseReturnRecord
}

export const PurchaseReturnPrint = React.forwardRef<HTMLDivElement, PurchaseReturnPrintProps>(
  ({ record }, ref) => {
    const user = useAuthStore((state) => state.user)
    const { text: currentRoleText } = useRoleDisplay(user?.role)
    const hasMainEvidences = (record.evidences?.length || 0) > 0
    const lineEvidenceLines = record.lines.filter((line) => (line.evidences?.length || 0) > 0)
    const currentIdentity = buildCurrentUserIdentityText(user || undefined, currentRoleText)

    return (
      <div ref={ref}>
        <PurchasePrintDocument
          title='采购退货单'
          documentNoLabel='退货单号'
          documentNo={record.returnNo}
          footerNote='本单据适用于已到货但未入库的采购退货场景，打印内容以系统登记的退货记录与照片留档为准。'
        >
          <PurchasePrintInfoGrid
            items={[
              { label: '采购单号', value: record.purchaseOrderNo },
              { label: '供应商', value: record.supplierName },
              { label: '退货日期', value: formatPurchasePrintDateTime(record.returnDate) },
              { label: '异常分类', value: record.issueCategory },
              { label: '退货原因', value: record.reason },
              { label: '采购经办', value: record.operator },
            ]}
          />

          <PurchasePrintSection
            title='退货明细'
            description='本页列示退货数量、金额及原因说明，供采购、品控与供应商对签确认。'
          >
            <table className='w-full border-collapse border border-black text-xs'>
              <thead>
                <tr className='bg-gray-100'>
                  <th className='border border-black p-2'>行号</th>
                  <th className='border border-black p-2'>物料编码</th>
                  <th className='border border-black p-2'>物料名称</th>
                  <th className='border border-black p-2'>规格</th>
                  <th className='border border-black p-2'>异常分类</th>
                  <th className='border border-black p-2 text-right'>退货数量</th>
                  <th className='border border-black p-2 text-right'>单价</th>
                  <th className='border border-black p-2 text-right'>金额</th>
                  <th className='border border-black p-2'>原因说明</th>
                </tr>
              </thead>
              <tbody>
                {record.lines.map((line) => (
                  <tr key={`${record.id}-${line.id}`} className='purchase-print-avoid-break'>
                    <td className='border border-black p-2 text-center'>{line.lineNo}</td>
                    <td className='border border-black p-2 font-mono'>{line.materialCode}</td>
                    <td className='border border-black p-2'>{line.materialName}</td>
                    <td className='border border-black p-2'>{line.specification}</td>
                    <td className='border border-black p-2'>{line.issueCategory || '--'}</td>
                    <td className='border border-black p-2 text-right'>
                      {formatPurchasePrintNumber(line.quantity)} {line.uom}
                    </td>
                    <td className='border border-black p-2 text-right'>
                      {formatPurchasePrintNumber(line.price)}
                    </td>
                    <td className='border border-black p-2 text-right'>
                      {formatPurchasePrintNumber(line.amount)}
                    </td>
                    <td className='border border-black p-2'>{line.reason || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className='mt-5 grid grid-cols-3 gap-4 text-sm'>
              <div>
                <span className='font-bold'>退货总数量：</span>
                {formatPurchasePrintNumber(record.totalQuantity)}
              </div>
              <div>
                <span className='font-bold'>退货总金额：</span>
                {formatPurchasePrintNumber(record.totalAmount)}
              </div>
              <div>
                <span className='font-bold'>备注：</span>
                {record.remarks || '--'}
              </div>
            </div>
          </PurchasePrintSection>

          {hasMainEvidences ? (
            <PurchasePrintSection
              title='主单现场照片'
              description='主单照片自动带出异常分类、备注和拍摄留档时间，便于退货单据与现场情况一并归档。'
              pageBreakBefore
            >
              <div className='purchase-print-photo-grid'>
                {record.evidences?.map((evidence, index) => (
                  <PurchasePrintPhotoCard
                    key={evidence.id}
                    title={`主单照片 ${String(index + 1).padStart(2, '0')}`}
                    photoLabel={`M-${String(index + 1).padStart(2, '0')}`}
                    photoName={evidence.name}
                    photoUrl={evidence.url}
                    metaRows={[
                      { label: '异常分类', value: record.issueCategory },
                      {
                        label: '备注说明',
                        value: evidence.note || [record.reason, record.remarks].filter(Boolean).join(' / '),
                      },
                      { label: '拍摄位置', value: evidence.location },
                      { label: '缺陷部位', value: evidence.defectPart },
                      { label: '拍摄时间', value: formatPurchasePrintDateTime(evidence.uploadedAt) },
                    ]}
                  />
                ))}
              </div>
            </PurchasePrintSection>
          ) : null}

          {lineEvidenceLines.length > 0 ? (
            <PurchasePrintSection
              title='行项目异常照片'
              description='按物料行归集异常照片，支持按照照片备注、拍摄位置和缺陷部位回看现场证据。'
              pageBreakBefore={!hasMainEvidences}
            >
              <div className='space-y-6'>
                {lineEvidenceLines.map((line) => (
                  <div key={`evidence-${record.id}-${line.id}`} className='purchase-print-avoid-break space-y-3'>
                    <div className='border-l-4 border-black pl-3 text-sm font-bold'>
                      第 {line.lineNo} 行 / {line.materialName} / {line.materialCode}
                    </div>
                    <div className='purchase-print-photo-grid'>
                      {line.evidences?.map((evidence, index) => (
                        <PurchasePrintPhotoCard
                          key={evidence.id}
                          title={`行项目照片 ${line.lineNo}-${String(index + 1).padStart(2, '0')}`}
                          photoLabel={`L${line.lineNo}-${String(index + 1).padStart(2, '0')}`}
                          photoName={evidence.name}
                          photoUrl={evidence.url}
                          metaRows={[
                            { label: '异常分类', value: line.issueCategory || record.issueCategory },
                            { label: '备注说明', value: evidence.note || line.reason || record.reason },
                            { label: '拍摄位置', value: evidence.location },
                            { label: '缺陷部位', value: evidence.defectPart },
                            { label: '拍摄时间', value: formatPurchasePrintDateTime(evidence.uploadedAt) },
                          ]}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PurchasePrintSection>
          ) : null}

          <PurchasePrintSignatureGrid
            entries={[
              { label: '当前账号', value: currentIdentity },
              { label: '当前角色', value: currentRoleText },
              { label: '来料品检' },
              { label: '供应商代表' },
            ]}
          />
        </PurchasePrintDocument>
      </div>
    )
  }
)

PurchaseReturnPrint.displayName = 'PurchaseReturnPrint'
