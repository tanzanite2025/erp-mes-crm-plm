import type { ChannelOpenResult } from './types'

export function normalizeWeChatHandle(handle: string): string {
  return handle.trim()
}

export function canOpenWeChat(handle: string): boolean {
  return normalizeWeChatHandle(handle).length > 0
}

export function openWeChat(handle: string): ChannelOpenResult {
  const normalizedHandle = normalizeWeChatHandle(handle)
  if (!normalizedHandle) {
    return { ok: false, reason: 'missing_handle' }
  }

  window.location.href = 'weixin://'
  return { ok: true }
}
