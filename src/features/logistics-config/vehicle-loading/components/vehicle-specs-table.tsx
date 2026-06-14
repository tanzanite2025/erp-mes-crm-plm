import { useLanguage } from '@/context/language-provider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { VehicleSpec } from '../data/vehicle-loading.types'
import { categoryLabelKey } from '../data/vehicle-loading.utils'
import { FieldCard } from './field-card'
import { VehicleEmptyState } from './vehicle-empty-state'
import { VehiclePhotoTriggerButton } from './vehicle-photo-trigger-button'

type Props = {
  specs: VehicleSpec[]
  onViewPhoto?: (vehicle: VehicleSpec) => void
}

export function VehicleSpecsTable({ specs, onViewPhoto }: Props) {
  const { t } = useLanguage()

  return (
    <FieldCard
      title={t('logisticsConfig.vehicleLoading.vehicleSpecs.title')}
      description='车型清单与规格数据'
    >
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
                <TableHead className='text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/55 uppercase'>
                  {t('logisticsConfig.vehicleLoading.vehicleSpecs.table.name')}
                </TableHead>
                <TableHead className='text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/55 uppercase'>
                  {t(
                    'logisticsConfig.vehicleLoading.vehicleSpecs.table.category'
                  )}
                </TableHead>
                <TableHead className='text-right text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/55 uppercase'>
                  {t(
                    'logisticsConfig.vehicleLoading.vehicleSpecs.table.volume'
                  )}
                </TableHead>
                <TableHead className='text-right text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/55 uppercase'>
                  {t(
                    'logisticsConfig.vehicleLoading.vehicleSpecs.table.payload'
                  )}
                </TableHead>
                <TableHead className='text-right text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/55 uppercase'>
                  {t('logisticsConfig.vehicleSpecsLibrary.usableSize')}
                </TableHead>
                <TableHead className='text-right text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/55 uppercase'>
                  {t('logisticsConfig.vehicleSpecsLibrary.physicalSize')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specs.map((spec) => (
                <TableRow
                  key={spec.id}
                  className='border-border/35 hover:bg-primary/5'
                >
                  <TableCell className='text-sm text-foreground'>
                    <div className='flex flex-col gap-2'>
                      <div className='font-semibold'>{spec.name}</div>
                      {onViewPhoto ? (
                        <div>
                          <VehiclePhotoTriggerButton
                            onClick={() => onViewPhoto(spec)}
                            className='h-8 px-3 text-[10px] font-black tracking-widest uppercase'
                          />
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className='text-sm font-normal text-muted-foreground'>
                    {t(categoryLabelKey(spec.category))}
                  </TableCell>
                  <TableCell className='text-right text-sm font-medium text-foreground/90 tabular-nums'>
                    {spec.volumeM3.toFixed(1)} m³
                  </TableCell>
                  <TableCell className='text-right text-sm font-medium text-foreground/90 tabular-nums'>
                    {spec.payloadKg.toFixed(0)} kg
                  </TableCell>
                  <TableCell className='text-right text-sm font-medium text-foreground/90 tabular-nums'>{`${spec.usableInnerSize.lengthMm}×${spec.usableInnerSize.widthMm}×${spec.usableInnerSize.heightMm} mm`}</TableCell>
                  <TableCell className='text-right text-sm font-medium text-foreground/90 tabular-nums'>{`${spec.physicalInnerSize.lengthMm}×${spec.physicalInnerSize.widthMm}×${spec.physicalInnerSize.heightMm} mm`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </FieldCard>
  )
}
