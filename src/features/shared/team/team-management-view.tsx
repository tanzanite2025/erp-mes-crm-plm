import { useState } from 'react'
import {
  CheckCircle2,
  Edit2,
  Filter,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DeltaSet } from '@/lib/delta/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TeamActionDialog } from './team-action-dialog'
import type { TeamModuleAdapter, TeamRecord, TeamType } from './types'

type TeamManagementViewProps = {
  adapter: TeamModuleAdapter
}

function getTypeBadge(type: TeamType, labels: TeamModuleAdapter['texts']['typeLabels']) {
  const configs: Record<TeamType, { label: string; color: string }> = {
    dispatch: { label: labels.dispatch, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    quality: { label: labels.quality, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    transfer: { label: labels.transfer, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    receive: { label: labels.receive, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  }
  const config = configs[type] ?? configs.dispatch

  return (
    <Badge variant='outline' className={cn('font-bold px-2 py-0.5 rounded-md', config.color)}>
      {config.label}
    </Badge>
  )
}

export function TeamManagementView({ adapter }: TeamManagementViewProps) {
  const { texts } = adapter
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null)

  const filteredTeams = adapter.teams.filter((team) => {
    const name = String(team.name ?? '').toLowerCase()
    const code = String(team.code ?? '').toLowerCase()
    const section = String(team.section ?? '').toLowerCase()
    const keyword = searchQuery.toLowerCase()
    return name.includes(keyword) || code.includes(keyword) || section.includes(keyword)
  })

  const handleSaveTeam = (params: { data: TeamRecord; isPatch: boolean; delta?: DeltaSet; version?: number }) => {
    void adapter.saveTeam(params)
    setIsDialogOpen(false)
  }

  const handleDeleteTeam = (id: string) => {
    const confirmed = window.confirm(texts.confirmDeleteMessage)
    if (!confirmed) return
    void adapter.deleteTeam(id)
  }

  if (adapter.isLoading && adapter.teams.length === 0) {
    return (
      <div className='flex flex-col gap-8 animate-pulse'>
        <div className='h-32 rounded-[32px] bg-muted/20' />
        <div className='h-64 rounded-[24px] bg-muted/10' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <Users className='size-4' />
          <h3 className='text-lg font-black tracking-tighter italic uppercase'>
            {texts.headerTitle}
          </h3>
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {texts.headerDescription}
        </p>
      </div>

      <div className='flex items-center justify-between gap-4 bg-muted/5 p-6 rounded-[24px] border border-dashed border-muted/50'>
        <div className='relative w-96 group'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 transition-colors group-focus-within:text-primary pointer-events-none' />
          <Input
            placeholder={texts.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10 h-12 rounded-2xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20 transition-all'
          />
        </div>
        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            size='icon'
            className='size-11 rounded-2xl border-dashed border-muted/50 hover:bg-primary/5 transition-colors'
          >
            <Filter className='size-4' />
          </Button>
          <div className='w-px h-6 bg-border mx-1' />
          <Button
            onClick={() => {
              setEditingTeam(null)
              setIsDialogOpen(true)
            }}
            className='bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-primary-foreground gap-2 transition-all hover:scale-105 active:scale-95'
          >
            <Plus className='size-4' /> {texts.addButtonLabel}
          </Button>
        </div>
      </div>

      <div className='rounded-[24px] border border-dashed border-muted/50 bg-background overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/10 border-b border-dashed border-muted/50'>
            <TableRow className='border-white/5 hover:bg-transparent'>
              <TableHead className='w-[120px] text-[10px] font-black uppercase tracking-widest py-6 italic'>{texts.table.code}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest italic'>{texts.table.name}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest italic'>{texts.table.step}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-center italic'>{texts.table.section}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-center italic'>{texts.table.type}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-center italic'>{texts.table.maintenance}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-center italic'>{texts.table.status}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest italic'>{texts.table.audit}</TableHead>
              <TableHead className='text-right text-[10px] font-black uppercase tracking-widest pr-8 italic'>{texts.table.commands}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.map((team) => (
              <TableRow key={team.id} className='group border-white/5 hover:bg-muted/20 transition-colors'>
                <TableCell className='font-mono font-black text-xs text-primary'>{team.code}</TableCell>
                <TableCell className='font-bold text-sm tracking-tight'>{team.name}</TableCell>
                <TableCell className='font-bold text-xs opacity-60 italic'>{team.step || '-'}</TableCell>
                <TableCell className='text-center'>
                  <span className='font-bold text-[10px] uppercase bg-muted/50 px-2 py-0.5 rounded-md text-muted-foreground'>
                    {team.section}
                  </span>
                </TableCell>
                <TableCell className='text-center'>{getTypeBadge((team.type as TeamType) ?? 'dispatch', texts.typeLabels)}</TableCell>
                <TableCell className='text-center'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'rounded-full px-3 py-0 border-2 font-bold text-[10px]',
                      team.isMaintenance
                        ? 'border-amber-500/50 text-amber-500 bg-amber-500/5'
                        : 'border-slate-500/20 text-slate-400'
                    )}
                  >
                    {team.isMaintenance ? texts.maintenanceLabels.true : texts.maintenanceLabels.false}
                  </Badge>
                </TableCell>
                <TableCell className='text-center'>
                  <div className='flex items-center justify-center gap-1.5 font-bold text-xs'>
                    {team.status === 'active' ? (
                      <>
                        <CheckCircle2 className='size-3 text-emerald-500' />
                        <span className='text-emerald-500/80'>{texts.statusLabels.active}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className='size-3 text-red-500' />
                        <span className='text-red-500/80'>{texts.statusLabels.inactive}</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-[10px] font-bold opacity-80'>{team.operator}</span>
                    <span className='text-[9px] font-medium text-muted-foreground'>{team.operateTime}</span>
                  </div>
                </TableCell>
                <TableCell className='text-right pr-6'>
                  <div className='flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all'
                      onClick={() => {
                        setEditingTeam(team)
                        setIsDialogOpen(true)
                      }}
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                    <Button variant='ghost' size='icon' className='h-8 w-8 rounded-lg hover:bg-muted transition-all'>
                      <Settings className='size-3.5 text-muted-foreground' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all'
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredTeams.length === 0 && (
          <div className='py-24 flex flex-col items-center justify-center text-muted-foreground/30'>
            <Users className='size-16 mb-4 opacity-10 stroke-[1px]' />
            <p className='text-sm font-black uppercase tracking-[0.3em]'>{texts.empty.title}</p>
            <p className='text-[10px] uppercase tracking-widest mt-2'>{texts.empty.description}</p>
          </div>
        )}
      </div>

      <TeamActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        team={editingTeam}
        onSave={handleSaveTeam}
        texts={texts.dialog}
        isLoading={adapter.isLoading}
      />
    </div>
  )
}
