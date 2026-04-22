import { createFileRoute } from '@tanstack/react-router'
import { SequenceMgmt } from '@/features/basic-settings/tabs/sequence-mgmt'

export const Route = createFileRoute('/_authenticated/code-center/linear-barcode/numbering')({
  component: SequenceMgmt,
})
