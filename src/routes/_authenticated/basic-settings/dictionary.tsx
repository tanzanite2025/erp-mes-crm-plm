import { createFileRoute } from '@tanstack/react-router'
import { DictionaryMgmt } from '@/features/basic-settings/tabs/dictionary-mgmt'

export const Route = createFileRoute('/_authenticated/basic-settings/dictionary')({
  component: DictionaryMgmt,
})
