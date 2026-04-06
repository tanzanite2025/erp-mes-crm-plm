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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TeamActionDialog } from './team-action-dialog'
import { TeamModuleAdapter, TeamRecord, TeamType } from './types'

type TeamManagementViewProps = {
  adapter: TeamModuleAdapter
}

const defaultDeleteConfirm = '确认删除该生产班组？此操作不可撤销。'

function getTypeBadge(type: TeamType) {
  const configs: Record<TeamType, { label: string; color: string }> = {
    dispatch: { label: '派工', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    quality: { label: '品质', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    transfer: { label: '移转', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    receive: { label: '接收', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  }
  const config = configs[type] ?? configs.dispatch

  return (
    <Badge variant='outline' className={cn('font-bold px-2 py-0.5 rounded-md', config.color)}>
      {config.label}
    </Badge>
  )
}

export function TeamManagementView({ adapter }: TeamManagementViewProps) {
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

  const handleSaveTeam = (data: Partial<TeamRecord>) => {
    void adapter.saveTeam({
      ...data,
      id: editingTeam?.id,
    })
    setIsDialogOpen(false)
  }

  const handleDeleteTeam = (id: string) => {
    const confirmed = window.confirm(adapter.confirmDeleteMessage ?? defaultDeleteConfirm)
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
            {adapter.headerTitle ?? '班组群组原子中心'}
          </h3>
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {adapter.headerDescription ??
            'PERSONNEL_TEAM_HUB / 生产动力核心：管理生产车间班组架构、逻辑分类及计件核算归属'}
        </p>
      </div>

      <div className='flex items-center justify-between gap-4 bg-muted/5 p-6 rounded-[24px] border border-dashed border-muted/50'>
        <div className='relative w-96 group'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 transition-colors group-focus-within:text-primary pointer-events-none' />
          <Input
            placeholder={adapter.searchPlaceholder ?? '搜索群组编码、名称、区段...'}
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
            <Plus className='size-4' /> {adapter.addButtonLabel ?? '新增班组'}
          </Button>
        </div>
      </div>

      <div className='rounded-[24px] border border-dashed border-muted/50 bg-background overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow className='border-white/5 hover:bg-transparent'>
              <TableHead className='w-[100px] text-[11px] font-black uppercase tracking-widest py-5'>群组编码</TableHead>
              <TableHead className='text-[11px] font-black uppercase tracking-widest'>群组名称</TableHead>
              <TableHead className='text-[11px] font-black uppercase tracking-widest'>群组步骤</TableHead>
              <TableHead className='text-[11px] font-black uppercase tracking-widest text-center'>归属区段</TableHead>
              <TableHead className='text-[11px] font-black uppercase tracking-widest text-center'>群组类型</TableHead>
              <TableHead className='text-[11px] font-black uppercase tracking-widest text-center'>是否维修</TableHead>
              <TableHead className='text-[11px] font-black uppercase tracking-widest text-center'>当前状态</TableHead>
              <TableHead className='text-[11px] font-black uppercase tracking-widest'>操作审计</TableHead>
              <TableHead className='text-right text-[11px] font-black uppercase tracking-widest pr-8'>管理控制</TableHead>
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
                <TableCell className='text-center'>{getTypeBadge((team.type as TeamType) ?? 'dispatch')}</TableCell>
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
                    {team.isMaintenance ? '维修组' : '常规组'}
                  </Badge>
                </TableCell>
                <TableCell className='text-center'>
                  <div className='flex items-center justify-center gap-1.5 font-bold text-xs'>
                    {team.status === 'active' ? (
                      <>
                        <CheckCircle2 className='size-3 text-emerald-500' />
                        <span className='text-emerald-500/80'>正常运行</span>
                      </>
                    ) : (
                      <>
                        <XCircle className='size-3 text-red-500' />
                        <span className='text-red-500/80'>已停用</span>
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
            <p className='text-sm font-black uppercase tracking-[0.3em]'>未匹配到任何工作团队</p>
            <p className='text-[10px] uppercase tracking-widest mt-2'>请尝试调整搜索条件或创建新班组</p>
          </div>
        )}
      </div>

      <TeamActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        team={editingTeam}
        onSave={handleSaveTeam}
      />
    </div>
  )
}
