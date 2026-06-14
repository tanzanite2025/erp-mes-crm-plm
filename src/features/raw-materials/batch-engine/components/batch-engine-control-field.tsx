import type { ReactNode } from 'react'

type BatchEngineControlFieldProps = {
  label: string
  children: ReactNode
}

export function BatchEngineControlField(props: BatchEngineControlFieldProps) {
  const { label, children } = props

  return (
    <div>
      <p className='mb-1 text-[10px] font-black tracking-widest text-slate-500/70'>
        {label}
      </p>
      {children}
    </div>
  )
}
