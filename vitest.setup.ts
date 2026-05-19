import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Mock scrollIntoView for jsdom (only if Element is defined)
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {}
}
