import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export function useSystemMonitor() {
  return useQuery({
    queryKey: ['system-health-integrity'],
    queryFn: () =>
      apiFetch<{
        integrity?: {
          anomalies: string[]
          isHealing: boolean
          details: string[]
        }
      }>('/health'),
    refetchInterval: 300_000,
    staleTime: 60_000,
    retry: 2,
  })
}
