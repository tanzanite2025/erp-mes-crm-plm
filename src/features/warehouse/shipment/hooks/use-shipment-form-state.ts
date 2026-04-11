'use client'

import { useCallback, useMemo, useState } from 'react'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type MasterDataSearchResult } from '../../inventory'
import {
  DEFAULT_SHIPMENT_FORM_DATA,
  createShipmentFormDraft,
  type ShipmentFormData,
  type ShipmentFormUpdater,
} from '../data/schema'

export function useShipmentFormState() {
  const [selectedItem, setSelectedItem] = useState<MasterDataSearchResult | null>(null)
  const [isShipmentOpen, setIsShipmentOpenState] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const initialForm = useMemo(() => DEFAULT_SHIPMENT_FORM_DATA, [])
  const { data: formData } = useDeltaTracker<ShipmentFormData>(initialForm, isShipmentOpen)

  const setFormData = useCallback((updater: ShipmentFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
      return
    }

    Object.assign(formData, updater)
  }, [formData])

  const setIsShipmentOpen = useCallback((open: boolean) => {
    setIsShipmentOpenState(open)
    if (!open) {
      setSelectedItem(null)
    }
  }, [])

  const openShipmentForm = useCallback((item: MasterDataSearchResult) => {
    setSelectedItem(item)
    Object.assign(formData, createShipmentFormDraft(item))
    setIsShipmentOpenState(true)
  }, [formData])

  const closeShipmentForm = useCallback(() => {
    setIsShipmentOpen(false)
  }, [setIsShipmentOpen])

  const fillMaxQuantity = useCallback((quantity: number) => {
    setFormData({ quantity })
  }, [setFormData])

  return {
    selectedItem,
    setSelectedItem,
    isShipmentOpen,
    setIsShipmentOpen,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    openShipmentForm,
    closeShipmentForm,
    fillMaxQuantity,
  }
}
