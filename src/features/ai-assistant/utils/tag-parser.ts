/**
 * AI 指令识别引擎 (Robust Tag Parser)
 * 核心目标：提高对 LLM 不规范输出的容错率。
 */
import { createLogger } from '@/lib/logger'
import { isValidRoute } from '../services/ai-protocol-validator'

const logger = createLogger('AiTagParser')

export interface ActionItem {
  label: string
  value: string
  type: 'ACT' | 'CMD'
}

/**
 * 解析业务跳转指令 [ACT: label | route]
 * 容错处理：不计较空格，不计较大小写。
 */
export function parseActionTags(text: string): ActionItem[] {
  if (!text) return []
  const results: ActionItem[] = []

  // 匹配 [ACT: label | value]
  // 容错点：\s* 处理不确定的空格，[i] 忽略大小写
  const actRegex = /\[ACT\s*:\s*([^|\]]+)\s*\|\s*([^\]]+)\]/gi
  let match

  while ((match = actRegex.exec(text)) !== null) {
    const route = match[2].trim()

    // [SECURITY] 仅当路由在白名单内时才解析
    if (isValidRoute(route)) {
      results.push({
        label: match[1].trim(),
        value: route,
        type: 'ACT',
      })
    } else {
      logger.warn(`Ignored unauthorized/hallucinated route: ${route}`)
    }
  }

  return results
}

/**
 * 解析智能分析指令 [CMD: label | command]
 * 容错处理：支持多行 Payload，支持复杂字符。
 */
export function parseCommandTags(text: string): ActionItem[] {
  if (!text) return []
  const results: ActionItem[] = []

  // 匹配 [CMD: label | payload]
  // [\s\S]+? 支持多行内容
  const cmdRegex = /\[CMD\s*:\s*([^|\]]+)\s*\|\s*([\s\S]+?)\]/gi
  let match

  while ((match = cmdRegex.exec(text)) !== null) {
    results.push({
      label: match[1].trim(),
      value: match[2].replace(/\s+/g, ' ').trim(), // 压缩多余空白
      type: 'CMD',
    })
  }

  return results
}

/**
 * 合并解析所有动作标签
 */
export function parseAllActionItems(text: string): ActionItem[] {
  return [...parseActionTags(text), ...parseCommandTags(text)]
}

/**
 * 清理文本中的协议标签，以便于用户阅读
 */
export function cleanActionTags(text: string): string {
  if (!text) return ''
  return text
    .replace(/\[ACT\s*:\s*[^\]]+\]/gi, '')
    .replace(/\[CMD\s*:\s*[\s\S]+?\]/gi, '')
    .trim()
}
