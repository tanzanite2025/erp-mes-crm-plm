import { Activity } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { LinearBarcodeInventoryStatusDefinitionSection } from '@/features/code-center/components/linear-barcode-inventory-status-definition-section'
import { LinearBarcodeProductionStatusDefinitionSection } from '@/features/code-center/components/linear-barcode-production-status-definition-section'
import { LinearBarcodeStatusBoundaryCard } from '@/features/code-center/components/linear-barcode-status-boundary-card'
import { LinearBarcodeStatusLifecycleFlowCard } from '@/features/code-center/components/linear-barcode-status-lifecycle-flow-card'
import { LinearBarcodeStatusSummaryMetrics } from '@/features/code-center/components/linear-barcode-status-summary-metrics'

export function LinearBarcodeStatusMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-5 duration-500 fade-in'>
      <IndustrialHeader
        icon={Activity}
        title={t('codeCenter.linearBarcode.status.page.title')}
        description={t('codeCenter.linearBarcode.status.page.description')}
        statusBadge={
          <Badge className='border-none bg-primary/10 px-4 py-1.5 text-[10px] font-black tracking-[0.2em] text-primary uppercase'>
            {t('codeCenter.linearBarcode.status.page.badges.definitionOnly')}
          </Badge>
        }
      />

      <LinearBarcodeStatusSummaryMetrics />
      <LinearBarcodeStatusBoundaryCard />

      <div className='grid gap-5 xl:grid-cols-2'>
        <LinearBarcodeInventoryStatusDefinitionSection />
        <LinearBarcodeProductionStatusDefinitionSection />
      </div>

      <LinearBarcodeStatusLifecycleFlowCard />
    </div>
  )
}
