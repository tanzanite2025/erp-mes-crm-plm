import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { type SalesOrder } from '../data/schema'
import { SalesOrderMaster } from './sales-order-master'
import type { SalesOrderFeatureCardFactory } from './sales-order-card/sales-order-card-types'

interface SalesOrderCanceledSectionProps {
  shouldLoadCanceledSection: boolean
  canceledOrders: SalesOrder[]
  canceledTotal: number
  selectedId?: string
  showCanceledSection: boolean
  onToggle: () => void
  pageSize: number
  canceledPage: number
  onCanceledPageChange: (page: number) => void
  onSelect: (id: string) => void
  onPreassembleScan: (order: SalesOrder) => void
  onViewReceivable?: (order: SalesOrder) => void
  onEdit: (order: SalesOrder) => void
  onDelete: (id: string) => void
  getFeatureCards?: SalesOrderFeatureCardFactory
}

export function SalesOrderCanceledSection({
  shouldLoadCanceledSection,
  canceledOrders,
  canceledTotal,
  selectedId,
  showCanceledSection,
  onToggle,
  pageSize,
  canceledPage,
  onCanceledPageChange,
  onSelect,
  onPreassembleScan,
  onViewReceivable,
  onEdit,
  onDelete,
  getFeatureCards,
}: SalesOrderCanceledSectionProps) {
  const { t } = useLanguage()

  if (!shouldLoadCanceledSection || canceledOrders.length === 0) {
    return null
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between rounded-2xl border border-dashed border-rose-200/80 bg-rose-50/50 px-4 py-3'>
        <div className='text-[11px] font-black tracking-wide text-rose-600'>
          {t('tradingSalesOrder.status.canceled')} ({canceledTotal})
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest'
          onClick={onToggle}
        >
          {showCanceledSection ? '收起' : '展开'}
        </Button>
      </div>

      {showCanceledSection ? (
        <SalesOrderMaster
          orders={canceledOrders}
          selectedId={selectedId}
          section='canceled'
          onSelect={onSelect}
          onPreassembleScan={onPreassembleScan}
          onViewReceivable={onViewReceivable}
          onEdit={onEdit}
          onDelete={onDelete}
          getFeatureCards={getFeatureCards}
        />
      ) : null}

      {showCanceledSection && canceledTotal > pageSize ? (
        <CompactPaginationControls
          className='mt-2'
          page={canceledPage}
          totalPages={Math.ceil(canceledTotal / pageSize)}
          onPageChange={onCanceledPageChange}
        />
      ) : null}
    </div>
  )
}
