import type { GreedyEngineFactorStatusTone } from './types'

export const ENGINE_CARD_SHELL_CLASS =
  'relative overflow-hidden rounded-[24px] border border-dashed border-foreground/15 bg-background/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.32)]'

export const ENGINE_HERO_SHELL_CLASS =
  'relative overflow-hidden rounded-[32px] border border-dashed border-cyan-500/15 bg-muted/5 p-8'

export const ENGINE_HERO_OVERLAY_CLASS = 'pointer-events-none absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent'

export const ENGINE_PANEL_CLASS = 'rounded-[22px] border border-dashed border-muted/45 bg-background/80'

export const ENGINE_SECTION_SHELL_CLASS =
  'rounded-[28px] border border-dashed border-foreground/10 bg-muted/5 px-4 py-5 md:px-6 md:py-6'

export const ENGINE_SECTION_HEADER_CLASS = 'flex items-center justify-between gap-4'

export const ENGINE_SECTION_DECOR_CLASS = 'hidden items-center gap-2 md:flex'

export const ENGINE_KICKER_CLASS = 'text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/55'

export const ENGINE_SECTION_TITLE_CLASS = 'mt-1 text-sm font-black tracking-tighter italic text-foreground'

export const ENGINE_CARD_TITLE_CLASS = 'text-sm font-black tracking-tighter italic text-foreground'

export const ENGINE_HERO_DESC_CLASS = 'text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'

export const ENGINE_DESC_CLASS = 'mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'

export const ENGINE_BADGE_CLASS =
  'inline-flex h-5 items-center justify-center rounded-full border border-dashed px-3 text-[8px] font-mono uppercase tracking-[0.2em] whitespace-nowrap'

export const ENGINE_COMPACT_VALUE_CLASS = 'text-[10px] font-black leading-5 tracking-tight text-foreground/90'

export const ENGINE_STATUS_ICON_CLASS = 'size-3.5 shrink-0'

export const ENGINE_TABLE_SHELL_CLASS =
  'overflow-hidden rounded-[26px] border border-dashed border-muted/45 bg-background/90 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.45)]'

export const ENGINE_TABLE_HEADER_CELL_CLASS =
  'border-b border-dashed border-muted/40 bg-muted/25 px-4 py-2 text-left text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'

export const ENGINE_TABLE_CELL_CLASS =
  'border-b border-dashed border-muted/25 px-4 py-2.5 align-top text-[10px] leading-normal text-foreground/85'

export const ENGINE_TABLE_ROW_CLASS = 'odd:bg-background even:bg-muted/10 hover:bg-muted/15 transition-colors'

export function getEngineStatusBadgeToneClass(tone: GreedyEngineFactorStatusTone): string {
  switch (tone) {
    case 'healthy':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
    case 'critical':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-600 animate-pulse'
    case 'alert':
    default:
      return 'border-amber-500/20 bg-amber-500/10 text-amber-600'
  }
}

export function getEngineStatusPanelToneClass(tone: GreedyEngineFactorStatusTone): string {
  switch (tone) {
    case 'healthy':
      return 'border-emerald-500/20 bg-emerald-500/5'
    case 'critical':
      return 'border-rose-500/20 bg-rose-500/5'
    case 'alert':
    default:
      return 'border-amber-500/20 bg-amber-500/5'
  }
}

export function getEngineStatusTextToneClass(tone: GreedyEngineFactorStatusTone): string {
  switch (tone) {
    case 'healthy':
      return 'text-emerald-600'
    case 'critical':
      return 'text-rose-600'
    case 'alert':
    default:
      return 'text-amber-600'
  }
}
