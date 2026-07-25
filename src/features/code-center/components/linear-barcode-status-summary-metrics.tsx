import { useLanguage } from '@/context/language-provider'
import {
  countTerminalLinearBarcodeStatusDefinitions,
  mergeLinearBarcodeStatusDefinitions,
  type LinearBarcodeStatusContract,
} from '@/features/code-center/data/linear-barcode-status-definitions'

function LinearBarcodeStatusDefinitionMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 px-4 py-3'>
      <div className='text-[10px] font-black tracking-[0.18em] text-muted-foreground/60 uppercase'>
        {label}
      </div>
      <div className='mt-1 text-lg font-black tracking-tight text-foreground'>
        {value}
      </div>
    </div>
  )
}

export function LinearBarcodeStatusSummaryMetrics({
  contract,
}: {
  contract: LinearBarcodeStatusContract
}) {
  const { t } = useLanguage()
  const definitions = mergeLinearBarcodeStatusDefinitions(contract)
  const terminalStatusCount =
    countTerminalLinearBarcodeStatusDefinitions(definitions)

  return (
    <div className='grid gap-3 md:grid-cols-3'>
      <LinearBarcodeStatusDefinitionMetric
        label={t('codeCenter.linearBarcode.status.metrics.total')}
        value={definitions.length}
      />
      <LinearBarcodeStatusDefinitionMetric
        label={t('codeCenter.linearBarcode.status.metrics.inventory')}
        value={contract.inventoryStatuses.length}
      />
      <LinearBarcodeStatusDefinitionMetric
        label={t('codeCenter.linearBarcode.status.metrics.terminal')}
        value={terminalStatusCount}
      />
    </div>
  )
}
