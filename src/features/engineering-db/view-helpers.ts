import {
  BookOpen,
  Droplets,
  FileCode,
  FileSpreadsheet,
  FileText,
  PenTool,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'

type EngineeringDbCategory = 'SPEC' | 'DRILLING' | 'LABELING'
type LabelingType = 'Water' | 'Paint' | 'Laser' | 'Other'
type TranslationFn = (key: string) => string

export type EngineeringDbPreviewKind = 'excel' | 'cad' | 'pdf'

type FileVisual = {
  icon: LucideIcon
  iconClassName: string
  containerClassName: string
}

type LabelingTypeVisual = {
  icon: LucideIcon
  className: string
}

const EXCEL_EXTENSIONS = new Set(['xlsx', 'xls', 'csv'])
const CAD_EXTENSIONS = new Set(['dwg', 'dxf', 'stp', 'step', 'rvt'])
const WORD_EXTENSIONS = new Set(['docx', 'doc'])

export function normalizeEngineeringDbFileExtension(extension?: string) {
  return extension?.toLowerCase()
}

export function isEngineeringDbExcelFile(extension?: string) {
  const normalized = normalizeEngineeringDbFileExtension(extension)
  return normalized ? EXCEL_EXTENSIONS.has(normalized) : false
}

export function isEngineeringDbCadFile(extension?: string) {
  const normalized = normalizeEngineeringDbFileExtension(extension)
  return normalized ? CAD_EXTENSIONS.has(normalized) : false
}

export function getEngineeringDbPreviewKind(extension?: string): EngineeringDbPreviewKind {
  if (isEngineeringDbExcelFile(extension)) {
    return 'excel'
  }
  if (isEngineeringDbCadFile(extension)) {
    return 'cad'
  }
  return 'pdf'
}

export function getEngineeringDbFileVisual(options: {
  extension?: string
  category?: EngineeringDbCategory
}): FileVisual {
  const normalized = normalizeEngineeringDbFileExtension(options.extension)

  if (normalized && EXCEL_EXTENSIONS.has(normalized)) {
    return {
      icon: FileSpreadsheet,
      iconClassName: 'text-emerald-500',
      containerClassName: 'bg-emerald-500/10 border-emerald-500/20',
    }
  }

  if (normalized && CAD_EXTENSIONS.has(normalized)) {
    return {
      icon: FileCode,
      iconClassName: 'text-orange-500',
      containerClassName: 'bg-orange-500/10 border-orange-500/20',
    }
  }

  if (normalized && WORD_EXTENSIONS.has(normalized)) {
    return {
      icon: FileText,
      iconClassName: 'text-blue-500',
      containerClassName: 'bg-blue-500/10 border-blue-500/20',
    }
  }

  if (options.category === 'LABELING') {
    return {
      icon: FileText,
      iconClassName: 'text-teal-500',
      containerClassName: 'bg-teal-500/10 border-teal-500/20',
    }
  }

  if (options.category === 'DRILLING') {
    return {
      icon: Target,
      iconClassName: 'text-indigo-500',
      containerClassName: 'bg-indigo-500/10 border-indigo-500/20',
    }
  }

  return {
    icon: BookOpen,
    iconClassName: 'text-amber-500',
    containerClassName: 'bg-amber-500/10 border-amber-500/20',
  }
}

export function getEngineeringDbCategoryLabel(t: TranslationFn, category: EngineeringDbCategory) {
  if (category === 'SPEC') {
    return t('engineering.db.categories.spec')
  }
  if (category === 'DRILLING') {
    return t('engineering.db.categories.drilling')
  }
  return t('engineering.db.categories.labeling')
}

export function getEngineeringDbCategoryBadgeClass(category: EngineeringDbCategory) {
  if (category === 'SPEC') {
    return 'text-blue-500 bg-blue-500/10'
  }
  if (category === 'DRILLING') {
    return 'text-indigo-500 bg-indigo-500/10'
  }
  return 'text-teal-500 bg-teal-500/10'
}

export function getEngineeringDbSubtypeLabel(t: TranslationFn, subType: string) {
  if (subType === 'DRILLING_PLAN') {
    return t('engineering.db.categories.drilling')
  }
  if (subType === 'LABELING_DRAFT') {
    return t('engineering.db.categories.labeling')
  }
  return subType
}

export function getEngineeringDbLabelingTypeLabel(t: TranslationFn, type: LabelingType) {
  if (type === 'Water') {
    return t('engineering.labeling.types.water')
  }
  if (type === 'Paint') {
    return t('engineering.labeling.types.paint')
  }
  if (type === 'Laser') {
    return t('engineering.labeling.types.laser')
  }
  return t('engineering.labeling.types.other')
}

export function getEngineeringDbLabelingTypeVisual(type: LabelingType): LabelingTypeVisual {
  if (type === 'Water') {
    return {
      icon: Droplets,
      className: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    }
  }
  if (type === 'Laser') {
    return {
      icon: Zap,
      className: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    }
  }
  if (type === 'Paint') {
    return {
      icon: PenTool,
      className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    }
  }
  return {
    icon: PenTool,
    className: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
  }
}
