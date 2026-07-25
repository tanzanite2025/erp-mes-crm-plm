import type { VehicleSpec } from '../data/vehicle-specs.types'

type Props = {
  spec: VehicleSpec
}

export function VehicleSpecCardNotes({ spec }: Props) {
  return (
    <div className='rounded-[22px] border border-border/70 bg-background/80 px-4 py-3 text-[13px] leading-5 text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-muted/5'>
      {spec.notes}
    </div>
  )
}
