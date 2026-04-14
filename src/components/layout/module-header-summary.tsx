interface ModuleHeaderSummaryProps {
  title: string
  description?: string
}

export function ModuleHeaderSummary({ title, description }: ModuleHeaderSummaryProps) {
  return (
    <div className='min-w-0'>
      <div className='truncate text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
        {title}
      </div>
      {description ? (
        <div className='mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-foreground/80 md:text-xs'>
          {description}
        </div>
      ) : null}
    </div>
  )
}
