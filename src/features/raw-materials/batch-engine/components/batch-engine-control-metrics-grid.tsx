import type { BatchEngineMetric } from '../types'

type BatchEngineControlMetricsGridProps = {
  metrics: BatchEngineMetric[]
}

export function BatchEngineControlMetricsGrid(props: BatchEngineControlMetricsGridProps) {
  const { metrics } = props

  return (
    <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
      {metrics.map((metric) => (
        <div key={metric.key} className='rounded-[20px] border border-slate-200 bg-white p-3'>
          <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>
            {metric.label}
          </p>
          <p className='mt-2 text-lg font-black tracking-tight text-slate-950'>{metric.value}</p>
          <p className='mt-1 text-xs leading-5 text-slate-600/80'>{metric.hint}</p>
        </div>
      ))}
    </div>
  )
}
