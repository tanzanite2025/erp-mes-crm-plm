import type { CSSOptions } from 'vite'

type InlinePostcssConfiguration = Exclude<
  NonNullable<CSSOptions['postcss']>,
  string
>
type PostcssPluginEntry = NonNullable<
  InlinePostcssConfiguration['plugins']
>[number]

export function createChrome109BusinessContentAndFloatingSurfaceColorFallbacksPostcssPlugin(): PostcssPluginEntry
