import { createLazyFileRoute } from '@tanstack/react-router'
import { MrpModule } from '@/features/mrp/module'

export const Route = createLazyFileRoute('/_authenticated/mrp')({
  component: MrpModule,
})
