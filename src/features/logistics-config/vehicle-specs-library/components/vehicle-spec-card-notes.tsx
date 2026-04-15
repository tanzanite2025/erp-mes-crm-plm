import type { VehicleSpec } from '../../vehicle-loading/data/vehicle-loading.types'

type Props = {
  spec: VehicleSpec
}

export function VehicleSpecCardNotes({ spec }: Props) {
  return <div className='rounded-[22px] border border-dashed border-border/60 bg-background/70 px-4 py-3 text-[13px] leading-5 text-muted-foreground'>{spec.notes}</div>
}
