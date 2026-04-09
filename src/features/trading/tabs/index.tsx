import { Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { LogisticsMgmt as LogisticsMgmtView } from '@/features/logistics/components/logistics-mgmt'
import { PartRequirements as MrpPartRequirements } from '@/features/mrp/pages/part-requirements'
import { CustomerList } from '../components/customer-list'
import { SalesOrderList } from '../components/sales-order-list-fixed'

export function CustomerMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={Users}
        title={t('trading.customers.pageTitle')}
        description={t('trading.customers.pageDescription')}
      />
      <CustomerList />
    </div>
  )
}

export function SalesOrders() {
  return (
    <div className='animate-in fade-in duration-700'>
      <SalesOrderList />
    </div>
  )
}

export function LogisticsMgmt() {
  return (
    <div className='animate-in fade-in duration-700'>
      <LogisticsMgmtView />
    </div>
  )
}

export const PartRequirements = MrpPartRequirements
