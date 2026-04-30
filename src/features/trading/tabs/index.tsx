import { ShoppingCart, Users } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { CustomerList } from '../components/customer-list'
import { SalesOrderList } from '../components/sales-order-list-fixed'

export function CustomerMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-2.5 animate-in fade-in duration-700 sm:gap-3'>
      <IndustrialHeader
        icon={Users}
        title={t('trading.customers.pageTitle')}
        description={t('trading.customers.pageDescription')}
        className='gap-1.5 rounded-[26px] p-4 md:p-5'
      />
      <CustomerList />
    </div>
  )
}

export function SalesOrders() {
  const { t } = useLanguage()

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={ShoppingCart}
        title={t('tradingSalesOrder.tabs.title')}
        description={t('tradingSalesOrder.dialog.description')}
      />
      <div className='flex min-h-0 flex-1'>
        <SalesOrderList />
      </div>
    </div>
  )
}
