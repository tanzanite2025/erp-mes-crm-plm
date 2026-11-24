// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  renderProductCodeLinearBarcodeAndQrCodeImages,
  type ProductCodeLinearBarcodeAndQrCodeImages,
} from '@/lib/product-code-linear-barcode-and-qr-code-renderer'
import { ProductCodeLinearBarcodeAndQrCodePreview } from './product-code-linear-barcode-and-qr-code-preview'

vi.mock('@/lib/product-code-linear-barcode-and-qr-code-renderer', () => ({
  renderProductCodeLinearBarcodeAndQrCodeImages: vi.fn(),
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.mocked(renderProductCodeLinearBarcodeAndQrCodeImages).mockReset()
})

function createDeferredProductCodeSymbolImages() {
  let resolve!: (images: ProductCodeLinearBarcodeAndQrCodeImages) => void
  let reject!: (error: Error) => void
  const promise = new Promise<ProductCodeLinearBarcodeAndQrCodeImages>(
    (complete, fail) => {
      resolve = complete
      reject = fail
    }
  )
  return { promise, resolve, reject }
}

const currentImages = {
  linearBarcodeDataUrl: 'data:image/png;base64,current-linear',
  qrCodeDataUrl: 'data:image/png;base64,current-qr',
}

describe('matching product code preview synchronization', () => {
  it.each(['resolve', 'reject'] as const)(
    'ignores an older render that completes with %s after the code changes',
    async (completion) => {
      vi.stubGlobal('IntersectionObserver', undefined)
      const oldRender = createDeferredProductCodeSymbolImages()
      vi.mocked(renderProductCodeLinearBarcodeAndQrCodeImages)
        .mockReturnValueOnce(oldRender.promise)
        .mockResolvedValueOnce(currentImages)
      const preview = render(
        <ProductCodeLinearBarcodeAndQrCodePreview code='26N10011R140001' />
      )
      await act(async () => {
        preview.rerender(
          <ProductCodeLinearBarcodeAndQrCodePreview code='26N10011D140001' />
        )
      })
      await act(async () => {
        if (completion === 'resolve')
          oldRender.resolve({
            linearBarcodeDataUrl: 'data:image/png;base64,stale-linear',
            qrCodeDataUrl: 'data:image/png;base64,stale-qr',
          })
        else oldRender.reject(new Error('Old render failed'))
      })
      const images = screen.getAllByRole('img')
      expect(images.map((image) => image.getAttribute('src'))).toEqual([
        currentImages.linearBarcodeDataUrl,
        currentImages.qrCodeDataUrl,
      ])
      images.forEach((image) =>
        expect(image.getAttribute('alt')).toContain('26N10011D140001')
      )
      expect(screen.getByRole('group')).toHaveAttribute('aria-busy', 'false')
    }
  )

  it('defers offscreen rendering and disconnects its observer after entering view', async () => {
    const observers: {
      notify: IntersectionObserverCallback
      disconnect: ReturnType<typeof vi.fn>
    }[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        disconnect = vi.fn()
        observe = vi.fn()
        constructor(notify: IntersectionObserverCallback) {
          observers.push({ notify, disconnect: this.disconnect })
        }
      }
    )
    vi.mocked(renderProductCodeLinearBarcodeAndQrCodeImages).mockResolvedValue(
      currentImages
    )
    render(<ProductCodeLinearBarcodeAndQrCodePreview code='26N10011R140001' />)
    expect(renderProductCodeLinearBarcodeAndQrCodeImages).not.toHaveBeenCalled()
    await act(async () =>
      observers[0].notify(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    )
    expect(
      renderProductCodeLinearBarcodeAndQrCodeImages
    ).toHaveBeenCalledExactlyOnceWith('26N10011R140001')
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('shows a completed error state without a partial symbol pair', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.mocked(renderProductCodeLinearBarcodeAndQrCodeImages).mockRejectedValue(
      new Error('QR failed')
    )
    await act(async () => {
      render(
        <ProductCodeLinearBarcodeAndQrCodePreview code='26N10011R140001' />
      )
    })
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(
      screen.getByText('codeCenter.linearBarcode.symbols.renderFailed')
    ).toBeVisible()
    expect(screen.getByRole('group')).toHaveAttribute('aria-busy', 'false')
  })
})
