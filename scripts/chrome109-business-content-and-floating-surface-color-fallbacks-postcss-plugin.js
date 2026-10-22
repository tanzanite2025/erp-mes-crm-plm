// Portal surfaces are siblings of the business content. Include each surface
// root so theme tokens, palette colors and alpha utilities also work there.
const FLOATING_SURFACE_SCOPES = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tooltip"]',
  '[data-slot="popover-content"]',
  '[data-slot="tooltip-content"]',
  '[data-slot="command-menu-knowledge-detail-drawer"]',
  '[data-slot="knowledge-base-entry-editor-overlay"]',
  '[data-slot="vehicle-contact-delete-dialog-overlay"]',
]
const BUSINESS_CONTENT_SCOPES = [
  '[data-slot="sidebar-inset"]',
  '[data-slot="global-bottom-dock"]',
]
const COMPATIBILITY_SCOPES = [
  ...BUSINESS_CONTENT_SCOPES,
  '[data-slot="sidebar"]',
  ...FLOATING_SURFACE_SCOPES,
]
// Keep inverse tooltip/menu text governed by their existing utility classes.
const DEFAULT_FOREGROUND_SCOPES = [
  ...BUSINESS_CONTENT_SCOPES,
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[data-slot="command-menu-knowledge-detail-drawer"]',
  '[data-slot="knowledge-base-entry-editor-overlay"]',
  '[data-slot="vehicle-contact-delete-dialog-overlay"]',
]
const COMPATIBILITY_SCOPE_ROOTS = COMPATIBILITY_SCOPES.join(', ')
const COMPATIBILITY_SCOPE_SUBJECT = `:where(${COMPATIBILITY_SCOPES.flatMap((scope) => [scope, `${scope} *`]).join(', ')})`
const LEGACY_COLOR_CONDITION = 'not (color: oklch(1 0 0))'

function convertLinearSrgbChannelToByte(channel) {
  const encoded =
    channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, encoded)) * 255)
}

function parseStaticThemeColor(value) {
  const oklch = value.match(
    /^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/
  )
  if (oklch) {
    const lightness = Number(oklch[1]) / (oklch[2] ? 100 : 1)
    const chroma = Number(oklch[3])
    const hueRadians = (Number(oklch[4]) * Math.PI) / 180
    const a = chroma * Math.cos(hueRadians)
    const b = chroma * Math.sin(hueRadians)
    // OKLab -> linear sRGB, followed by sRGB encoding and gamut clipping.
    const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3)
    const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3)
    const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3)
    return {
      channels: [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
      ].map(convertLinearSrgbChannelToByte),
      alpha: oklch[5] ? Number(oklch[5]) / (oklch[6] ? 100 : 1) : 1,
    }
  }
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)
  if (!hex) return null
  const expanded =
    hex[1].length <= 4
      ? [...hex[1]].map((digit) => digit + digit).join('')
      : hex[1]
  return {
    channels: [0, 2, 4].map((offset) =>
      parseInt(expanded.slice(offset, offset + 2), 16)
    ),
    alpha: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  }
}

function legacyColorChannelsProperty(token) {
  return `--chrome109-${token.slice(2)}-rgb`
}

function legacyColorAlphaProperty(token) {
  return `--chrome109-${token.slice(2)}-alpha`
}

function collectRootThemeColors(root) {
  const light = new Map()
  const dark = new Map()
  root.walkRules((rule) => {
    const declarations = rule.selector === '.dark' ? dark : light
    if (
      rule.selector !== '.dark' &&
      !rule.selectors.some((selector) => [':root', ':host'].includes(selector))
    )
      return
    for (const node of rule.nodes) {
      if (node.type !== 'decl' || !node.prop.startsWith('--')) continue
      const color = parseStaticThemeColor(node.value)
      const alias = node.value.match(/^var\((--[\w-]+)\)$/)?.[1]
      if (color || alias) declarations.set(node.prop, { color, alias })
    }
  })
  const knownColors = new Set(
    [...light, ...dark]
      .filter(([, value]) => value.color)
      .map(([token]) => token)
  )
  // Theme aliases can reference other aliases, including sidebar tokens.
  for (let previousSize = -1; previousSize !== knownColors.size; ) {
    previousSize = knownColors.size
    for (const [token, value] of [...light, ...dark]) {
      if (knownColors.has(value.alias)) knownColors.add(token)
    }
  }
  return { light, dark, knownColors }
}

function splitTopLevelCssArguments(value) {
  const argumentsList = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '(') depth++
    if (value[index] === ')') depth--
    if (value[index] === ',' && depth === 0) {
      argumentsList.push(value.slice(start, index).trim())
      start = index + 1
    }
  }
  argumentsList.push(value.slice(start).trim())
  return argumentsList
}

function describeTransparentColorMix(value, knownColors) {
  if (!value.startsWith('color-mix(') || !value.endsWith(')')) return null
  const args = splitTopLevelCssArguments(value.slice(10, -1))
  if (args.length !== 3 || args[0] !== 'in oklab' || args[2] !== 'transparent')
    return null
  const weightedColor = args[1].match(
    /^(var\(--[\w-]+\)|color-mix\([\s\S]+\))\s+([\d.]+%|var\(--tw-shadow-alpha\))$/
  )
  if (!weightedColor) return null
  const token = weightedColor[1].match(/^var\((--[\w-]+)\)$/)?.[1]
  const source = token
    ? knownColors.has(token)
      ? { token, weights: [] }
      : null
    : describeTransparentColorMix(weightedColor[1], knownColors)
  if (!source) return null
  const weight = weightedColor[2].endsWith('%')
    ? String(Number(weightedColor[2].slice(0, -1)) / 100)
    : weightedColor[2]
  return { token: source.token, weights: [...source.weights, weight] }
}

function replaceTransparentColorMixes(value, knownColors) {
  let result = ''
  let position = 0
  while (position < value.length) {
    const start = value.indexOf('color-mix(', position)
    if (start < 0) return result + value.slice(position)
    let end = start + 10
    let depth = 1
    while (end < value.length && depth > 0) {
      if (value[end] === '(') depth++
      if (value[end] === ')') depth--
      end++
    }
    const original = value.slice(start, end)
    const mix = describeTransparentColorMix(original, knownColors)
    result += value.slice(position, start)
    result += mix
      ? `rgb(var(${legacyColorChannelsProperty(mix.token)}) / calc(var(${legacyColorAlphaProperty(mix.token)}) * ${mix.weights.join(' * ')}))`
      : original
    position = end
  }
  return result
}

function scopeChrome109CompatibleColorSelectorSubject(selector) {
  let depth = 0
  for (let index = 0; index < selector.length; index++) {
    if (selector[index] === '\\') {
      index++
      continue
    }
    if (selector[index] === '(' || selector[index] === '[') depth++
    if (selector[index] === ')' || selector[index] === ']') depth--
    if (depth === 0 && selector.slice(index, index + 2) === '::') {
      return (
        selector.slice(0, index) +
        COMPATIBILITY_SCOPE_SUBJECT +
        selector.slice(index)
      )
    }
  }
  return selector + COMPATIBILITY_SCOPE_SUBJECT
}

function cloneScopedColorMixFallbacks(node, knownColors) {
  if (node.type === 'decl') {
    const value = replaceTransparentColorMixes(node.value, knownColors)
    return value === node.value ? [] : [node.clone({ value })]
  }
  if (!node.nodes || (node.type === 'atrule' && /keyframes$/.test(node.name)))
    return []
  const children = node.nodes.flatMap((child) =>
    cloneScopedColorMixFallbacks(child, knownColors)
  )
  if (!children.length) return []
  // The fallback must sit outside the positive color-mix feature gate.
  if (
    node.type === 'atrule' &&
    node.name === 'supports' &&
    /^\(color:\s*color-mix\(/.test(node.params)
  )
    return children
  const clone = node.clone({ nodes: children })
  if (node.type === 'rule' && children.some((child) => child.type === 'decl')) {
    clone.selectors = node.selectors.map(
      scopeChrome109CompatibleColorSelectorSubject
    )
  }
  return [clone]
}

function insertScopedColorFallbacksInOriginalCascadeOrder(
  container,
  knownColors,
  postcss
) {
  for (const node of [...container.nodes]) {
    if (node.type === 'atrule' && /keyframes$/.test(node.name)) continue
    if (
      node.type === 'atrule' &&
      node.name === 'supports' &&
      /^\(color:\s*color-mix\(/.test(node.params)
    ) {
      const fallbacks = node.nodes.flatMap((child) =>
        cloneScopedColorMixFallbacks(child, knownColors)
      )
      if (fallbacks.length)
        node.after(
          postcss
            .atRule({ name: 'supports', params: LEGACY_COLOR_CONDITION })
            .append(fallbacks)
        )
      continue
    }
    if (!node.nodes) continue
    const declarations =
      node.type === 'rule'
        ? node.nodes
            .filter((child) => child.type === 'decl')
            .flatMap((child) =>
              cloneScopedColorMixFallbacks(child, knownColors)
            )
        : []
    insertScopedColorFallbacksInOriginalCascadeOrder(node, knownColors, postcss)
    if (!declarations.length) continue
    const scopedRule = node.clone({ nodes: declarations })
    scopedRule.selectors = node.selectors.map(
      scopeChrome109CompatibleColorSelectorSubject
    )
    // Insert beside the source rule. Appending every fallback at the end would
    // let an alpha utility override a later opaque utility with equal specificity.
    node.after(
      postcss
        .atRule({ name: 'supports', params: LEGACY_COLOR_CONDITION })
        .append(scopedRule)
    )
  }
}

export function createChrome109BusinessContentAndFloatingSurfaceColorFallbacksPostcssPlugin() {
  return {
    postcssPlugin:
      'chrome109-business-content-and-floating-surface-color-fallbacks',
    OnceExit(root, { postcss }) {
      const { light, dark, knownColors } = collectRootThemeColors(root)
      if (!knownColors.has('--foreground')) return
      const compatibility = postcss.atRule({
        name: 'supports',
        params: LEGACY_COLOR_CONDITION,
      })
      for (const [theme, colors] of [
        ['light', light],
        ['dark', dark],
      ]) {
        const rule = postcss.rule({
          selector: `${theme === 'dark' ? '.dark ' : ''}:where(${COMPATIBILITY_SCOPE_ROOTS})`,
        })
        for (const [token, { color, alias }] of colors) {
          if (!knownColors.has(token)) continue
          const channels = color?.channels.join(' ')
          rule.append({
            prop: token,
            value: color
              ? `rgb(${channels} / ${color.alpha})`
              : `var(${alias})`,
          })
          rule.append({
            prop: legacyColorChannelsProperty(token),
            value: color
              ? channels
              : `var(${legacyColorChannelsProperty(alias)})`,
          })
          rule.append({
            prop: legacyColorAlphaProperty(token),
            value: color
              ? String(color.alpha)
              : `var(${legacyColorAlphaProperty(alias)})`,
          })
        }
        if (rule.nodes.length) compatibility.append(rule)
      }
      // These regions inherit body text, whose OKLCH color fails in 109.
      // Keeping this default in base preserves semantic/inverse utility colors.
      compatibility.append(
        postcss.atRule({ name: 'layer', params: 'base' }).append(
          postcss
            .rule({
              selector: `:where(${DEFAULT_FOREGROUND_SCOPES.join(', ')})`,
            })
            .append({ prop: 'color', value: 'var(--foreground)' })
        )
      )
      insertScopedColorFallbacksInOriginalCascadeOrder(
        root,
        knownColors,
        postcss
      )
      root.append(compatibility)
    },
  }
}
