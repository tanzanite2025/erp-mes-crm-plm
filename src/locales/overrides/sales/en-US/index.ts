import { list } from './list'
import { status } from './status'
import { master } from './master'
import { detail } from './detail'
import { dialog } from './dialog'
import { headerFields } from './headerFields'
import { linesEditor } from './linesEditor'
import { footer } from './footer'
import { preview } from './preview'

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
