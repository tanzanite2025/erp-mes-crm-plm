import { Factory, ShoppingCart } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { SupplierList } from '@/features/trading/components/supplier-list'
import { PurchaseOrderList } from '@/features/trading/components/purchase/purchase-order-list'
import { PurchaseOrderLogs } from '@/features/trading/components/purchase/purchase-order-logs'
import { PurchaseOrderReturns } from '@/features/trading/components/purchase/purchase-order-returns'

export function SupplierMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Factory}
        title={t('purchase.suppliers.title')}
        description={t('purchase.suppliers.description')}
        statusBadge={
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.supplier}
            targetName={t('purchase.suppliers.title')}
            label={t('common.audit.trigger')}
            className='h-10 rounded-full px-4'
          />
        }
      />
      <SupplierList />
    </div>
  )
}

export function PurchaseOrders() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={ShoppingCart}
        title={t('purchase.orders.title')}
        description={t('purchase.orders.description')}
      />

      <Tabs defaultValue='orders' className='w-full space-y-4 sm:space-y-6'>
        <TabsList className='no-scrollbar flex h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-dashed border-primary/20 bg-muted/50 p-1.5'>
          <TabsTrigger
            value='orders'
            className='h-9 shrink-0 whitespace-nowrap rounded-xl px-4 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg sm:px-6'
          >
            {t('purchase.orders.tabOrders')}
          </TabsTrigger>
          <TabsTrigger
            value='logs'
            className='h-9 shrink-0 whitespace-nowrap rounded-xl px-4 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg sm:px-6'
          >
            {t('purchase.orders.tabLogs')}
          </TabsTrigger>
          <TabsTrigger
            value='returns'
            className='h-9 shrink-0 whitespace-nowrap rounded-xl px-4 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg sm:px-6'
          >
            {t('purchase.orders.tabReturns')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='orders' className='mt-0'>
          <PurchaseOrderList />
        </TabsContent>

        <TabsContent value='logs' className='mt-0'>
          <PurchaseOrderLogs />
        </TabsContent>

        <TabsContent value='returns' className='mt-0'>
          <PurchaseOrderReturns />
        </TabsContent>
      </Tabs>
    </div>
  )
}
