import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FloatingSurfaceCloseButton } from '@/components/ui/floating-surface-close-button'
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
        <DialogContent
          size='6xl'
          showCloseButton={false}
          data-mobile-floating-surface-layout='column'
          className='flex h-[82dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-[28px] border-border/60 p-0 shadow-2xl'
        >
          <DialogHeader className='shrink-0 border-b border-dashed border-border/60 px-5 py-5 text-start md:px-8 md:py-6'>
            <div className='flex items-start gap-3 sm:gap-4'>
              <div className='flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5 text-primary'>
                <Bell className='size-5' />
              </div>
              <div className='min-w-0 flex-1 space-y-2'>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <DialogTitle className='text-lg leading-6 font-black tracking-tight'>
                    消息中心
                  </DialogTitle>
                  {unreadCount > 0 && (
                    <span className='rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] leading-4 font-black text-primary'>
                      {unreadCount} 条未读
                    </span>
                  )}
                </div>
                <DialogDescription className='text-xs leading-5'>
                  集中查看业务提醒与系统通知，阅读和归档状态会在设备间同步。
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <FloatingSurfaceCloseButton aria-label='关闭消息中心' />
              </DialogClose>
            </div>
          </DialogHeader>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-dashed border-border/60 px-5 py-3 md:px-8'>
            <div
              role='group'
              aria-label='消息分类'
              className='inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 p-1'
            >
              {(['active', 'history'] as const).map((value) => (
                <Button
                  key={value}
                  size='sm'
                  variant={scope === value ? 'default' : 'ghost'}
                  aria-pressed={scope === value}
                  className='h-9 rounded-full px-4 text-xs font-black shadow-none sm:px-5'
                  onClick={() => {
                    setScope(value)
                    setCursors([''])
                  }}
                >
                  {value === 'active' ? (
                    <Inbox className='size-3.5' />
                  ) : (
                    <Archive className='size-3.5' />
                  )}
                  {value === 'active' ? '收件箱' : '历史消息'}
                </Button>
              ))}
            </div>
            <Button
              size='sm'
              variant='outline'
              className='ml-auto h-9 rounded-full border-border/60 px-4 text-xs font-bold shadow-none'
              aria-label='刷新消息'
              onClick={() => void inbox.refetch()}
            >
              <RefreshCw
                className={cn('size-4', inbox.isFetching && 'animate-spin')}
              />
              刷新消息
            </Button>
          </div>
          {!isOnline && (
            <p
              role='status'
              className='mx-5 mt-4 shrink-0 rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs leading-6 text-muted-foreground md:mx-8'
            >
              当前离线，显示的是上次同步的消息。联网后可保存已读与归档操作。
            </p>
          )}
          {inbox.isError && (
            <div
              role='alert'
              className='mx-5 mt-4 shrink-0 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-xs leading-6 text-destructive md:mx-8'
            >
              消息暂时无法同步，
              <button
                className='rounded-full font-bold underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                onClick={() => void inbox.refetch()}
              >
                点击重试
              </button>
            </div>
          )}
          <div
            data-mobile-floating-surface-scroll-body=''
            className='min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-muted/15 px-5 py-5 md:px-8 md:py-6'
          >
            {inbox.isPending ? (
              <div
                role='status'
                className='flex min-h-full flex-col items-center justify-center gap-4 py-10 text-sm text-muted-foreground'
              >
                <Loader2 className='size-7 animate-spin text-primary/60' />
                <p>正在加载消息…</p>
              </div>
            ) : messages.length === 0 && !inbox.isError ? (
              <div
                role='status'
                className='flex min-h-full flex-col items-center justify-center gap-3 py-10 text-center'
              >
                <div className='mb-1 flex size-16 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground/60'>
                  {scope === 'active' ? (
                    <Inbox className='size-7' />
                  ) : (
                    <Archive className='size-7' />
                  )}
                </div>
                <p className='text-sm font-black'>
                  {scope === 'active' ? '暂无消息' : '暂无历史消息'}
                </p>
                <p className='text-xs leading-5 text-muted-foreground'>
                  {scope === 'active'
                    ? '新的业务提醒与系统通知会显示在这里。'
                    : '已归档、已解除或已过期的消息会保留在这里。'}
                </p>
              </div>
            ) : null}
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  'rounded-2xl border border-border/60 bg-card p-4 sm:p-5',
                  !message.isRead &&
                    scope === 'active' &&
                    'border-primary/20 bg-primary/5'
                )}
              >
                <div className='flex items-start justify-between gap-3'>
                  <h3 className='min-w-0 flex-1 text-sm leading-6 font-black break-words'>
                    {message.title}
                  </h3>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-[10px] leading-4 font-bold',
                      !message.isRead && scope === 'active'
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-border/60 bg-muted/30 text-muted-foreground'
                    )}
                  >
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
                <p className='mt-2 text-sm leading-7 break-words whitespace-pre-wrap text-muted-foreground'>
                  {message.content}
                </p>
                <div className='mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-border/60 pt-3'>
                  <time
                    dateTime={message.timestamp}
                    className='mr-auto text-[11px] leading-5 text-muted-foreground'
                  >
                    {new Date(message.timestamp).toLocaleString()}
                  </time>
                  {!message.isRead && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='rounded-full px-3 text-xs font-bold'
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
                      variant='outline'
                      className='rounded-full border-border/60 px-3 text-xs font-bold shadow-none'
                      disabled={!isOnline || stateMutation.isPending}
                      onClick={() =>
                        void updateDisplayedNotificationState(
                          [message.id],
                          'archive'
                        )
                      }
                    >
                      <Archive className='size-3.5' />
                      归档
                    </Button>
                  )}
                  {message.actionUrl &&
                    !message.isResolved &&
                    (!message.expiresAt ||
                      new Date(message.expiresAt) > new Date()) && (
                      <Button
                        size='sm'
                        className='rounded-full px-3 text-xs font-black shadow-none'
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
                        <ChevronRight className='size-3.5' />
                      </Button>
                    )}
                </div>
              </article>
            ))}
          </div>
          <div className='flex shrink-0 flex-col gap-3 border-t border-dashed border-border/60 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-8'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                className='h-9 rounded-full border-border/60 px-4 text-xs font-bold shadow-none'
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
                <CheckCheck className='size-4' />
                本页已读
              </Button>
              {scope === 'active' && (
                <Button
                  size='sm'
                  variant='outline'
                  className='h-9 rounded-full border-border/60 px-4 text-xs font-bold shadow-none'
                  disabled={
                    !isOnline ||
                    stateMutation.isPending ||
                    messages.length === 0
                  }
                  onClick={() =>
                    void updateDisplayedNotificationState(
                      messages.map((message) => message.id),
                      'archive'
                    )
                  }
                >
                  <Archive className='size-3.5' />
                  归档本页
                </Button>
              )}
            </div>
            <div className='flex flex-wrap items-center gap-2 sm:ml-auto'>
              <span className='mr-auto text-xs whitespace-nowrap text-muted-foreground sm:mr-2'>
                共 {inbox.data?.total ?? 0} 条
              </span>
              <Button
                size='sm'
                variant='outline'
                className='h-9 rounded-full border-border/60 px-4 text-xs font-bold shadow-none'
                disabled={cursors.length === 1 || inbox.isFetching}
                onClick={() => setCursors((previous) => previous.slice(0, -1))}
              >
                上一页
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='h-9 rounded-full border-border/60 px-4 text-xs font-bold shadow-none'
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
