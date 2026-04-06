import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import {
  resolveOrSyncPermissionIds,
  XDFC_EFFECTIVE_PERMISSIONS_EVENT,
} from '@/features/authz/services/effective-permission-service'
import { getAuthSessionCompatibleRoleIds } from '@/features/authz/utils/auth-session'

export function AuthDebugIndicator() {
  const user = useAuthStore((state) => state.user)
  const roleIds = useMemo(() => getAuthSessionCompatibleRoleIds(user), [user])
  const canShow = import.meta.env.DEV
  const [permissionCount, setPermissionCount] = useState(0)

  useEffect(() => {
    if (!canShow) {
      setPermissionCount(0)
      return
    }

    let active = true

    const load = async () => {
      try {
        const permissions = await resolveOrSyncPermissionIds(roleIds)
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
    window.addEventListener('xdfc_system_roles_updated', handleUpdate)

    return () => {
      active = false
      window.removeEventListener(XDFC_EFFECTIVE_PERMISSIONS_EVENT, handleUpdate)
      window.removeEventListener('xdfc_system_roles_updated', handleUpdate)
    }
  }, [canShow, roleIds])

  if (!canShow) return null

  const roleLabel = roleIds.length > 0 ? roleIds.join(', ') : 'none'

  return (
    <Badge
      variant='outline'
      title={`roles: ${roleLabel}\npermissions: ${permissionCount}`}
      className='hidden lg:inline-flex h-8 items-center gap-1 rounded-full border-dashed border-emerald-500/40 bg-emerald-500/5 px-2.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300'
    >
      <ShieldCheck className='size-3' />
      <span>R{roleIds.length}</span>
      <span className='opacity-50'>/</span>
      <span>P{permissionCount}</span>
    </Badge>
  )
}
