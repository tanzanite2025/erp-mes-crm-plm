import { useCallback, useEffect, useState } from 'react'
import { Edit, Plus, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { ApprovalService, type ApprovalConfig, type ApprovalUserOption } from '../services/approval-service'

const MODULE_OPTIONS = ['Inventory', 'Trading', 'Production'] as const
const ACTION_OPTIONS = ['VOID', 'DELETE', 'SCRAP'] as const

export function ApprovalConfigs() {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [configs, setConfigs] = useState<ApprovalConfig[]>([])
  const [users, setUsers] = useState<ApprovalUserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newConfig, setNewConfig] = useState({
    module: 'Inventory',
    action: 'VOID',
    approver1Id: '',
    approver2Id: '',
    isActive: true,
  })

  const handleOpenAdd = () => {
    if (!allowsAction('action_approval_config_manage')) return
    setIsAddOpen(true)
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [configsData, usersData] = await Promise.all([
        ApprovalService.getConfigs(),
        ApprovalService.fetchUserOptions(),
      ])
      setConfigs(configsData)
      setUsers(usersData)
    } catch (error) {
      setError(error)
      toast.error(t('approval.configs.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const handleSave = async () => {
    if (!allowsAction('action_approval_config_manage')) return

    try {
      if (!newConfig.approver1Id) throw new Error(t('approval.configs.approverRequired'))

      await ApprovalService.saveConfig({
        ...newConfig,
        approver2Id: newConfig.approver2Id || undefined,
      })

      toast.success(t('approval.configs.saveSuccess'))
      setIsAddOpen(false)
      fetchData()
      setNewConfig({
        module: 'Inventory',
        action: 'VOID',
        approver1Id: '',
        approver2Id: '',
        isActive: true,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('approval.configs.loadFailed'))
    }
  }

  useEffect(() => {
    let cancelled = false

    void Promise.resolve()
      .then(async () => {
        const [configsData, usersData] = await Promise.all([
          ApprovalService.getConfigs(),
          ApprovalService.fetchUserOptions(),
        ])

        if (cancelled) {
          return
        }

        setError(null)
        setConfigs(configsData)
        setUsers(usersData)
        setLoading(false)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setError(error)
        toast.error(t('approval.configs.loadFailed'))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [t])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const getModuleKey = (value: string): Parameters<typeof t>[0] => `approval.modules.${value.toLowerCase()}` as Parameters<typeof t>[0]
  const getActionKey = (value: string): Parameters<typeof t>[0] => `approval.actions.${value.toLowerCase()}` as Parameters<typeof t>[0]

  if (loading) return <div>{t('approval.configs.loading')}</div>

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Shield className='size-4' />
          <h3 className='text-lg font-black uppercase italic tracking-tighter'>
            {t('approval.configs.heroTitle')}
          </h3>
        </div>
        <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60'>
          {t('approval.configs.heroSubtitle')}
        </p>
      </div>

      <div className='flex items-center justify-end gap-4 px-1'>
        <Button
          className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95'
          onClick={handleOpenAdd}
        >
          <Plus className='mr-2 size-4' />
          {t('approval.configs.addRule')}
        </Button>
      </div>

      <div className='overflow-hidden rounded-[32px] border border-dashed bg-muted/5 shadow-inner'>
        <Table>
          <TableHeader className='h-14 bg-muted/30'>
            <TableRow className='border-b border-dashed hover:bg-transparent'>
              <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.labels.module')}
              </TableHead>
              <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.labels.action')}
              </TableHead>
              <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.labels.l1Approver')}
              </TableHead>
              <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.labels.l2Approver')}
              </TableHead>
              <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.labels.status')}
              </TableHead>
              <TableHead className='px-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('approval.labels.operations')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='py-20 text-center'>
                  <div className='flex flex-col items-center justify-center italic text-muted-foreground/20'>
                    <Shield className='mb-4 size-12 opacity-10' />
                    <p className='text-[11px] font-black uppercase tracking-widest'>
                      {t('approval.configs.empty')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow
                  key={config.id}
                  className='h-16 border-b transition-colors last:border-0 hover:bg-muted/5'
                >
                  <TableCell className='px-6 text-xs font-black'>
                    {t(getModuleKey(config.module))}
                  </TableCell>
                  <TableCell className='px-6'>
                    <Badge
                      variant='outline'
                      className='h-5 border-primary/20 bg-primary/5 px-2 py-0 text-[10px] font-black uppercase tracking-widest text-primary'
                    >
                      {t(getActionKey(config.action))}
                    </Badge>
                  </TableCell>
                  <TableCell className='px-6 text-xs font-bold'>
                    {config.approver1?.username || t('approval.configs.dialog.unassigned')}
                  </TableCell>
                  <TableCell className='px-6 text-xs font-bold text-muted-foreground'>
                    {config.approver2?.username || '-'}
                  </TableCell>
                  <TableCell className='px-6'>
                    <Badge
                      className={cn(
                        'h-5 px-2 py-0 text-[9px] font-black',
                        config.isActive
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                          : 'border-transparent bg-muted text-muted-foreground'
                      )}
                    >
                      {config.isActive ? t('approval.status.active') : t('approval.status.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className='px-6 text-right'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full'>
                      <Edit className='h-3.5 w-3.5' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-full text-destructive hover:bg-destructive/10'
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className='rounded-[28px] border border-dashed bg-linear-to-r from-muted/50 to-muted/10 p-6 shadow-inner'>
        <div className='mb-3 flex items-center gap-2'>
          <div className='size-2 rounded-full bg-primary animate-pulse' />
          <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('approval.configs.guidelinesTitle')}
          </span>
        </div>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          <div className='space-y-1'>
            <p className='text-[11px] font-black uppercase text-foreground/80'>
              {t('approval.configs.guidelines.separationTitle')}
            </p>
            <p className='text-[10px] leading-relaxed text-muted-foreground'>
              {t('approval.configs.guidelines.separationBody')}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-[11px] font-black uppercase text-foreground/80'>
              {t('approval.configs.guidelines.wildcardTitle')}
            </p>
            <p className='text-[10px] leading-relaxed text-muted-foreground'>
              {t('approval.configs.guidelines.wildcardBody')}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-[11px] font-black uppercase text-foreground/80'>
              {t('approval.configs.guidelines.effectiveTitle')}
            </p>
            <p className='text-[10px] leading-relaxed text-muted-foreground'>
              {t('approval.configs.guidelines.effectiveBody')}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className='rounded-[32px] border-none shadow-2xl'>
          <DialogHeader>
            <DialogTitle className='text-sm font-black uppercase tracking-tight'>
              {t('approval.configs.dialog.title')}
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-6 py-6'>
            <div className='grid gap-2'>
              <label className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('approval.configs.dialog.targetModule')}
              </label>
              <select
                className='flex h-12 w-full rounded-2xl border-none bg-muted/50 px-4 py-2 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20'
                value={newConfig.module}
                onChange={(e) => setNewConfig({ ...newConfig, module: e.target.value })}
              >
                {MODULE_OPTIONS.map((module) => (
                  <option key={module} value={module}>
                    {t(getModuleKey(module))}
                  </option>
                ))}
              </select>
            </div>

            <div className='grid gap-2'>
              <label className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('approval.configs.dialog.sensitiveAction')}
              </label>
              <select
                className='flex h-12 w-full rounded-2xl border-none bg-muted/50 px-4 py-2 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20'
                value={newConfig.action}
                onChange={(e) => setNewConfig({ ...newConfig, action: e.target.value })}
              >
                {ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {t(getActionKey(action))}
                  </option>
                ))}
              </select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <label className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                  {t('approval.configs.dialog.l1Approver')}
                </label>
                <select
                  className='flex h-12 w-full rounded-2xl border-none bg-muted/50 px-4 py-2 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20'
                  value={newConfig.approver1Id}
                  onChange={(e) => setNewConfig({ ...newConfig, approver1Id: e.target.value })}
                >
                  <option value=''>{t('approval.configs.dialog.unassigned')}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className='grid gap-2'>
                <label className='pl-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                  {t('approval.configs.dialog.l2Approver')}
                </label>
                <select
                  className='flex h-12 w-full rounded-2xl border-none bg-muted/50 px-4 py-2 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20'
                  value={newConfig.approver2Id}
                  onChange={(e) => setNewConfig({ ...newConfig, approver2Id: e.target.value })}
                >
                  <option value=''>{t('approval.configs.dialog.optionalBypass')}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className='-mx-6 -mb-6 rounded-b-[32px] bg-muted/30 p-4'>
            <Button variant='ghost' className='rounded-full text-xs font-bold' onClick={() => setIsAddOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button className='rounded-full text-xs font-black shadow-lg shadow-primary/20' onClick={handleSave}>
              {t('approval.configs.dialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
