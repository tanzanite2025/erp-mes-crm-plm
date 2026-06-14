/**
 * BOM Protocol Sync Alert Component
 *
 * Displays validation warnings and errors from protocol synchronization.
 * Helps users understand when RelationSidecar has drifted from form state.
 */

'use client'

import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type ProtocolSyncValidationResult } from '../hooks/use-bom-protocol-sync'

interface BOMProtocolSyncAlertProps {
  validation: ProtocolSyncValidationResult
  needsSync: boolean
}

export function BOMProtocolSyncAlert({
  validation,
  needsSync,
}: BOMProtocolSyncAlertProps) {
  const { errors, warnings } = validation

  // Don't show anything if everything is valid
  if (errors.length === 0 && warnings.length === 0 && !needsSync) {
    return null
  }

  // Show errors with high priority (compact version)
  if (errors.length > 0) {
    return (
      <Alert variant='destructive' className='mb-2 py-2'>
        <AlertCircle className='h-3 w-3' />
        <AlertTitle className='mb-1 text-xs font-semibold'>
          树结构数据不一致
        </AlertTitle>
        <AlertDescription className='text-xs'>
          检测到 {errors.length} 个问题已自动修复
          {errors.length <= 2 && (
            <span className='ml-1 text-[10px] opacity-80'>
              (
              {errors
                .map((e) => {
                  if (e.type === 'missing-node') return '缺失节点'
                  if (e.type === 'section-mismatch') return '分类不匹配'
                  if (e.type === 'orphaned-node') return '孤立节点'
                  if (e.type === 'invalid-parent') return '无效父节点'
                  return ''
                })
                .join('、')}
              )
            </span>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Show warnings with medium priority (compact version)
  if (warnings.length > 0) {
    return (
      <Alert
        variant='default'
        className='mb-2 border-yellow-500/50 bg-yellow-50/50 py-2 dark:bg-yellow-950/10'
      >
        <AlertTriangle className='h-3 w-3 text-yellow-600 dark:text-yellow-500' />
        <AlertTitle className='mb-1 text-xs font-semibold text-yellow-900 dark:text-yellow-100'>
          树结构已同步
        </AlertTitle>
        <AlertDescription className='text-xs text-yellow-800 dark:text-yellow-200'>
          检测到 {warnings.length} 个变化已自动同步
          {warnings.length <= 2 && (
            <span className='ml-1 text-[10px] opacity-80'>
              (
              {warnings
                .map((w) => {
                  if (w.type === 'stale-id') return 'ID更新'
                  if (w.type === 'section-drift') return '分类修改'
                  if (w.type === 'empty-branch') return '空分支'
                  return ''
                })
                .join('、')}
              )
            </span>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Show info if sync is needed but no specific errors/warnings (compact version)
  if (needsSync) {
    return (
      <Alert
        variant='default'
        className='mb-2 border-blue-500/30 bg-blue-50/50 py-2 dark:bg-blue-950/10'
      >
        <Info className='h-3 w-3 text-blue-600 dark:text-blue-400' />
        <AlertTitle className='mb-0 text-xs font-semibold text-blue-900 dark:text-blue-100'>
          树结构已自动同步
        </AlertTitle>
      </Alert>
    )
  }

  return null
}
