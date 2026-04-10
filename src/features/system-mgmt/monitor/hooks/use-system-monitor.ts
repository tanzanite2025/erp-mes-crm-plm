import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import { SYSTEM_ANOMALY_KEYS } from '../types'

export function useSystemMonitor() {
  const addMessage = useNotificationStore((s) => s.addMessage)
  const archiveMessage = useNotificationStore((s) => s.archiveMessage)
  const messages = useNotificationStore((s) => s.messages)

  const { data } = useQuery({
    queryKey: ['system-health-integrity'],
    queryFn: () =>
      apiFetch<{ integrity?: { anomalies: string[]; isHealing: boolean; details: string[] } }>('/health'),
    refetchInterval: 300000,
    staleTime: 60000,
    retry: 2,
  })

  useEffect(() => {
    if (!data?.integrity?.anomalies) return

    const { anomalies, details } = data.integrity
    const fsAnomalyKey = SYSTEM_ANOMALY_KEYS.FILESYSTEM_PERMISSION_DENIED
    const hasFsAnomaly = anomalies.includes('FS_PERMISSION_DENIED')
    const existingFsMessage = messages.find(
      (m) => (m.metadata as any)?.uniqueKey === fsAnomalyKey && !m.isArchived
    )

    if (hasFsAnomaly) {
      addMessage({
        title: '文件存储权限告警',
        content: '检测到核心存储目录 (uploads/backups) 无法写入，这会导致上传与备份任务失败。',
        type: 'SYSTEM_NOTICE',
        priority: 'critical',
        metadata: {
          uniqueKey: fsAnomalyKey,
          details: details.filter((d) => d.includes('Directory')),
          errorCode: 'FS_DENIED',
        },
      })
      return
    }

    if (existingFsMessage) {
      archiveMessage(existingFsMessage.id)
    }
  }, [data, addMessage, archiveMessage, messages])
}
