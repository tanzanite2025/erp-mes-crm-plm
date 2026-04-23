import { History } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { ShippingPlaceholderCard } from './shared'

export function ShippingHistoryPage() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={History}
        title={t('trading.shippingManagement.history.title')}
        description={t('trading.shippingManagement.history.description')}
      />

      <ShippingPlaceholderCard
        title='发货记录'
        description='这里后续会展示发货确认、车型匹配、联系结果和历史流转，形成从发货到联系的闭环记录。'
        actionLabel='查看历史'
      />
    </div>
  )
}
