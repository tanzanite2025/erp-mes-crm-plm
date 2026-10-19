import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { createChrome109BusinessPageAndBottomDockColorFallbacksPostcssPlugin } from './chrome109-business-page-and-bottom-dock-color-fallbacks-postcss-plugin.js'

// Exercise the same PostCSS engine Vite uses, without another build dependency.
const requireFromVite = createRequire(import.meta.resolve('vite'))
const postcss = requireFromVite('postcss')
const themeFixture = `
@layer theme {
  :root, :host { --color-blue-600: oklch(0.546 0.245 262.881); --color-white: #fff; }
}
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.129 0.042 264.695);
  --border: oklch(0.929 0.013 255.508);
  --accent: var(--background);
}
.dark {
  --foreground: oklch(0.95 0.01 247.858);
  --border: oklch(0.28 0.02 264.695 / 60%);
}
`

async function compileBusinessPageColorFallbackFixture(css = '') {
  const original = postcss.parse(themeFixture + css)
  const before = original.toString()
  const result = await postcss([
    createChrome109BusinessPageAndBottomDockColorFallbacksPostcssPlugin(),
  ]).process(original, { from: undefined })
  const fallback = result.root.last
  assert.equal(fallback.name, 'supports')
  assert.equal(fallback.params, 'not (color: oklch(1 0 0))')
  const withoutFallback = result.root.clone()
  withoutFallback.walkAtRules('supports', (node) => {
    if (node.params === 'not (color: oklch(1 0 0))') node.remove()
  })
  assert.equal(
    withoutFallback.toString(),
    before,
    'Original CSS must remain intact'
  )
  return result.root
}

function findGeneratedBusinessPageColorRule(root, selectorPart) {
  let match
  root.walkAtRules('supports', (condition) => {
    if (condition.params !== 'not (color: oklch(1 0 0))') return
    condition.walkRules((rule) => {
      if (rule.selector.includes(selectorPart)) match = rule
    })
  })
  return match
}

test('generates light/dark sRGB tokens, palette colors and local aliases', async () => {
  const fallback = (await compileBusinessPageColorFallbackFixture()).last
  const light = fallback.nodes[0]
  const dark = fallback.nodes[1]
  const lightValues = Object.fromEntries(
    light.nodes.map((node) => [node.prop, node.value])
  )
  const darkValues = Object.fromEntries(
    dark.nodes.map((node) => [node.prop, node.value])
  )
  assert.equal(
    light.selector,
    ':where([data-slot="sidebar-inset"], [data-slot="global-bottom-dock"])'
  )
  assert.equal(
    dark.selector,
    '.dark :where([data-slot="sidebar-inset"], [data-slot="global-bottom-dock"])'
  )
  assert.equal(lightValues['--foreground'], 'rgb(2 6 24 / 1)')
  assert.equal(darkValues['--foreground'], 'rgb(233 239 245 / 1)')
  assert.equal(darkValues['--border'], 'rgb(36 41 51 / 0.6)')
  assert.equal(lightValues['--color-blue-600'], 'rgb(21 93 252 / 1)')
  assert.equal(lightValues['--chrome109-color-white-rgb'], '255 255 255')
  assert.equal(
    lightValues['--chrome109-accent-rgb'],
    'var(--chrome109-background-rgb)'
  )
  assert.equal(darkValues['--chrome109-border-alpha'], '0.6')
  assert.match(
    fallback.toString(),
    /@layer base[\s\S]*color: var\(--foreground\)/
  )
})

test('retains layer/media/state rules while removing the positive color-mix gate', async () => {
  const root = await compileBusinessPageColorFallbackFixture(`
    @layer utilities {
      @media (width >= 48rem) {
        @supports (color: color-mix(in lab, red, red)) {
          .button:hover { background: color-mix(in oklab, var(--background) 20%, transparent) }
        }
      }
    }
  `)
  const rule = findGeneratedBusinessPageColorRule(root, '.button:hover')
  assert.equal(rule.parent.name, 'supports')
  assert.equal(rule.parent.parent.name, 'media')
  assert.equal(rule.parent.parent.parent.name, 'layer')
  assert.equal(rule.parent.parent.parent.params, 'utilities')
  assert.equal(
    rule.selector,
    '.button:hover:where([data-slot="sidebar-inset"], [data-slot="sidebar-inset"] *, [data-slot="global-bottom-dock"], [data-slot="global-bottom-dock"] *)'
  )
  assert.equal(
    rule.first.value,
    'rgb(var(--chrome109-background-rgb) / calc(var(--chrome109-background-alpha) * 0.2))'
  )
})

test('preserves theme alpha when applying another transparency percentage', async () => {
  const root = await compileBusinessPageColorFallbackFixture(`
    .border { border-color: color-mix(in oklab, var(--border) 45%, transparent) }
  `)
  assert.equal(
    findGeneratedBusinessPageColorRule(root, '.border').first.value,
    'rgb(var(--chrome109-border-rgb) / calc(var(--chrome109-border-alpha) * 0.45))'
  )
})

test('preserves dark ancestors, pseudo elements and escaped utility names', async () => {
  const root = await compileBusinessPageColorFallbackFixture(`
    .dark .placeholder\\:text-muted::placeholder {
      color: color-mix(in oklab, var(--foreground) 44%, transparent)
    }
  `)
  assert.equal(
    findGeneratedBusinessPageColorRule(root, '.dark .placeholder').selector,
    '.dark .placeholder\\:text-muted:where([data-slot="sidebar-inset"], [data-slot="sidebar-inset"] *, [data-slot="global-bottom-dock"], [data-slot="global-bottom-dock"] *)::placeholder'
  )
})

test('converts nested transparent shadow colors without losing runtime alpha', async () => {
  const root = await compileBusinessPageColorFallbackFixture(`
    .shadow {
      --tw-shadow-color: color-mix(in oklab, color-mix(in oklab, var(--foreground) 20%, transparent) var(--tw-shadow-alpha), transparent);
    }
  `)
  assert.equal(
    findGeneratedBusinessPageColorRule(root, '.shadow').first.value,
    'rgb(var(--chrome109-foreground-rgb) / calc(var(--chrome109-foreground-alpha) * 0.2 * var(--tw-shadow-alpha)))'
  )
})

test('leaves unknown local variables, currentColor and unrelated declarations intact', async () => {
  const root = await compileBusinessPageColorFallbackFixture(`
    .local {
      color: color-mix(in oklab, var(--local-color) 40%, transparent);
      outline-color: color-mix(in oklab, currentcolor 50%, transparent);
      padding: 8px;
    }
  `)
  assert.equal(findGeneratedBusinessPageColorRule(root, '.local'), undefined)
})

test('supports nested development CSS and keeps parent dark selectors unscoped', async () => {
  const root = await compileBusinessPageColorFallbackFixture(`
    .dark {
      .button {
        &:hover { color: color-mix(in oklab, var(--foreground) 80%, transparent) }
      }
    }
  `)
  const rule = findGeneratedBusinessPageColorRule(root, '&:hover')
  assert.equal(rule.parent.parent.selector, '.button')
  assert.equal(rule.parent.parent.parent.selector, '.dark')
  assert.equal(
    rule.selector,
    '&:hover:where([data-slot="sidebar-inset"], [data-slot="sidebar-inset"] *, [data-slot="global-bottom-dock"], [data-slot="global-bottom-dock"] *)'
  )
})

test('keeps alpha fallbacks before later opaque rules with equal specificity', async () => {
  const root = await compileBusinessPageColorFallbackFixture(`
    @layer utilities {
      @supports (color: color-mix(in lab, red, red)) {
        .translucent { color: color-mix(in oklab, var(--foreground) 50%, transparent) }
      }
      .opaque { color: white; }
    }
  `)
  const layer = root.nodes.find(
    (node) => node.name === 'layer' && node.params === 'utilities'
  )
  assert.equal(layer.nodes[1].params, 'not (color: oklch(1 0 0))')
  assert.equal(layer.nodes[2].selector, '.opaque')
})

test('does not alter separate stylesheets that contain no application theme', async () => {
  const css = '.other { color: red; }'
  const result = await postcss([
    createChrome109BusinessPageAndBottomDockColorFallbacksPostcssPlugin(),
  ]).process(css, { from: undefined })
  assert.equal(result.css, css)
})
