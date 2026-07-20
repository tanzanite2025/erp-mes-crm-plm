// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProductBarcodeCaptureSession } from '../services/product-barcode-capture-session-service'
import { ProductBarcodeMobileCapturePanel } from './product-barcode-mobile-capture-panel'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/lib/bwip-renderer', () => ({
  renderBwipBarcode: vi.fn().mockResolvedValue(undefined),
}))

const session: ProductBarcodeCaptureSession = {
  sessionId: 'session-123',
  uploadToken: 'token-123',
  status: 'Waiting',
  rawCode: '',
  barcodeProtocol: '',
  barcodeSummary: '',
  expiresAt: '',
}

describe('ProductBarcodeMobileCapturePanel', () => {
  afterEach(() => cleanup())

  it('keeps the fallback compact until a mobile session exists', () => {
    const onCreateSession = vi.fn()
    const onCopyLink = vi.fn()

    const { rerender } = render(
      <ProductBarcodeMobileCapturePanel
        captureSession={null}
        captureUrl=''
        statusMessage=''
        isCreatingSession={false}
        onCreateSession={onCreateSession}
        onCopyLink={onCopyLink}
        compact
      />
    )

    expect(
      screen.queryByRole('button', {
        name: 'cuttingOperations.productBinding.mobileCapture.actions.copyLink',
      })
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'cuttingOperations.productBinding.mobileCapture.actions.create',
      })
    )
    expect(onCreateSession).toHaveBeenCalledOnce()

    rerender(
      <ProductBarcodeMobileCapturePanel
        captureSession={session}
        captureUrl='https://example.test/capture/session-123'
        statusMessage='created'
        isCreatingSession={false}
        onCreateSession={onCreateSession}
        onCopyLink={onCopyLink}
        compact
      />
    )

    expect(
      screen.getByRole('button', {
        name: 'cuttingOperations.productBinding.mobileCapture.actions.copyLink',
      })
    ).not.toBeNull()
    expect(screen.getByText('Waiting')).not.toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'cuttingOperations.productBinding.mobileCapture.actions.copyLink',
      })
    )
    expect(onCopyLink).toHaveBeenCalledOnce()
  })
})
