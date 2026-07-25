import { useQuery } from '@tanstack/react-query'
import { Activity, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { LinearBarcodeInventoryStatusDefinitionSection } from '@/features/code-center/components/linear-barcode-inventory-status-definition-section'
import { LinearBarcodeProductionLocationAnchorContractCard } from '@/features/code-center/components/linear-barcode-production-location-anchor-contract-card'
import { LinearBarcodeProductionStatusDefinitionSection } from '@/features/code-center/components/linear-barcode-production-status-definition-section'
import { LinearBarcodeStatusBoundaryCard } from '@/features/code-center/components/linear-barcode-status-boundary-card'
import { LinearBarcodeStatusLifecycleFlowCard } from '@/features/code-center/components/linear-barcode-status-lifecycle-flow-card'
import { LinearBarcodeStatusSummaryMetrics } from '@/features/code-center/components/linear-barcode-status-summary-metrics'
import {
  LINEAR_BARCODE_STATUS_CONTRACT_QUERY_KEY,
  linearBarcodeStatusContractService,
} from '@/features/code-center/services/linear-barcode-status-contract-service'

function LinearBarcodeStatusContractLoadingCard() {
  const { t } = useLanguage()

  return (
    <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
      <CardContent className='flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-muted-foreground'>
        <Loader2 className='size-4 animate-spin text-primary' />
        {t('codeCenter.linearBarcode.status.states.loadingContract')}
      </CardContent>
    </Card>
  )
}

function LinearBarcodeStatusContractErrorCard({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void
  isRetrying: boolean
}) {
  const { t } = useLanguage()

  return (
    <Card className='rounded-[28px] border border-dashed border-destructive/30 bg-destructive/5 shadow-none'>
      <CardContent className='flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between'>
        <div className='flex gap-3'>
          <AlertCircle className='mt-0.5 size-5 shrink-0 text-destructive' />
          <div>
            <div className='text-sm font-black text-foreground'>
              {t('codeCenter.linearBarcode.status.states.contractLoadFailed')}
            </div>
            <p className='mt-2 text-[11px] leading-5 text-muted-foreground'>
              {t(
                'codeCenter.linearBarcode.status.states.contractLoadFailedDescription'
              )}
            </p>
          </div>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='shrink-0'
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RefreshCw
            className={`mr-2 size-4 ${isRetrying ? 'animate-spin' : ''}`}
          />
          {t('codeCenter.linearBarcode.status.actions.retryContract')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function LinearBarcodeStatusMgmt() {
  const { t } = useLanguage()
  const contractQuery = useQuery({
    queryKey: LINEAR_BARCODE_STATUS_CONTRACT_QUERY_KEY,
    queryFn: () => linearBarcodeStatusContractService.getContract(),
  })
  const contract = contractQuery.data

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

      {contractQuery.isLoading ? (
        <LinearBarcodeStatusContractLoadingCard />
      ) : contractQuery.isError || !contract ? (
        <LinearBarcodeStatusContractErrorCard
          onRetry={() => void contractQuery.refetch()}
          isRetrying={contractQuery.isFetching}
        />
      ) : (
        <>
          <LinearBarcodeStatusSummaryMetrics contract={contract} />
          <LinearBarcodeStatusBoundaryCard />

          <div className='grid gap-5 xl:grid-cols-2'>
            <LinearBarcodeInventoryStatusDefinitionSection
              definitions={contract.inventoryStatuses}
            />
            <LinearBarcodeProductionStatusDefinitionSection
              definitions={contract.productionStatuses}
            />
          </div>

          <LinearBarcodeProductionLocationAnchorContractCard
            anchors={contract.productionLocationAnchors}
            writePolicies={contract.writePolicies}
          />

          <LinearBarcodeStatusLifecycleFlowCard />
        </>
      )}
    </div>
  )
}
