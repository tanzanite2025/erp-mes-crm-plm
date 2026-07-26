import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VehicleLoadingDiagramFrame } from './vehicle-loading-diagram-frame'
import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'

export function VehicleLoadingDiagram({
  vehicleName,
  ...props
}: VehicleLoadingDiagramProps) {
  return (
    <Card
      className={`flex h-full min-h-[430px] flex-1 flex-col overflow-hidden rounded-[22px] border-primary/15 bg-background/90 shadow-none ${props.className ?? ''}`.trim()}
    >
      <CardHeader className='shrink-0 space-y-0 px-4 py-3'>
        <CardTitle className='text-sm font-black tracking-tight'>
          {vehicleName}
        </CardTitle>
        <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          装载示意 · {props.orientation.label}
        </div>
      </CardHeader>
      <CardContent className='flex min-h-0 flex-1 flex-col gap-2 px-3 pt-0 pb-3'>
        <VehicleLoadingDiagramFrame
          vehicleSize={props.vehicleSize}
          packageSize={props.packageSize}
          orientation={props.orientation}
          boxesPerLayer={props.boxesPerLayer}
          layerCount={props.layerCount}
          maxBoxes={props.maxBoxes}
          placements={props.placements}
          activeLayerIndex={props.activeLayerIndex}
          zoomPercent={props.zoomPercent}
        />
      </CardContent>
    </Card>
  )
}
