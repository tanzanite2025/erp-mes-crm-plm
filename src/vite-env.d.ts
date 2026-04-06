/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_REMOTE_LOGGING: string
  readonly VITE_LOG_DRAIN_URL: string
  readonly VITE_LOG_DRAIN_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
