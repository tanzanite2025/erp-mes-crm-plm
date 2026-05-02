import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ChevronDown, Clock3, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  canReadRecentVisit,
  getRecentVisitsStorageKey,
  readRecentVisits,
  RECENT_VISITS_UPDATED_EVENT,
} from './recent-visits-store'
import type { RecentVisit } from './types'

const DESKTOP_MAX_VISIBLE_LIMIT = 6
const DESKTOP_RECENT_TRIGGER_WIDTH = 118
const DESKTOP_OVERFLOW_TRIGGER_WIDTH = 44
const DESKTOP_VISIT_SLOT_WIDTH = 112
const RECENT_VISITS_MENU_LIMIT = 12

function formatVisitTime(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function RecentVisitsBar() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const user = useAuthStore((state) => state.user)
  const [visits, setVisits] = useState<RecentVisit[]>([])
  const [desktopVisibleLimit, setDesktopVisibleLimit] = useState(DESKTOP_MAX_VISIBLE_LIMIT)
  const desktopSlotRef = useRef<HTMLDivElement | null>(null)
  const storageKey = useMemo(() => getRecentVisitsStorageKey(user), [user])

  useEffect(() => {
    let alive = true

    const load = async () => {
      const records = await readRecentVisits(user)
      if (alive) setVisits(records.filter((visit) => canReadRecentVisit(user, visit)))
    }

    void load()

    if (!storageKey || typeof window === 'undefined') {
      return () => {
        alive = false
      }
    }

    const handleUpdate = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { key?: string } | undefined : undefined
      if (!detail?.key || detail.key === storageKey) void load()
    }

    const handleStorageKeyUpdate = () => {
      void load()
    }

    window.addEventListener(RECENT_VISITS_UPDATED_EVENT, handleUpdate)
    window.addEventListener(`${storageKey}_updated`, handleStorageKeyUpdate)

    return () => {
      alive = false
      window.removeEventListener(RECENT_VISITS_UPDATED_EVENT, handleUpdate)
      window.removeEventListener(`${storageKey}_updated`, handleStorageKeyUpdate)
    }
  }, [storageKey, user])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const element = desktopSlotRef.current
    if (!element) return

    const updateVisibleLimit = () => {
      const availableWidth = element.getBoundingClientRect().width
      const reservedWidth = DESKTOP_RECENT_TRIGGER_WIDTH + DESKTOP_OVERFLOW_TRIGGER_WIDTH
      const nextLimit = Math.floor((availableWidth - reservedWidth) / DESKTOP_VISIT_SLOT_WIDTH)
      setDesktopVisibleLimit(Math.min(DESKTOP_MAX_VISIBLE_LIMIT, Math.max(1, nextLimit)))
    }

    updateVisibleLimit()
    const observer = new ResizeObserver(updateVisibleLimit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const displayVisits = visits.map((visit) => ({
    ...visit,
    label: visit.labelKey ? t(visit.labelKey) : visit.fallbackLabel,
    isActive: pathname === visit.path || pathname.startsWith(`${visit.path}/`),
  }))

  const visibleVisits = displayVisits.slice(0, desktopVisibleLimit)
  const overflowVisits = displayVisits.slice(desktopVisibleLimit)

  const goToVisit = (path: string) => {
    navigate({ to: path as never })
  }

  const renderVisitItem = (visit: (typeof displayVisits)[number]) => (
    <DropdownMenuItem
      key={visit.path}
      onSelect={() => goToVisit(visit.path)}
      className='flex min-w-0 cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2'
    >
      <div className='min-w-0'>
        <div className='truncate text-xs font-black tracking-tight'>{visit.label}</div>
        <div className='truncate text-[10px] font-semibold text-muted-foreground/70'>
          {visit.path}
        </div>
      </div>
      <span className='shrink-0 text-[9px] font-black text-muted-foreground/50'>
        {formatVisitTime(visit.visitedAt, locale)}
      </span>
    </DropdownMenuItem>
  )

  const renderRecentVisitsContent = (title: string, items = displayVisits) => {
    const menuItems = items.slice(0, RECENT_VISITS_MENU_LIMIT)
    return (
    <>
      <DropdownMenuLabel className='px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
        {title}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {menuItems.length > 0 ? (
        menuItems.map(renderVisitItem)
      ) : (
        <div className='px-3 py-4 text-center'>
          <div className='text-xs font-black tracking-tight text-foreground'>
            {t('recentVisits.emptyTitle')}
          </div>
          <div className='mt-1 text-[10px] font-semibold leading-4 text-muted-foreground/70'>
            {t('recentVisits.emptyDescription')}
          </div>
        </div>
      )}
    </>
    )
  }

  return (
    <div ref={desktopSlotRef} className='flex w-full min-w-0 items-center justify-center'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            className='flex h-9 max-w-[150px] items-center gap-2 rounded-full border-dashed bg-background/80 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-none md:hidden'
          >
            <Clock3 className='size-3.5' />
            <span className='truncate'>{t('recentVisits.shortLabel')}</span>
            <ChevronDown className='size-3' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='center' className='w-[min(92vw,360px)] rounded-2xl p-2'>
          {renderRecentVisitsContent(t('recentVisits.title'))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className='hidden w-full min-w-0 max-w-[min(62vw,960px)] items-center justify-center gap-2 md:flex'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className='flex h-9 shrink-0 items-center gap-1.5 rounded-full border-dashed bg-background/60 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 shadow-none hover:text-foreground'
            >
              <Clock3 className='size-3.5' />
              {t('recentVisits.shortLabel')}
              <ChevronDown className='size-3' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='center' className='w-80 rounded-2xl p-2'>
            {renderRecentVisitsContent(t('recentVisits.title'))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className='flex min-w-0 items-center gap-2 overflow-hidden'>
          {visibleVisits.map((visit) => (
            <Button
              key={visit.path}
              type='button'
              variant='outline'
              onClick={() => goToVisit(visit.path)}
              className={cn(
                'h-9 max-w-[112px] rounded-full border-dashed bg-background/70 px-3 text-[10px] font-black tracking-widest shadow-none transition-colors xl:max-w-[126px]',
                visit.isActive
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={visit.label}
            >
              <span className='truncate'>{visit.label}</span>
            </Button>
          ))}
        </div>

        {overflowVisits.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                size='icon'
                className='size-9 shrink-0 rounded-full border-dashed bg-background/70 text-muted-foreground shadow-none'
              >
                <MoreHorizontal className='size-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='center' className='w-80 rounded-2xl p-2'>
              {renderRecentVisitsContent(t('recentVisits.moreTitle'), overflowVisits)}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  )
}
