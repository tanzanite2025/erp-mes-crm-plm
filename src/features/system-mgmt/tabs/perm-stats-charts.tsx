import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LayoutDashboard, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface PermStatsChartsProps {
  userDist: Array<{ name: string; value: number }>
  permLoad: Array<{ name: string; count: number; fullMark: number }>
}

export function PermStatsCharts({ userDist, permLoad }: PermStatsChartsProps) {
  const { t } = useLanguage()
  const visibleUserDist = userDist.filter((item) => item.value > 0)

  return (
    <div className='flex flex-col gap-6 lg:grid lg:grid-cols-7'>
      <Card className='col-span-3 overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5'>
        <CardHeader className='pb-0'>
          <CardTitle className='flex items-center gap-2 text-sm font-black uppercase italic tracking-tighter'>
            <LayoutDashboard className='size-4 text-blue-600/60' />
            {t('systemManagement.permissionAudit.charts.userDistribution.title')}
          </CardTitle>
          <CardDescription className='text-[9px] font-black uppercase tracking-widest opacity-40'>
            {t('systemManagement.permissionAudit.charts.userDistribution.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mt-2 h-[300px] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={visibleUserDist}
                  cx='50%'
                  cy='50%'
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey='value'
                  label={({ name, percent, x, y, cx }) => (
                    <text
                      x={x}
                      y={y}
                      fill='#64748b'
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline='central'
                      fontSize={10}
                      fontWeight={900}
                      className='font-mono'
                    >
                      {`${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    </text>
                  )}
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '2 2' }}
                >
                  {visibleUserDist.map((_, index) => (
                    <Cell key={`perm-user-dist-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '16px',
                    border: '1px dashed #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                  }}
                />
                <Legend
                  verticalAlign='bottom'
                  height={36}
                  formatter={(value) => (
                    <span className='text-[10px] font-black uppercase italic tracking-widest opacity-60'>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className='col-span-4 overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5'>
        <CardHeader className='pb-0'>
          <CardTitle className='flex items-center gap-2 text-sm font-black uppercase italic tracking-tighter'>
            <TrendingUp className='size-4 text-indigo-600/60' />
            {t('systemManagement.permissionAudit.charts.permissionLoad.title')}
          </CardTitle>
          <CardDescription className='text-[9px] font-black uppercase tracking-widest opacity-40'>
            {t('systemManagement.permissionAudit.charts.permissionLoad.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mt-2 h-[300px] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={permLoad}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis
                  dataKey='name'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '16px',
                    border: '1px dashed #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                  }}
                />
                <Bar
                  dataKey='count'
                  name={t('systemManagement.permissionAudit.charts.permissionLoad.barLabel')}
                  fill='#3b82f6'
                  radius={[8, 8, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
