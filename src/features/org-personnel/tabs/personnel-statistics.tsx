import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Users } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { personnelQueryKeys } from '../query-keys'
import { PersonnelStatsService } from '../services/personnel-stats-service'

export default function PersonnelStatistics() {
  const { t } = useLanguage()
  const { data: ranking, isLoading } = useQuery({
    queryKey: personnelQueryKeys.stats.ranking(),
    queryFn: () => PersonnelStatsService.getExcellentEmployeeRanking(),
  })

  const topPlayers = useMemo(() => ranking?.slice(0, 3) || [], [ranking])

  if (isLoading) {
    return (
      <div className='animate-in space-y-8 p-8 duration-700 fade-in'>
        <Skeleton className='h-40 w-full rounded-[32px]' />
        <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
          <Skeleton className='h-64 rounded-[24px]' />
          <Skeleton className='h-64 rounded-[24px]' />
          <Skeleton className='h-64 rounded-[24px]' />
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 p-8 duration-700 fade-in'>
      {/* 顶部荣誉榜 */}
      <header className='relative overflow-hidden rounded-[32px] border-dashed border-primary/20 bg-muted/5 p-8'>
        <div className='relative z-10 space-y-2'>
          <h1 className='flex items-center gap-2 text-lg font-black tracking-tighter text-primary uppercase italic'>
            <Trophy className='h-5 w-5 text-amber-500' />
            {t('orgPersonnel.statsPage.headerTitle')}
          </h1>
          <p className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {t('orgPersonnel.statsPage.headerDescription')}
          </p>
        </div>
        <div className='absolute top-0 right-0 flex h-full w-64 items-center justify-end bg-linear-to-l from-primary/5 to-transparent pr-12'>
          <Trophy className='-mr-8 h-32 w-32 text-primary/10 italic' />
        </div>
      </header>

      {/* 核心指标 */}
      <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
        {topPlayers.map((player, index) => (
          <Card
            key={player.employeeId}
            className='group relative overflow-hidden rounded-[24px] border-dashed p-6 transition-all hover:shadow-xl'
          >
            <div className='absolute top-4 right-4 text-4xl font-black italic opacity-10 transition-opacity group-hover:opacity-20'>
              0{index + 1}
            </div>
            <div className='space-y-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-black text-primary italic'>
                  {player.name.substring(0, 1)}
                </div>
                <div>
                  <h3 className='text-sm font-black tracking-tighter uppercase italic'>
                    {player.name}
                  </h3>
                  <p className='font-mono text-[8px] text-muted-foreground'>
                    {player.deptName}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <p className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('orgPersonnel.statsPage.metrics.attendanceRate')}
                  </p>
                  <p className='font-mono text-xs font-bold'>
                    {(player.attendanceRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className='space-y-1'>
                  <p className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('orgPersonnel.statsPage.metrics.tenure')}
                  </p>
                  <p className='font-mono text-xs font-bold'>
                    {player.tenureYears}{' '}
                    {t('orgPersonnel.statsPage.metrics.yearsUnit')}
                  </p>
                </div>
                <div className='space-y-1'>
                  <p className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('orgPersonnel.statsPage.metrics.score')}
                  </p>
                  <p className='text-lg font-black text-primary italic'>
                    {player.score}
                  </p>
                </div>
              </div>

              <div className='h-1 w-full overflow-hidden rounded-full bg-muted/30'>
                <div
                  className='h-full bg-primary transition-all duration-1000'
                  style={{ width: `${(player.score / 100) * 100}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 详细列表 */}
      <div className='rounded-[24px] border border-dashed bg-muted/5 p-6'>
        <h2 className='mb-6 flex items-center gap-2 text-sm font-black tracking-tighter uppercase italic'>
          <Users className='h-4 w-4' />
          {t('orgPersonnel.statsPage.detailTitle')}
        </h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-left'>
            <thead>
              <tr className='border-b border-dashed border-primary/10'>
                <th className='py-4 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('orgPersonnel.statsPage.table.name')}
                </th>
                <th className='py-4 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('orgPersonnel.statsPage.table.department')}
                </th>
                <th className='py-4 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('orgPersonnel.statsPage.table.attendance')}
                </th>
                <th className='py-4 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('orgPersonnel.statsPage.table.tenure')}
                </th>
                <th className='py-4 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('orgPersonnel.statsPage.table.score')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking?.map((row) => (
                <tr
                  key={row.employeeId}
                  className='border-b border-dashed border-primary/5 transition-colors hover:bg-primary/5'
                >
                  <td className='py-4 text-xs font-bold italic'>{row.name}</td>
                  <td className='py-4 text-[9px] tracking-widest uppercase'>
                    {row.deptName}
                  </td>
                  <td className='py-4'>
                    <div className='flex items-center gap-2'>
                      <span className='font-mono text-[8px] text-muted-foreground'>
                        {t('orgPersonnel.statsPage.table.leaveDays', {
                          count: row.leaveDays,
                        })}
                      </span>
                      <div className='h-1 w-12 overflow-hidden rounded-full bg-muted/30'>
                        <div
                          className='h-full bg-emerald-500'
                          style={{ width: `${row.attendanceRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className='py-4 font-mono text-[10px]'>
                    {t('orgPersonnel.statsPage.table.tenureValue', {
                      count: row.tenureYears,
                    })}
                  </td>
                  <td className='py-4 text-sm font-black text-primary italic'>
                    {row.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
