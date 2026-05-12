import { forwardRef } from 'react'
import { useLanguage } from '@/context/language-provider'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'

export interface BOMPrintItem {
  section: string
  materialCode: string
  materialName: string
  materialSpec: string
  unit: string
  unitPrice: number
  unitUsage: number
  wastagePercent: number
  standardUsage: number
  supplyChannel: string
}

export interface BOMPrintTemplateProps {
  bomNo: string
  bomDisplayVersion?: string
  changeOrderNo?: string
  productName: string
  items: BOMPrintItem[]
}

export const BOMPrintTemplate = forwardRef<HTMLDivElement, BOMPrintTemplateProps>(
  ({ bomNo, bomDisplayVersion, changeOrderNo, productName, items = [] }, ref) => {
    const { locale, t } = useLanguage()
    const { level3Name } = useHierarchyLevelLabels()
    const today = new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    return (
      <div
        ref={ref}
        className='bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto box-border text-sm font-sans'
      >
        <style type='text/css'>
          {`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0;
            }
            .print-table th, .print-table td {
              border: 1px solid currentColor;
              padding: 6px 4px;
              text-align: center;
              font-size: 13px;
            }
            .print-table th {
              font-weight: bold;
            }
            .print-dashed-bottom {
              border-bottom: 1px dashed currentColor;
            }
            .print-dashed-top {
              border-top: 1px dashed currentColor;
            }
          `}
        </style>

        <table className='print-table' style={{ borderBottom: 'none' }}>
          <tbody>
            <tr>
              <td rowSpan={3} className='font-bold text-xl tracking-widest' style={{ width: '15%' }}>
                <div className='flex flex-col items-center justify-center h-full'>
                  <span>{t('printMgmt.bomTemplate.companyLine1')}</span>
                  <span>{t('printMgmt.bomTemplate.companyLine2')}</span>
                </div>
              </td>
              <td rowSpan={3} className='font-bold text-2xl' style={{ width: '55%' }}>
                {productName} - {t('printMgmt.bomTemplate.titleSuffix')}
                <div className='mt-2 text-sm font-mono'>
                  {bomNo}
                  {bomDisplayVersion ? ` / ${bomDisplayVersion}` : ''}
                </div>
              </td>
              <td style={{ width: '15%' }}>{t('printMgmt.bomTemplate.documentCode')}</td>
              <td style={{ width: '15%' }}>{changeOrderNo || '-'}</td>
            </tr>
            <tr>
              <td>{t('printMgmt.bomTemplate.version')}</td>
              <td>A1</td>
            </tr>
            <tr>
              <td>{t('printMgmt.bomTemplate.effectiveDate')}</td>
              <td>{today}</td>
            </tr>
            <tr>
              <td colSpan={4} className='font-bold py-3 bg-gray-50/50'>
                {t('printMgmt.bomTemplate.technicalStandard')}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className='text-left pl-4 font-bold border-r-0'>
                {t('printMgmt.bomTemplate.nameLabel')}
              </td>
              <td colSpan={2} className='text-left pl-4 font-bold border-l-0'>
                {t('printMgmt.bomTemplate.productSpec', { productName })}
              </td>
            </tr>
          </tbody>
        </table>

        <table className='print-table' style={{ borderTop: 'none', borderBottom: 'none' }}>
          <thead>
            <tr>
              <th className='font-bold' style={{ width: '8%', borderTop: 'none' }}>
                {level3Name}
              </th>
              <th className='font-bold' style={{ width: '12%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.materialCode')}
              </th>
              <th className='font-bold' style={{ width: '15%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.materialName')}
              </th>
              <th className='font-bold' style={{ width: '25%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.materialSpec')}
              </th>
              <th className='font-bold' style={{ width: '6%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.unit')}
              </th>
              <th className='font-bold' style={{ width: '6%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.unitPrice')}
              </th>
              <th className='font-bold' style={{ width: '8%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.unitUsage')}
              </th>
              <th className='font-bold' style={{ width: '6%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.wastagePercent')}
              </th>
              <th className='font-bold' style={{ width: '8%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.standardUsage')}
              </th>
              <th className='font-bold' style={{ width: '6%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.columns.supplyChannel')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr key={idx}>
                  <td className='font-semibold'>{item.section}</td>
                  <td className='text-xs'>{item.materialCode}</td>
                  <td>{item.materialName}</td>
                  <td className='text-xs'>{item.materialSpec}</td>
                  <td>{item.unit}</td>
                  <td>{item.unitPrice}</td>
                  <td className='font-bold text-blue-800'>{item.unitUsage}</td>
                  <td>{item.wastagePercent}%</td>
                  <td className='font-bold text-blue-800'>{item.standardUsage}</td>
                  <td>{item.supplyChannel}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className='py-8 text-gray-500 italic'>
                  {t('printMgmt.bomTemplate.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <table className='print-table' style={{ borderTop: 'none' }}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ width: '20%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.issueDept')}
              </td>
              <td colSpan={2} style={{ width: '20%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.issuedBy')}
              </td>
              <td style={{ width: '20%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.recipientDept')}
              </td>
              <td colSpan={5} className='text-xs' style={{ width: '40%', borderTop: 'none' }}>
                {t('printMgmt.bomTemplate.recipients')}
              </td>
            </tr>
            <tr>
              <td style={{ width: '10%' }}>{t('printMgmt.bomTemplate.proofread')}</td>
              <td style={{ width: '10%' }}>{t('printMgmt.bomTemplate.approve')}</td>
              <td colSpan={2} style={{ width: '20%' }}>
                {t('printMgmt.bomTemplate.preparedBy')}
              </td>
              <td style={{ width: '20%' }}>{t('printMgmt.bomTemplate.preparedDate')}</td>
              <td style={{ width: '10%' }}>{today}</td>
              <td
                colSpan={4}
                className='font-bold tracking-widest print-dashed-bottom'
                style={{ width: '30%' }}
              >
                {t('printMgmt.bomTemplate.revisionNotes')}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className='py-4 text-transparent'>
                {t('printMgmt.bomTemplate.signaturePlaceholder')}
              </td>
              <td>{t('printMgmt.bomTemplate.revisionDate')}</td>
              <td />
              <td colSpan={4} className='print-dashed-top' />
            </tr>
          </tbody>
        </table>
      </div>
    )
  }
)

BOMPrintTemplate.displayName = 'BOMPrintTemplate'
