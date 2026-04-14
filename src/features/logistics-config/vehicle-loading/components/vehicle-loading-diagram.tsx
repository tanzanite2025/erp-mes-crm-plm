import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VehicleLoadingDiagramFrame } from './vehicle-loading-diagram-frame'
import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'

export function VehicleLoadingDiagram({ vehicleName, ...props }: VehicleLoadingDiagramProps) {
  return (
    <Card className={`rounded-[28px] border-dashed bg-background/80 shadow-none ${props.className ?? ''}`.trim()}>
      <CardHeader className='space-y-0 pb-1 pt-0'>
        <CardTitle className='text-base font-black tracking-tight'>{vehicleName}</CardTitle>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
          装载示意 · {props.orientationLabel}
        </div>
      </CardHeader>
      <CardContent className='flex min-h-0 flex-1 flex-col gap-2 pt-0 pb-3'>
        <VehicleLoadingDiagramFrame
          vehicleSize={props.vehicleSize}
          packageSize={props.packageSize}
          orientationLabel={props.orientationLabel}
          orientationAxis={props.orientationAxis}
          boxesPerLayer={props.boxesPerLayer}
          layerCount={props.layerCount}
          maxBoxes={props.maxBoxes}
        />
      </CardContent>
    </Card>
  )
}
