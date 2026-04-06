import { Factory, ShoppingCart } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { SupplierList } from '@/features/trading/components/supplier-list'
import { PurchaseOrderList } from '@/features/trading/components/purchase/purchase-order-list'
import { PurchaseOrderLogs } from '@/features/trading/components/purchase/purchase-order-logs'

export function SupplierMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={Factory}
        title={t('purchase.suppliers.title')}
        description={t('purchase.suppliers.description')}
      />
      <SupplierList />
    </div>
  )
}

export function PurchaseOrders() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={ShoppingCart}
        title={t('purchase.orders.title')}
        description={t('purchase.orders.description')}
      />

      <Tabs defaultValue='orders' className='w-full space-y-6'>
        <TabsList className='bg-muted/50 p-1.5 rounded-2xl h-12 border border-dashed border-primary/20 gap-1'>
          <TabsTrigger
            value='orders'
            className='h-9 rounded-xl px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg'
          >
            {t('purchase.orders.tabOrders')}
          </TabsTrigger>
          <TabsTrigger
            value='logs'
            className='h-9 rounded-xl px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg'
          >
            {t('purchase.orders.tabLogs')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='orders' className='mt-0'>
          <PurchaseOrderList />
        </TabsContent>

        <TabsContent value='logs' className='mt-0'>
          <PurchaseOrderLogs />
        </TabsContent>
      </Tabs>
    </div>
  )
}
