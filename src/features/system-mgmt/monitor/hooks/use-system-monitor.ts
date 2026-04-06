import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store';
import { SYSTEM_ANOMALY_KEYS } from '../types';

/**
 * 极致监控 Hook (UDS 1.0 信号强化型)
 * 支持详细指纹异常 (Details) 与实时状态推播产生的即时刷新
 */
export function useSystemMonitor() {
  const addMessage = useNotificationStore(s => s.addMessage);
  const archiveMessage = useNotificationStore(s => s.archiveMessage);
  const messages = useNotificationStore(s => s.messages);

  const { data } = useQuery({
    queryKey: ['system-health-integrity'],
    queryFn: () => apiFetch<{ integrity?: { anomalies: string[]; isHealing: boolean; details: string[] } }>('/health'),
    refetchInterval: 300000, // 轮询周期放宽至 5 分钟 (仅作为 WS 信号丢失的兜底)
    staleTime: 60000,
    retry: 2,
  });

  useEffect(() => {
    if (!data?.integrity?.anomalies) return;

    const { anomalies, isHealing, details } = data.integrity;

    // --- 巡检项 1: 指纹级数据完整性 ---
    const dictAnomalyKey = SYSTEM_ANOMALY_KEYS.DICTIONARY_MISSING;
    // 包含传统缺失与深度指纹丢失
    const hasDictAnomaly = anomalies.includes('SYSTEM_DICTIONARY_MISSING') || 
                          anomalies.includes('SYSTEM_DICTIONARY_FINGERPRINT_LOST');
    
    const isDbBusy = anomalies.includes('DATABASE_QUERY_BUSY');

    const existingDictMessage = messages.find(
        m => (m.metadata as any)?.uniqueKey === dictAnomalyKey && !m.isArchived
    );

    if (hasDictAnomaly && !isDbBusy) {
      addMessage({
        title: '系统核心指纹丢失 (核心参数)',
        content: isHealing 
          ? '检测到核心业务指纹损坏，系统正在尝试“毫秒级快速自愈”中...' 
          : '检测到系统核心数据指纹校验失败（部分种子数据缺失）。请前往基础配置手动恢复。',
        type: 'SYSTEM_NOTICE',
        priority: 'critical',
        metadata: { 
          uniqueKey: dictAnomalyKey,
          isHealing: isHealing,
          details: details, // 将失败的具体指纹传递至 UI
          errorCode: 'FINGERPRINT_LOST'
        }
      });
    } else {
      if (existingDictMessage && !isDbBusy) {
        archiveMessage(existingDictMessage.id);
      }
    }

    // --- 巡检项 2: 基础设施权限 ---
    const fsAnomalyKey = 'system_anomaly_fs_permission';
    const hasFsAnomaly = anomalies.includes('FS_PERMISSION_DENIED');
    const existingFsMessage = messages.find(
        m => (m.metadata as any)?.uniqueKey === fsAnomalyKey && !m.isArchived
    );

    if (hasFsAnomaly) {
        addMessage({
          title: '文件存储权限报警',
          content: '检测到核心存储目录 (uploads/backups) 无法写入，这会导致上传与备份任务失败。',
          type: 'SYSTEM_NOTICE',
          priority: 'critical',
          metadata: { 
            uniqueKey: fsAnomalyKey,
            details: details.filter(d => d.includes('Directory')),
            errorCode: 'FS_DENIED'
          }
        });
    } else {
        if (existingFsMessage) {
            archiveMessage(existingFsMessage.id);
        }
    }
  }, [data, addMessage, archiveMessage, messages]);
}
