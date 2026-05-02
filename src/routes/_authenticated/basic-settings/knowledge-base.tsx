import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeBaseMgmt } from '@/features/basic-settings/knowledge-base/tabs/knowledge-base-mgmt'

export const Route = createFileRoute('/_authenticated/basic-settings/knowledge-base')({
  component: KnowledgeBaseMgmt,
})
