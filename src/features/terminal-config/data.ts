import type { LucideIcon } from 'lucide-react'
import { BookOpen, Printer, ScanLine, SmartphoneCharging } from 'lucide-react'
import type { TranslationKey } from '@/locales'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export type TerminalResourceStatus = 'pendingUpload' | 'planned'

export type TerminalResource = {
  title: string
  version: string
  target: string
  packageType: string
  note: string
  status: TerminalResourceStatus
}

export type TerminalGuide = {
  title: string
  description: string
  points: string[]
}

export type TerminalCategory = {
  title: string
  description: string
  icon: LucideIcon
  items: TerminalResource[]
}

export function getPrinterCategories(t: TranslateFn): TerminalCategory[] {
  return [
    {
      title: t('terminalConfig.resources.printers.labelPrinters.title'),
      description: t('terminalConfig.resources.printers.labelPrinters.description'),
      icon: Printer,
      items: [
        {
          title: t('terminalConfig.resources.printers.labelPrinters.items.tsc.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.printers.labelPrinters.items.tsc.target'),
          packageType: t('terminalConfig.resources.common.windowsDriverPackage'),
          note: t('terminalConfig.resources.printers.labelPrinters.items.tsc.note'),
          status: 'pendingUpload',
        },
        {
          title: t('terminalConfig.resources.printers.labelPrinters.items.zebra.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.printers.labelPrinters.items.zebra.target'),
          packageType: t('terminalConfig.resources.common.windowsDriverPackage'),
          note: t('terminalConfig.resources.printers.labelPrinters.items.zebra.note'),
          status: 'pendingUpload',
        },
      ],
    },
    {
      title: t('terminalConfig.resources.printers.debugTools.title'),
      description: t('terminalConfig.resources.printers.debugTools.description'),
      icon: BookOpen,
      items: [
        {
          title: t('terminalConfig.resources.printers.debugTools.items.portTool.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.printers.debugTools.items.portTool.target'),
          packageType: t('terminalConfig.resources.common.desktopDebugTool'),
          note: t('terminalConfig.resources.printers.debugTools.items.portTool.note'),
          status: 'pendingUpload',
        },
      ],
    },
  ]
}

export function getPdaCategories(t: TranslateFn): TerminalCategory[] {
  return [
    {
      title: t('terminalConfig.resources.pda.workTerminals.title'),
      description: t('terminalConfig.resources.pda.workTerminals.description'),
      icon: SmartphoneCharging,
      items: [
        {
          title: t('terminalConfig.resources.pda.workTerminals.items.browserShell.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.common.androidPda'),
          packageType: t('terminalConfig.resources.common.terminalPackage'),
          note: t('terminalConfig.resources.pda.workTerminals.items.browserShell.note'),
          status: 'pendingUpload',
        },
        {
          title: t('terminalConfig.resources.pda.workTerminals.items.offlineGuide.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.common.androidPda'),
          packageType: t('terminalConfig.resources.common.operationManual'),
          note: t('terminalConfig.resources.pda.workTerminals.items.offlineGuide.note'),
          status: 'planned',
        },
      ],
    },
  ]
}

export function getScannerCategories(t: TranslateFn): TerminalCategory[] {
  return [
    {
      title: t('terminalConfig.resources.scanners.deviceModules.title'),
      description: t('terminalConfig.resources.scanners.deviceModules.description'),
      icon: ScanLine,
      items: [
        {
          title: t('terminalConfig.resources.scanners.deviceModules.items.scannerGuide.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.scanners.deviceModules.items.scannerGuide.target'),
          packageType: t('terminalConfig.resources.common.configGuide'),
          note: t('terminalConfig.resources.scanners.deviceModules.items.scannerGuide.note'),
          status: 'planned',
        },
        {
          title: t('terminalConfig.resources.scanners.deviceModules.items.fixedHeadTemplate.title'),
          version: t('terminalConfig.resources.common.placeholderVersion'),
          target: t('terminalConfig.resources.scanners.deviceModules.items.fixedHeadTemplate.target'),
          packageType: t('terminalConfig.resources.common.parameterTemplate'),
          note: t('terminalConfig.resources.scanners.deviceModules.items.fixedHeadTemplate.note'),
          status: 'pendingUpload',
        },
      ],
    },
  ]
}

export function getInstallGuides(t: TranslateFn): TerminalGuide[] {
  return [
    {
      title: t('terminalConfig.guides.printerFlow.title'),
      description: t('terminalConfig.guides.printerFlow.description'),
      points: [
        t('terminalConfig.guides.printerFlow.points.0'),
        t('terminalConfig.guides.printerFlow.points.1'),
        t('terminalConfig.guides.printerFlow.points.2'),
      ],
    },
    {
      title: t('terminalConfig.guides.pdaFlow.title'),
      description: t('terminalConfig.guides.pdaFlow.description'),
      points: [
        t('terminalConfig.guides.pdaFlow.points.0'),
        t('terminalConfig.guides.pdaFlow.points.1'),
        t('terminalConfig.guides.pdaFlow.points.2'),
      ],
    },
    {
      title: t('terminalConfig.guides.scannerChecklist.title'),
      description: t('terminalConfig.guides.scannerChecklist.description'),
      points: [
        t('terminalConfig.guides.scannerChecklist.points.0'),
        t('terminalConfig.guides.scannerChecklist.points.1'),
        t('terminalConfig.guides.scannerChecklist.points.2'),
      ],
    },
  ]
}
