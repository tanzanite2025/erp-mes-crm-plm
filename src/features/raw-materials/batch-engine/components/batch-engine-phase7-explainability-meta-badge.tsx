export type BatchEnginePhase7ExplainabilityMetaBadgeTone = 'violet' | 'amber' | 'slate' | 'rose'

type BatchEnginePhase7ExplainabilityMetaBadgeProps = {
  label: string
  tone: BatchEnginePhase7ExplainabilityMetaBadgeTone
  compact?: boolean
  className?: string
}

export function BatchEnginePhase7ExplainabilityMetaBadge({
  label,
  tone,
  compact,
  className,
}: BatchEnginePhase7ExplainabilityMetaBadgeProps) {
  const toneClassName = tone === 'violet'
    ? 'border-violet-300/70 bg-violet-500/10 text-violet-800'
    : tone === 'amber'
      ? 'border-amber-300/70 bg-amber-500/10 text-amber-800'
      : tone === 'rose'
        ? 'border-rose-300/70 bg-rose-500/10 text-rose-800'
        : 'border-slate-300/70 bg-slate-500/10 text-slate-800'

  return (
    <span
      className={`inline-flex items-center rounded-full border border-dashed font-mono text-[8px] uppercase tracking-[0.12em] ${compact ? 'h-4 px-1.5' : 'h-5 px-2'} ${toneClassName} ${className ?? ''}`.trim()}
    >
      {label}
    </span>
  )
}
