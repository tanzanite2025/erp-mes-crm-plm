import type { BatchEngineMetric } from '../types'

type BatchEngineControlMetricsGridProps = {
  metrics: BatchEngineMetric[]
}

export function BatchEngineControlMetricsGrid(props: BatchEngineControlMetricsGridProps) {
  const { metrics } = props

  return (
    <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
      {metrics.map((metric) => (
        <div key={metric.key} className='rounded-[20px] border border-border/40 bg-muted/5 p-3'>
          <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60'>
            {metric.label}
          </p>
          <p className='mt-2 text-lg font-black tracking-tight text-foreground'>{metric.value}</p>
          <p className='mt-1 text-xs leading-5 text-muted-foreground/70'>{metric.hint}</p>
        </div>
      ))}
    </div>
  )
}
