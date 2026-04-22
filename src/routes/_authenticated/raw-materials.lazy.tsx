import { createLazyFileRoute } from '@tanstack/react-router'
import { RawMaterialsModule } from '@/features/raw-materials'

export const Route = createLazyFileRoute('/_authenticated/raw-materials')({
  component: RawMaterialsModule,
})
