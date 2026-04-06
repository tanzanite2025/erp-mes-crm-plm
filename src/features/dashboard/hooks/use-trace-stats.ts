import { useEffect, useState } from 'react'
import { TraceService, type TraceStats } from '../services/trace-service'

export function useTraceStats(enabled = true) {
  const [stats, setStats] = useState<TraceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStats(null)
      setError(null)
      setLoading(false)
      return
    }

    let isMounted = true

    async function fetchStats() {
      try {
        setLoading(true)
        const data = await TraceService.getDashboardStats()
        if (isMounted) {
          setStats(data)
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch stats'))
          setLoading(false)
        }
      }
    }

    void fetchStats()

    return () => {
      isMounted = false
    }
  }, [enabled])

  return { stats, loading, error }
}
