import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import type { VehicleSpec } from '../../data/vehicle-loading.types'
import { categoryLabel } from '../data/vehicle-loading.utils'
import { FieldCard } from './field-card'
import { VehicleEmptyState } from './vehicle-empty-state'

type Props = {
  specs: VehicleSpec[]
}

export function VehicleSpecsTable({ specs }: Props) {
  const { t } = useLanguage()

  return (
    <FieldCard title={t('logisticsConfig.vehicleLoading.vehicleSpecs.title')} description={t('logisticsConfig.vehicleLoading.vehicleSpecs.description')}>
      {specs.length === 0 ? (
        <VehicleEmptyState
          title='暂无可用车型'
          description='当前筛选条件没有匹配到车型，请放宽最小体积、最小载重或切换类别。'
        />
      ) : (
        <div className='overflow-hidden rounded-[20px] border border-dashed border-border/55 bg-background/90'>
          <Table>
            <TableHeader>
              <TableRow className='border-border/40 hover:bg-transparent'>
                <TableHead className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55'>{t('logisticsConfig.vehicleLoading.vehicleSpecs.table.name')}</TableHead>
                <TableHead className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55'>{t('logisticsConfig.vehicleLoading.vehicleSpecs.table.category')}</TableHead>
                <TableHead className='text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55'>{t('logisticsConfig.vehicleLoading.vehicleSpecs.table.volume')}</TableHead>
                <TableHead className='text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55'>{t('logisticsConfig.vehicleLoading.vehicleSpecs.table.payload')}</TableHead>
                <TableHead className='text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55'>{t('logisticsConfig.vehicleLoading.vehicleSpecs.table.innerSize')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specs.map((spec) => (
                <TableRow key={spec.id} className='border-border/35 hover:bg-primary/5'>
                  <TableCell className='text-sm font-semibold text-foreground'>{spec.name}</TableCell>
                  <TableCell className='text-sm font-normal text-muted-foreground'>{categoryLabel(spec.category)}</TableCell>
                  <TableCell className='text-right text-sm font-medium tabular-nums text-foreground/90'>{spec.volumeM3.toFixed(1)} m³</TableCell>
                  <TableCell className='text-right text-sm font-medium tabular-nums text-foreground/90'>{spec.payloadKg.toFixed(0)} kg</TableCell>
                  <TableCell className='text-right text-sm font-medium tabular-nums text-foreground/90'>{`${spec.innerLengthMm}×${spec.innerWidthMm}×${spec.innerHeightMm} mm`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </FieldCard>
  )
}
