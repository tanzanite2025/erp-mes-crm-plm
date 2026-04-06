import { createLogger } from '@/lib/logger'

const logger = createLogger('AiStreamParser')

export async function parseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void,
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const dataStr = trimmed.replace(/^data: /, '')
      if (dataStr === '[DONE]') continue

      try {
        const json = JSON.parse(dataStr)
        const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.text || ''
        if (content) onChunk(content)
      } catch {
        logger.warn('Failed to parse chunk', dataStr)
      }
    }
  }
}
