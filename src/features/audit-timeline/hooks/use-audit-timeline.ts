import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { AuditLog } from '../types';

export const useAuditTimeline = (module: string, targetId: string) => {
  return useQuery<AuditLog[]>({
    queryKey: ['audit-timeline', module, targetId],
    queryFn: async () => {
      const response = await apiFetch<AuditLog[]>(`/audit/timeline?module=${module}&target_id=${targetId}`);
      return response;
    },
    enabled: !!module && !!targetId,
  });
};
