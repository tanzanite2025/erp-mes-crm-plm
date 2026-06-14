interface PermissionPassthroughProps {
  permission: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function NonBlockingPermissionBoundary({
  permission: _permission,
  children,
  fallback: _fallback = null,
}: PermissionPassthroughProps) {
  return <>{children}</>
}
