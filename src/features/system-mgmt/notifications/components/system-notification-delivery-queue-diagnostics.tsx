import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface SystemNotificationDeliveryDiagnostics {
  pendingCount: number
  failedCount: number
  oldestPendingAt: string | null
  recentFailures: {
    id: string
    notificationId: string | null
    attempts: number
    lastError: string
    failedAt: string | null
  }[]
}

export function SystemNotificationDeliveryQueueDiagnostics() {
  const user = useAuthStore((state) => state.user)
  const canManage = Boolean(user?.permissions?.includes('perm_manage'))
  const queryClient = useQueryClient()
  const queryKey = ['system-notification-delivery-queue', user?.id]
  const diagnostics = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<SystemNotificationDeliveryDiagnostics>(
        '/message-center/delivery-queue'
      ),
    enabled: canManage,
    refetchInterval: 30_000,
    retry: false,
    gcTime: 0,
  })
  const retry = useMutation({
    mutationFn: (taskID: string) =>
      apiFetch<void>(`/message-center/delivery-queue/${taskID}/retry`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('原投递任务已安排重试')
      void queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({
        queryKey: ['routing-execution-logs'],
      })
    },
    onError: () => toast.error('未能安排重试，请刷新投递状态后再试'),
  })
  if (!canManage) return null
  return (
    <section className='mb-3 rounded-lg border p-4 text-sm'>
      <div className='flex flex-wrap items-center gap-3'>
        <h3 className='font-semibold'>通知投递状态</h3>
        {diagnostics.data && (
          <>
            <span>等待发布 {diagnostics.data.pendingCount}</span>
            <span
              className={
                diagnostics.data.failedCount
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }
            >
              需人工恢复 {diagnostics.data.failedCount}
            </span>
            {diagnostics.data.oldestPendingAt && (
              <span className='text-xs text-muted-foreground'>
                最早积压：
                {new Date(diagnostics.data.oldestPendingAt).toLocaleString()}
              </span>
            )}
          </>
        )}
        <Button
          size='sm'
          variant='ghost'
          className='ml-auto'
          onClick={() => void diagnostics.refetch()}
        >
          刷新
        </Button>
      </div>
      <p className='mt-1 text-xs text-muted-foreground'>
        消息入箱后即可查询。此处记录实时提醒的发布情况，阅读状态由员工操作保存。
      </p>
      {diagnostics.isError && (
        <p role='alert' className='mt-2 text-destructive'>
          无法获取投递状态，请重试。
        </p>
      )}
      {diagnostics.data?.recentFailures.map((task) => (
        <div
          key={task.id}
          className='mt-3 flex items-start gap-3 border-t pt-3'
        >
          <div className='min-w-0 flex-1'>
            <p className='text-xs text-muted-foreground'>
              已尝试 {task.attempts} 次 ·{' '}
              {task.failedAt ? '自动重试已暂停' : '等待自动重试'}
            </p>
            <p className='mt-1 text-xs break-words'>{task.lastError}</p>
          </div>
          <Button
            size='sm'
            variant='outline'
            disabled={retry.isPending}
            onClick={() => retry.mutate(task.id)}
          >
            重试原任务
          </Button>
        </div>
      ))}
    </section>
  )
}
