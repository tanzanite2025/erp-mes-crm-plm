import { createFileRoute } from '@tanstack/react-router'

function PermissionTreeSmokePage() {
  return (
    <div className='flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground'>
      权限树自动同步验证路由
    </div>
  )
}

export const Route = createFileRoute(
  '/_authenticated/basic-settings/permission-tree-smoke'
)({
  component: PermissionTreeSmokePage,
})
