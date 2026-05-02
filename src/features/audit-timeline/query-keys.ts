import type { AuditModuleValue } from './data/audit-modules'

export const auditTimelineQueryKeys = {
  all: ['audit-timeline'] as const,
  detail: (module: AuditModuleValue, targetId?: string) =>
    [...auditTimelineQueryKeys.all, module, targetId ?? '__module__'] as const,
}
