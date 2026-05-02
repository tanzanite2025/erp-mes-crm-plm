import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  Bold,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AssetService } from '@/services/asset-service'
import {
  escapeKnowledgeHtml,
  knowledgeContentToEditorHtml,
  sanitizeKnowledgeContentHtml,
} from '../data/knowledge-content'
import {
  knowledgeBasePrimaryBlockquoteClass,
  knowledgeBaseRichContentClass,
} from './knowledge-base-rich-content'

interface KnowledgeBaseRichTextFieldProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const MAX_KNOWLEDGE_IMAGE_SIZE = 8 * 1024 * 1024

export function KnowledgeBaseRichTextField({
  value,
  onChange,
  className,
}: KnowledgeBaseRichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const lastEmittedValueRef = useRef<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || value === lastEmittedValueRef.current) return

    const nextHtml = knowledgeContentToEditorHtml(value)
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml
    }
  }, [value])

  const saveSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return
    savedRangeRef.current = range
  }

  const restoreSelection = () => {
    const range = savedRangeRef.current
    if (!range) return
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const emitChange = () => {
    const editor = editorRef.current
    if (!editor) return
    const sanitized = sanitizeKnowledgeContentHtml(editor.innerHTML)
    if (editor.innerHTML !== sanitized) editor.innerHTML = sanitized
    lastEmittedValueRef.current = sanitized
    onChange(sanitized)
  }

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand(command, false, commandValue)
    emitChange()
    saveSelection()
  }

  const insertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('只能插入图片文件。')
      return
    }
    if (file.size > MAX_KNOWLEDGE_IMAGE_SIZE) {
      setImageError('图片不能超过 8MB。')
      return
    }

    setIsUploadingImage(true)
    setImageError(null)
    try {
      const uploaded = await AssetService.uploadFile(file)
      editorRef.current?.focus()
      restoreSelection()
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${escapeKnowledgeHtml(uploaded.url)}" alt="${escapeKnowledgeHtml(file.name)}">`
      )
      emitChange()
      saveSelection()
    } catch (error) {
      setImageError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <div className='overflow-hidden rounded-2xl border-none bg-muted/50 shadow-inner transition-all focus-within:ring-1 focus-within:ring-primary/20'>
      <div className='flex flex-wrap items-center gap-1 border-b border-dashed border-muted/50 bg-background/65 px-2 py-1.5'>
        <ToolbarButton label='标题' onClick={() => runCommand('formatBlock', '<h3>')}>
          <Heading3 className='size-3.5' />
        </ToolbarButton>
        <ToolbarButton label='加粗' onClick={() => runCommand('bold')}>
          <Bold className='size-3.5' />
        </ToolbarButton>
        <ToolbarButton label='斜体' onClick={() => runCommand('italic')}>
          <Italic className='size-3.5' />
        </ToolbarButton>
        <ToolbarButton label='下划线' onClick={() => runCommand('underline')}>
          <Underline className='size-3.5' />
        </ToolbarButton>
        <ToolbarButton label='无序列表' onClick={() => runCommand('insertUnorderedList')}>
          <List className='size-3.5' />
        </ToolbarButton>
        <ToolbarButton label='有序列表' onClick={() => runCommand('insertOrderedList')}>
          <ListOrdered className='size-3.5' />
        </ToolbarButton>
        <ToolbarButton label='引用' onClick={() => runCommand('formatBlock', '<blockquote>')}>
          <Quote className='size-3.5' />
        </ToolbarButton>
        <ToolbarButton
          label={isUploadingImage ? '图片上传中' : '插入图片'}
          disabled={isUploadingImage}
          onClick={() => {
            saveSelection()
            fileInputRef.current?.click()
          }}
        >
          <ImagePlus className='size-3.5' />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/png,image/jpeg,image/gif,image/webp'
          className='hidden'
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void insertImage(file)
            event.target.value = ''
          }}
        />
      </div>
      {imageError ? (
        <div className='border-b border-dashed border-destructive/20 bg-destructive/5 px-3 py-1.5 text-[11px] font-semibold text-destructive'>
          {imageError}
        </div>
      ) : null}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder='输入知识正文，可插入图片...'
        className={cn(
          knowledgeBaseRichContentClass,
          knowledgeBasePrimaryBlockquoteClass,
          'min-h-36 overflow-y-auto bg-transparent px-4 py-3 text-foreground outline-none empty:before:text-muted-foreground/40 empty:before:content-[attr(data-placeholder)]',
          className
        )}
        onBlur={saveSelection}
        onInput={emitChange}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPaste={() => {
          window.setTimeout(emitChange, 0)
        }}
      />
    </div>
  )
}

function ToolbarButton({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type='button'
      title={label}
      disabled={disabled}
      className='flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
