import { useEffect, useState } from 'react'
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const CONFIRM_KEYWORD = 'DELETE'

interface BusinessEventSourceDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceName: string
  sourceCode: string
  /** 引用此事件源的通知规则数量 */
  referencingRuleCount: number
  /** 引用此事件源的通知规则名称列表（最多展示几条） */
  referencingRuleNames: string[]
  isDeleting?: boolean
  onConfirm: () => void | Promise<void>
}

/**
 * 业务事件源删除二次确认弹窗。
 * - 若仍被通知规则引用 → 完全锁死，无法删除，提示先解除引用
 * - 若未被引用 → 必须输入 DELETE 才允许执行删除
 */
export function BusinessEventSourceDeleteDialog({
  open,
  onOpenChange,
  sourceName,
  sourceCode,
  referencingRuleCount,
  referencingRuleNames,
  isDeleting = false,
  onConfirm,
}: BusinessEventSourceDeleteDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')

  // 每次打开都清空输入
  useEffect(() => {
    if (open) {
      setConfirmInput('')
    }
  }, [open])

  const isReferenced = referencingRuleCount > 0
  const inputMatches = confirmInput.trim().toUpperCase() === CONFIRM_KEYWORD
  const canDelete = !isReferenced && inputMatches && !isDeleting

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='max-w-lg rounded-3xl'>
        <AlertDialogHeader className='gap-3'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-2xl',
                isReferenced
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-rose-100 text-rose-600'
              )}
            >
              {isReferenced ? (
                <Lock className='size-5' />
              ) : (
                <AlertTriangle className='size-5' />
              )}
            </div>
            <AlertDialogTitle className='text-base font-black tracking-tight uppercase italic'>
              {isReferenced ? '无法删除业务事件源' : '危险操作：删除业务事件源'}
            </AlertDialogTitle>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm font-bold'>{sourceName}</span>
            <Badge
              variant='outline'
              className='rounded-full font-mono text-[10px] font-semibold text-muted-foreground'
            >
              {sourceCode}
            </Badge>
          </div>
          <AlertDialogDescription className='text-xs leading-6 font-bold text-muted-foreground'>
            {isReferenced ? (
              <>
                当前事件源被{' '}
                <span className='font-black text-amber-700'>
                  {referencingRuleCount}
                </span>{' '}
                条通知规则引用，必须先解除引用才能删除。
              </>
            ) : (
              <>
                删除后该事件源的配置将无法恢复，包括所有动作、状态字典、字段和动态解析器。
                请输入{' '}
                <span className='inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-black text-rose-600'>
                  DELETE
                </span>{' '}
                确认删除。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isReferenced ? (
          <div className='rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3'>
            <div className='flex items-center gap-2 text-[11px] font-black tracking-widest text-amber-700 uppercase'>
              <ShieldAlert className='size-3.5' />
              规则引用清单
            </div>
            <ul className='mt-2 flex flex-col gap-1 text-xs font-bold text-amber-900'>
              {referencingRuleNames.slice(0, 6).map((name, index) => (
                <li
                  key={`${name}-${index}`}
                  className='flex items-center gap-2'
                >
                  <span className='size-1 rounded-full bg-amber-500' />
                  {name}
                </li>
              ))}
              {referencingRuleNames.length > 6 && (
                <li className='text-[11px] font-bold text-amber-700/80'>
                  以及其他 {referencingRuleNames.length - 6} 条规则...
                </li>
              )}
            </ul>
            <p className='mt-3 text-[11px] font-bold text-amber-700/80'>
              请前往「通知规则」页面将这些规则的事件源切换或删除后再回来执行删除。
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              输入 DELETE 以确认
            </label>
            <Input
              value={confirmInput}
              onChange={(event) => setConfirmInput(event.target.value)}
              placeholder='DELETE'
              className='h-11 rounded-2xl font-mono text-sm font-black tracking-widest'
              autoComplete='off'
              autoFocus
            />
            <p className='text-[10px] font-bold text-muted-foreground'>
              区分大小写。输入正确后「确认删除」按钮才会激活。
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className='rounded-full text-xs font-black'>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            onClick={(event) => {
              if (!canDelete) {
                event.preventDefault()
                return
              }
              void onConfirm()
            }}
            className={cn(
              'rounded-full text-xs font-black tracking-widest uppercase',
              isReferenced
                ? 'bg-muted text-muted-foreground'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            )}
          >
            {isDeleting ? '删除中...' : isReferenced ? '已锁定' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
