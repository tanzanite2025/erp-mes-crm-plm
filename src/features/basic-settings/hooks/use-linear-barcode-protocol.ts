import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type LinearBarcodeProtocolConfig } from '../data/linear-barcode-protocol'
import { BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY } from '../query-keys'
import { linearBarcodeProtocolService } from '../services/linear-barcode-protocol-service'

export function useLinearBarcodeProtocol() {
  const queryClient = useQueryClient()

  const protocolQuery = useQuery({
    queryKey: BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY,
    queryFn: () => linearBarcodeProtocolService.getConfig(),
  })

  const cacheProtocolConfig = useCallback(
    (config: LinearBarcodeProtocolConfig) => {
      queryClient.setQueryData(BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY, config)
    },
    [queryClient]
  )

  return {
    protocolConfig: protocolQuery.data,
    isConfigLoading: protocolQuery.isLoading,
    protocolConfigError: protocolQuery.error,
    refetchProtocolConfig: protocolQuery.refetch,
    cacheProtocolConfig,
  }
}
