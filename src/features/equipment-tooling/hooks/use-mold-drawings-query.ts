'use client'

import { useQuery } from '@tanstack/react-query'
import { DrawingService } from '../services/drawing-service'

export const moldDrawingsBySnQueryKey = (moldSn: string) => ['equipment-tooling', 'mold-drawings-by-sn', moldSn] as const

export function useMoldDrawingsQuery(open: boolean, moldSn?: string) {
  return useQuery({
    queryKey: moldDrawingsBySnQueryKey(moldSn ?? ''),
    queryFn: () => DrawingService.getDrawingsByMold(moldSn ?? ''),
    enabled: open && !!moldSn,
  })
}
