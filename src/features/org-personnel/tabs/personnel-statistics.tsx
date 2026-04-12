import { useQuery } from '@tanstack/react-query'
import { PersonnelStatsService } from '../services/personnel-stats-service'
import { personnelQueryKeys } from '../query-keys'
import { Card } from '@/components/ui/card'
import { useMemo } from 'react'
import { Trophy, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function PersonnelStatistics() {
  const { data: ranking, isLoading } = useQuery({
    queryKey: personnelQueryKeys.stats.ranking(),
    queryFn: () => PersonnelStatsService.getExcellentEmployeeRanking()
  })

  const topPlayers = useMemo(() => ranking?.slice(0, 3) || [], [ranking])

  if (isLoading) {
    return <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <Skeleton className="h-40 w-full rounded-[32px]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Skeleton className="h-64 rounded-[24px]" />
         <Skeleton className="h-64 rounded-[24px]" />
         <Skeleton className="h-64 rounded-[24px]" />
      </div>
    </div>
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 p-8">
      {/* 顶部荣誉榜 */}
      <header className="rounded-[32px] border-dashed border-primary/20 bg-muted/5 p-8 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <h1 className="text-lg font-black tracking-tighter italic uppercase text-primary flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Excellent Employee Hall of Fame
          </h1>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
            基于出勤、工龄与绩效考评的数字化实时评分系统
          </p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent flex items-center justify-end pr-12">
            <Trophy className="w-32 h-32 text-primary/10 -mr-8 italic" />
        </div>
      </header>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {topPlayers.map((player, index) => (
          <Card key={player.employeeId} className="rounded-[24px] p-6 border-dashed hover:shadow-xl transition-all relative group overflow-hidden">
            <div className="absolute top-4 right-4 text-4xl font-black italic opacity-10 group-hover:opacity-20 transition-opacity">
              0{index + 1}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black italic text-primary">
                  {player.name.substring(0, 1)}
                </div>
                <div>
                  <h3 className="text-sm font-black italic tracking-tighter uppercase">{player.name}</h3>
                  <p className="text-[8px] font-mono text-muted-foreground">{player.deptName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">出勤率</p>
                  <p className="text-xs font-mono font-bold">{(player.attendanceRate * 100).toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">在司工龄</p>
                  <p className="text-xs font-mono font-bold">{player.tenureYears} Yrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">综合得分</p>
                  <p className="text-lg font-black italic text-primary">{player.score}</p>
                </div>
              </div>
              
              <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                <div 
                   className="h-full bg-primary transition-all duration-1000" 
                   style={{ width: `${(player.score / 100) * 100}%` }} 
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 详细列表 */}
      <div className="rounded-[24px] border border-dashed p-6 bg-muted/5">
         <h2 className="text-sm font-black italic tracking-tighter uppercase mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" />
            全员评分细节预览
         </h2>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-dashed border-primary/10">
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">姓名</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">部门</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">出勤情况</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">工龄</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">综合评分</th>
                  </tr>
               </thead>
               <tbody>
                  {ranking?.map(row => (
                    <tr key={row.employeeId} className="border-b border-dashed border-primary/5 hover:bg-primary/5 transition-colors">
                      <td className="py-4 text-xs font-bold italic">{row.name}</td>
                      <td className="py-4 text-[9px] uppercase tracking-widest">{row.deptName}</td>
                      <td className="py-4">
                         <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-muted-foreground">{row.leaveDays}天请假</span>
                            <div className="w-12 h-1 bg-muted/30 rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500" style={{ width: `${row.attendanceRate * 100}%` }} />
                            </div>
                         </div>
                      </td>
                      <td className="py-4 text-[10px] font-mono">{row.tenureYears}年</td>
                      <td className="py-4 text-sm font-black italic text-primary">{row.score}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
