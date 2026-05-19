import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import { type SalesOrder } from '../data/schema'
import type { SalesOrderFeatureCardFactory } from './sales-order-card/sales-order-card-types'
import { SalesOrderMaster } from './sales-order-master'

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
    <div className='min-w-0 shrink-0 space-y-3'>
      <div className='flex items-center justify-between rounded-2xl border border-dashed border-rose-500/15 bg-rose-500/5 px-4 py-3'>
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
        <ScrollArea className='max-h-[42vh]'>
          <div className='pr-1'>
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
          </div>
        </ScrollArea>
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
