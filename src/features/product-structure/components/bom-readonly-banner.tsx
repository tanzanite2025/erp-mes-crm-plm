/**
 * BOM Read-Only Banner Component
 *
 * Displays a prominent banner when BOM is in locked/read-only state.
 * Provides clear visual feedback to prevent user confusion.
 */
import { Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BOMReadOnlyBannerProps {
  isLocked: boolean
  version?: number
}

export function BOMReadOnlyBanner({
  isLocked,
  version,
}: BOMReadOnlyBannerProps) {
  if (!isLocked) {
    return null
  }

  return (
    <Alert className='border-amber-200 bg-amber-50/50'>
      <Lock className='size-4 text-amber-600' />
      <AlertDescription className='flex items-center justify-between'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-[11px] font-black tracking-widest text-amber-900 uppercase'>
            只读模式
          </span>
          <span className='text-[10px] text-amber-700'>
            此 BOM 已锁定，无法修改
            {version && ` (v${version})`}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  )
}
