import { createLazyFileRoute } from '@tanstack/react-router'
import PackagingAssembly from '@/features/warehouse/tabs/packaging-assembly'

export const Route = createLazyFileRoute(
  '/_authenticated/warehouse-config/packaging-assembly'
)({
  component: PackagingAssembly,
})
