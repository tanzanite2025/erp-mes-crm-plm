import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrientationLegend } from './orientation-legend'
import { VehicleLoadingDiagram } from './vehicle-loading-diagram'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicleName: string
  vehicleSize: {
    lengthMm: number
    widthMm: number
    heightMm: number
  }
  packageSize: {
    lengthMm: number
    widthMm: number
    heightMm: number
  }
  orientationLabel: string
  orientationAxis?: 'length' | 'width' | 'height'
  boxesPerLayer: number
  layerCount: number
  maxBoxes: number
  explanation: string[]
}

export function VehicleLoadingPlanDialog({
  open,
  onOpenChange,
  vehicleName,
  vehicleSize,
  packageSize,
  orientationLabel,
  orientationAxis,
  boxesPerLayer,
  layerCount,
  maxBoxes,
  explanation,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[1200px] flex-col gap-0 rounded-[28px] border-dashed bg-background/95 p-0 shadow-xl sm:max-w-[1200px]'>
        <DialogHeader className='shrink-0 border-b border-dashed border-border/60 px-3 py-2 sm:px-4 sm:py-3'>
          <DialogTitle className='text-sm font-black tracking-tight'>
            装载示意
          </DialogTitle>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-hidden px-2 py-2 sm:px-3 sm:py-3'>
          <div className='grid gap-3 lg:grid-cols-[1.7fr_1fr] lg:items-start'>
            <div className='flex min-h-0 flex-col'>
              <VehicleLoadingDiagram
                vehicleName={vehicleName}
                vehicleSize={vehicleSize}
                packageSize={packageSize}
                orientationLabel={orientationLabel}
                orientationAxis={orientationAxis}
                boxesPerLayer={boxesPerLayer}
                layerCount={layerCount}
                maxBoxes={maxBoxes}
              />
            </div>

            <div className='space-y-3 rounded-[22px] border border-dashed border-border/60 bg-muted/3 p-3 sm:p-4'>
              <div>
                <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  说明
                </div>
                <div className='mt-2 text-sm font-black'>{vehicleName}</div>
                <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
                  当前方案按{' '}
                  <span className='font-black text-foreground'>
                    {orientationLabel}
                  </span>{' '}
                  朝向摆放。
                </div>
              </div>

              <OrientationLegend className='grid gap-2' />

              <div className='space-y-2'>
                {explanation.map((item) => (
                  <div
                    key={item}
                    className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-primary/80'
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className='rounded-2xl border border-dashed border-border/60 bg-background/80 px-2 py-2 text-[11px] leading-relaxed text-muted-foreground'>
                图中仅展示示意关系，具体摆放时仍需结合现场装车顺序与实际货物形状确认。
              </div>
            </div>
          </div>
        </div>

        <div className='shrink-0 border-t border-dashed border-border/60 px-3 py-2 sm:px-4 sm:py-3'>
          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
