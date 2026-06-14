import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorStatus } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import {
  ProductBarcodeCaptureSessionService,
  type ProductBarcodeCaptureSession,
} from '../services/product-barcode-capture-session-service'
import {
  getProductBindingSubmissionOutcome,
  productBindingService,
  type CreateProductBindingRequest,
  type ProductBindingRecord,
} from '../services/product-binding-service'
import { invalidateProductBindingHistoryQueries } from './use-product-binding-history-query'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message
    return typeof message === 'string' ? message : ''
  }
  return ''
}

export type ProductBindingFeedbackState =
  | 'idle'
  | 'missingBarcode'
  | 'missingQr'
  | 'submitting'
  | 'success'
  | 'duplicate'
  | 'conflict'
  | 'error'

export function useProductBindingPageState() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const appliedCaptureSessionIdRef = useRef('')
  const [productBarcode, setProductBarcode] = useState('')
  const [prepregQrCode, setPrepregQrCode] = useState('')
  const [feedbackState, setFeedbackState] =
    useState<ProductBindingFeedbackState>('idle')
  const [bindingResult, setBindingResult] =
    useState<ProductBindingRecord | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [barcodeCaptureSession, setBarcodeCaptureSession] =
    useState<ProductBarcodeCaptureSession | null>(null)
  const [isCreatingBarcodeCaptureSession, setIsCreatingBarcodeCaptureSession] =
    useState(false)
  const [barcodeCaptureStatusMessage, setBarcodeCaptureStatusMessage] =
    useState('')

  const barcodeCaptureUrl = useMemo(() => {
    if (!barcodeCaptureSession?.uploadToken || typeof window === 'undefined')
      return ''
    const sessionId = encodeURIComponent(barcodeCaptureSession.sessionId)
    const token = encodeURIComponent(barcodeCaptureSession.uploadToken)
    return `${window.location.origin}/product-barcode-capture/${sessionId}?token=${token}`
  }, [barcodeCaptureSession])

  const submitBindingMutation = useMutation({
    mutationFn: async (payload: CreateProductBindingRequest) =>
      productBindingService.submitBinding(payload),
  })

  const resetFeedback = () => {
    setFeedbackState('idle')
    setBindingResult(null)
    setSubmitError('')
  }

  useEffect(() => {
    if (!barcodeCaptureSession || barcodeCaptureSession.status !== 'Waiting')
      return

    const intervalId = window.setInterval(() => {
      void ProductBarcodeCaptureSessionService.get(
        barcodeCaptureSession.sessionId
      )
        .then((nextSession) => {
          setBarcodeCaptureSession((current) => ({
            ...nextSession,
            uploadToken: current?.uploadToken,
          }))
          if (
            nextSession.status === 'Submitted' &&
            appliedCaptureSessionIdRef.current !== nextSession.sessionId
          ) {
            appliedCaptureSessionIdRef.current = nextSession.sessionId
            setProductBarcode(nextSession.rawCode || '')
            setBarcodeCaptureStatusMessage(
              t('cuttingOperations.productBinding.mobileCapture.status.filled')
            )
            resetFeedback()
            toast.success(
              t('cuttingOperations.productBinding.mobileCapture.toasts.filled'),
              {
                description: nextSession.rawCode || '--',
              }
            )
            return
          }
          if (nextSession.status === 'Expired') {
            setBarcodeCaptureStatusMessage(
              t('cuttingOperations.productBinding.mobileCapture.status.expired')
            )
          }
        })
        .catch(() => {
          setBarcodeCaptureStatusMessage(
            t(
              'cuttingOperations.productBinding.mobileCapture.status.pollingFailed'
            )
          )
        })
    }, 2500)

    return () => window.clearInterval(intervalId)
  }, [barcodeCaptureSession, t])

  const handleCreateBarcodeCaptureSession = async () => {
    setIsCreatingBarcodeCaptureSession(true)
    try {
      const session = await ProductBarcodeCaptureSessionService.create()
      appliedCaptureSessionIdRef.current = ''
      setBarcodeCaptureSession(session)
      setBarcodeCaptureStatusMessage(
        t('cuttingOperations.productBinding.mobileCapture.status.created')
      )
    } catch {
      toast.error(
        t('cuttingOperations.productBinding.mobileCapture.toasts.createFailed')
      )
    } finally {
      setIsCreatingBarcodeCaptureSession(false)
    }
  }

  const handleCopyBarcodeCaptureLink = async () => {
    if (!barcodeCaptureUrl) return
    try {
      await navigator.clipboard.writeText(barcodeCaptureUrl)
      toast.success(
        t('cuttingOperations.productBinding.mobileCapture.toasts.linkCopied')
      )
    } catch {
      toast.error(
        t('cuttingOperations.productBinding.mobileCapture.toasts.copyFailed')
      )
    }
  }

  const handleSubmitBinding = async () => {
    if (!productBarcode.trim()) {
      setBindingResult(null)
      setSubmitError('')
      setFeedbackState('missingBarcode')
      return
    }
    if (!prepregQrCode.trim()) {
      setBindingResult(null)
      setSubmitError('')
      setFeedbackState('missingQr')
      return
    }

    setFeedbackState('submitting')
    setBindingResult(null)
    setSubmitError('')

    try {
      const result = await submitBindingMutation.mutateAsync({
        productBarcode: productBarcode.trim(),
        prepregQrCode: prepregQrCode.trim(),
      })
      await invalidateProductBindingHistoryQueries(queryClient)
      setBindingResult(result)
      setFeedbackState(
        getProductBindingSubmissionOutcome(result) === 'duplicate'
          ? 'duplicate'
          : 'success'
      )
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        const conflictMessage = getErrorMessage(error)
        setSubmitError(conflictMessage)

        try {
          const history = await productBindingService.listBindings({
            limit: 1,
            productBarcode: productBarcode.trim(),
          })
          const latestBinding = history.items[0]
          setBindingResult(
            latestBinding
              ? {
                  ...latestBinding,
                  message: conflictMessage || latestBinding.message,
                }
              : null
          )
        } catch {
          setBindingResult(null)
        }

        setFeedbackState('conflict')
        return
      }

      setSubmitError(getErrorMessage(error))
      setFeedbackState('error')
    }
  }

  const latestBindingId = bindingResult?.id || ''

  return {
    productBarcode,
    setProductBarcode,
    prepregQrCode,
    setPrepregQrCode,
    feedbackState,
    bindingResult,
    submitError,
    resetFeedback,
    submitBindingMutation,
    handleSubmitBinding,
    latestBindingId,
    barcodeCaptureSession,
    barcodeCaptureUrl,
    barcodeCaptureStatusMessage,
    isCreatingBarcodeCaptureSession,
    handleCreateBarcodeCaptureSession,
    handleCopyBarcodeCaptureLink,
  }
}
