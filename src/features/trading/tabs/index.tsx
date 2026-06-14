import { ShoppingCart, Users } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { CustomerList } from '../components/customer-list'
import { SalesOrderList } from '../components/sales-order-list-fixed'

export function CustomerMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex min-w-0 animate-in flex-col gap-2.5 duration-700 fade-in sm:gap-3'>
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
    <div className='flex min-h-0 flex-1 animate-in flex-col gap-8 duration-700 fade-in'>
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
