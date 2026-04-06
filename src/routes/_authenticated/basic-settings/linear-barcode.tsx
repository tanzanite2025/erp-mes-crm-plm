import { createFileRoute } from '@tanstack/react-router'
import { LinearBarcodeMgmt } from '../../../features/basic-settings/tabs/linear-barcode-mgmt'

export const Route = createFileRoute('/_authenticated/basic-settings/linear-barcode')({
  component: LinearBarcodeMgmt,
})
