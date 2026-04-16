import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import {
  resolveOrSyncPermissionIds,
  XDFC_EFFECTIVE_PERMISSIONS_EVENT,
} from '@/features/authz/services/effective-permission-service'

export function AuthDebugIndicator() {
  const user = useAuthStore((state) => state.user)
  const permissionIds = useMemo(() => user?.permissions ?? [], [user])
  const canShow = import.meta.env.DEV
  const [permissionCount, setPermissionCount] = useState(0)

  useEffect(() => {
    if (!canShow) return

    let active = true

    const load = async () => {
      try {
        const permissions = await resolveOrSyncPermissionIds([])
        if (active) {
          setPermissionCount(permissions.length)
        }
      } catch {
        if (active) {
          setPermissionCount(0)
        }
      }
    }

    void load()

    const handleUpdate = () => {
      void load()
    }

    window.addEventListener(XDFC_EFFECTIVE_PERMISSIONS_EVENT, handleUpdate)

    return () => {
      active = false
      window.removeEventListener(XDFC_EFFECTIVE_PERMISSIONS_EVENT, handleUpdate)
    }
  }, [canShow])

  if (!canShow) return null

  return (
    <Badge
      variant='outline'
      title={`permissions: ${permissionCount}`}
      className='hidden lg:inline-flex h-8 items-center gap-1 rounded-full border-dashed border-emerald-500/40 bg-emerald-500/5 px-2.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300'
    >
      <ShieldCheck className='size-3' />
      <span>P{permissionIds.length}</span>
      <span className='opacity-50'>/</span>
      <span>P{permissionCount}</span>
    </Badge>
  )
}
