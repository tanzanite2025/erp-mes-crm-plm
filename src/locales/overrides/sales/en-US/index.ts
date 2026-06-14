import { detail } from './detail'
import { dialog } from './dialog'
import { footer } from './footer'
import { headerFields } from './headerFields'
import { linesEditor } from './linesEditor'
import { list } from './list'
import { master } from './master'
import { preview } from './preview'
import { status } from './status'

export const salesEnUSOverrides = {
  tradingSalesOrder: {
    list,
    status,
    master,
    detail,
    dialog,
    headerFields,
    linesEditor,
    footer,
    preview,
  },
} as const
