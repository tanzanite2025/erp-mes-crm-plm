import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_CUTTING_ENGINE_CONFIG,
  normalizeCuttingEngineConfig,
  type CuttingEngineConfig,
} from './types'

type CuttingEngineConfigState = {
  config: CuttingEngineConfig
  revision: number
  saveConfig: (config: CuttingEngineConfig) => void
  resetConfig: () => void
}

export const useCuttingEngineConfigStore = create<CuttingEngineConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_CUTTING_ENGINE_CONFIG,
      revision: 0,
      saveConfig: (config) => {
        set((state) => ({
          config: normalizeCuttingEngineConfig(config),
          revision: state.revision + 1,
        }))
      },
      resetConfig: () => {
        set((state) => ({
          config: DEFAULT_CUTTING_ENGINE_CONFIG,
          revision: state.revision + 1,
        }))
      },
    }),
    {
      name: 'xdfc_cutting_engine_config_v1',
      partialize: (state) => ({
        config: state.config,
        revision: state.revision,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | Partial<CuttingEngineConfigState>
          | undefined
        return {
          ...currentState,
          config: normalizeCuttingEngineConfig(persisted?.config),
          revision:
            typeof persisted?.revision === 'number'
              ? persisted.revision
              : currentState.revision,
        }
      },
    }
  )
)
