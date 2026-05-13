/**
 * BOM Version Conflict Dialog
 * 
 * Displays version conflict errors and provides resolution options.
 */

'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { type OptimisticLockError } from '../hooks/use-bom-optimistic-lock'

interface BOMVersionConflictDialogProps {
  open: boolean
  error: OptimisticLockError | null
  onRefresh: () => void
  onCancel: () => void
}

export function BOMVersionConflictDialog({
  open,
  error,
  onRefresh,
  onCancel,
}: BOMVersionConflictDialogProps) {
  if (!error) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            保存失败：版本冲突
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">检测到并发编辑冲突</p>
                    <div className="text-sm space-y-1">
                      <p>• 您的版本：V{error.expectedVersion}</p>
                      <p>• 服务器版本：V{error.actualVersion}</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="text-sm space-y-2">
                <p className="font-medium">可能原因：</p>
                <p className="text-muted-foreground">
                  其他用户在您编辑期间修改了此BOM。为了防止数据丢失，系统拒绝了您的保存请求。
                </p>
              </div>

              {error.conflictingFields && error.conflictingFields.length > 0 && (
                <div className="text-sm space-y-2">
                  <p className="font-medium">冲突字段：</p>
                  <div className="bg-muted p-2 rounded text-xs font-mono">
                    {error.conflictingFields.join(', ')}
                  </div>
                </div>
              )}

              <div className="text-sm space-y-2">
                <p className="font-medium">建议操作：</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>点击"刷新数据"获取最新版本</li>
                  <li>重新应用您的修改</li>
                  <li>再次保存</li>
                </ol>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  💡 提示：您可以先将当前修改复制到其他地方，刷新后再粘贴回来。
                </AlertDescription>
              </Alert>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            刷新数据
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
