import { describe, expect, it } from 'vitest'
import {
  getKnowledgeContentMediaFlags,
  getKnowledgeContentText,
  knowledgeContentToEditorHtml,
  sanitizeKnowledgeContentHtml,
} from './knowledge-content'

describe('knowledge content helpers', () => {
  it('converts plain text paragraphs to editor html', () => {
    expect(knowledgeContentToEditorHtml('第一段\n\n第二段')).toBe(
      '<p>第一段</p><p>第二段</p>'
    )
  })

  it('extracts searchable text from rich content', () => {
    expect(
      getKnowledgeContentText('<h3>标题</h3><p>正文 <strong>重点</strong></p>')
    ).toContain('标题')
    expect(
      getKnowledgeContentText('<h3>标题</h3><p>正文 <strong>重点</strong></p>')
    ).toContain('正文 重点')
  })

  it('removes unsafe script and inline event handlers', () => {
    expect(
      sanitizeKnowledgeContentHtml('<p onclick="alert(1)">正文</p><script>alert(1)</script>')
    ).toBe('<p>正文</p>')
  })

  it('detects media markers in rich content for card indicators', () => {
    expect(getKnowledgeContentMediaFlags('<p>content</p>')).toEqual({
      hasImage: false,
      hasVideo: false,
    })
    expect(getKnowledgeContentMediaFlags('<img src="data:image/png;base64,AA==" alt="">')).toEqual({
      hasImage: true,
      hasVideo: false,
    })
    expect(getKnowledgeContentMediaFlags('<video src="demo.mp4"></video>')).toEqual({
      hasImage: false,
      hasVideo: true,
    })
  })
})
