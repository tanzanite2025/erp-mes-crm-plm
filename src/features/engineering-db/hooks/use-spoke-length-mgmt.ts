import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { engineeringDBService } from '../services/engineering-db-service'
import { hubService } from '../services/hub-service'
import { nippleService } from '../services/nipple-service'
import { type SpokeLength } from '../data/schema'
import { type Hub } from '../data/hub-schema'
import { type Nipple } from '../data/nipple-schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'

export function useSpokeLengthMgmt() {
    const { t } = useLanguage()
    const [data, setData] = useState<SpokeLength[]>([])
    const { data: products = [] } = useGetProducts()
    const [hubs, setHubs] = useState<Hub[]>([])
    const [nipples, setNipples] = useState<Nipple[]>([])
    
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const loadAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [spokeData, hubData, nippleData] = await Promise.all([
                engineeringDBService.getSpokeLength(),
                hubService.getHubs(),
                nippleService.getNipples()
            ])
            setData(spokeData)
            setHubs(hubData)
            setNipples(nippleData)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadAllData()

        const handleUpdate = () => {
            void loadAllData()
        }

        window.addEventListener('xdfc_spoke_lengths_data_updated', handleUpdate)
        return () => {
            window.removeEventListener('xdfc_spoke_lengths_data_updated', handleUpdate)
        }
    }, [loadAllData])

    const productMap = useMemo(() => {
        const map = new Map<string, any>()
        products.forEach(p => map.set(p.id, p))
        return map
    }, [products])

    const hubMap = useMemo(() => {
        const map = new Map<string, Hub>()
        hubs.forEach(h => map.set(h.id, h))
        return map
    }, [hubs])

    const nippleMap = useMemo(() => {
        const map = new Map<string, Nipple>()
        nipples.forEach(n => map.set(n.id, n))
        return map
    }, [nipples])

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const product = productMap.get(item.productId)
            const hub = hubMap.get(item.hubId || '')
            const nipple = nippleMap.get(item.nippleId || '')
            const searchStr = searchTerm.toLowerCase()
            
            return item.name.toLowerCase().includes(searchStr) ||
                   (product?.sku || '').toLowerCase().includes(searchStr) ||
                   (hub?.name || '').toLowerCase().includes(searchStr) ||
                   (nipple?.name || '').toLowerCase().includes(searchStr) ||
                   (item.material || '').toLowerCase().includes(searchStr)
        })
    }, [data, productMap, hubMap, nippleMap, searchTerm])

    const handleDelete = async (item: SpokeLength) => {
        if (!window.confirm(t('engineering.spokeLength.toasts.deleteConfirm'))) return
        
        try {
            const newData = data.filter(p => p.id !== item.id)
            setData(newData)
            await engineeringDBService.saveSpokeLength(newData)
            window.dispatchEvent(new CustomEvent('xdfc_spoke_lengths_data_updated'))
            toast.success(t('engineering.spokeLength.toasts.deleteSuccess'))
        } catch (error) {
            toast.error(t('common.status.error' as any))
        }
    }

    const handleSave = async (params: { 
        data: SpokeLength; 
        isPatch: boolean; 
        delta?: any; 
        version?: number 
    }) => {
        const { data: formData, isPatch, delta, version } = params
        
        // 更新本地状态
        setData(prev => {
            const exists = prev.find(p => p.id === formData.id)
            if (exists) {
                return prev.map(p => p.id === formData.id ? formData : p)
            }
            return [formData, ...prev]
        })

        if (isPatch && delta) {
            await engineeringDBService.patchSpokeLength(formData.id, delta, version!)
        } else {
            // 注意：这里由于 service 原有设计限制，包装成数组传递
            await engineeringDBService.saveSpokeLength([formData])
        }
        
        window.dispatchEvent(new CustomEvent('xdfc_spoke_lengths_data_updated'))
    }

    return {
        data,
        filteredData,
        isLoading,
        searchTerm,
        setSearchTerm,
        productMap,
        hubMap,
        nippleMap,
        handleDelete,
        handleSave,
        refresh: loadAllData
    }
}
