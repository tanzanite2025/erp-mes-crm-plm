/**
 * BOM Protocol Recovery Dialog
 *
 * Provides recovery options when protocol adapter encounters errors.
 * Replaces white screen crashes with user-friendly recovery UI.
 */

'use client'

import { AlertTriangle, RefreshCw, Filter, X, Wrench } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  type ProtocolRecoveryError,
  type ProtocolRecoveryStrategy,
} from '../hooks/use-bom-protocol-recovery'

interface BOMProtocolRecoveryDialogProps {
  open: boolean
  error: ProtocolRecoveryError | null
  isRecovering: boolean
  onRecover: (strategy: ProtocolRecoveryStrategy) => Promise<void>
  onCancel: () => void
}

export function BOMProtocolRecoveryDialog({
  open,
  error,
  isRecovering,
  onRecover,
  onCancel,
}: BOMProtocolRecoveryDialogProps) {
  if (!error) {
    return null
  }

  const handleRecover = async (strategy: ProtocolRecoveryStrategy) => {
    await onRecover(strategy)
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className='max-w-2xl'>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-yellow-600' />
            树结构数据异常
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-4'>
              <Alert
                variant='default'
                className='border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
              >
                <AlertDescription className='text-yellow-900 dark:text-yellow-100'>
                  <div className='space-y-2'>
                    <p className='font-medium'>检测到树结构数据问题</p>
                    <p className='text-sm'>{error.message}</p>
                    {error.nodeId && (
                      <p className='rounded bg-yellow-100 p-1 font-mono text-xs dark:bg-yellow-900/30'>
                        节点ID: {error.nodeId}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className='space-y-2 text-sm'>
                <p className='font-medium'>可能原因：</p>
                <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                  <li>物料已被删除，但树结构仍引用该物料</li>
                  <li>分类代码已更改，但树结构未同步</li>
                  <li>数据导入或迁移过程中出现不一致</li>
                </ul>
              </div>

              <div className='space-y-3'>
                <p className='text-sm font-medium'>请选择恢复方式：</p>

                <div className='grid gap-3'>
                  {/* Rebuild Strategy */}
                  <Button
                    variant='outline'
                    className='h-auto items-start justify-start p-4 text-left'
                    onClick={() => handleRecover('rebuild')}
                    disabled={isRecovering}
                  >
                    <div className='flex w-full gap-3'>
                      <RefreshCw className='mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600' />
                      <div className='flex-1 space-y-1'>
                        <div className='font-medium'>重建树结构（推荐）</div>
                        <div className='text-xs text-muted-foreground'>
                          根据当前表格数据完全重建树结构。这会丢失自定义的树结构排序，但能确保数据一致性。
                        </div>
                      </div>
                    </div>
                  </Button>

                  {/* Filter Strategy */}
                  <Button
                    variant='outline'
                    className='h-auto items-start justify-start p-4 text-left'
                    onClick={() => handleRecover('filter')}
                    disabled={isRecovering}
                  >
                    <div className='flex w-full gap-3'>
                      <Filter className='mt-0.5 h-5 w-5 flex-shrink-0 text-green-600' />
                      <div className='flex-1 space-y-1'>
                        <div className='font-medium'>过滤无效引用</div>
                        <div className='text-xs text-muted-foreground'>
                          保留现有树结构，仅移除无效的节点引用。适合只有少量数据问题的情况。
                        </div>
                      </div>
                    </div>
                  </Button>

                  {/* Ignore Strategy */}
                  <Button
                    variant='outline'
                    className='h-auto items-start justify-start p-4 text-left'
                    onClick={() => handleRecover('ignore')}
                    disabled={isRecovering}
                  >
                    <div className='flex w-full gap-3'>
                      <X className='mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600' />
                      <div className='flex-1 space-y-1'>
                        <div className='font-medium'>使用默认结构</div>
                        <div className='text-xs text-muted-foreground'>
                          忽略现有树结构，使用默认的分类结构显示所有物料。适合树结构完全损坏的情况。
                        </div>
                      </div>
                    </div>
                  </Button>

                  {/* Manual Strategy */}
                  <Button
                    variant='outline'
                    className='h-auto items-start justify-start p-4 text-left'
                    onClick={() => handleRecover('manual')}
                    disabled={isRecovering}
                  >
                    <div className='flex w-full gap-3'>
                      <Wrench className='mt-0.5 h-5 w-5 flex-shrink-0 text-gray-600' />
                      <div className='flex-1 space-y-1'>
                        <div className='font-medium'>手动修复</div>
                        <div className='text-xs text-muted-foreground'>
                          关闭此对话框，手动检查并修复数据问题。适合需要精确控制的情况。
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {error.context && (
                <Alert>
                  <AlertDescription className='text-xs'>
                    <details>
                      <summary className='mb-2 cursor-pointer font-medium'>
                        技术详情（点击展开）
                      </summary>
                      <pre className='overflow-auto rounded bg-muted p-2 text-xs'>
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant='ghost' onClick={onCancel} disabled={isRecovering}>
            取消
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
