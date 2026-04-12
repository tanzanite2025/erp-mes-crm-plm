'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type Product } from '../data/schema'
import { BOMS_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../query-keys'
import { bomService } from '../services/bom-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMReadData')

export function useBOMReadData() {
  const { t } = useLanguage()

  const bomsQuery = useQuery({
    queryKey: BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(),
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
  })
  const productsQuery = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => ProductCoreService.getProducts(),
  })

  const data = useMemo(() => {
    if (bomsQuery.isLoading) return []
    if (bomsQuery.error) return []
    if (!bomsQuery.data) {
      const error = new Error('[CRITICAL] BOM data is missing after load')
      failLoudly(error, 'useBOMReadData.boms')
      throw error
    }
    return bomsQuery.data
  }, [bomsQuery.data, bomsQuery.error, bomsQuery.isLoading])

  const materials = useMemo(() => {
    if (materialsQuery.isLoading) return []
    if (materialsQuery.error) return []
    if (!materialsQuery.data) {
      const error = new Error('[CRITICAL] BOM materials are missing after load')
      failLoudly(error, 'useBOMReadData.materials')
      throw error
    }
    return materialsQuery.data
  }, [materialsQuery.data, materialsQuery.error, materialsQuery.isLoading])

  const products = useMemo(() => {
    if (productsQuery.isLoading) return [] as Product[]
    if (productsQuery.error) return [] as Product[]
    if (!productsQuery.data) {
      const error = new Error('[CRITICAL] BOM products are missing after load')
      failLoudly(error, 'useBOMReadData.products')
      throw error
    }
    return productsQuery.data
  }, [productsQuery.data, productsQuery.error, productsQuery.isLoading])

  const isLoading = bomsQuery.isLoading || materialsQuery.isLoading || productsQuery.isLoading
  const loadError = bomsQuery.error || materialsQuery.error || productsQuery.error || null

  useEffect(() => {
    if (bomsQuery.error) {
      logger.error('BOM data load error', bomsQuery.error)
      toast.error(t('engineering.bomArchive.toasts.loadFailed'))
    }
  }, [bomsQuery.error, t])

  useEffect(() => {
    if (materialsQuery.error) {
      logger.error('BOM materials load error', materialsQuery.error)
      toast.error(t('engineering.bomArchive.toasts.loadFailed'))
    }
  }, [materialsQuery.error, t])

  return {
    data,
    products,
    materials,
    isLoading,
    loadError,
  }
}
