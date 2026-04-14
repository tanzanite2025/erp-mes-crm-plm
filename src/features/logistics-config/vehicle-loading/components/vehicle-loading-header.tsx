import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'

type Props = {
  onViewDiagram: () => void
}

export function VehicleLoadingHeader({ onViewDiagram }: Props) {
  const { t } = useLanguage()

  return (
    <PageHeader title={t('logisticsConfig.vehicleLoading.title')} description={t('logisticsConfig.vehicleLoading.description')} icon={Truck}>
      <Button
        type='button'
        className='h-11 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25'
        onClick={onViewDiagram}
      >
        查看装载示意
      </Button>
    </PageHeader>
  )
}
