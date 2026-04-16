import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Activity, Key, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { type User } from '@/features/users/data/schema'
import { fetchUsers as fetchUsersApi } from '@/features/users/services/user-api'
import { isForbiddenError } from '@/lib/error-status'
import { useRoles } from '../hooks/use-roles'

const PermStatsCharts = lazy(() =>
  import('./perm-stats-charts').then((module) => ({ default: module.PermStatsCharts })),
)

export function PermStatsTab() {
  const { t } = useLanguage()
  const { roles, permissions, error: rolesError } = useRoles()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setError(null)
        const userPage = await fetchUsersApi({})
        setAllUsers(userPage.items)
      } catch (loadError) {
        setError(loadError)
        setAllUsers([])
      } finally {
        setLoading(false)
      }
    }

    void loadUsers()
  }, [])

  const stats = useMemo(() => {
    if (!roles.length) return null

    const userDist = roles.map((role) => ({
      name: role.label,
      value: 0,
    }))

    const permLoad = roles.map((role) => ({
      name: role.label,
      count: role.permissions.length,
      fullMark: permissions.length,
    }))

    const modules = [
      { label: t('systemManagement.permissionAudit.modules.warehouse'), id: 'menu_warehouse' },
      { label: t('systemManagement.permissionAudit.modules.trading'), id: 'menu_trading' },
      { label: t('systemManagement.permissionAudit.modules.mrp'), id: 'menu_mrp' },
      { label: t('systemManagement.permissionAudit.modules.engineering'), id: 'menu_engineering' },
      { label: t('systemManagement.permissionAudit.modules.quality'), id: 'menu_quality' },
      { label: t('systemManagement.permissionAudit.modules.production'), id: 'menu_prod_config' },
      { label: t('systemManagement.permissionAudit.modules.organization'), id: 'menu_org' },
    ]

    const moduleCoverage = modules.map((moduleItem) => ({
      name: moduleItem.label,
      roles: roles.filter((role) => role.permissions.includes(moduleItem.id)).length,
    }))

    return {
      userDist,
      permLoad,
      moduleCoverage,
      totalUsers: allUsers.length,
      totalRoles: roles.length,
      totalPerms: permissions.length,
    }
  }, [roles, permissions, allUsers, t])

  const coreCoverage = useMemo(() => {
    if (!stats || stats.totalRoles === 0) return 0
    const totalModuleRoles = stats.moduleCoverage.reduce((total, item) => total + item.roles, 0)
    const baseCount = stats.totalRoles * stats.moduleCoverage.length
    return Math.round((totalModuleRoles / baseCount) * 100)
  }, [stats])

  const pageError = error ?? rolesError

  if (isForbiddenError(pageError)) {
    return <ForbiddenState />
  }

  if (loading || !stats) {
    return (
      <div className='animate-pulse p-8 text-center text-muted-foreground'>
        {t('systemManagement.permissionAudit.loading')}
      </div>
    )
  }

  return (
    <div className='animate-in fade-in flex flex-col gap-8 duration-700'>
      <div className='flex flex-col gap-1 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:rounded-[32px] sm:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <LayoutDashboard className='size-4' />
          <h3 className='text-base font-black uppercase italic tracking-tighter sm:text-lg'>
            {t('systemManagement.permissionAudit.header.title')}
          </h3>
        </div>
        <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60 sm:text-[9px]'>
          {t('systemManagement.permissionAudit.header.subtitle')}
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-black uppercase italic tracking-tighter text-muted-foreground/60'>
              {t('systemManagement.permissionAudit.cards.totalUsers.title')}
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground/40' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-black font-mono tracking-tighter'>{stats.totalUsers}</div>
            <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {t('systemManagement.permissionAudit.cards.totalUsers.caption')}
            </p>
          </CardContent>
        </Card>

        <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-black uppercase italic tracking-tighter text-muted-foreground/60'>
              {t('systemManagement.permissionAudit.cards.totalRoles.title')}
            </CardTitle>
            <ShieldCheck className='h-4 w-4 text-blue-600/40' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-black font-mono tracking-tighter'>{stats.totalRoles}</div>
            <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {t('systemManagement.permissionAudit.cards.totalRoles.caption')}
            </p>
          </CardContent>
        </Card>

        <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-black uppercase italic tracking-tighter text-muted-foreground/60'>
              {t('systemManagement.permissionAudit.cards.totalPermissions.title')}
            </CardTitle>
            <Key className='h-4 w-4 text-amber-500/40' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-black font-mono tracking-tighter'>{stats.totalPerms}</div>
            <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {t('systemManagement.permissionAudit.cards.totalPermissions.caption')}
            </p>
          </CardContent>
        </Card>

        <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/10'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-black uppercase italic tracking-tighter text-muted-foreground/60'>
              {t('systemManagement.permissionAudit.cards.coreCoverage.title')}
            </CardTitle>
            <Activity className='h-4 w-4 text-green-600/40' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-black font-mono tracking-tighter'>{coreCoverage}%</div>
            <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {t('systemManagement.permissionAudit.cards.coreCoverage.caption')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Suspense
        fallback={
          <div className='grid gap-6 lg:grid-cols-7'>
            <div className='col-span-3 h-[380px] animate-pulse rounded-[24px] border border-dashed border-muted/50 bg-muted/5' />
            <div className='col-span-4 h-[380px] animate-pulse rounded-[24px] border border-dashed border-muted/50 bg-muted/5' />
          </div>
        }
      >
        <PermStatsCharts userDist={stats.userDist} permLoad={stats.permLoad} />
      </Suspense>

      <Card className='overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5'>
        <CardHeader>
          <CardTitle className='text-sm font-black uppercase italic tracking-tighter'>
            {t('systemManagement.permissionAudit.matrix.title')}
          </CardTitle>
          <CardDescription className='text-[9px] font-black uppercase tracking-widest opacity-40'>
            {t('systemManagement.permissionAudit.matrix.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6'>
            {stats.moduleCoverage.map((moduleItem) => (
              <div
                key={moduleItem.name}
                className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted/50 bg-background/50 p-4 transition-all hover:scale-[1.02] hover:bg-background'
              >
                <span className='mb-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {moduleItem.name} {t('systemManagement.permissionAudit.matrix.moduleSuffix')}
                </span>
                <div className='text-2xl font-black font-mono text-slate-800'>{moduleItem.roles}</div>
                <span className='mt-1 text-[8px] font-black uppercase tracking-widest text-slate-400 opacity-40'>
                  {t('systemManagement.permissionAudit.matrix.rolesAccess')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className='rounded-[20px] border border-dashed border-indigo-100/50 bg-indigo-50/30 p-4'>
        <p className='text-center text-[8px] font-black uppercase italic leading-relaxed tracking-tighter text-indigo-600/60 sm:text-left sm:text-[10px]'>
          {t('systemManagement.permissionAudit.note')}
        </p>
      </div>
    </div>
  )
}
