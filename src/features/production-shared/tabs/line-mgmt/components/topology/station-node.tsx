import { memo, useEffect, useState } from 'react'
import { Check, MapPin, MoreVertical, ShieldCheck, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import type { Station } from '../../types'
import { SecurityAuthDialog } from './security-auth-dialog'

interface StationNodeProps {
  segmentId: string
  jobCategoryId: string
  station: Station
  onUpdateStation: (segmentId: string, jobCategoryId: string, stationId: string, updates: Pick<Station, 'code' | 'name'>) => void
  onRemove: (segmentId: string, jobCategoryId: string, stationId: string) => void
}

export const StationNode = memo(({
  segmentId,
  jobCategoryId,
  station,
  onUpdateStation,
  onRemove,
}: StationNodeProps) => {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editCode, setEditCode] = useState(station.code || '')
  const [editName, setEditName] = useState(station.name)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'rename' | 'remove' | null>(null)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setEditCode(station.code || '')
      setEditName(station.name)
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [station.code, station.name])

  const handleAuthConfirm = () => {
    if (pendingAction === 'rename') {
      setIsEditing(true)
    } else if (pendingAction === 'remove') {
      onRemove(segmentId, jobCategoryId, station.id)
    }
  }

  const handleSave = () => {
    if (editName.trim() !== '') {
      onUpdateStation(segmentId, jobCategoryId, station.id, {
        code: editCode,
        name: editName,
      })
    } else {
      setEditCode(station.code || '')
      setEditName(station.name)
    }
    setIsEditing(false)
  }

  return (
    <div className='group/station flex w-full items-center gap-2 rounded-[20px] border border-muted/25 bg-muted/10 px-3 py-2 transition-all hover:border-blue-300/20 hover:bg-muted/15'>
      <MapPin className='size-4 shrink-0 text-blue-500/80' />
      <span className='shrink-0 text-[9px] font-bold uppercase tracking-widest text-blue-600/35'>[{t('orgPersonnel.lineMgmt.topology.station')}]</span>

      {isEditing ? (
        <div className='animate-in fade-in zoom-in-95 flex min-w-0 flex-1 items-center gap-2 duration-200'>
          <Input
            value={editCode}
            onChange={(event) => setEditCode(event.target.value)}
            placeholder={t('orgPersonnel.lineMgmt.editor.stationCodePlaceholder')}
            className='h-8 w-28 border-none bg-white/80 px-2 text-[11px] font-mono tracking-wider dark:bg-white/10 dark:text-slate-100'
          />
          <Input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSave()
              if (event.key === 'Escape') {
                setEditCode(station.code || '')
                setEditName(station.name)
                setIsEditing(false)
              }
            }}
            placeholder={t('orgPersonnel.lineMgmt.editor.stationNamePlaceholder')}
            className='h-8 min-w-0 flex-1 border-none bg-white/80 px-2 text-[11px] font-bold tracking-tight dark:bg-white/10 dark:text-slate-100'
            autoFocus
          />
          <button onClick={handleSave} className='text-emerald-500'>
            <Check className='size-4' />
          </button>
        </div>
      ) : (
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          <span className='rounded-full border border-blue-100 bg-blue-50/70 px-2 py-1 text-[10px] font-mono tracking-wider text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200'>
            {station.code || '--'}
          </span>
          <span className='truncate text-[11px] font-bold text-slate-700 dark:text-slate-200'>
            {station.name}
          </span>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className='flex size-7 shrink-0 items-center justify-center text-slate-300 opacity-0 transition-opacity hover:text-slate-600 group-hover/station:opacity-100 dark:text-slate-500 dark:hover:text-slate-300'
          >
            <MoreVertical className='size-4' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='rounded-2xl border border-border/50 bg-background/95 p-1 shadow-xl backdrop-blur-md dark:bg-popover/95'>
          <DropdownMenuItem
            onClick={() => {
              setPendingAction('rename')
              setIsAuthOpen(true)
            }}
            className='cursor-pointer gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest'
          >
            <ShieldCheck className='size-3.5 text-blue-500' />
            {t('orgPersonnel.lineMgmt.topology.stationRenameAuth')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setPendingAction('remove')
              setIsAuthOpen(true)
            }}
            className='cursor-pointer gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 focus:text-rose-600'
          >
            <X className='size-3.5' />
            {t('orgPersonnel.lineMgmt.topology.stationRemoveAuth')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SecurityAuthDialog
        open={isAuthOpen}
        onOpenChange={setIsAuthOpen}
        onConfirm={handleAuthConfirm}
        title={pendingAction === 'rename'
          ? t('orgPersonnel.lineMgmt.topology.stationRenameTitle')
          : t('orgPersonnel.lineMgmt.topology.stationRemoveTitle')}
        description={pendingAction === 'rename'
          ? t('orgPersonnel.lineMgmt.topology.stationRenameDesc')
          : t('orgPersonnel.lineMgmt.topology.stationRemoveDesc')}
      />
    </div>
  )
})
