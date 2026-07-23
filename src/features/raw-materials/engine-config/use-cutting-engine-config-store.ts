import { create } from 'zustand'
import {
  DEFAULT_CUTTING_ENGINE_CONFIG,
  normalizeCuttingEngineConfig,
  type CuttingEngineConfig,
} from './types'

type CuttingEngineConfigState = {
  config: CuttingEngineConfig
  revision: number
  applyConfig: (config: CuttingEngineConfig) => void
}

function cuttingEngineConfigSignature(config: CuttingEngineConfig): string {
  return JSON.stringify(normalizeCuttingEngineConfig(config))
}

export const useCuttingEngineConfigStore = create<CuttingEngineConfigState>()(
  (set) => ({
    config: DEFAULT_CUTTING_ENGINE_CONFIG,
    revision: 0,
    applyConfig: (config) => {
      set((state) => {
        const normalized = normalizeCuttingEngineConfig(config)
        if (
          cuttingEngineConfigSignature(normalized) ===
          cuttingEngineConfigSignature(state.config)
        ) {
          return state
        }

        return {
          config: normalized,
          revision: state.revision + 1,
        }
      })
    },
  })
)
