import { createLazyFileRoute } from '@tanstack/react-router'
import { PrepregBindingQrPage } from '@/features/raw-materials/prepreg-binding-qr/pages/prepreg-binding-qr-page'

export const Route = createLazyFileRoute('/_authenticated/raw-materials/binding-qr')({
  component: PrepregBindingQrPage,
})
