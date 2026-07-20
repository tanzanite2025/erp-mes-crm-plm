import { Factory, ShoppingCart } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { SupplierList } from '@/features/purchase/suppliers'
import {
  PurchaseOrderList,
  PurchaseOrderLogs,
  PurchaseOrderReturns,
} from '@/features/purchase/orders'

export function SupplierMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
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
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={ShoppingCart}
        title={t('purchase.orders.title')}
        description={t('purchase.orders.description')}
      />

      <Tabs defaultValue='orders' className='w-full space-y-4 sm:space-y-6'>
        <TabsList className='no-scrollbar flex h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-dashed border-primary/20 bg-muted/50 p-1.5'>
          <TabsTrigger
            value='orders'
            className='h-9 shrink-0 rounded-xl px-4 text-[10px] font-black tracking-widest whitespace-nowrap uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg sm:px-6'
          >
            {t('purchase.orders.tabOrders')}
          </TabsTrigger>
          <TabsTrigger
            value='logs'
            className='h-9 shrink-0 rounded-xl px-4 text-[10px] font-black tracking-widest whitespace-nowrap uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg sm:px-6'
          >
            {t('purchase.orders.tabLogs')}
          </TabsTrigger>
          <TabsTrigger
            value='returns'
            className='h-9 shrink-0 rounded-xl px-4 text-[10px] font-black tracking-widest whitespace-nowrap uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg sm:px-6'
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
