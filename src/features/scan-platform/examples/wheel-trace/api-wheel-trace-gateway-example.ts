import { createWheelTraceApiGateway } from '../../adapters/wheel-trace/api-wheel-trace-gateway'
import { runWheelTraceLookup } from '../../use-cases/wheel-trace-lookup'

export async function runWheelTraceApiGatewayExample(rawCode: string) {
  const gateway = createWheelTraceApiGateway({
    endpoint: '/trace/wheel/lookup',
    terminalId: 'mobile-trace-demo',
    includeResolvedProduct: true,
  })

  return runWheelTraceLookup(
    {
      rawCode,
      source: 'camera',
      surface: 'standalone',
    },
    gateway
  )
}
