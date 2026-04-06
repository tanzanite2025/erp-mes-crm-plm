import { createFileRoute } from '@tanstack/react-router'
import { DMNumberMgmt } from '../../../features/basic-settings/tabs/dm-numbering-mgmt'

export const Route = createFileRoute('/_authenticated/basic-settings/dm-numbering')({
  component: DMNumberMgmt,
})
