import { useCallback, useEffect, useMemo, useState } from 'react'
import { History as HistoryIcon, Search } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ForbiddenState } from '@/components/forbidden-state'
import { getApprovalStatusMeta } from '../approval-i18n'
import {
  ApprovalService,
  type ApprovalRequest,
} from '../services/approval-service'

export function ApprovalHistory() {
  const { t, locale } = useLanguage()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        const data = await ApprovalService.getMyApprovals()
        const historyOnly = data
          .filter((r) => r.status !== 'PENDING' && r.status !== 'APPROVED_L1')
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )

        setRequests(historyOnly)
      } catch (error) {
        setError(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getModuleKey = useCallback(
    (value: string): Parameters<typeof t>[0] =>
      `approval.modules.${value.toLowerCase()}` as Parameters<typeof t>[0],
    []
  )
  const getActionKey = useCallback(
    (value: string): Parameters<typeof t>[0] =>
      `approval.actions.${value.toLowerCase()}` as Parameters<typeof t>[0],
    []
  )
  const filteredHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return requests

    return requests.filter((request) => {
      const moduleLabel = t(getModuleKey(request.module)).toLowerCase()
      const actionLabel = t(getActionKey(request.action)).toLowerCase()
      const requester = request.requester?.username?.toLowerCase() || ''

      return (
        moduleLabel.includes(query) ||
        actionLabel.includes(query) ||
        requester.includes(query) ||
        request.module.toLowerCase().includes(query) ||
        request.action.toLowerCase().includes(query)
      )
    })
  }, [getActionKey, getModuleKey, requests, searchTerm, t])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <HistoryIcon className='size-4' />
          <h3 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('approval.history.heroTitle')}
          </h3>
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
          {t('approval.history.heroSubtitle', {
            count: filteredHistory.length,
          })}
        </p>
      </div>

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='relative max-w-sm flex-1'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('approval.history.searchPlaceholder')}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className='overflow-hidden rounded-[32px] border border-dashed bg-muted/5 shadow-inner'>
        <Table>
          <TableHeader className='h-14 bg-muted/30'>
            <TableRow className='border-b border-dashed hover:bg-transparent'>
              <TableHead className='w-[150px] pl-6 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.labels.module')}
              </TableHead>
              <TableHead className='w-[150px] text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.labels.action')}
              </TableHead>
              <TableHead className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.labels.requester')}
              </TableHead>
              <TableHead className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.labels.result')}
              </TableHead>
              <TableHead className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.labels.pinCode')}
              </TableHead>
              <TableHead className='pr-6 text-right text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('approval.labels.timestamp')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={index} className='h-16'>
                    <TableCell className='pl-6'>
                      <Skeleton className='h-4 w-20' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-24' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-16' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-6 w-20 rounded-full' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-12' />
                    </TableCell>
                    <TableCell className='pr-6'>
                      <Skeleton className='ml-auto h-4 w-24' />
                    </TableCell>
                  </TableRow>
                ))
            ) : filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='h-[300px] text-center'>
                  <div className='flex flex-col items-center justify-center text-muted-foreground/20 italic'>
                    <HistoryIcon className='mb-4 size-12 opacity-10' />
                    <p className='text-[11px] font-black tracking-widest uppercase'>
                      {t('approval.history.empty')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((req) => (
                <TableRow
                  key={req.id}
                  className='group h-16 border-b transition-colors last:border-0 hover:bg-muted/5'
                >
                  <TableCell className='pl-6 text-xs font-black'>
                    {t(getModuleKey(req.module))}
                  </TableCell>
                  <TableCell className='text-xs font-bold text-muted-foreground'>
                    {t(getActionKey(req.action))}
                  </TableCell>
                  <TableCell className='text-xs font-medium'>
                    {req.requester?.username ||
                      t('approval.labels.unknownUser')}
                  </TableCell>
                  <TableCell>
                    <AuditStatusDisplay
                      meta={getApprovalStatusMeta(t, req.status)}
                      badgeClassName='h-5 px-2 py-0'
                    />
                  </TableCell>
                  <TableCell>
                    {req.authCode ? (
                      <code className='rounded border border-primary/10 bg-primary/5 px-2 py-1 font-mono text-[13px] font-black text-primary'>
                        {req.authCode}
                      </code>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className='pr-6 text-right font-mono text-[10px] text-muted-foreground'>
                    {new Date(req.createdAt).toLocaleString(locale)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
