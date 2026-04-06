import { Boxes, Package, FlaskConical, Truck, Warehouse } from 'lucide-react'

/**
 * 根据类别代码返回对应的工业化图标
 */
export const getCategoryIcon = (code: string) => {
    switch (code) {
        case 'MATERIAL':
            return <Boxes className='size-5 text-amber-500' />
        case 'FINISHED':
            return <Package className='size-5 text-blue-500' />
        case 'RD':
            return <FlaskConical className='size-5 text-purple-500' />
        case 'WIP':
            return <Truck className='size-5 text-emerald-500' />
        default:
            return <Warehouse className='size-5 text-slate-500' />
    }
}
