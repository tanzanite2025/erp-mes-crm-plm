const ALLOWED_RICH_TEXT_TAGS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'DIV',
  'EM',
  'H3',
  'H4',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'SPAN',
  'STRONG',
  'U',
  'UL',
])

const IMAGE_SRC_PATTERN =
  /^(data:image\/(png|jpe?g|gif|webp);base64,|https?:\/\/|\/(?!\/))/i
const IMAGE_TAG_PATTERN = /<img\b/i
const VIDEO_TAG_PATTERN = /<(video|source)\b/i

export function escapeKnowledgeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function isKnowledgeContentHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function knowledgeContentToEditorHtml(value: string) {
  if (!value.trim()) return ''
  if (isKnowledgeContentHtml(value)) return sanitizeKnowledgeContentHtml(value)
  return value
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeKnowledgeHtml(paragraph).replace(/\n/g, '<br>')}</p>`
    )
    .join('')
}

export function getKnowledgeContentText(value: string) {
  if (!isKnowledgeContentHtml(value)) return value

  if (typeof document !== 'undefined') {
    const container = document.createElement('div')
    container.innerHTML = sanitizeKnowledgeContentHtml(value)
    return container.textContent?.trim() ?? ''
  }

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h3|h4|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function getKnowledgeContentMediaFlags(value: string) {
  if (!isKnowledgeContentHtml(value)) {
    return { hasImage: false, hasVideo: false }
  }

  return {
    hasImage: IMAGE_TAG_PATTERN.test(value),
    hasVideo: VIDEO_TAG_PATTERN.test(value),
  }
}

export function sanitizeKnowledgeContentHtml(value: string) {
  if (typeof document === 'undefined') {
    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/\sjavascript:/gi, '')
  }

  const template = document.createElement('template')
  template.innerHTML = value

  sanitizeNode(template.content)
  return template.innerHTML
}

function sanitizeNode(parent: ParentNode) {
  Array.from(parent.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) return
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove()
      return
    }

    const element = node as HTMLElement
    if (!ALLOWED_RICH_TEXT_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes))
      sanitizeNode(parent)
      return
    }

    sanitizeAttributes(element)
    sanitizeNode(element)
  })
}

function sanitizeAttributes(element: HTMLElement) {
  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase()
    const value = attribute.value

    if (name.startsWith('on') || name === 'style' || name === 'class') {
      element.removeAttribute(attribute.name)
      return
    }

    if (element.tagName === 'A') {
      if (name === 'href') {
        if (!/^(https?:|\/)/i.test(value)) {
          element.removeAttribute(attribute.name)
        }
        return
      }
      if (name === 'target' || name === 'rel') return
      element.removeAttribute(attribute.name)
      return
    }

    if (element.tagName === 'IMG') {
      if (name === 'src') {
        if (!IMAGE_SRC_PATTERN.test(value)) {
          element.removeAttribute(attribute.name)
        }
        return
      }
      if (name === 'alt') return
      element.removeAttribute(attribute.name)
      return
    }

    element.removeAttribute(attribute.name)
  })

  if (element.tagName === 'A') {
    element.setAttribute('target', '_blank')
    element.setAttribute('rel', 'noreferrer')
  }
}
