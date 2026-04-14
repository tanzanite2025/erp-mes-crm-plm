import { Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { ShippingPlaceholderCard } from './shared'

export function ShippingContactsPage() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={Users}
        title={t('trading.shippingManagement.contacts.title')}
        description={t('trading.shippingManagement.contacts.description')}
      />

      <ShippingPlaceholderCard
        title='联系人'
        description='这里后续会显示车型绑定的供应商和联系人，支持电话、微信、复制联系方式和一键触达。'
        actionLabel='查看联系人'
      />
    </div>
  )
}
