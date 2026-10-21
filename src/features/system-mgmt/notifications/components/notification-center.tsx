import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SystemNotificationInboxScope } from '../system-notification-inbox-service'
import {
  useSystemNotificationInbox,
  useSystemNotificationInboxStateMutation,
  useSystemNotificationInboxConnectionStatus,
} from '../use-system-notification-inbox'

export function NotificationCenter({
  placement = 'header',
}: {
  placement?: 'header' | 'dock'
}) {
  const user = useAuthStore((state) => state.user)
  return (
    <CurrentAccountSystemNotificationCenter
      key={user?.id + ':' + user?.permissions?.join(',')}
      placement={placement}
    />
  )
}

function CurrentAccountSystemNotificationCenter({
  placement,
}: {
  placement: 'header' | 'dock'
}) {
  const isOnline = useSystemNotificationInboxConnectionStatus()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<SystemNotificationInboxScope>('active')
  const [cursors, setCursors] = useState([''])
  const inbox = useSystemNotificationInbox(scope, cursors[cursors.length - 1])
  const stateMutation = useSystemNotificationInboxStateMutation()
  const navigate = useNavigate()
  const messages = inbox.data?.items ?? []
  const unreadCount = inbox.data?.unreadCount ?? 0

  async function updateDisplayedNotificationState(
    ids: string[],
    action: 'read' | 'archive'
  ) {
    try {
      await stateMutation.mutateAsync({ ids, action })
      return true
    } catch {
      toast.error('操作未保存，请联网后重试')
      return false
    }
  }

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        aria-label={
          unreadCount ? `消息中心，${unreadCount} 条未读` : '消息中心'
        }
        className={cn(
          'relative rounded-full',
          placement === 'dock'
            ? 'size-11 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20'
            : 'h-10 w-10'
        )}
        onClick={() => setOpen(true)}
      >
        <Bell className='size-5' />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-white'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='flex max-h-[85dvh] flex-col sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='text-base'>
              消息中心{' '}
              {unreadCount > 0 && (
                <span className='text-sm font-normal text-muted-foreground'>
                  · {unreadCount} 条未读
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              阅读与归档会同步到当前账号的其他设备。业务办理结果以对应单据为准。
            </DialogDescription>
          </DialogHeader>
          <div className='flex items-center gap-2 border-b pb-3'>
            {(['active', 'history'] as const).map((value) => (
              <Button
                key={value}
                size='sm'
                variant={scope === value ? 'secondary' : 'ghost'}
                onClick={() => {
                  setScope(value)
                  setCursors([''])
                }}
              >
                {value === 'active' ? '收件箱' : '历史消息'}
              </Button>
            ))}
            <Button
              size='icon'
              variant='ghost'
              className='ml-auto size-8'
              aria-label='刷新消息'
              onClick={() => void inbox.refetch()}
            >
              <RefreshCw
                className={cn('size-4', inbox.isFetching && 'animate-spin')}
              />
            </Button>
          </div>
          {!isOnline && (
            <p
              role='status'
              className='rounded-md border p-3 text-sm text-muted-foreground'
            >
              当前离线，显示的是上次同步的消息。联网后可保存已读与归档操作。
            </p>
          )}
          {inbox.isError && (
            <div
              role='alert'
              className='rounded-md border border-destructive/30 p-3 text-sm text-destructive'
            >
              消息暂时无法同步，
              <button
                className='underline'
                onClick={() => void inbox.refetch()}
              >
                点击重试
              </button>
            </div>
          )}
          <div className='min-h-24 flex-1 space-y-3 overflow-y-auto'>
            {inbox.isPending ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                正在加载消息…
              </p>
            ) : messages.length === 0 && !inbox.isError ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                暂无消息
              </p>
            ) : null}
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  'rounded-lg border p-4',
                  !message.isRead &&
                    scope === 'active' &&
                    'border-primary/30 bg-primary/5'
                )}
              >
                <div className='flex items-start justify-between gap-3'>
                  <h3 className='text-sm leading-5 font-semibold'>
                    {message.title}
                  </h3>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {message.isResolved
                      ? '已解除'
                      : message.isArchived
                        ? '已归档'
                        : message.expiresAt &&
                            new Date(message.expiresAt) <= new Date()
                          ? '已过期'
                          : message.isRead
                            ? '已读'
                            : '未读'}
                  </span>
                </div>
                <p className='mt-2 text-sm leading-6 whitespace-pre-wrap text-muted-foreground'>
                  {message.content}
                </p>
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                  <time className='mr-auto text-xs text-muted-foreground'>
                    {new Date(message.timestamp).toLocaleString()}
                  </time>
                  {!message.isRead && (
                    <Button
                      size='sm'
                      variant='ghost'
                      disabled={!isOnline || stateMutation.isPending}
                      onClick={() =>
                        void updateDisplayedNotificationState(
                          [message.id],
                          'read'
                        )
                      }
                    >
                      标记已读
                    </Button>
                  )}
                  {!message.isArchived && (
                    <Button
                      size='sm'
                      variant='ghost'
                      disabled={!isOnline || stateMutation.isPending}
                      onClick={() =>
                        void updateDisplayedNotificationState(
                          [message.id],
                          'archive'
                        )
                      }
                    >
                      <Archive className='mr-1 size-3.5' />
                      归档
                    </Button>
                  )}
                  {message.actionUrl &&
                    !message.isResolved &&
                    (!message.expiresAt ||
                      new Date(message.expiresAt) > new Date()) && (
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={!isOnline || stateMutation.isPending}
                        onClick={async () => {
                          if (
                            !message.isRead &&
                            !(await updateDisplayedNotificationState(
                              [message.id],
                              'read'
                            ))
                          )
                            return
                          setOpen(false)
                          void navigate({ to: message.actionUrl as never })
                        }}
                      >
                        查看业务
                        <ChevronRight className='ml-1 size-3.5' />
                      </Button>
                    )}
                </div>
              </article>
            ))}
          </div>
          <div className='flex flex-wrap items-center gap-2 border-t pt-3'>
            <Button
              size='sm'
              variant='ghost'
              disabled={
                !isOnline ||
                stateMutation.isPending ||
                !messages.some((message) => !message.isRead)
              }
              onClick={() =>
                void updateDisplayedNotificationState(
                  messages
                    .filter((message) => !message.isRead)
                    .map((message) => message.id),
                  'read'
                )
              }
            >
              <CheckCheck className='mr-1 size-4' />
              本页已读
            </Button>
            {scope === 'active' && (
              <Button
                size='sm'
                variant='ghost'
                disabled={
                  !isOnline || stateMutation.isPending || messages.length === 0
                }
                onClick={() =>
                  void updateDisplayedNotificationState(
                    messages.map((message) => message.id),
                    'archive'
                  )
                }
              >
                归档本页
              </Button>
            )}
            <span className='ml-auto text-xs text-muted-foreground'>
              共 {inbox.data?.total ?? 0} 条
            </span>
            <Button
              size='sm'
              variant='outline'
              disabled={cursors.length === 1 || inbox.isFetching}
              onClick={() => setCursors((previous) => previous.slice(0, -1))}
            >
              上一页
            </Button>
            <Button
              size='sm'
              variant='outline'
              disabled={!inbox.data?.nextCursor || inbox.isFetching}
              onClick={() => {
                if (inbox.data?.nextCursor)
                  setCursors((previous) => [
                    ...previous,
                    inbox.data.nextCursor!,
                  ])
              }}
            >
              下一页
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
