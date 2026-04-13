export type ContactChannel = 'wechat'

export interface ChannelOpenResult {
  ok: boolean
  reason?: 'missing_handle'
}
