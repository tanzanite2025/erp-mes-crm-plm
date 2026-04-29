import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import {
  productBindingService,
  type CreateProductBindingRequest,
  type ProductBindingRecord,
} from '../services/product-binding-service'
import {
  ProductBarcodeCaptureSessionService,
  type ProductBarcodeCaptureSession,
} from '../services/product-barcode-capture-session-service'

export type ProductBindingFeedbackState =
  | 'idle'
  | 'missingBarcode'
  | 'missingQr'
  | 'submitting'
  | 'success'
  | 'error'

function buildProductBindingHistoryQueryKey(productBarcode: string, prepregQrCode: string) {
  return ['cutting-operations', 'product-binding', 'history', productBarcode, prepregQrCode] as const
}

export function useProductBindingPageState() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const appliedCaptureSessionIdRef = useRef('')
  const [productBarcode, setProductBarcode] = useState('')
  const [prepregQrCode, setPrepregQrCode] = useState('')
  const [feedbackState, setFeedbackState] = useState<ProductBindingFeedbackState>('idle')
  const [bindingResult, setBindingResult] = useState<ProductBindingRecord | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [barcodeCaptureSession, setBarcodeCaptureSession] = useState<ProductBarcodeCaptureSession | null>(null)
  const [isCreatingBarcodeCaptureSession, setIsCreatingBarcodeCaptureSession] = useState(false)
  const [barcodeCaptureStatusMessage, setBarcodeCaptureStatusMessage] = useState('')

  const trimmedProductBarcode = useMemo(() => productBarcode.trim(), [productBarcode])
  const trimmedPrepregQrCode = useMemo(() => prepregQrCode.trim(), [prepregQrCode])
  const barcodeCaptureUrl = useMemo(() => {
    if (!barcodeCaptureSession?.uploadToken || typeof window === 'undefined') return ''
    const sessionId = encodeURIComponent(barcodeCaptureSession.sessionId)
    const token = encodeURIComponent(barcodeCaptureSession.uploadToken)
    return `${window.location.origin}/product-barcode-capture/${sessionId}?token=${token}`
  }, [barcodeCaptureSession])

  const historyQueryKey = buildProductBindingHistoryQueryKey(trimmedProductBarcode, trimmedPrepregQrCode)

  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: () =>
      productBindingService.listBindings({
        limit: 12,
        productBarcode: trimmedProductBarcode || undefined,
        prepregBindingToken: trimmedPrepregQrCode || undefined,
      }),
    enabled: true,
  })

  const submitBindingMutation = useMutation({
    mutationFn: async (payload: CreateProductBindingRequest) => productBindingService.submitBinding(payload),
  })

  const resetFeedback = () => {
    setFeedbackState('idle')
    setBindingResult(null)
    setSubmitError('')
  }

  useEffect(() => {
    if (!barcodeCaptureSession || barcodeCaptureSession.status !== 'Waiting') return

    const intervalId = window.setInterval(() => {
      void ProductBarcodeCaptureSessionService.get(barcodeCaptureSession.sessionId)
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
            setBarcodeCaptureStatusMessage(t('cuttingOperations.productBinding.mobileCapture.status.filled'))
            resetFeedback()
            toast.success(t('cuttingOperations.productBinding.mobileCapture.toasts.filled'), {
              description: nextSession.rawCode || '--',
            })
            return
          }
          if (nextSession.status === 'Expired') {
            setBarcodeCaptureStatusMessage(t('cuttingOperations.productBinding.mobileCapture.status.expired'))
          }
        })
        .catch(() => {
          setBarcodeCaptureStatusMessage(t('cuttingOperations.productBinding.mobileCapture.status.pollingFailed'))
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
      setBarcodeCaptureStatusMessage(t('cuttingOperations.productBinding.mobileCapture.status.created'))
    } catch {
      toast.error(t('cuttingOperations.productBinding.mobileCapture.toasts.createFailed'))
    } finally {
      setIsCreatingBarcodeCaptureSession(false)
    }
  }

  const handleCopyBarcodeCaptureLink = async () => {
    if (!barcodeCaptureUrl) return
    try {
      await navigator.clipboard.writeText(barcodeCaptureUrl)
      toast.success(t('cuttingOperations.productBinding.mobileCapture.toasts.linkCopied'))
    } catch {
      toast.error(t('cuttingOperations.productBinding.mobileCapture.toasts.copyFailed'))
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
      await queryClient.invalidateQueries({ queryKey: historyQueryKey })
      setBindingResult(result)
      setFeedbackState('success')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '')
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
    bindingHistory: historyQuery.data?.items ?? [],
    historyTotal: historyQuery.data?.total ?? 0,
    isHistoryLoading: historyQuery.isLoading,
    historyError: historyQuery.error,
    latestBindingId,
    barcodeCaptureSession,
    barcodeCaptureUrl,
    barcodeCaptureStatusMessage,
    isCreatingBarcodeCaptureSession,
    handleCreateBarcodeCaptureSession,
    handleCopyBarcodeCaptureLink,
  }
}
